import React, { useState } from 'react';
import { Lead, LeadStage, LeadSource, User, Customer, Offer } from '../../types';
import { storage } from '../../services/storageService';
import { WhatsAppService } from '../../services/whatsappService';
import { WhatsAppSendModal } from '../../components/common/WhatsAppSendModal';
import { 
  Plus, Search, Filter, Phone, Mail, Calendar, 
  ArrowRight, UserCheck, FileText, CheckCircle2, 
  MessageSquare, Clock, MapPin, Eye
} from 'lucide-react';

interface LeadManagementViewProps {
  leads: Lead[];
  users: User[];
  onSaveLeads: (leads: Lead[]) => void;
  onConvertToCustomer: (lead: Lead) => void;
  onCreateOfferForLead?: (lead: Lead) => void;
}

export const LeadManagementView: React.FC<LeadManagementViewProps> = ({
  leads,
  users,
  onSaveLeads,
  onConvertToCustomer,
  onCreateOfferForLead,
}) => {
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [whatsAppModalData, setWhatsAppModalData] = useState<{
    isOpen: boolean;
    lead: Lead;
    message: string;
  } | null>(null);

  // New Lead Form State
  const [formData, setFormData] = useState({
    fullName: '',
    companyName: '',
    phone: '',
    email: '',
    city: 'İstanbul',
    interestedServiceCategory: 'Güvenlik Kamerası Sistemleri',
    serviceDetails: '',
    message: '',
    source: 'Web Sitesi' as LeadSource,
    assignedUserId: users[1]?.id || users[0]?.id || '',
    budgetEstimate: 25000,
  });

  const stages: { id: LeadStage; label: string; color: string }[] = [
    { id: 'new', label: 'Yeni Lead', color: 'border-t-blue-500' },
    { id: 'contacted', label: 'İletişime Geçildi', color: 'border-t-indigo-500' },
    { id: 'discovery_scheduled', label: 'Keşif Planlandı', color: 'border-t-amber-500' },
    { id: 'offer_preparing', label: 'Teklif Hazırlanıyor', color: 'border-t-purple-500' },
    { id: 'offer_sent', label: 'Teklif Gönderildi', color: 'border-t-cyan-500' },
    { id: 'won', label: 'Kazanıldı', color: 'border-t-emerald-500' },
    { id: 'lost', label: 'Kaybedildi', color: 'border-t-slate-400' },
  ];

  const filteredLeads = leads.filter(l => {
    const matchSearch = 
      l.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (l.companyName && l.companyName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      l.phone.includes(searchTerm) ||
      l.interestedServiceCategory.toLowerCase().includes(searchTerm.toLowerCase());
    const matchSource = sourceFilter === 'all' || l.source === sourceFilter;
    return matchSearch && matchSource;
  });

  const handleStageChange = (leadId: string, newStage: LeadStage) => {
    const updated = leads.map(l => {
      if (l.id === leadId) {
        return { ...l, stage: newStage, updatedAt: new Date().toISOString() };
      }
      return l;
    });
    onSaveLeads(updated);
    if (selectedLead && selectedLead.id === leadId) {
      setSelectedLead({ ...selectedLead, stage: newStage });
    }
  };

  const handleAddActivity = (leadId: string, summary: string) => {
    if (!summary.trim()) return;
    const currentUser = storage.getCurrentUser();
    const updated = leads.map(l => {
      if (l.id === leadId) {
        const newAct = {
          id: 'act-' + Date.now(),
          leadId,
          userId: currentUser.id,
          userName: currentUser.fullName,
          type: 'note' as const,
          summary,
          createdAt: new Date().toISOString(),
        };
        return { ...l, activities: [newAct, ...l.activities], updatedAt: new Date().toISOString() };
      }
      return l;
    });
    onSaveLeads(updated);
    if (selectedLead && selectedLead.id === leadId) {
      setSelectedLead(updated.find(l => l.id === leadId) || null);
    }
  };

  const handleOpenWhatsAppForLead = (lead: Lead) => {
    const message = WhatsAppService.getMessageContent('LEAD_CUSTOMER_GREETING', undefined, {
      musteri_adi: lead.fullName,
      hizmet_kategorisi: lead.interestedServiceCategory,
    });

    WhatsAppService.openWhatsAppDirect(lead.phone, message);

    setWhatsAppModalData({
      isOpen: true,
      lead,
      message,
    });
  };

  const handleLeadWhatsAppSent = (lead: Lead) => {
    if (lead.stage === 'new') {
      handleStageChange(lead.id, 'contacted');
    }
    handleAddActivity(lead.id, 'Müşteriyle WhatsApp üzerinden doğrudan iletişim sağlandı.');
  };

  const handleCreateLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName.trim() || !formData.phone.trim()) {
      alert('Lütfen ad soyad ve telefon numarasını giriniz.');
      return;
    }

    const assignedUser = users.find(u => u.id === formData.assignedUserId);
    const newLead: Lead = {
      id: 'lead-' + Date.now(),
      fullName: formData.fullName,
      companyName: formData.companyName,
      phone: formData.phone,
      email: formData.email,
      city: formData.city,
      interestedServiceCategory: formData.interestedServiceCategory,
      serviceDetails: formData.serviceDetails,
      message: formData.message,
      source: formData.source,
      stage: 'new',
      assignedUserId: formData.assignedUserId,
      assignedUserName: assignedUser?.fullName,
      budgetEstimate: Number(formData.budgetEstimate) || 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      activities: [
        {
          id: 'act-' + Date.now(),
          leadId: 'lead-' + Date.now(),
          userId: assignedUser?.id || 'usr-1',
          userName: assignedUser?.fullName || 'Sistem',
          type: 'note',
          summary: 'Yeni lead sisteme kaydedildi.',
          createdAt: new Date().toISOString(),
        }
      ],
    };

    const updated = [newLead, ...leads];
    onSaveLeads(updated);
    storage.logAudit('LEAD_CREATED', 'lead', newLead.id, newLead.fullName, null, newLead);
    setShowNewModal(false);
    setFormData({
      fullName: '',
      companyName: '',
      phone: '',
      email: '',
      city: 'İstanbul',
      interestedServiceCategory: 'Güvenlik Kamerası Sistemleri',
      serviceDetails: '',
      message: '',
      source: 'Web Sitesi',
      assignedUserId: users[1]?.id || users[0]?.id || '',
      budgetEstimate: 25000,
    });
  };

  return (
    <div className="space-y-5 pb-12">
      {/* Üst Filtre & Aksiyon Barı */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-72">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Lead adı, firma veya telefon ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white focus:outline-none"
          >
            <option value="all">Tüm Kaynaklar</option>
            <option value="Web Sitesi">Web Sitesi</option>
            <option value="Telefon">Telefon</option>
            <option value="WhatsApp">WhatsApp</option>
            <option value="Google">Google</option>
            <option value="Instagram">Instagram</option>
            <option value="Referans">Referans</option>
            <option value="Manuel">Manuel</option>
          </select>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <div className="bg-slate-100 p-1 rounded-xl flex">
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                viewMode === 'kanban' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'
              }`}
            >
              Kanban Pano
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                viewMode === 'table' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'
              }`}
            >
              Tablo Liste
            </button>
          </div>

          <button
            onClick={() => setShowNewModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
          >
            <Plus size={16} /> Yeni Lead Ekle
          </button>
        </div>
      </div>

      {/* KANBAN GÖRÜNÜMÜ */}
      {viewMode === 'kanban' ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {stages.map(stage => {
            const stageLeads = filteredLeads.filter(l => l.stage === stage.id);
            return (
              <div key={stage.id} className="w-72 shrink-0 bg-slate-100/80 rounded-2xl p-3 border border-slate-200">
                <div className={`border-t-4 ${stage.color} pt-2 mb-3 flex items-center justify-between`}>
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">{stage.label}</h3>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white text-slate-600 border border-slate-200">
                    {stageLeads.length}
                  </span>
                </div>

                <div className="space-y-2.5 max-h-[calc(100vh-280px)] overflow-y-auto">
                  {stageLeads.map(lead => (
                    <div
                      key={lead.id}
                      onClick={() => setSelectedLead(lead)}
                      className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs hover:border-blue-400 hover:shadow-md transition cursor-pointer"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700">
                          {lead.source}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(lead.createdAt).toLocaleDateString('tr-TR')}
                        </span>
                      </div>

                      <h4 className="text-xs font-bold text-slate-900">{lead.fullName}</h4>
                      {lead.companyName && (
                        <p className="text-[11px] text-slate-600 font-medium">{lead.companyName}</p>
                      )}

                      <div className="text-[11px] text-blue-700 font-semibold mt-1">
                        {lead.interestedServiceCategory}
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <span>{lead.assignedUserName || 'Atanmadı'}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenWhatsAppForLead(lead);
                            }}
                            className="p-1 text-emerald-600 hover:bg-emerald-50 rounded transition"
                            title="Müşteriye WhatsApp Mesajı Gönder"
                          >
                            <MessageSquare size={13} />
                          </button>
                        </div>
                        {lead.budgetEstimate ? (
                          <span className="font-bold text-slate-900">
                            {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(lead.budgetEstimate)}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  ))}

                  {stageLeads.length === 0 && (
                    <div className="py-8 text-center text-xs text-slate-400">
                      Bu aşamada lead yok
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLO GÖRÜNÜMÜ */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider border-b border-slate-200 font-bold">
              <tr>
                <th className="py-3 px-4">Müşteri / Firma</th>
                <th className="py-3 px-4">İletişim</th>
                <th className="py-3 px-4">Hizmet Alanı</th>
                <th className="py-3 px-4">Kaynak</th>
                <th className="py-3 px-4">Aşama</th>
                <th className="py-3 px-4">Sorumlu</th>
                <th className="py-3 px-4 text-right">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLeads.map(lead => (
                <tr key={lead.id} className="hover:bg-slate-50 transition">
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-slate-900">{lead.fullName}</div>
                    {lead.companyName && <div className="text-[11px] text-slate-500">{lead.companyName}</div>}
                  </td>
                  <td className="py-3.5 px-4 text-slate-600">
                    <div>{lead.phone}</div>
                    {lead.email && <div className="text-[11px] text-slate-400">{lead.email}</div>}
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-blue-700">
                    {lead.interestedServiceCategory}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                      {lead.source}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <select
                      value={lead.stage}
                      onChange={(e) => handleStageChange(lead.id, e.target.value as LeadStage)}
                      className="text-xs font-semibold px-2 py-1 rounded-lg border border-slate-200 bg-white"
                    >
                      {stages.map(s => (
                        <option key={s.id} value={s.id}>{s.label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="py-3.5 px-4 text-slate-700 font-medium">
                    {lead.assignedUserName || '-'}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenWhatsAppForLead(lead)}
                        className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                        title="Müşteriye WhatsApp Mesajı Gönder"
                      >
                        <MessageSquare size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedLead(lead)}
                        className="px-2.5 py-1 text-xs font-bold text-blue-600 hover:bg-blue-50 rounded-lg"
                      >
                        İncele
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* LEAD DETAY MODALI */}
      {selectedLead && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4 mb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                  Lead Detayı • {selectedLead.source}
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-1">{selectedLead.fullName}</h3>
                {selectedLead.companyName && <p className="text-xs text-slate-500">{selectedLead.companyName}</p>}
              </div>
              <button
                onClick={() => setSelectedLead(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            {/* Hızlı Dönüşüm Butonları */}
            <div className="flex flex-wrap gap-2 p-3 bg-blue-50/60 rounded-xl border border-blue-100 mb-5">
              <button
                type="button"
                onClick={() => handleOpenWhatsAppForLead(selectedLead)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg shadow-xs hover:bg-emerald-700 transition"
                title="Müşteriye doğrudan WhatsApp üzerinden mesaj yaz"
              >
                <MessageSquare size={14} /> WhatsApp ile Yaz
              </button>
              <button
                type="button"
                onClick={() => {
                  onConvertToCustomer(selectedLead);
                  setSelectedLead(null);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-blue-200 text-blue-800 text-xs font-bold rounded-lg shadow-xs hover:bg-blue-100"
              >
                <UserCheck size={14} /> Müşteriye Dönüştür
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onCreateOfferForLead) onCreateOfferForLead(selectedLead);
                  setSelectedLead(null);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg shadow-xs hover:bg-blue-700"
              >
                <FileText size={14} /> Teklif Oluştur
              </button>
              <button
                type="button"
                onClick={() => {
                  handleStageChange(selectedLead.id, 'discovery_scheduled');
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-100"
              >
                <Calendar size={14} /> Keşif Planlandı Yap
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs mb-5">
              <div className="space-y-1.5">
                <span className="text-slate-400 font-semibold block">İletişim</span>
                <div className="flex items-center gap-2 font-semibold text-slate-800">
                  <Phone size={14} className="text-slate-400" /> {selectedLead.phone}
                </div>
                {selectedLead.email && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <Mail size={14} className="text-slate-400" /> {selectedLead.email}
                  </div>
                )}
                {selectedLead.city && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <MapPin size={14} className="text-slate-400" /> {selectedLead.city}
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <span className="text-slate-400 font-semibold block">Talep Kapsamı</span>
                <div className="font-bold text-blue-700">{selectedLead.interestedServiceCategory}</div>
                {selectedLead.budgetEstimate && (
                  <div className="text-slate-700">
                    Tahmini Bütçe: <strong>{new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(selectedLead.budgetEstimate)}</strong>
                  </div>
                )}
                <div className="text-slate-500">
                  Sorumlu: <strong>{selectedLead.assignedUserName || 'Atanmadı'}</strong>
                </div>
              </div>
            </div>

            {selectedLead.message && (
              <div className="mb-5 p-3 bg-slate-50 rounded-xl text-xs text-slate-700 border border-slate-100">
                <strong className="block text-slate-900 mb-1">Gelen Mesaj / Not:</strong>
                {selectedLead.message}
              </div>
            )}

            {/* Aktivite Geçmişi & Not Ekleme */}
            <div className="border-t border-slate-100 pt-4">
              <h4 className="text-xs font-bold text-slate-900 mb-3 flex items-center gap-1.5">
                <Clock size={14} className="text-blue-600" /> Aktivite Geçmişi ve Notlar
              </h4>

              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  id="actNoteInput"
                  placeholder="Lead hakkında görüşme notu ekleyin..."
                  className="flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleAddActivity(selectedLead.id, (e.target as HTMLInputElement).value);
                      (e.target as HTMLInputElement).value = '';
                    }
                  }}
                />
                <button
                  onClick={() => {
                    const input = document.getElementById('actNoteInput') as HTMLInputElement;
                    if (input) {
                      handleAddActivity(selectedLead.id, input.value);
                      input.value = '';
                    }
                  }}
                  className="px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-lg"
                >
                  Ekle
                </button>
              </div>

              <div className="space-y-2 max-h-44 overflow-y-auto">
                {selectedLead.activities?.map(act => (
                  <div key={act.id} className="p-2.5 bg-slate-50 rounded-lg text-xs border border-slate-100">
                    <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                      <span className="font-bold text-slate-700">{act.userName}</span>
                      <span>{new Date(act.createdAt).toLocaleString('tr-TR')}</span>
                    </div>
                    <div className="text-slate-800 font-medium">{act.summary}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* YENİ LEAD EKLEME MODALI */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Yeni Potansiyel Müşteri (Lead)</h3>
              <button onClick={() => setShowNewModal(false)} className="text-slate-400">✕</button>
            </div>

            <form onSubmit={handleCreateLead} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Ad Soyad / Yetkili <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="Örn: Selim Demir"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Firma / Kurum Adı</label>
                  <input
                    type="text"
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    placeholder="Örn: Demir Lojistik Ltd."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
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
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">İlgilenilen Hizmet</label>
                  <select
                    value={formData.interestedServiceCategory}
                    onChange={(e) => setFormData({ ...formData, interestedServiceCategory: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="Güvenlik Kamerası Sistemleri">Güvenlik Kamerası Sistemleri</option>
                    <option value="Hırsız Alarm Sistemleri">Hırsız Alarm Sistemleri</option>
                    <option value="Yangın Algılama Sistemleri">Yangın Algılama Sistemleri</option>
                    <option value="Akıllı Ev ve Ofis Sistemleri">Akıllı Ev ve Ofis Sistemleri</option>
                    <option value="Network / Ağ Kurulumu">Network / Ağ Kurulumu</option>
                    <option value="Anten ve Uydu Sistemleri">Anten ve Uydu Sistemleri</option>
                    <option value="Profesyonel Ses Sistemleri">Profesyonel Ses Sistemleri</option>
                    <option value="Barkod ve Adisyon Sistemleri">Barkod ve Adisyon Sistemleri</option>
                    <option value="Bilgisayar Tamir ve IT Hizmetleri">Bilgisayar Tamir ve IT Hizmetleri</option>
                    <option value="Web Sitesi Tasarımı">Web Sitesi Tasarımı</option>
                    <option value="Kurumsal Kimlik Tasarımı">Kurumsal Kimlik Tasarımı</option>
                    <option value="Özel Yazılım Hizmetleri">Özel Yazılım Hizmetleri</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Lead Kaynağı</label>
                  <select
                    value={formData.source}
                    onChange={(e) => setFormData({ ...formData, source: e.target.value as LeadSource })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="Web Sitesi">Web Sitesi</option>
                    <option value="Telefon">Telefon</option>
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="Google">Google</option>
                    <option value="Instagram">Instagram</option>
                    <option value="Referans">Referans</option>
                    <option value="Manuel">Manuel</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Talebin Detayı / Mesaj</label>
                <textarea
                  rows={3}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Müşterinin istediği kamera adedi veya arıza açıklaması..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
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
                  Leadi Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* WHATSAPP GÖNDERİM MODALI */}
      {whatsAppModalData && (
        <WhatsAppSendModal
          isOpen={whatsAppModalData.isOpen}
          title={`Müşteri WhatsApp İletişimi: ${whatsAppModalData.lead.fullName}`}
          recipientName={whatsAppModalData.lead.fullName}
          recipientPhone={whatsAppModalData.lead.phone}
          initialMessage={whatsAppModalData.message}
          relatedEntityType="lead"
          relatedEntityId={whatsAppModalData.lead.id}
          relatedEntityNumber={whatsAppModalData.lead.fullName}
          onClose={() => setWhatsAppModalData(null)}
          onSent={() => handleLeadWhatsAppSent(whatsAppModalData.lead)}
        />
      )}
    </div>
  );
};
