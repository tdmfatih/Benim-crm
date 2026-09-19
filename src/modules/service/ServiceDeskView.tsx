import React, { useState } from 'react';
import { ServiceTicket, ServiceTicketStatus, Customer, User, ServiceOperation } from '../../types';
import { storage } from '../../services/storageService';
import { PDFService } from '../../services/pdfService';
import { WhatsAppService } from '../../services/whatsappService';
import { AutomationEngine } from '../../services/automationEngine';
import { 
  Plus, Search, Cpu, Wrench, Printer, MessageSquare, 
  ExternalLink, Copy, CheckCircle2, Clock, AlertTriangle, 
  Laptop, Trash2, CheckSquare, DollarSign, ArrowLeft,
  Camera, Image as ImageIcon, Upload, Eye, X, FileText
} from 'lucide-react';

interface ServiceDeskViewProps {
  services: ServiceTicket[];
  customers: Customer[];
  users: User[];
  onSaveServices: (services: ServiceTicket[]) => void;
  onOpenPublicService: (token: string) => void;
  onCreateInvoiceFromService: (ticket: ServiceTicket) => void;
}

export const ServiceDeskView: React.FC<ServiceDeskViewProps> = ({
  services,
  customers,
  users,
  onSaveServices,
  onOpenPublicService,
  onCreateInvoiceFromService,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedTicket, setSelectedTicket] = useState<ServiceTicket | null>(services[0] || null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // New operation inputs in detail view
  const [newOpDesc, setNewOpDesc] = useState('');
  const [newOpParts, setNewOpParts] = useState(0);
  const [newOpLabor, setNewOpLabor] = useState(0);

  // Photo evidence state
  const [photoStage, setPhotoStage] = useState<'intake' | 'repair' | 'delivered'>('intake');
  const [photoCaption, setPhotoCaption] = useState('');
  const [previewPhoto, setPreviewPhoto] = useState<{ url: string; caption?: string; stage?: string } | null>(null);

  const formatMoney = (val: number) => 
    new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(val);

  const filteredServices = services.filter(s => {
    const matchSearch = 
      s.ticketNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.serialNumber && s.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchStatus = statusFilter === 'all' || s.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleCopyLink = (token: string) => {
    const fullUrl = `${window.location.origin}/service-approval/${token}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const handleStatusChange = (ticketId: string, newStatus: ServiceTicketStatus) => {
    const updated = services.map(s => {
      if (s.id === ticketId) {
        return { ...s, status: newStatus, updatedAt: new Date().toISOString() };
      }
      return s;
    });
    onSaveServices(updated);
    if (selectedTicket?.id === ticketId) {
      setSelectedTicket({ ...selectedTicket, status: newStatus });
    }
  };

  // WhatsApp Mesaj Gönderimleri (3 Farklı Senaryo)
  const handleSendWhatsAppNotification = async (ticket: ServiceTicket, type: 'intake' | 'diagnosis' | 'ready') => {
    const approvalUrl = `${window.location.origin}/service-approval/${ticket.approvalToken}`;

    if (type === 'intake') {
      await WhatsAppService.sendMessage({
        recipientName: ticket.customerName,
        recipientPhone: ticket.customerPhone,
        templateCode: 'SERVICE_INTAKE_CONFIRMATION',
        variables: {
          musteri_adi: ticket.customerName,
          servis_no: ticket.ticketNumber,
          cihaz_tanimi: `${ticket.brand} ${ticket.model} (${ticket.deviceType})`,
          sikayet: ticket.reportedIssue,
        },
        relatedEntity: { type: 'service', id: ticket.id, number: ticket.ticketNumber },
      });
      alert(`Servis kabul teyit mesajı ${ticket.customerName} müşterisine WhatsApp ile iletildi.`);
    } else if (type === 'diagnosis') {
      await WhatsAppService.sendMessage({
        recipientName: ticket.customerName,
        recipientPhone: ticket.customerPhone,
        templateCode: 'SERVICE_DIAGNOSIS_COST_APPROVAL',
        variables: {
          musteri_adi: ticket.customerName,
          servis_no: ticket.ticketNumber,
          ariza_tespiti: ticket.diagnosticNotes || 'Cihaz bileşenleri arızalı.',
          toplam_maliyet: formatMoney(ticket.totalCost),
          onay_linki: approvalUrl,
        },
        relatedEntity: { type: 'service', id: ticket.id, number: ticket.ticketNumber },
      });
      handleStatusChange(ticket.id, 'waiting_approval');
      alert(`Arıza tespiti ve güvenli onay bağlantısı WhatsApp ile gönderildi.`);
    } else if (type === 'ready') {
      await WhatsAppService.sendMessage({
        recipientName: ticket.customerName,
        recipientPhone: ticket.customerPhone,
        templateCode: 'SERVICE_READY_FOR_PICKUP',
        variables: {
          musteri_adi: ticket.customerName,
          servis_no: ticket.ticketNumber,
          kalan_bakiye: formatMoney(ticket.remainingBalance),
        },
        relatedEntity: { type: 'service', id: ticket.id, number: ticket.ticketNumber },
      });
      handleStatusChange(ticket.id, 'ready');
      alert(`Cihaz teslime hazır bilgilendirmesi WhatsApp ile müşteriye ulaştırıldı.`);
    }
  };

  const handleAddOperation = (ticketId: string) => {
    if (!newOpDesc.trim()) return;

    const opTotal = Number(newOpParts) + Number(newOpLabor);
    const newOp: ServiceOperation = {
      id: 'op-' + Date.now(),
      description: newOpDesc,
      partsCost: Number(newOpParts),
      laborCost: Number(newOpLabor),
      totalCost: opTotal,
      isApprovedByCustomer: false,
    };

    const updated = services.map(s => {
      if (s.id === ticketId) {
        const operations = [...s.operations, newOp];
        const totalPartsCost = operations.reduce((sum, o) => sum + o.partsCost, 0);
        const totalLaborCost = operations.reduce((sum, o) => sum + o.laborCost, 0);
        const totalCost = totalPartsCost + totalLaborCost;
        const remainingBalance = totalCost - s.depositPaid;

        return {
          ...s,
          operations,
          totalPartsCost,
          totalLaborCost,
          totalCost,
          remainingBalance,
          updatedAt: new Date().toISOString(),
        };
      }
      return s;
    });

    onSaveServices(updated);
    if (selectedTicket?.id === ticketId) {
      setSelectedTicket(updated.find(s => s.id === ticketId) || null);
    }
    setNewOpDesc('');
    setNewOpParts(0);
    setNewOpLabor(0);
  };

  const handleAddPhoto = (ticketId: string, url: string, caption: string, stage: 'intake' | 'repair' | 'delivered') => {
    const newPhoto = {
      id: 'photo-' + Date.now(),
      url,
      caption: caption || undefined,
      stage,
      uploadedAt: new Date().toISOString(),
    };

    const updated = services.map(s => {
      if (s.id === ticketId) {
        const servicePhotos = [...(s.servicePhotos || []), newPhoto];
        return {
          ...s,
          servicePhotos,
          updatedAt: new Date().toISOString(),
        };
      }
      return s;
    });

    onSaveServices(updated);
    storage.saveServiceTickets(updated);
    if (selectedTicket?.id === ticketId) {
      setSelectedTicket(updated.find(s => s.id === ticketId) || null);
    }
    setPhotoCaption('');
  };

  const handleDeletePhoto = (ticketId: string, photoId: string) => {
    const updated = services.map(s => {
      if (s.id === ticketId) {
        const servicePhotos = (s.servicePhotos || []).filter(p => p.id !== photoId);
        return {
          ...s,
          servicePhotos,
          updatedAt: new Date().toISOString(),
        };
      }
      return s;
    });

    onSaveServices(updated);
    storage.saveServiceTickets(updated);
    if (selectedTicket?.id === ticketId) {
      setSelectedTicket(updated.find(s => s.id === ticketId) || null);
    }
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
              placeholder="Servis No, müşteri, marka veya seri no..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white focus:outline-none"
          >
            <option value="all">Tüm Aşamalar</option>
            <option value="received">Cihaz Alındı</option>
            <option value="diagnosing">Arıza Tespiti Yapılıyor</option>
            <option value="waiting_approval">Onay Bekliyor</option>
            <option value="approved">Onaylandı</option>
            <option value="in_repair">Tamir Ediliyor</option>
            <option value="ready">Teslime Hazır</option>
            <option value="delivered">Teslim Edildi</option>
          </select>
        </div>

        <button
          onClick={() => setShowNewModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-xs transition w-full sm:w-auto justify-center"
        >
          <Plus size={16} /> Yeni Cihaz Kabul / Servis Fişi
        </button>
      </div>

      {/* İki Kolonlu Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Servis Listesi - Mobilde detay seçiliyse gizlenebilir */}
        <div className={`bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden ${
          selectedTicket ? 'hidden lg:block' : 'block'
        }`}>
          <div className="p-3.5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center text-xs font-bold text-slate-700">
            <span>Teknik Servis Masası ({filteredServices.length})</span>
          </div>

          <div className="divide-y divide-slate-100 max-h-[calc(100vh-250px)] overflow-y-auto">
            {filteredServices.map(s => {
              const isSelected = selectedTicket?.id === s.id;
              return (
                <div
                  key={s.id}
                  onClick={() => setSelectedTicket(s)}
                  className={`p-3.5 transition cursor-pointer ${
                    isSelected ? 'bg-purple-50/80 border-l-4 border-l-purple-600' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-purple-700">{s.ticketNumber}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      s.status === 'ready' ? 'bg-emerald-100 text-emerald-800' :
                      s.status === 'delivered' ? 'bg-slate-100 text-slate-700' :
                      s.status === 'waiting_approval' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {s.status === 'received' ? 'Cihaz Alındı' :
                       s.status === 'diagnosing' ? 'Teşhis Ediliyor' :
                       s.status === 'waiting_approval' ? 'Onay Bekliyor' :
                       s.status === 'approved' ? 'Onaylandı' :
                       s.status === 'ready' ? 'Teslime Hazır' :
                       s.status === 'delivered' ? 'Teslim Edildi' : s.status}
                    </span>
                  </div>

                  <div className="text-xs font-bold text-slate-900">{s.customerName}</div>
                  <div className="text-[11px] text-slate-600 flex items-center gap-1 mt-0.5">
                    <Laptop size={12} className="text-purple-600" />
                    <strong>{s.brand} {s.model}</strong> ({s.deviceType})
                  </div>

                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-900">{formatMoney(s.totalCost)}</span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(s.createdAt).toLocaleDateString('tr-TR')}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Servis Detayı & WhatsApp Eylemleri */}
        <div className={`lg:col-span-2 ${selectedTicket ? 'block' : 'hidden lg:block'}`}>
          {selectedTicket ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              {/* Mobilde Geri Dön Butonu */}
              <div className="p-3 bg-slate-100 border-b border-slate-200 lg:hidden flex items-center justify-between">
                <button
                  onClick={() => setSelectedTicket(null)}
                  className="flex items-center gap-1.5 text-xs font-bold text-purple-600 hover:text-purple-700"
                >
                  <ArrowLeft size={16} /> Servis Listesine Dön
                </button>
                <span className="text-[11px] text-slate-500 font-semibold">{selectedTicket.ticketNumber}</span>
              </div>
              {/* Başlık ve Butonlar */}
              <div className="p-5 border-b border-slate-100 bg-slate-50/60 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-purple-900">{selectedTicket.ticketNumber}</span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                      {selectedTicket.deviceType}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 mt-1">
                    {selectedTicket.brand} {selectedTicket.model} • {selectedTicket.customerName}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Seri No: {selectedTicket.serialNumber || '-'} • Giriş: {new Date(selectedTicket.createdAt).toLocaleDateString('tr-TR')}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => PDFService.printServiceTicket(selectedTicket)}
                    className="px-3 py-1.5 bg-white border border-purple-300 hover:bg-purple-50 text-purple-700 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs"
                    title="Resmi Servis & Onarım Raporunu Yazdır (Fotoğraflı)"
                  >
                    <Printer size={14} /> Servis Formu (A4)
                  </button>

                  <button
                    onClick={() => PDFService.printServiceIntakeReceipt(selectedTicket)}
                    className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs"
                    title="Cihaz Kabul & Teslim Alma Makbuzu (Müşteri Nüshası)"
                  >
                    <FileText size={14} /> Kabul Makbuzu (A4)
                  </button>

                  <select
                    value={selectedTicket.status}
                    onChange={(e) => handleStatusChange(selectedTicket.id, e.target.value as ServiceTicketStatus)}
                    className="px-3 py-1.5 bg-purple-50 text-purple-900 font-bold text-xs rounded-xl border border-purple-200"
                  >
                    <option value="received">Cihaz Alındı</option>
                    <option value="diagnosing">Teşhis Ediliyor</option>
                    <option value="waiting_approval">Onay Bekliyor</option>
                    <option value="approved">Onaylandı</option>
                    <option value="in_repair">Tamir Ediliyor</option>
                    <option value="ready">Teslime Hazır</option>
                    <option value="delivered">Teslim Edildi</option>
                  </select>
                </div>
              </div>

              {/* WhatsApp Entegrasyon Butonları Şeridi */}
              <div className="p-3.5 bg-emerald-50/80 border-b border-emerald-100 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs text-emerald-900 font-bold">
                  <MessageSquare size={16} className="text-emerald-700" />
                  WhatsApp Bildirim İstasyonu:
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    onClick={() => handleSendWhatsAppNotification(selectedTicket, 'intake')}
                    className="px-2.5 py-1 bg-white hover:bg-emerald-100 text-emerald-800 text-[11px] font-bold rounded-lg border border-emerald-300 shadow-xs"
                  >
                    1. Kabul Mesajı
                  </button>
                  <button
                    onClick={() => handleSendWhatsAppNotification(selectedTicket, 'diagnosis')}
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-lg shadow-xs"
                  >
                    2. Arıza & Onay Linki Gönder
                  </button>
                  <button
                    onClick={() => handleSendWhatsAppNotification(selectedTicket, 'ready')}
                    className="px-2.5 py-1 bg-white hover:bg-emerald-100 text-emerald-800 text-[11px] font-bold rounded-lg border border-emerald-300 shadow-xs"
                  >
                    3. Teslime Hazır Mesajı
                  </button>
                </div>
              </div>

              {/* Müşteri Onay Ekranı Önizleme Linki */}
              <div className="p-3 bg-purple-50/60 border-b border-purple-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 text-purple-900">
                  <span className="font-bold text-purple-700">Müşteri Online Servis Onay Linki:</span>
                  <span className="text-[11px] font-mono bg-white px-2 py-0.5 rounded border border-purple-200">
                    /service-approval/{selectedTicket.approvalToken}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopyLink(selectedTicket.secureApprovalToken || selectedTicket.approvalToken || '')}
                    className="px-2.5 py-1 bg-white hover:bg-purple-100 text-purple-700 text-[11px] font-bold rounded-lg border border-purple-300 flex items-center gap-1"
                  >
                    <Copy size={12} /> {copiedToken === (selectedTicket.secureApprovalToken || selectedTicket.approvalToken) ? 'Kopyalandı!' : 'Linki Kopyala'}
                  </button>
                  <button
                    onClick={() => onOpenPublicService(selectedTicket.secureApprovalToken || selectedTicket.approvalToken || '')}
                    className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-bold rounded-lg flex items-center gap-1"
                  >
                    <ExternalLink size={12} /> Müşteri Gözüyle Aç
                  </button>
                </div>
              </div>

              {/* Servis Detayı */}
              <div className="p-5 space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                    <span className="font-bold text-slate-400 uppercase text-[10px] block">Müşteri Şikayeti</span>
                    <p className="text-slate-800 font-medium">{selectedTicket.reportedIssue}</p>
                    <div className="pt-2 text-slate-500">
                      <strong>Teslim Alınan Aksesuarlar:</strong> {selectedTicket.accessoriesDelivered.join(', ') || 'Yok'}
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                    <span className="font-bold text-slate-400 uppercase text-[10px] block">Teknisyen Teşhisi / Durum</span>
                    <p className="text-slate-800 font-medium">{selectedTicket.diagnosticNotes || 'İnceleme devam ediyor.'}</p>
                    <div className="pt-2 text-slate-500">
                      <strong>Atanan Teknisyen:</strong> {selectedTicket.assignedTechnicianName || 'Henüz atanmadı'}
                    </div>
                  </div>
                </div>

                {/* Yapılan İşlemler ve Parça Kalemleri */}
                <div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                    Uygulanan Onarım İşlemleri & Parça Maliyetleri
                  </h4>

                  <div className="border border-slate-200 rounded-xl overflow-hidden mb-3">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                        <tr>
                          <th className="py-2 px-3">İşlem Açıklaması</th>
                          <th className="py-2 px-3 text-right">Yedek Parça</th>
                          <th className="py-2 px-3 text-right">İşçilik</th>
                          <th className="py-2 px-3 text-right">Toplam</th>
                          <th className="py-2 px-3 text-center">Müşteri Onayı</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedTicket.operations.map(op => (
                          <tr key={op.id}>
                            <td className="py-2.5 px-3 font-semibold text-slate-900">{op.description}</td>
                            <td className="py-2.5 px-3 text-right">{formatMoney(op.partsCost)}</td>
                            <td className="py-2.5 px-3 text-right">{formatMoney(op.laborCost)}</td>
                            <td className="py-2.5 px-3 text-right font-bold text-slate-900">{formatMoney(op.totalCost)}</td>
                            <td className="py-2.5 px-3 text-center">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                op.isApprovedByCustomer ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                              }`}>
                                {op.isApprovedByCustomer ? '✓ Onaylandı' : 'Bekliyor'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Yeni İşlem Ekleme Çubuğu */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center gap-2">
                    <input
                      type="text"
                      placeholder="Yeni işlem / parça tanımı (Örn: 2TB HDD Değişimi)..."
                      value={newOpDesc}
                      onChange={(e) => setNewOpDesc(e.target.value)}
                      className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                    />
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        placeholder="Parça (TL)"
                        value={newOpParts || ''}
                        onChange={(e) => setNewOpParts(Number(e.target.value))}
                        className="w-24 px-2 py-1.5 border border-slate-300 rounded-lg text-xs text-right"
                      />
                      <input
                        type="number"
                        placeholder="İşçilik (TL)"
                        value={newOpLabor || ''}
                        onChange={(e) => setNewOpLabor(Number(e.target.value))}
                        className="w-24 px-2 py-1.5 border border-slate-300 rounded-lg text-xs text-right"
                      />
                      <button
                        onClick={() => handleAddOperation(selectedTicket.id)}
                        className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg text-xs"
                      >
                        Kalemi Ekle
                      </button>
                    </div>
                  </div>
                </div>

                {/* FOTOĞRAFLI KANIT & SERVİS GÖRSELLERİ (Giriş Kabul, Onarım ve Teslimat Kanıtı) */}
                <div className="pt-2 border-t border-slate-100">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                        <Camera size={15} className="text-purple-600" /> Fotoğraflı Kanıt & Servis Görselleri
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Cihaz teslim alırken hasar/çizik kanıtı, onarım süreci veya teslimat anı fotoğrafları ekleyin. A4 Servis Fişinde resmi kanıt olarak basılır.
                      </p>
                    </div>
                    <span className="text-[11px] font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg self-start sm:self-auto border border-purple-100">
                      {selectedTicket.servicePhotos?.length || 0} Fotoğraf Kayıtlı
                    </span>
                  </div>

                  {/* Yeni Fotoğraf Yükleme Çubuğu */}
                  <div className="p-3 bg-purple-50/40 rounded-xl border border-purple-100 mb-4 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={photoStage}
                        onChange={(e) => setPhotoStage(e.target.value as any)}
                        className="px-2.5 py-1.5 bg-white border border-purple-200 rounded-lg text-xs font-bold text-purple-900"
                      >
                        <option value="intake">📸 Cihaz Giriş / Kabul Kanıtı (Hasar/Çizik)</option>
                        <option value="repair">🔧 Onarım / Parça Değişim Kanıtı</option>
                        <option value="delivered">✅ Teslimat & Çalışır Durum Kanıtı</option>
                      </select>

                      <input
                        type="text"
                        placeholder="Fotoğraf açıklaması (Örn: Ekran sol üst çatlak)..."
                        value={photoCaption}
                        onChange={(e) => setPhotoCaption(e.target.value)}
                        className="flex-1 min-w-[200px] px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                      />

                      <div className="flex items-center gap-1.5">
                        <label className="cursor-pointer px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-2xs">
                          <Camera size={13} /> Fotoğraf Çek / Yükle
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = (event) => {
                                  if (event.target?.result) {
                                    handleAddPhoto(
                                      selectedTicket.id, 
                                      event.target.result as string, 
                                      photoCaption, 
                                      photoStage
                                    );
                                  }
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Fotoğraflar Izgarası */}
                  {selectedTicket.servicePhotos && selectedTicket.servicePhotos.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {selectedTicket.servicePhotos.map((photo) => {
                        const stageBadge = 
                          photo.stage === 'intake' ? { label: 'Giriş / Hasar', bg: 'bg-amber-100 text-amber-800' } :
                          photo.stage === 'repair' ? { label: 'Onarım / Parça', bg: 'bg-blue-100 text-blue-800' } :
                          { label: 'Teslim Edildi', bg: 'bg-emerald-100 text-emerald-800' };

                        return (
                          <div 
                            key={photo.id}
                            className="group relative bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs hover:shadow-md transition flex flex-col"
                          >
                            <div 
                              onClick={() => setPreviewPhoto({ url: photo.url, caption: photo.caption, stage: photo.stage })}
                              className="w-full h-28 bg-slate-100 relative cursor-pointer overflow-hidden"
                            >
                              <img 
                                src={photo.url} 
                                alt={photo.caption || 'Servis kanıt fotoğrafı'} 
                                className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                              />
                              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition">
                                <Eye size={18} />
                              </div>
                              <span className={`absolute top-1.5 left-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xs ${stageBadge.bg}`}>
                                {stageBadge.label}
                              </span>
                            </div>

                            <div className="p-2 flex-1 flex flex-col justify-between bg-white">
                              <p className="text-[11px] font-medium text-slate-700 line-clamp-2" title={photo.caption}>
                                {photo.caption || 'Açıklama belirtilmedi'}
                              </p>
                              <div className="mt-1 flex items-center justify-between pt-1 border-t border-slate-50">
                                <span className="text-[9px] text-slate-400">
                                  {new Date(photo.uploadedAt).toLocaleDateString('tr-TR')}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (confirm('Bu kanıt fotoğrafını silmek istediğinize emin misiniz?')) {
                                      handleDeletePhoto(selectedTicket.id, photo.id);
                                    }
                                  }}
                                  className="text-slate-400 hover:text-red-500 p-1"
                                  title="Fotoğrafı Sil"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 text-center">
                      <Camera size={22} className="mx-auto text-slate-300 mb-1" />
                      <p className="text-xs font-medium text-slate-500">Henüz fotoğraflı kanıt eklenmedi.</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Cihaz teslim alırken veya teslim ederken telefonunuzun kamerasıyla çekip anında yükleyebilirsiniz.
                      </p>
                    </div>
                  )}
                </div>

                {/* Finansal Özet & Fatura Kes Butonu */}
                <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div className="text-slate-500">
                    Alınan Kapora: <strong>{formatMoney(selectedTicket.depositPaid)}</strong>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-xs text-slate-500">Kalan Tahsilat:</div>
                      <div className="text-base font-extrabold text-purple-900">
                        {formatMoney(selectedTicket.remainingBalance)}
                      </div>
                    </div>

                    <button
                      onClick={() => onCreateInvoiceFromService(selectedTicket)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-xs"
                    >
                      Servis Faturası Kes →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
              Görüntülemek için soldan bir servis kaydı seçiniz.
            </div>
          )}
        </div>
      </div>

      {/* YENİ SERVİS KABUL MODALI */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Yeni Teknik Servis Kaydı (Cihaz Kabul)</h3>
              <button onClick={() => setShowNewModal(false)} className="text-slate-400">✕</button>
            </div>

            <NewServiceForm
              customers={customers}
              users={users}
              onClose={() => setShowNewModal(false)}
              onSave={(newTicket) => {
                const updated = [newTicket, ...services];
                onSaveServices(updated);
                setSelectedTicket(newTicket);
                setShowNewModal(false);
                storage.logAudit('SERVICE_INTAKE', 'service', newTicket.id, newTicket.ticketNumber, null, newTicket);
              }}
            />
          </div>
        </div>
      )}

      {/* SERVİS FOTOĞRAFI BÜYÜK ÖNİZLEME MODALI (LIGHTBOX) */}
      {previewPhoto && (
        <div 
          onClick={() => setPreviewPhoto(null)}
          className="fixed inset-0 bg-black/85 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl"
          >
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2">
                <Camera size={16} className="text-purple-600" />
                <span className="font-bold text-slate-900 text-sm">
                  {previewPhoto.stage === 'intake' ? 'Cihaz Giriş & Hasar Kanıtı' :
                   previewPhoto.stage === 'repair' ? 'Onarım & Parça Kanıtı' : 'Teslimat & Çalışır Durum Kanıtı'}
                </span>
              </div>
              <button 
                onClick={() => setPreviewPhoto(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="p-4 flex items-center justify-center bg-slate-900 max-h-[70vh]">
              <img 
                src={previewPhoto.url} 
                alt="Kanıt Fotoğrafı" 
                className="max-h-[60vh] max-w-full object-contain rounded shadow-lg" 
              />
            </div>

            <div className="p-4 bg-white flex items-center justify-between">
              <p className="text-xs text-slate-700 font-medium">
                {previewPhoto.caption ? `Açıklama: ${previewPhoto.caption}` : 'Açıklama belirtilmedi.'}
              </p>
              <button
                onClick={() => setPreviewPhoto(null)}
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

// Alt Form Bileşeni: Yeni Servis Kaydı
interface NewServiceFormProps {
  customers: Customer[];
  users: User[];
  onClose: () => void;
  onSave: (ticket: ServiceTicket) => void;
}

const NewServiceForm: React.FC<NewServiceFormProps> = ({ customers, users, onClose, onSave }) => {
  const [customerId, setCustomerId] = useState(customers[0]?.id || '');
  const [deviceType, setDeviceType] = useState('NVR / Kayıt Cihazı');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [accessories, setAccessories] = useState('Adaptör');
  const [reportedIssue, setReportedIssue] = useState('');
  const [assignedTechId, setAssignedTechId] = useState(users[3]?.id || users[0]?.id || '');
  const [depositPaid, setDepositPaid] = useState(0);
  const [intakePhotos, setIntakePhotos] = useState<Array<{ id: string; url: string; caption?: string; stage: 'intake'; uploadedAt: string }>>([]);

  const selectedCustomer = customers.find(c => c.id === customerId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || !brand.trim() || !reportedIssue.trim()) {
      alert('Lütfen müşteri, marka ve müşteri şikayetini giriniz.');
      return;
    }

    const techUser = users.find(u => u.id === assignedTechId);
    const ticketNumber = `3AS-SRV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newTicket: ServiceTicket = {
      id: 'srv-' + Date.now(),
      ticketNumber,
      customerId: selectedCustomer.id,
      customerName: selectedCustomer.name,
      customerPhone: selectedCustomer.phone,
      customerEmail: selectedCustomer.email,
      deviceType,
      brand,
      model,
      serialNumber,
      accessoriesDelivered: accessories ? accessories.split(',').map(a => a.trim()) : [],
      reportedIssue,
      status: 'received',
      priority: 'normal',
      physicalCondition: 'Normal kullanım izleri mevcut',
      assignedTechnicianId: assignedTechId,
      assignedTechnicianName: techUser?.fullName,
      approvalToken: '3as_srv_' + Math.random().toString(36).substring(2, 10),
      secureApprovalToken: '3as_srv_' + Math.random().toString(36).substring(2, 10),
      photos: [],
      servicePhotos: intakePhotos,
      operations: [],
      totalPartsCost: 0,
      totalLaborCost: 0,
      totalCost: 0,
      depositPaid: Number(depositPaid) || 0,
      remainingBalance: -(Number(depositPaid) || 0),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSave(newTicket);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 text-xs">
      <div>
        <label className="block font-bold text-slate-700 mb-1">Müşteri <span className="text-red-500">*</span></label>
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

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block font-bold text-slate-700 mb-1">Cihaz Türü</label>
          <select
            value={deviceType}
            onChange={(e) => setDeviceType(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
          >
            <option value="NVR / Kayıt Cihazı">NVR / Kayıt Cihazı</option>
            <option value="IP / Analog Kamera">IP / Analog Kamera</option>
            <option value="Alarm Paneli">Alarm Paneli</option>
            <option value="Masaüstü Bilgisayar (PC)">Masaüstü Bilgisayar (PC)</option>
            <option value="Laptop / Dizüstü">Laptop / Dizüstü</option>
            <option value="Sunucu / Server">Sunucu / Server</option>
            <option value="Switch / Router / Modem">Switch / Router / Modem</option>
            <option value="Adisyon / Barkod Cihazı">Adisyon / Barkod Cihazı</option>
            <option value="Ses Amfisi / Mikser">Ses Amfisi / Mikser</option>
          </select>
        </div>
        <div>
          <label className="block font-bold text-slate-700 mb-1">Marka <span className="text-red-500">*</span></label>
          <input
            type="text"
            required
            placeholder="Örn: Dahua, Hikvision, Dell..."
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block font-bold text-slate-700 mb-1">Model</label>
          <input
            type="text"
            placeholder="Örn: NVR4108HS-4KS2"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg"
          />
        </div>
        <div>
          <label className="block font-bold text-slate-700 mb-1">Seri Numarası</label>
          <input
            type="text"
            placeholder="Örn: DH849301924"
            value={serialNumber}
            onChange={(e) => setSerialNumber(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg"
          />
        </div>
      </div>

      <div>
        <label className="block font-bold text-slate-700 mb-1">Teslim Alınan Aksesuarlar (Virgülle ayırınız)</label>
        <input
          type="text"
          placeholder="Örn: 12V Adaptör, Mouse, Kumanda"
          value={accessories}
          onChange={(e) => setAccessories(e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg"
        />
      </div>

      <div>
        <label className="block font-bold text-slate-700 mb-1">Müşteri Şikayeti / Arıza Tanımı <span className="text-red-500">*</span></label>
        <textarea
          rows={3}
          required
          placeholder="Cihaz açılmıyor, bip sesi veriyor veya kameraları görmüyor..."
          value={reportedIssue}
          onChange={(e) => setReportedIssue(e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block font-bold text-slate-700 mb-1">Sorumlu Teknisyen</label>
          <select
            value={assignedTechId}
            onChange={(e) => setAssignedTechId(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
          >
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.fullName} ({u.roleTitle})</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block font-bold text-slate-700 mb-1">Alınan Kapora (TL)</label>
          <input
            type="number"
            value={depositPaid}
            onChange={(e) => setDepositPaid(Number(e.target.value))}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg"
          />
        </div>
      </div>

      {/* Cihaz Kabul Anı Fotoğraflı Kanıt Ekleme */}
      <div className="p-3 bg-purple-50/50 rounded-xl border border-purple-100">
        <div className="flex items-center justify-between mb-2">
          <label className="font-bold text-purple-900 text-xs flex items-center gap-1.5">
            <Camera size={14} className="text-purple-600" /> Cihaz Giriş & Hasar Fotoğrafı (Opsiyonel)
          </label>
          <label className="cursor-pointer px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-[11px] font-bold transition flex items-center gap-1">
            <Camera size={12} /> Fotoğraf Çek / Ekle
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (event) => {
                    if (event.target?.result) {
                      setIntakePhotos(prev => [
                        ...prev,
                        {
                          id: 'photo-' + Date.now(),
                          url: event.target?.result as string,
                          caption: 'Giriş anı cihaz durumu',
                          stage: 'intake',
                          uploadedAt: new Date().toISOString(),
                        }
                      ]);
                    }
                  };
                  reader.readAsDataURL(file);
                }
              }}
            />
          </label>
        </div>

        {intakePhotos.length > 0 ? (
          <div className="flex items-center gap-2 overflow-x-auto py-1">
            {intakePhotos.map((photo, idx) => (
              <div key={photo.id} className="relative w-14 h-14 rounded-lg overflow-hidden border border-purple-200 shrink-0 group">
                <img src={photo.url} alt="Kabul Fotoğrafı" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setIntakePhotos(prev => prev.filter((_, i) => i !== idx))}
                  className="absolute inset-0 bg-red-600/70 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[11px] text-slate-500">
            Kasa çatlağı, kırık ekran vb. hasar kanıtlarını teslim alırken telefon kamerasıyla anında fotoğraflayabilirsiniz.
          </p>
        )}
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
          className="px-4 py-2 font-bold bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
        >
          Cihazı Kabul Et ve Servis Fişi Aç
        </button>
      </div>
    </form>
  );
};
