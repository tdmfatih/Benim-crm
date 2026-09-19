import React, { useState, useEffect } from 'react';
import { storage } from '../services/storageService';
import { PDFService } from '../services/pdfService';
import { AutomationEngine } from '../services/automationEngine';
import { BrandLogo } from '../components/layout/BrandLogo';
import { Offer } from '../types';
import { CheckCircle2, XCircle, Printer, ShieldCheck, Clock, FileText, AlertTriangle } from 'lucide-react';

interface PublicOfferApprovalProps {
  token: string;
  onBackToApp?: () => void;
  onApproved?: (offer: Offer) => void;
}

export const PublicOfferApproval: React.FC<PublicOfferApprovalProps> = ({ token, onBackToApp, onApproved }) => {
  const [offer, setOffer] = useState<Offer | null>(null);
  const [actionDone, setActionDone] = useState<'approved' | 'rejected' | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [approverName, setApproverName] = useState('');

  useEffect(() => {
    const found = storage.getOfferByToken(token);
    if (found) {
      setOffer(found);
      if (found.status === 'approved') setActionDone('approved');
      if (found.status === 'rejected') setActionDone('rejected');
    }
  }, [token]);

  if (!offer) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white max-w-md w-full p-8 rounded-2xl shadow-lg text-center border border-slate-200">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle size={32} />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Geçersiz veya Süresi Dolmuş Bağlantı</h2>
          <p className="text-sm text-slate-600 mb-6">
            Bu teklif bağlantısı geçersiz kılınmış veya süresi dolmuş olabilir. Lütfen 3AS Teknoloji müşteri temsilcinizle iletişime geçiniz.
          </p>
          {onBackToApp && (
            <button
              onClick={onBackToApp}
              className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-700"
            >
              Yönetim Paneline Dön
            </button>
          )}
        </div>
      </div>
    );
  }

  const formatMoney = (val: number) => 
    new Intl.NumberFormat('tr-TR', { style: 'currency', currency: offer.currency }).format(val);

  const handleApprove = () => {
    if (!approverName.trim()) {
      alert('Lütfen onaylayan yetkili adını ve soyadını giriniz.');
      return;
    }

    const offers = storage.getOffers();
    const idx = offers.findIndex(o => o.id === offer.id);
    if (idx === -1) return;

    const updated: Offer = {
      ...offers[idx],
      status: 'approved',
      approvedAt: new Date().toISOString(),
      clientIp: '88.245.19.102 (Doğrulandı)',
    };
    offers[idx] = updated;
    storage.saveOffers(offers);

    storage.logAudit(
      'OFFER_APPROVED_ONLINE',
      'offer',
      offer.id,
      `${offer.offerNumber} (v${offer.currentVersion})`,
      { status: offer.status },
      { status: 'approved', approver: approverName, timestamp: new Date().toISOString() }
    );

    AutomationEngine.triggerEvent('OFFER_APPROVED', {
      customerName: offer.customerName,
      customerPhone: offer.customerPhone,
      entityId: offer.id,
      entityNumber: offer.offerNumber,
      entityType: 'offer',
      variables: {
        musteri_adi: offer.customerName,
        teklif_no: offer.offerNumber,
        toplam_tutar: formatMoney(offer.grandTotal),
      },
    });

    setOffer(updated);
    setActionDone('approved');
    if (onApproved) onApproved(updated);
  };

  const handleReject = () => {
    const offers = storage.getOffers();
    const idx = offers.findIndex(o => o.id === offer.id);
    if (idx === -1) return;

    const updated: Offer = {
      ...offers[idx],
      status: 'rejected',
      rejectedAt: new Date().toISOString(),
      rejectionReason: rejectReason || 'Müşteri tarafından sebep belirtilmedi.',
      clientIp: '88.245.19.102',
    };
    offers[idx] = updated;
    storage.saveOffers(offers);

    storage.logAudit(
      'OFFER_REJECTED_ONLINE',
      'offer',
      offer.id,
      offer.offerNumber,
      { status: offer.status },
      { status: 'rejected', reason: rejectReason }
    );

    setOffer(updated);
    setActionDone('rejected');
    setShowRejectModal(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <BrandLogo size="md" />
            <div className="text-left sm:text-right">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                <ShieldCheck size={14} /> Güvenli Doğrulanmış Müşteri Portalı
              </span>
              <p className="text-xs text-slate-500 mt-1">Bu sayfa sadece teklif muhatabına özeldir.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Müşteri / Firma</span>
              <h2 className="text-base font-bold text-slate-900">{offer.customerName}</h2>
              <p className="text-xs text-slate-600 mt-0.5">{offer.customerPhone} {offer.customerEmail ? `• ${offer.customerEmail}` : ''}</p>
              {offer.customerAddress && <p className="text-xs text-slate-500 mt-1">{offer.customerAddress}</p>}
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Teklif Detayları</span>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-blue-700">{offer.offerNumber} <span className="text-xs text-slate-500 font-normal">(Sürüm {offer.currentVersion})</span></span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  offer.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                  offer.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  {offer.status === 'approved' ? '✓ ONAYLANDI' : offer.status === 'rejected' ? '✕ REDDEDİLDİ' : 'ONAY BEKLİYOR'}
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1.5">Hizmet: <strong>{offer.serviceCategory}</strong></p>
              <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                <Clock size={12} /> Son Geçerlilik: {new Date(offer.validUntil).toLocaleDateString('tr-TR')}
              </p>
            </div>
          </div>
        </div>

        {/* Kalemler Tablosu */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileText size={16} className="text-blue-600" /> Teklif Kalemleri ve İş Kapsamı
            </h3>
            <button
              onClick={() => PDFService.printOffer(offer)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg shadow-sm transition"
            >
              <Printer size={14} /> Resmi PDF İndir / Yazdır
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 font-semibold">#</th>
                  <th className="py-3 px-4 font-semibold">Ürün / Hizmet Kalemi</th>
                  <th className="py-3 px-4 font-semibold text-center">Miktar</th>
                  <th className="py-3 px-4 font-semibold text-right">Birim Fiyat</th>
                  <th className="py-3 px-4 font-semibold text-center">KDV</th>
                  <th className="py-3 px-4 font-semibold text-right">Toplam</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {offer.items.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition">
                    <td className="py-3.5 px-4 text-xs text-slate-400 font-medium">{idx + 1}</td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">{item.name}</div>
                      {item.description && <div className="text-xs text-slate-500 mt-0.5">{item.description}</div>}
                    </td>
                    <td className="py-3.5 px-4 text-center font-medium">{item.quantity} {item.unit}</td>
                    <td className="py-3.5 px-4 text-right">{formatMoney(item.unitPrice)}</td>
                    <td className="py-3.5 px-4 text-center text-xs font-medium text-slate-500">%{item.vatRate}</td>
                    <td className="py-3.5 px-4 text-right font-bold text-slate-900">{formatMoney(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Toplamlar */}
          <div className="p-6 bg-slate-50/70 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="text-xs text-slate-500 max-w-sm">
              {offer.paymentTerms && <p className="mb-1"><strong>Ödeme Koşulları:</strong> {offer.paymentTerms}</p>}
              {offer.warrantyTerms && <p><strong>Garanti Şartları:</strong> {offer.warrantyTerms}</p>}
            </div>

            <div className="w-full sm:w-72 space-y-2">
              <div className="flex justify-between text-xs text-slate-600">
                <span>Ara Toplam:</span>
                <span className="font-semibold">{formatMoney(offer.subtotal)}</span>
              </div>
              {offer.discountTotal > 0 && (
                <div className="flex justify-between text-xs text-red-600">
                  <span>İskonto:</span>
                  <span className="font-semibold">-{formatMoney(offer.discountTotal)}</span>
                </div>
              )}
              <div className="flex justify-between text-xs text-slate-600">
                <span>KDV (%20):</span>
                <span className="font-semibold">{formatMoney(offer.taxTotal)}</span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between text-base font-extrabold text-blue-900">
                <span>GENEL TOPLAM:</span>
                <span>{formatMoney(offer.grandTotal)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Onaylama Paneli */}
        {actionDone === 'approved' ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center shadow-sm">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 size={32} />
            </div>
            <h3 className="text-lg font-bold text-emerald-900">Teklif Başarıyla Onaylandı</h3>
            <p className="text-sm text-emerald-700 mt-1 max-w-md mx-auto">
              Teşekkür ederiz. Onayınız şirketimiz sistemine işlenmiş olup saha ve montaj planlama ekibimiz en kısa sürede sizinle irtibata geçecektir.
            </p>
            {offer.approvedAt && (
              <p className="text-xs text-emerald-600 mt-3">Onay Zamanı: {new Date(offer.approvedAt).toLocaleString('tr-TR')}</p>
            )}
          </div>
        ) : actionDone === 'rejected' ? (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center shadow-sm">
            <div className="w-14 h-14 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-3">
              <XCircle size={32} />
            </div>
            <h3 className="text-lg font-bold text-red-900">Teklif Reddedildi Olarak İşlendi</h3>
            <p className="text-sm text-red-700 mt-1">
              Geri bildiriminiz 3AS Teknoloji satış yöneticisine iletilmiştir.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h4 className="text-sm font-bold text-slate-900 mb-3">Teklif Kararı & Dijital Onay</h4>
            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Onaylayan Yetkili Adı ve Soyadı <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={approverName}
                onChange={(e) => setApproverName(e.target.value)}
                placeholder="Örn: Murat Erdem (Şirket Müdürü)"
                className="w-full sm:w-80 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <button
                onClick={handleApprove}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-md transition"
              >
                <CheckCircle2 size={18} /> Teklifi Onaylıyorum
              </button>
              <button
                onClick={() => setShowRejectModal(true)}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-700 font-semibold text-sm rounded-xl transition border border-slate-200"
              >
                <XCircle size={18} /> Teklifi Reddetmek İstiyorum
              </button>
            </div>
          </div>
        )}

        {/* Modal: Red Sebebi */}
        {showRejectModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
              <h3 className="text-base font-bold text-slate-900 mb-2">Teklifi Reddetme Nedeni</h3>
              <p className="text-xs text-slate-500 mb-4">
                Teklifi revize edebilmemiz veya bütçenize uygun yeni bir çözüm üretebilmemiz için lütfen kısa bir açıklama belirtiniz:
              </p>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={4}
                placeholder="Bütçe yüksek bulundu, kalem sayısı yetersiz vb..."
                className="w-full p-3 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:outline-none mb-4"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowRejectModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Vazgeç
                </button>
                <button
                  onClick={handleReject}
                  className="px-4 py-2 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-lg"
                >
                  Reddi Kaydet
                </button>
              </div>
            </div>
          </div>
        )}

        {onBackToApp && (
          <div className="mt-8 text-center">
            <button
              onClick={onBackToApp}
              className="text-xs font-medium text-slate-500 hover:text-blue-600 underline"
            >
              ← Şirket Personeli Yönetim Paneline Dön
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
