import React, { useState } from 'react';
import { Customer, Offer, Installation, ServiceTicket, Invoice, CommunicationLog } from '../../types';
import { storage } from '../../services/storageService';
import { 
  Plus, Search, Building2, User, Phone, Mail, MapPin, 
  FileText, Wrench, Cpu, Receipt, MessageSquare, ChevronRight,
  ExternalLink, Calendar, ArrowLeft
} from 'lucide-react';

interface CustomerListViewProps {
  customers: Customer[];
  offers: Offer[];
  installations: Installation[];
  services: ServiceTicket[];
  invoices: Invoice[];
  communicationLogs?: CommunicationLog[];
  onSaveCustomers: (customers: Customer[]) => void;
  onNavigateToOffer?: (offerId: string) => void;
  onNavigateToService?: (serviceId: string) => void;
  onNavigateToInstallation?: (installationId: string) => void;
  onNewOfferForCustomer?: (customer: Customer) => void;
  onNewServiceForCustomer?: (customer: Customer) => void;
}

export const CustomerListView: React.FC<CustomerListViewProps> = ({
  customers,
  offers,
  installations,
  services,
  invoices,
  communicationLogs = [],
  onSaveCustomers,
  onNavigateToOffer,
  onNavigateToService,
  onNavigateToInstallation,
  onNewOfferForCustomer,
  onNewServiceForCustomer,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'offers' | 'installations' | 'services' | 'invoices' | 'whatsapp'>('overview');
  const [showNewModal, setShowNewModal] = useState(false);

  // New Customer Form
  const [formData, setFormData] = useState({
    type: 'corporate' as 'individual' | 'corporate',
    name: '',
    contactPerson: '',
    taxOffice: '',
    taxNumber: '',
    tcIdentityNumber: '',
    phone: '',
    secondaryPhone: '',
    email: '',
    address: '',
    city: 'İstanbul',
    district: '',
    notes: '',
  });

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.includes(searchTerm) ||
    (c.contactPerson && c.contactPerson.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (c.taxNumber && c.taxNumber.includes(searchTerm))
  );

  const formatMoney = (val: number) => 
    new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(val);

  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim()) {
      alert('Lütfen müşteri adı ve telefon numarasını giriniz.');
      return;
    }

    const newCust = storage.addCustomer({
      type: formData.type,
      name: formData.name,
      contactPerson: formData.contactPerson,
      taxOffice: formData.taxOffice,
      taxNumber: formData.taxNumber,
      tcIdentityNumber: formData.tcIdentityNumber,
      phone: formData.phone,
      secondaryPhone: formData.secondaryPhone,
      email: formData.email,
      address: formData.address,
      city: formData.city,
      district: formData.district,
      notes: formData.notes,
      tags: [formData.type === 'corporate' ? 'Kurumsal' : 'Bireysel'],
    });

    onSaveCustomers(storage.getCustomers());
    setShowNewModal(false);
    setSelectedCustomer(newCust);
    setFormData({
      type: 'corporate',
      name: '',
      contactPerson: '',
      taxOffice: '',
      taxNumber: '',
      tcIdentityNumber: '',
      phone: '',
      secondaryPhone: '',
      email: '',
      address: '',
      city: 'İstanbul',
      district: '',
      notes: '',
    });
  };

  // Customer Related Data
  const custOffers = selectedCustomer ? offers.filter(o => o.customerId === selectedCustomer.id) : [];
  const custInstallations = selectedCustomer ? installations.filter(i => i.customerId === selectedCustomer.id) : [];
  const custServices = selectedCustomer ? services.filter(s => s.customerId === selectedCustomer.id) : [];
  const custInvoices = selectedCustomer ? invoices.filter(i => i.customerId === selectedCustomer.id) : [];
  const custWhatsApp = selectedCustomer 
    ? communicationLogs.filter(c => c.recipientPhone.includes(selectedCustomer.phone.slice(-7)))
    : [];

  return (
    <div className="space-y-5 pb-12">
      {/* Üst Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Cari unvan, yetkili, vergi no veya tel ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <button
          onClick={() => setShowNewModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition w-full sm:w-auto justify-center"
        >
          <Plus size={16} /> Yeni Cari / Müşteri Kartı
        </button>
      </div>

      {/* Ana Izgara: Sol Liste + Sağ 360° Detay */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Müşteri Listesi (1 Kolon) - Mobilde detay açıksa gizlenebilir */}
        <div className={`bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden ${
          selectedCustomer ? 'hidden lg:block' : 'block'
        }`}>
          <div className="p-3.5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center text-xs font-bold text-slate-700">
            <span>Cari Kartlar ({filteredCustomers.length})</span>
          </div>

          <div className="divide-y divide-slate-100 max-h-[calc(100vh-250px)] overflow-y-auto">
            {filteredCustomers.map(cust => {
              const isSelected = selectedCustomer?.id === cust.id;
              return (
                <div
                  key={cust.id}
                  onClick={() => setSelectedCustomer(cust)}
                  className={`p-3.5 transition cursor-pointer flex items-start justify-between ${
                    isSelected ? 'bg-blue-50/80 border-l-4 border-l-blue-600' : 'hover:bg-slate-50'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      {cust.type === 'corporate' ? (
                        <Building2 size={14} className="text-blue-600 shrink-0" />
                      ) : (
                        <User size={14} className="text-emerald-600 shrink-0" />
                      )}
                      <h4 className="text-xs font-bold text-slate-900">{cust.name}</h4>
                    </div>

                    {cust.contactPerson && (
                      <p className="text-[11px] text-slate-500 mt-0.5 ml-5">{cust.contactPerson}</p>
                    )}

                    <div className="text-[11px] text-slate-600 mt-1 ml-5 flex items-center gap-1">
                      <Phone size={11} className="text-slate-400" /> {cust.phone}
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                      {cust.district ? `${cust.district} / ` : ''}{cust.city}
                    </span>
                  </div>
                </div>
              );
            })}

            {filteredCustomers.length === 0 && (
              <div className="p-8 text-center text-xs text-slate-400">
                Aramaya uygun müşteri bulunamadı.
              </div>
            )}
          </div>
        </div>

        {/* 360 Derece Müşteri Detay Çerçevesi (2 Kolon) */}
        <div className={`lg:col-span-2 ${selectedCustomer ? 'block' : 'hidden lg:block'}`}>
          {selectedCustomer ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              {/* Mobilde Geri Dön Butonu */}
              <div className="p-3 bg-slate-100 border-b border-slate-200 lg:hidden flex items-center justify-between">
                <button
                  onClick={() => setSelectedCustomer(null)}
                  className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700"
                >
                  <ArrowLeft size={16} /> Müşteri Listesine Dön
                </button>
                <span className="text-[11px] text-slate-500 font-medium">360° Cari Görünüm</span>
              </div>

              {/* Müşteri Başlığı */}
              <div className="p-5 border-b border-slate-100 bg-slate-50/60">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                        selectedCustomer.type === 'corporate' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {selectedCustomer.type === 'corporate' ? 'Kurumsal Cari' : 'Bireysel Müşteri'}
                      </span>
                      <span className="text-xs text-slate-400">Kayıt: {new Date(selectedCustomer.createdAt).toLocaleDateString('tr-TR')}</span>
                    </div>
                    <h2 className="text-base font-bold text-slate-900 mt-1">{selectedCustomer.name}</h2>
                    {selectedCustomer.contactPerson && (
                      <p className="text-xs text-slate-600 font-medium">Yetkili: {selectedCustomer.contactPerson}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href={`tel:${selectedCustomer.phone}`}
                      className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl flex items-center gap-1 shadow-xs"
                    >
                      <Phone size={13} /> Ara
                    </a>
                    <a
                      href={`https://wa.me/90${selectedCustomer.phone.replace(/\D/g, '').slice(-10)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1 shadow-xs"
                    >
                      <MessageSquare size={13} /> WhatsApp
                    </a>
                  </div>
                </div>

                {/* Sekmeler */}
                <div className="flex gap-2 overflow-x-auto mt-5 pt-3 border-t border-slate-200/60">
                  {[
                    { id: 'overview', label: 'Genel Bakış' },
                    { id: 'offers', label: `Teklifler (${custOffers.length})` },
                    { id: 'installations', label: `Montajlar (${custInstallations.length})` },
                    { id: 'services', label: `Teknik Servis (${custServices.length})` },
                    { id: 'invoices', label: `Faturalar (${custInvoices.length})` },
                    { id: 'whatsapp', label: `WhatsApp (${custWhatsApp.length})` },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition shrink-0 ${
                        activeTab === tab.id
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-600 hover:bg-slate-200/60'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sekme İçerikleri */}
              <div className="p-5 text-xs">
                {activeTab === 'overview' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5">
                        <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px] block">İletişim & Konum</span>
                        <div><strong>Telefon:</strong> {selectedCustomer.phone}</div>
                        {selectedCustomer.secondaryPhone && <div><strong>2. Telefon:</strong> {selectedCustomer.secondaryPhone}</div>}
                        {selectedCustomer.email && <div><strong>E-posta:</strong> {selectedCustomer.email}</div>}
                        <div><strong>Adres:</strong> {selectedCustomer.address}</div>
                        <div><strong>İl / İlçe:</strong> {selectedCustomer.district} / {selectedCustomer.city}</div>
                      </div>

                      <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5">
                        <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px] block">Mali & Fatura Bilgileri</span>
                        <div><strong>Vergi Dairesi:</strong> {selectedCustomer.taxOffice || '-'}</div>
                        <div><strong>Vergi No:</strong> {selectedCustomer.taxNumber || '-'}</div>
                        <div><strong>T.C. Kimlik No:</strong> {selectedCustomer.tcIdentityNumber || '-'}</div>
                        {selectedCustomer.notes && (
                          <div className="mt-2 pt-2 border-t border-slate-200 text-slate-600">
                            <strong>Özel Not:</strong> {selectedCustomer.notes}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-3 rounded-xl bg-blue-50 border border-blue-100 text-center">
                        <div className="text-[11px] text-blue-700 font-semibold">Toplam Teklif</div>
                        <div className="text-lg font-bold text-blue-950 mt-0.5">{custOffers.length}</div>
                      </div>
                      <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-center">
                        <div className="text-[11px] text-emerald-700 font-semibold">Saha Montajı</div>
                        <div className="text-lg font-bold text-emerald-950 mt-0.5">{custInstallations.length}</div>
                      </div>
                      <div className="p-3 rounded-xl bg-purple-50 border border-purple-100 text-center">
                        <div className="text-[11px] text-purple-700 font-semibold">Servis Kaydı</div>
                        <div className="text-lg font-bold text-purple-950 mt-0.5">{custServices.length}</div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'offers' && (
                  <div className="space-y-2">
                    {custOffers.map(o => (
                      <div key={o.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                        <div>
                          <div className="font-bold text-slate-900">{o.offerNumber} (v{o.currentVersion})</div>
                          <div className="text-slate-500 text-[11px]">{o.serviceCategory}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-blue-700">{formatMoney(o.grandTotal)}</div>
                          <button
                            onClick={() => onNavigateToOffer?.(o.id)}
                            className="text-[11px] text-blue-600 font-semibold hover:underline"
                          >
                            Teklifi Aç →
                          </button>
                        </div>
                      </div>
                    ))}
                    {custOffers.length === 0 && <p className="text-slate-400 py-4 text-center">Teklif bulunamadı.</p>}
                  </div>
                )}

                {activeTab === 'installations' && (
                  <div className="space-y-2">
                    {custInstallations.map(inst => (
                      <div key={inst.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                        <div>
                          <div className="font-bold text-slate-900">{inst.installationNumber} - {inst.projectName}</div>
                          <div className="text-slate-500 text-[11px] flex items-center gap-1">
                            <Calendar size={12} /> {inst.scheduledDate} {inst.scheduledTime}
                          </div>
                        </div>
                        <button
                          onClick={() => onNavigateToInstallation?.(inst.id)}
                          className="text-[11px] text-blue-600 font-semibold hover:underline"
                        >
                          Montaj Detayı →
                        </button>
                      </div>
                    ))}
                    {custInstallations.length === 0 && <p className="text-slate-400 py-4 text-center">Montaj kaydı bulunamadı.</p>}
                  </div>
                )}

                {activeTab === 'services' && (
                  <div className="space-y-2">
                    {custServices.map(srv => (
                      <div key={srv.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                        <div>
                          <div className="font-bold text-slate-900">{srv.ticketNumber} - {srv.brand} {srv.model}</div>
                          <div className="text-slate-500 text-[11px]">{srv.reportedIssue}</div>
                        </div>
                        <button
                          onClick={() => onNavigateToService?.(srv.id)}
                          className="text-[11px] text-blue-600 font-semibold hover:underline"
                        >
                          Servis Kartı →
                        </button>
                      </div>
                    ))}
                    {custServices.length === 0 && <p className="text-slate-400 py-4 text-center">Teknik servis kaydı bulunamadı.</p>}
                  </div>
                )}

                {activeTab === 'invoices' && (
                  <div className="space-y-2">
                    {custInvoices.map(inv => (
                      <div key={inv.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                        <div>
                          <div className="font-bold text-slate-900">{inv.invoiceNumber}</div>
                          <div className="text-slate-500 text-[11px]">Vade: {inv.dueDate}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-slate-900">{formatMoney(inv.grandTotal)}</div>
                          <div className="text-[11px] font-semibold text-emerald-700">Kalan: {formatMoney(inv.remainingAmount)}</div>
                        </div>
                      </div>
                    ))}
                    {custInvoices.length === 0 && <p className="text-slate-400 py-4 text-center">Fatura kaydı bulunamadı.</p>}
                  </div>
                )}

                {activeTab === 'whatsapp' && (
                  <div className="space-y-2">
                    {custWhatsApp.map(w => (
                      <div key={w.id} className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100 text-xs">
                        <div className="flex justify-between text-[10px] text-emerald-800 font-bold mb-1">
                          <span>{w.messageType}</span>
                          <span>{new Date(w.sentAt).toLocaleString('tr-TR')} • {w.status.toUpperCase()}</span>
                        </div>
                        <div className="text-slate-700 whitespace-pre-line">{w.content}</div>
                      </div>
                    ))}
                    {custWhatsApp.length === 0 && <p className="text-slate-400 py-4 text-center">Gönderilmiş WhatsApp iletisi bulunamadı.</p>}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
              Detaylarını ve 360° operasyonel geçmişini görüntülemek için soldan bir müşteri seçiniz.
            </div>
          )}
        </div>
      </div>

      {/* YENİ CARİ KART EKLEME MODALI */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Yeni Cari Kart Oluştur</h3>
              <button onClick={() => setShowNewModal(false)} className="text-slate-400">✕</button>
            </div>

            <form onSubmit={handleCreateCustomer} className="space-y-3 text-xs">
              <div className="flex gap-4 p-2 bg-slate-50 rounded-lg">
                <label className="flex items-center gap-1.5 font-bold text-slate-700 cursor-pointer">
                  <input
                    type="radio"
                    name="type"
                    value="corporate"
                    checked={formData.type === 'corporate'}
                    onChange={() => setFormData({ ...formData, type: 'corporate' })}
                  />
                  Kurumsal Cari
                </label>
                <label className="flex items-center gap-1.5 font-bold text-slate-700 cursor-pointer">
                  <input
                    type="radio"
                    name="type"
                    value="individual"
                    checked={formData.type === 'individual'}
                    onChange={() => setFormData({ ...formData, type: 'individual' })}
                  />
                  Bireysel Müşteri
                </label>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {formData.type === 'corporate' ? 'Firma / Ticari Unvan' : 'Adı Soyadı'} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={formData.type === 'corporate' ? 'Örn: ABC Teknoloji San. Tic. Ltd. Şti.' : 'Örn: Ahmet Kaya'}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              {formData.type === 'corporate' && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Yetkili Kişi</label>
                    <input
                      type="text"
                      value={formData.contactPerson}
                      onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                      placeholder="Örn: Canan Yıldız"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Vergi Dairesi / No</label>
                    <input
                      type="text"
                      value={formData.taxNumber}
                      onChange={(e) => setFormData({ ...formData, taxNumber: e.target.value })}
                      placeholder="Vergi No / Daire"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Telefon <span className="text-red-500">*</span></label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="0532..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">E-posta</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="info@sirket.com"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Adres</label>
                <textarea
                  rows={2}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Cadde, sokak, no..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">İlçe</label>
                  <input
                    type="text"
                    value={formData.district}
                    onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                    placeholder="Örn: Kadıköy"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">İl</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="İstanbul"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                >
                  Cariyi Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
