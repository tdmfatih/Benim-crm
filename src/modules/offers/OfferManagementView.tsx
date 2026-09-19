import React, { useState } from 'react';
import { Offer, OfferItem, Customer, Product, User } from '../../types';
import { storage } from '../../services/storageService';
import { RBACService } from '../../services/rbacService';
import { PDFService } from '../../services/pdfService';
import { WhatsAppService } from '../../services/whatsappService';
import { AutomationEngine } from '../../services/automationEngine';
import { 
  Plus, Search, FileText, Printer, MessageSquare, Copy, 
  ExternalLink, CheckCircle2, XCircle, Clock, Eye, Trash2, 
  ShieldAlert, ArrowRight, RefreshCw, ArrowLeft, Image as ImageIcon, X
} from 'lucide-react';

interface OfferManagementViewProps {
  offers: Offer[];
  customers: Customer[];
  products: Product[];
  onSaveOffers: (offers: Offer[]) => void;
  onCreateInstallationFromOffer: (offer: Offer) => void;
  onCreateInvoiceFromOffer: (offer: Offer) => void;
  onOpenPublicOffer: (token: string) => void;
}

export const OfferManagementView: React.FC<OfferManagementViewProps> = ({
  offers,
  customers,
  products,
  onSaveOffers,
  onCreateInstallationFromOffer,
  onCreateInvoiceFromOffer,
  onOpenPublicOffer,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(offers[0] || null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);

  const companySettings = storage.getSettings();
  const canViewCost = RBACService.canViewCost();

  const formatMoney = (val: number) => 
    new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(val);

  const filteredOffers = offers.filter(o => {
    const matchSearch = 
      o.offerNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.serviceCategory.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'all' || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleCopyLink = (token: string) => {
    const fullUrl = `${window.location.origin}/offer/${token}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const handleSendWhatsApp = async (offer: Offer) => {
    const fullUrl = `${window.location.origin}/offer/${offer.secureToken}`;
    await WhatsAppService.sendMessage({
      recipientName: offer.customerName,
      recipientPhone: offer.customerPhone,
      templateCode: 'OFFER_APPROVAL_REQUEST',
      variables: {
        musteri_adi: offer.customerName,
        teklif_no: offer.offerNumber,
        kategori: offer.serviceCategory,
        toplam_tutar: formatMoney(offer.grandTotal),
        onay_linki: fullUrl,
      },
      relatedEntity: {
        type: 'offer',
        id: offer.id,
        number: offer.offerNumber,
      },
    });

    // Mark as sent
    const updated = offers.map(o => {
      if (o.id === offer.id && o.status === 'draft') {
        return { ...o, status: 'sent' as const, sentAt: new Date().toISOString() };
      }
      return o;
    });
    onSaveOffers(updated);
    if (selectedOffer?.id === offer.id) {
      setSelectedOffer({ ...selectedOffer, status: 'sent', sentAt: new Date().toISOString() });
    }
    alert(`Teklif ve güvenli onay bağlantısı ${offer.customerName} müşterisine WhatsApp ile başarıyla iletildi.`);
  };

  const handleReviseOffer = (offer: Offer) => {
    const newVersion = offer.currentVersion + 1;
    const revised: Offer = {
      ...offer,
      id: 'off-' + Date.now(),
      currentVersion: newVersion,
      status: 'draft',
      secureToken: '3as_token_' + Math.random().toString(36).substring(2, 10),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updated = [revised, ...offers];
    onSaveOffers(updated);
    setSelectedOffer(revised);
    storage.logAudit(
      'OFFER_REVISED',
      'offer',
      revised.id,
      `${revised.offerNumber} (v${newVersion})`,
      { previousVersion: offer.currentVersion },
      { newVersion }
    );
    alert(`Teklif revize edildi: Yeni sürüm v${newVersion} taslağı oluşturuldu.`);
  };

  return (
    <div className="space-y-5 pb-12">
      {/* Üst Filtre Barı */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Teklif No veya müşteri ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white focus:outline-none"
          >
            <option value="all">Tüm Durumlar</option>
            <option value="draft">Taslak</option>
            <option value="sent">Gönderildi (Onay Bekliyor)</option>
            <option value="approved">Onaylandı</option>
            <option value="rejected">Reddedildi</option>
          </select>
        </div>

        <button
          onClick={() => setShowNewModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition w-full sm:w-auto justify-center"
        >
          <Plus size={16} /> Yeni Fiyat Teklifi Hazırla
        </button>
      </div>

      {/* Ana Çift Kolonlu Görünüm */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Teklif Listesi (1 Kolon) - Mobilde detay seçiliyse gizlenebilir */}
        <div className={`bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden ${
          selectedOffer ? 'hidden lg:block' : 'block'
        }`}>
          <div className="p-3.5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center text-xs font-bold text-slate-700">
            <span>Kayıtlı Teklifler ({filteredOffers.length})</span>
          </div>

          <div className="divide-y divide-slate-100 max-h-[calc(100vh-250px)] overflow-y-auto">
            {filteredOffers.map(o => {
              const isSelected = selectedOffer?.id === o.id;
              return (
                <div
                  key={o.id}
                  onClick={() => setSelectedOffer(o)}
                  className={`p-3.5 transition cursor-pointer ${
                    isSelected ? 'bg-blue-50/80 border-l-4 border-l-blue-600' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-blue-700">
                      {o.offerNumber} <span className="text-[10px] text-slate-500 font-normal">(v{o.currentVersion})</span>
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      o.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                      o.status === 'rejected' ? 'bg-red-100 text-red-800' :
                      o.status === 'sent' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {o.status === 'approved' ? 'Onaylandı' :
                       o.status === 'rejected' ? 'Reddedildi' :
                       o.status === 'sent' ? 'Onay Bekliyor' : 'Taslak'}
                    </span>
                  </div>

                  <div className="text-xs font-bold text-slate-900">{o.customerName}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{o.serviceCategory}</div>

                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className="font-extrabold text-slate-900">{formatMoney(o.grandTotal)}</span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(o.createdAt).toLocaleDateString('tr-TR')}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Teklif Detay & İşlemler Paneli (2 Kolon) */}
        <div className={`lg:col-span-2 ${selectedOffer ? 'block' : 'hidden lg:block'}`}>
          {selectedOffer ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              {/* Mobilde Geri Dön Butonu */}
              <div className="p-3 bg-slate-100 border-b border-slate-200 lg:hidden flex items-center justify-between">
                <button
                  onClick={() => setSelectedOffer(null)}
                  className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700"
                >
                  <ArrowLeft size={16} /> Teklif Listesine Dön
                </button>
                <span className="text-[11px] text-slate-500 font-semibold">{selectedOffer.offerNumber}</span>
              </div>

              {/* Başlık ve Butonlar */}
              <div className="p-5 border-b border-slate-100 bg-slate-50/60 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="flex items-start gap-3">
                  {companySettings?.logoUrl ? (
                    <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 p-1 flex items-center justify-center shrink-0 shadow-2xs">
                      <img src={companySettings.logoUrl} alt="Şirket Logosu" className="max-h-full max-w-full object-contain" />
                    </div>
                  ) : null}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold text-blue-900">{selectedOffer.offerNumber}</span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                        Sürüm: v{selectedOffer.currentVersion}
                      </span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        selectedOffer.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                        selectedOffer.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        selectedOffer.status === 'sent' ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {selectedOffer.status.toUpperCase()}
                      </span>
                      {companySettings?.logoUrl && (
                        <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100">
                          Logo Baskılı Antet
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 mt-1">{selectedOffer.customerName}</h3>
                    <p className="text-xs text-slate-500">{selectedOffer.serviceCategory} • Son Geçerlilik: {new Date(selectedOffer.validUntil).toLocaleDateString('tr-TR')}</p>
                  </div>
                </div>

                {/* Aksiyon Butonları */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => PDFService.printOffer(selectedOffer)}
                    className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs"
                    title="Resmi A4 PDF Yazdır"
                  >
                    <Printer size={14} /> PDF Yazdır
                  </button>

                  <button
                    onClick={() => handleSendWhatsApp(selectedOffer)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs"
                    title="Müşteriye WhatsApp ile Onay Linki Gönder"
                  >
                    <MessageSquare size={14} /> WhatsApp ile Gönder
                  </button>

                  <button
                    onClick={() => handleReviseOffer(selectedOffer)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5"
                    title="Yeni Revizyon Oluştur"
                  >
                    <RefreshCw size={14} /> Revize Et (v{selectedOffer.currentVersion + 1})
                  </button>
                </div>
              </div>

              {/* Güvenli Onay Linki Bilgi Şeridi */}
              <div className="p-3 bg-blue-50/70 border-b border-blue-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 text-blue-900 font-medium">
                  <span className="font-bold text-blue-700">Müşteri Online Onay Bağlantısı:</span>
                  <span className="text-[11px] text-slate-600 font-mono bg-white px-2 py-0.5 rounded border border-blue-200">
                    /offer/{selectedOffer.secureToken}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopyLink(selectedOffer.secureToken)}
                    className="px-2.5 py-1 bg-white hover:bg-blue-100 text-blue-700 text-[11px] font-bold rounded-lg border border-blue-300 flex items-center gap-1"
                  >
                    <Copy size={12} /> {copiedToken === selectedOffer.secureToken ? 'Kopyalandı!' : 'Linki Kopyala'}
                  </button>
                  <button
                    onClick={() => onOpenPublicOffer(selectedOffer.secureToken)}
                    className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold rounded-lg flex items-center gap-1"
                  >
                    <ExternalLink size={12} /> Müşteri Ekranında Aç
                  </button>
                </div>
              </div>

              {/* Onaylandığında Tetiklenen İş Akışları */}
              {selectedOffer.status === 'approved' && (
                <div className="p-3.5 bg-emerald-50 border-b border-emerald-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div className="flex items-center gap-2 text-xs text-emerald-800 font-bold">
                    <CheckCircle2 size={16} className="text-emerald-600" />
                    Müşteri Tarafından Onaylandı! Hemen operasyona geçebilirsiniz:
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onCreateInstallationFromOffer(selectedOffer)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs"
                    >
                      Saha Montaj Emri Oluştur →
                    </button>
                    <button
                      onClick={() => onCreateInvoiceFromOffer(selectedOffer)}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs"
                    >
                      Fatura Kes →
                    </button>
                  </div>
                </div>
              )}

              {/* Kalemler Tablosu (RBAC Cost Koruma ile) */}
              <div className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Teklif Kalemleri ve İşçilik
                  </h4>

                  {/* RBAC Maliyet Yetki Uyarısı */}
                  {!canViewCost && (
                    <span className="text-[10px] text-amber-700 font-semibold flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      <ShieldAlert size={12} /> Alış Maliyeti ve Kar Marjı Rolünüz Sebebiyle Gizlenmiştir
                    </span>
                  )}
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider border-b border-slate-200 font-bold">
                      <tr>
                        <th className="py-2.5 px-3">#</th>
                        <th className="py-2.5 px-2 text-center w-12">Görsel</th>
                        <th className="py-2.5 px-3">Ürün / Hizmet</th>
                        <th className="py-2.5 px-3 text-center">Miktar</th>
                        {canViewCost && <th className="py-2.5 px-3 text-right text-amber-800 bg-amber-50/50">Maliyet (Alış)</th>}
                        <th className="py-2.5 px-3 text-right">Satış Birim</th>
                        <th className="py-2.5 px-3 text-center">KDV</th>
                        <th className="py-2.5 px-3 text-right">Toplam Tutar</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {selectedOffer.items.map((item, idx) => (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="py-3 px-3 text-slate-400">{idx + 1}</td>
                          <td className="py-3 px-2 text-center">
                            {item.imageUrl ? (
                              <button
                                type="button"
                                onClick={() => setPreviewImage({ url: item.imageUrl!, title: item.name })}
                                className="w-9 h-9 rounded-lg border border-slate-200 overflow-hidden inline-block hover:ring-2 hover:ring-blue-500 transition shadow-2xs group relative"
                                title="Görseli Büyüt"
                              >
                                <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition" />
                              </button>
                            ) : (
                              <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-300 mx-auto">
                                <ImageIcon size={14} />
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-bold text-slate-900">{item.name}</div>
                            {item.description && <div className="text-[10px] text-slate-500">{item.description}</div>}
                          </td>
                          <td className="py-3 px-3 text-center font-medium">{item.quantity} {item.unit}</td>
                          {canViewCost && (
                            <td className="py-3 px-3 text-right text-amber-900 bg-amber-50/20 font-mono">
                              {formatMoney(item.costPrice || 0)}
                            </td>
                          )}
                          <td className="py-3 px-3 text-right font-medium">{formatMoney(item.unitPrice)}</td>
                          <td className="py-3 px-3 text-center text-slate-500">%{item.vatRate}</td>
                          <td className="py-3 px-3 text-right font-bold text-slate-900">{formatMoney(item.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Toplamlar ve Marj Hesabı */}
                <div className="mt-5 flex flex-col sm:flex-row justify-between items-start gap-4">
                  <div className="text-xs text-slate-500 max-w-sm">
                    {selectedOffer.paymentTerms && <p className="mb-1"><strong>Ödeme:</strong> {selectedOffer.paymentTerms}</p>}
                    {selectedOffer.warrantyTerms && <p><strong>Garanti:</strong> {selectedOffer.warrantyTerms}</p>}
                  </div>

                  <div className="w-full sm:w-72 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-1.5">
                    <div className="flex justify-between text-slate-600">
                      <span>Ara Toplam:</span>
                      <span className="font-semibold">{formatMoney(selectedOffer.subtotal)}</span>
                    </div>
                    {selectedOffer.discountTotal > 0 && (
                      <div className="flex justify-between text-red-600">
                        <span>İskonto:</span>
                        <span className="font-semibold">-{formatMoney(selectedOffer.discountTotal)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-slate-600">
                      <span>KDV (%20):</span>
                      <span className="font-semibold">{formatMoney(selectedOffer.taxTotal)}</span>
                    </div>
                    <div className="pt-2 border-t border-slate-300 flex justify-between text-sm font-extrabold text-blue-900">
                      <span>GENEL TOPLAM:</span>
                      <span>{formatMoney(selectedOffer.grandTotal)}</span>
                    </div>

                    {/* RBAC Kar Marjı Kutusu */}
                    {canViewCost && (
                      <div className="mt-3 pt-2 border-t border-amber-200 bg-amber-50/80 -mx-4 -mb-4 p-3 rounded-b-xl text-[11px] text-amber-900">
                        <div className="flex justify-between font-bold">
                          <span>Toplam Maliyet:</span>
                          <span>{formatMoney(selectedOffer.totalCost || 0)}</span>
                        </div>
                        <div className="flex justify-between font-extrabold text-emerald-800 mt-1">
                          <span>Net Kar Marjı:</span>
                          <span>%{selectedOffer.marginPercentage ? selectedOffer.marginPercentage.toFixed(1) : '35.0'}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
              Görüntülemek için soldan bir teklif seçiniz.
            </div>
          )}
        </div>
      </div>

      {/* YENİ TEKLİF HAZIRLAMA MODALI */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Yeni Fiyat Teklifi Oluştur</h3>
              <button onClick={() => setShowNewModal(false)} className="text-slate-400">✕</button>
            </div>

            <NewOfferForm
              customers={customers}
              products={products}
              onClose={() => setShowNewModal(false)}
              onSave={(newOffer) => {
                const updated = [newOffer, ...offers];
                onSaveOffers(updated);
                setSelectedOffer(newOffer);
                setShowNewModal(false);
                storage.logAudit('OFFER_CREATED', 'offer', newOffer.id, newOffer.offerNumber, null, newOffer);
              }}
            />
          </div>
        </div>
      )}

      {/* ÜRÜN GÖRSELİ ÖNİZLEME MODALI (LIGHTBOX) */}
      {previewImage && (
        <div 
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 bg-black/85 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl"
          >
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <span className="font-bold text-slate-900 text-sm truncate">{previewImage.title}</span>
              <button 
                onClick={() => setPreviewImage(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-4 flex items-center justify-center bg-white max-h-[65vh]">
              <img 
                src={previewImage.url} 
                alt={previewImage.title} 
                className="max-h-[55vh] max-w-full object-contain rounded-lg" 
              />
            </div>
            <div className="p-3 bg-slate-50 border-t border-slate-100 text-center">
              <button
                onClick={() => setPreviewImage(null)}
                className="px-4 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-bold hover:bg-slate-700"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Alt Bileşen: Yeni Teklif Formu
interface NewOfferFormProps {
  customers: Customer[];
  products: Product[];
  onClose: () => void;
  onSave: (offer: Offer) => void;
}

const NewOfferForm: React.FC<NewOfferFormProps> = ({ customers, products, onClose, onSave }) => {
  const [customerId, setCustomerId] = useState(customers[0]?.id || '');
  const [serviceCategory, setServiceCategory] = useState('Güvenlik Kamerası Sistemleri');
  const [items, setItems] = useState<OfferItem[]>([
    {
      id: 'item-1',
      productId: products[0]?.id,
      type: 'product',
      name: products[0]?.name || '4 Kanal IP Kamera Seti',
      description: 'IP Güvenlik Kamerası donanım ve montaj kalemi',
      quantity: 1,
      unit: 'Adet',
      unitPrice: products[0]?.salePrice || 12500,
      costPrice: products[0]?.purchasePrice || 8200,
      vatRate: 20,
      discountPercent: 0,
      discountAmount: 0,
      total: (products[0]?.salePrice || 12500) * 1.2,
    }
  ]);

  const selectedCustomer = customers.find(c => c.id === customerId);

  const handleAddItem = () => {
    const defaultProd = products[0];
    const newItem: OfferItem = {
      id: 'item-' + Date.now(),
      productId: defaultProd?.id,
      type: 'product',
      name: defaultProd?.name || 'Ürün / Hizmet',
      description: 'Standart ürün/hizmet kalemi',
      quantity: 1,
      unit: 'Adet',
      unitPrice: defaultProd?.salePrice || 1000,
      costPrice: defaultProd?.purchasePrice || 600,
      vatRate: 20,
      discountPercent: 0,
      discountAmount: 0,
      total: (defaultProd?.salePrice || 1000) * 1.2,
    };
    setItems([...items, newItem]);
  };

  const handleRemoveItem = (idx: number) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const updated = [...items];
    const item = { ...updated[index], [field]: value };
    
    // Auto recalculate total
    const qty = Number(item.quantity) || 1;
    const price = Number(item.unitPrice) || 0;
    const vat = Number(item.vatRate) || 20;
    item.total = (qty * price) * (1 + vat / 100);

    updated[index] = item;
    setItems(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) {
      alert('Lütfen bir müşteri seçiniz.');
      return;
    }

    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const taxTotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice * (item.vatRate / 100)), 0);
    const grandTotal = subtotal + taxTotal;
    const totalCost = items.reduce((sum, item) => sum + (item.quantity * (item.costPrice || 0)), 0);
    const marginPercentage = grandTotal > 0 ? ((grandTotal - totalCost) / grandTotal) * 100 : 0;

    const offerNumber = `3AS-TEK-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newOffer: Offer = {
      id: 'off-' + Date.now(),
      offerNumber,
      currentVersion: 1,
      customerId: selectedCustomer.id,
      customerName: selectedCustomer.name,
      customerPhone: selectedCustomer.phone,
      customerEmail: selectedCustomer.email,
      customerAddress: selectedCustomer.address,
      serviceCategory,
      currency: 'TRY',
      exchangeRate: 1,
      status: 'draft',
      validUntil: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      items,
      subtotal,
      discountTotal: 0,
      taxTotal,
      grandTotal,
      totalCost,
      marginPercentage,
      paymentTerms: '%40 Kapora siparişte, %40 montaj bitimi, %20 teslimat ve kabulde.',
      warrantyTerms: '2 Yıl Yerinde Birebir Değişim ve Servis Garantisi.',
      secureToken: '3as_token_' + Math.random().toString(36).substring(2, 10),
      notes: '',
      versions: [
        {
          versionNumber: 1,
          createdAt: new Date().toISOString(),
          createdBy: storage.getCurrentUser().id,
          createdByName: storage.getCurrentUser().fullName,
          items: [...items],
          subtotal,
          discountTotal: 0,
          taxTotal,
          grandTotal,
          totalCost,
          marginPercentage,
        }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSave(newOffer);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-xs">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block font-bold text-slate-700 mb-1">Müşteri / Cari <span className="text-red-500">*</span></label>
          <select
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-medium"
          >
            {customers.map(c => (
              <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block font-bold text-slate-700 mb-1">Hizmet Grubu</label>
          <select
            value={serviceCategory}
            onChange={(e) => setServiceCategory(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
          >
            <option value="Güvenlik Kamerası Sistemleri">Güvenlik Kamerası Sistemleri</option>
            <option value="Hırsız Alarm Sistemleri">Hırsız Alarm Sistemleri</option>
            <option value="Yangın Algılama Sistemleri">Yangın Algılama Sistemleri</option>
            <option value="Network / Ağ Kurulumu">Network / Ağ Kurulumu</option>
            <option value="Akıllı Ev ve Ofis Sistemleri">Akıllı Ev ve Ofis Sistemleri</option>
            <option value="Barkod ve Adisyon Sistemleri">Barkod ve Adisyon Sistemleri</option>
            <option value="Profesyonel Ses Sistemleri">Profesyonel Ses Sistemleri</option>
            <option value="Bilgisayar Tamir ve IT Hizmetleri">Bilgisayar Tamir ve IT Hizmetleri</option>
          </select>
        </div>
      </div>

      {/* Kalemler */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="font-bold text-slate-800">Teklif Kalemleri</label>
          <button
            type="button"
            onClick={handleAddItem}
            className="px-2.5 py-1 bg-blue-50 text-blue-700 font-bold rounded-lg hover:bg-blue-100 flex items-center gap-1"
          >
            <Plus size={12} /> Kalem Ekle
          </button>
        </div>

        <div className="space-y-2 max-h-64 overflow-y-auto">
          {items.map((item, idx) => (
            <div key={item.id} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="flex items-center gap-2">
                {/* Envanterden Hızlı Ürün Seçimi */}
                <select
                  onChange={(e) => {
                    const found = products.find(p => p.id === e.target.value);
                    if (found) {
                      const updated = [...items];
                      updated[idx] = {
                        ...updated[idx],
                        productId: found.id,
                        name: found.name,
                        description: found.description || `${found.brand} (${found.sku})`,
                        imageUrl: found.imageUrl,
                        unitPrice: found.salePrice,
                        costPrice: found.purchasePrice,
                        total: (updated[idx].quantity * found.salePrice) * (1 + updated[idx].vatRate / 100),
                      };
                      setItems(updated);
                    }
                  }}
                  defaultValue=""
                  className="px-2 py-1 bg-white border border-blue-200 rounded text-[11px] font-semibold text-blue-800"
                >
                  <option value="" disabled>📦 Envanterden Hızlı Seç...</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.salePrice} TL)</option>
                  ))}
                </select>

                {item.imageUrl && (
                  <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                    ✓ Ürün Görseli Var
                  </span>
                )}
              </div>

              <div className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-5">
                  <input
                    type="text"
                    placeholder="Ürün / Hizmet Açıklaması"
                    value={item.name}
                    onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div className="col-span-2">
                  <input
                    type="number"
                    placeholder="Miktar"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-center text-xs"
                  />
                </div>
                <div className="col-span-3">
                  <input
                    type="number"
                    placeholder="Birim Fiyat (TL)"
                    value={item.unitPrice}
                    onChange={(e) => handleItemChange(idx, 'unitPrice', e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-right text-xs font-semibold"
                  />
                </div>
                <div className="col-span-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(idx)}
                    className="text-red-500 hover:text-red-700 p-1"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
        >
          İptal
        </button>
        <button
          type="submit"
          className="px-4 py-2 font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
        >
          Teklifi Oluştur ve Kaydet
        </button>
      </div>
    </form>
  );
};
