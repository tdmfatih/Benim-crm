import React, { useState } from 'react';
import { Installation, Customer, User, Product, InstallationStatus } from '../../types';
import { storage } from '../../services/storageService';
import { PDFService } from '../../services/pdfService';
import { AutomationEngine } from '../../services/automationEngine';
import { 
  Plus, Search, Wrench, Calendar, CheckSquare, Package, 
  Printer, Copy, ExternalLink, CheckCircle2, Clock, 
  MapPin, Phone, ShieldCheck, UserCheck, ArrowLeft,
  Camera, Image as ImageIcon, Upload, Eye, X, Trash2
} from 'lucide-react';

interface InstallationPlanningViewProps {
  installations: Installation[];
  customers: Customer[];
  users: User[];
  products: Product[];
  onSaveInstallations: (installations: Installation[]) => void;
  onOpenPublicDelivery: (token: string) => void;
}

export const InstallationPlanningView: React.FC<InstallationPlanningViewProps> = ({
  installations,
  customers,
  users,
  products,
  onSaveInstallations,
  onOpenPublicDelivery,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedInst, setSelectedInst] = useState<Installation | null>(installations[0] || null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Montaj fotoğraflı kanıt state'leri
  const [photoType, setPhotoType] = useState<'before' | 'in_progress' | 'after'>('after');
  const [photoCaption, setPhotoCaption] = useState('');
  const [previewPhoto, setPreviewPhoto] = useState<{ url: string; caption?: string; type?: string } | null>(null);

  const filteredInstallations = installations.filter(i => {
    const matchSearch = 
      i.installationNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.projectName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'all' || i.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleCopyLink = (token: string) => {
    const fullUrl = `${window.location.origin}/delivery-confirm/${token}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const handleToggleChecklist = (instId: string, checkId: string) => {
    const updated = installations.map(inst => {
      if (inst.id === instId) {
        const checklist = inst.checklist.map(c => {
          if (c.id === checkId) {
            const nextState = !c.isCompleted;
            return {
              ...c,
              isCompleted: nextState,
              completedAt: nextState ? new Date().toISOString() : undefined,
            };
          }
          return c;
        });
        return { ...inst, checklist, updatedAt: new Date().toISOString() };
      }
      return inst;
    });

    onSaveInstallations(updated);
    if (selectedInst?.id === instId) {
      setSelectedInst(updated.find(i => i.id === instId) || null);
    }
  };

  const handleStatusChange = (instId: string, newStatus: InstallationStatus) => {
    const updated = installations.map(inst => {
      if (inst.id === instId) {
        return { ...inst, status: newStatus, updatedAt: new Date().toISOString() };
      }
      return inst;
    });
    onSaveInstallations(updated);
    if (selectedInst?.id === instId) {
      setSelectedInst({ ...selectedInst, status: newStatus });
    }
  };

  const handleAddPhoto = (instId: string, url: string, caption: string, type: 'before' | 'in_progress' | 'after') => {
    const newPhoto = {
      id: 'inst-photo-' + Date.now(),
      url,
      caption: caption || '',
      type,
      uploadedAt: new Date().toISOString(),
    };

    const updated = installations.map(inst => {
      if (inst.id === instId) {
        const photos = [...(inst.photos || []), newPhoto];
        return {
          ...inst,
          photos,
          updatedAt: new Date().toISOString(),
        };
      }
      return inst;
    });

    onSaveInstallations(updated);
    storage.saveInstallations(updated);
    if (selectedInst?.id === instId) {
      setSelectedInst(updated.find(i => i.id === instId) || null);
    }
    setPhotoCaption('');
  };

  const handleDeletePhoto = (instId: string, photoId: string) => {
    const updated = installations.map(inst => {
      if (inst.id === instId) {
        const photos = (inst.photos || []).filter(p => p.id !== photoId);
        return {
          ...inst,
          photos,
          updatedAt: new Date().toISOString(),
        };
      }
      return inst;
    });

    onSaveInstallations(updated);
    storage.saveInstallations(updated);
    if (selectedInst?.id === instId) {
      setSelectedInst(updated.find(i => i.id === instId) || null);
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
              placeholder="Montaj no, müşteri veya proje ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white focus:outline-none"
          >
            <option value="all">Tüm Durumlar</option>
            <option value="scheduled">Planlandı</option>
            <option value="in_progress">Saha Montajı Sürüyor</option>
            <option value="completed">Tamamlandı & Teslim Edildi</option>
          </select>
        </div>

        <button
          onClick={() => setShowNewModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition w-full sm:w-auto justify-center"
        >
          <Plus size={16} /> Yeni Saha Montaj İş Emri
        </button>
      </div>

      {/* İki Kolonlu Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sol: Montaj Listesi - Mobilde detay seçiliyse gizlenebilir */}
        <div className={`bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden ${
          selectedInst ? 'hidden lg:block' : 'block'
        }`}>
          <div className="p-3.5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center text-xs font-bold text-slate-700">
            <span>Saha Montaj Ajandası ({filteredInstallations.length})</span>
          </div>

          <div className="divide-y divide-slate-100 max-h-[calc(100vh-250px)] overflow-y-auto">
            {filteredInstallations.map(inst => {
              const isSelected = selectedInst?.id === inst.id;
              return (
                <div
                  key={inst.id}
                  onClick={() => setSelectedInst(inst)}
                  className={`p-3.5 transition cursor-pointer ${
                    isSelected ? 'bg-emerald-50/80 border-l-4 border-l-emerald-600' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-emerald-700">{inst.installationNumber}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      inst.status === 'completed' ? 'bg-emerald-100 text-emerald-800' :
                      inst.status === 'in_progress' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {inst.status === 'completed' ? 'Tamamlandı' :
                       inst.status === 'in_progress' ? 'Saha Çalışması' : 'Planlandı'}
                    </span>
                  </div>

                  <div className="text-xs font-bold text-slate-900">{inst.customerName}</div>
                  <div className="text-[11px] text-slate-600 mt-0.5">{inst.projectName}</div>

                  <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                    <span className="flex items-center gap-1 font-medium">
                      <Calendar size={12} /> {inst.scheduledDate} {inst.scheduledTime}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-400">
                      {inst.assignedTechnicians.map(t => t.fullName).join(', ')}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sağ: Montaj Detayı & Teknisyen Saha Ekranı */}
        <div className={`lg:col-span-2 ${selectedInst ? 'block' : 'hidden lg:block'}`}>
          {selectedInst ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              {/* Mobilde Geri Dön Butonu */}
              <div className="p-3 bg-slate-100 border-b border-slate-200 lg:hidden flex items-center justify-between">
                <button
                  onClick={() => setSelectedInst(null)}
                  className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:text-emerald-700"
                >
                  <ArrowLeft size={16} /> Montaj Listesine Dön
                </button>
                <span className="text-[11px] text-slate-500 font-semibold">{selectedInst.installationNumber}</span>
              </div>

              {/* Başlık */}
              <div className="p-5 border-b border-slate-100 bg-slate-50/60 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-emerald-900">{selectedInst.installationNumber}</span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                      Tarih: {selectedInst.scheduledDate} {selectedInst.scheduledTime}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 mt-1">{selectedInst.customerName}</h3>
                  <p className="text-xs text-slate-500">{selectedInst.projectName} • {selectedInst.fullAddress}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => PDFService.printInstallationDelivery(selectedInst)}
                    className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs"
                  >
                    <Printer size={14} /> Teslim Tutanağı Yazdır
                  </button>

                  <select
                    value={selectedInst.status}
                    onChange={(e) => handleStatusChange(selectedInst.id, e.target.value as InstallationStatus)}
                    className="px-3 py-1.5 bg-emerald-50 text-emerald-900 font-bold text-xs rounded-xl border border-emerald-200"
                  >
                    <option value="scheduled">Planlandı</option>
                    <option value="in_progress">Saha Montajı Sürüyor</option>
                    <option value="completed">Tamamlandı</option>
                  </select>
                </div>
              </div>

              {/* Müşteri Teslim Onay Ekranı Link Şeridi */}
              <div className="p-3 bg-emerald-50/70 border-b border-emerald-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 text-emerald-900">
                  <span className="font-bold text-emerald-700">Müşteri Saha Teslim Onay Ekranı:</span>
                  <span className="text-[11px] font-mono bg-white px-2 py-0.5 rounded border border-emerald-200">
                    /delivery-confirm/{selectedInst.deliveryApprovalToken}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopyLink(selectedInst.secureDeliveryToken || selectedInst.deliveryApprovalToken || '')}
                    className="px-2.5 py-1 bg-white hover:bg-emerald-100 text-emerald-700 text-[11px] font-bold rounded-lg border border-emerald-300 flex items-center gap-1"
                  >
                    <Copy size={12} /> {copiedToken === (selectedInst.secureDeliveryToken || selectedInst.deliveryApprovalToken) ? 'Kopyalandı!' : 'Linki Kopyala'}
                  </button>
                  <button
                    onClick={() => onOpenPublicDelivery(selectedInst.secureDeliveryToken || selectedInst.deliveryApprovalToken || '')}
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-lg flex items-center gap-1"
                  >
                    <ExternalLink size={12} /> Müşteri Ekranında Aç
                  </button>
                </div>
              </div>

              {/* Detay Gövdesi */}
              <div className="p-5 space-y-5 text-xs">
                {/* Görev Tanımı ve Teknisyenler */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                    <span className="font-bold text-slate-400 uppercase text-[10px] block">İş Emri Kapsamı</span>
                    <p className="text-slate-800 font-medium">{selectedInst.tasksDescription}</p>
                  </div>

                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                    <span className="font-bold text-slate-400 uppercase text-[10px] block">Görevli Teknisyenler</span>
                    <div className="space-y-1">
                      {selectedInst.assignedTechnicians.map(t => (
                        <div key={t.userId} className="flex items-center gap-1.5 font-bold text-slate-800">
                          <UserCheck size={14} className="text-emerald-600" />
                          <span>{t.fullName}</span>
                          {t.isLead && <span className="text-[10px] px-1.5 bg-blue-100 text-blue-700 rounded">Şef</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Mobil Teknisyen Checklist (İnteraktif) */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <CheckSquare size={14} className="text-emerald-600" /> Saha Montaj ve Kalite Kontrol Checklist
                    </h4>
                    <span className="text-slate-500 text-[11px]">
                      {selectedInst.checklist.filter(c => c.isCompleted).length} / {selectedInst.checklist.length} Tamamlandı
                    </span>
                  </div>

                  <div className="space-y-2">
                    {selectedInst.checklist.map(item => (
                      <div
                        key={item.id}
                        onClick={() => handleToggleChecklist(selectedInst.id, item.id)}
                        className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                          item.isCompleted
                            ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                            : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className={`w-5 h-5 rounded flex items-center justify-center ${
                            item.isCompleted ? 'bg-emerald-600 text-white' : 'border border-slate-300 bg-white'
                          }`}>
                            {item.isCompleted && '✓'}
                          </div>
                          <span className={`font-semibold ${item.isCompleted ? 'line-through opacity-80' : ''}`}>
                            {item.text}
                          </span>
                        </div>

                        {item.completedAt && (
                          <span className="text-[10px] text-emerald-700">
                            {new Date(item.completedAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sahada Kullanılan Malzemeler */}
                <div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Package size={14} className="text-blue-600" /> Sahada Monte Edilen Cihaz & Sarf Malzemeleri
                  </h4>

                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3">Malzeme Adı</th>
                          <th className="py-2.5 px-3">SKU</th>
                          <th className="py-2.5 px-3 text-center">Kullanılan Miktar</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedInst.materials.map(m => (
                          <tr key={m.id}>
                            <td className="py-2.5 px-3 font-semibold text-slate-900">{m.productName}</td>
                            <td className="py-2.5 px-3 text-slate-500">{m.sku}</td>
                            <td className="py-2.5 px-3 text-center font-bold text-emerald-700">
                              {m.usedQty} {m.unit}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* SAHA MONTAJI FOTOĞRAFLI KANIT & TESLİMAT GÖRSELLERİ */}
                <div className="pt-3 border-t border-slate-100">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                        <Camera size={15} className="text-emerald-600" /> Saha Montajı Fotoğraflı Kanıt & Teslimat Görselleri
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Saha montaj öncesi keşif, kablolama/montaj aşaması veya teslimat kanıt fotoğrafları ekleyin. A4 Montaj ve Teslim Tutanağında basılır.
                      </p>
                    </div>
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg self-start sm:self-auto border border-emerald-100">
                      {selectedInst.photos?.length || 0} Saha Fotoğrafı
                    </span>
                  </div>

                  {/* Yeni Fotoğraf Yükleme Çubuğu */}
                  <div className="p-3 bg-emerald-50/40 rounded-xl border border-emerald-100 mb-4 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={photoType}
                        onChange={(e) => setPhotoType(e.target.value as any)}
                        className="px-2.5 py-1.5 bg-white border border-emerald-200 rounded-lg text-xs font-bold text-emerald-900"
                      >
                        <option value="before">📍 Keşif & Montaj Öncesi Saha</option>
                        <option value="in_progress">⚙️ Montaj & Kablolama Esnası</option>
                        <option value="after">✅ Montaj Tamamlandı / Çalışır Durum</option>
                      </select>

                      <input
                        type="text"
                        placeholder="Saha fotoğrafı açıklaması (Örn: Kamera 4 açı ayarı tamamlandı)..."
                        value={photoCaption}
                        onChange={(e) => setPhotoCaption(e.target.value)}
                        className="flex-1 min-w-[200px] px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                      />

                      <label className="cursor-pointer px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-2xs">
                        <Camera size={13} /> Sahadan Çek / Yükle
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
                                    selectedInst.id,
                                    event.target.result as string,
                                    photoCaption,
                                    photoType
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

                  {/* Fotoğraflar Izgarası */}
                  {selectedInst.photos && selectedInst.photos.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {selectedInst.photos.map((photo) => {
                        const typeBadge = 
                          photo.type === 'before' ? { label: 'Keşif / Öncesi', bg: 'bg-amber-100 text-amber-800' } :
                          photo.type === 'in_progress' ? { label: 'Montaj Esnası', bg: 'bg-blue-100 text-blue-800' } :
                          { label: 'Tamamlandı & Çalışır', bg: 'bg-emerald-100 text-emerald-800' };

                        return (
                          <div 
                            key={photo.id}
                            className="group relative bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs hover:shadow-md transition flex flex-col"
                          >
                            <div 
                              onClick={() => setPreviewPhoto({ url: photo.url, caption: photo.caption, type: photo.type })}
                              className="w-full h-28 bg-slate-100 relative cursor-pointer overflow-hidden"
                            >
                              <img 
                                src={photo.url} 
                                alt={photo.caption || 'Montaj kanıt fotoğrafı'} 
                                className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                              />
                              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition">
                                <Eye size={18} />
                              </div>
                              <span className={`absolute top-1.5 left-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xs ${typeBadge.bg}`}>
                                {typeBadge.label}
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
                                    if (confirm('Bu saha montaj fotoğrafını silmek istediğinize emin misiniz?')) {
                                      handleDeletePhoto(selectedInst.id, photo.id);
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
                      <p className="text-xs font-medium text-slate-500">Henüz saha montaj fotoğrafı eklenmedi.</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Sahadaki teknisyen cep telefonu kamerasıyla montaj öncesi ve bitmiş halin fotoğraflarını anında yükleyebilir.
                      </p>
                    </div>
                  )}
                </div>

                {/* Müşteri Teslim Onayı Bilgisi */}
                {selectedInst.customerDeliveryApproval?.isApproved && (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <div className="flex items-center gap-2 text-emerald-900 font-bold mb-1">
                      <CheckCircle2 size={16} className="text-emerald-600" />
                      Müşteri Tarafından Teslim Alındı ve Onaylandı
                    </div>
                    <div className="text-xs text-emerald-700">
                      Teslim Alan: <strong>{selectedInst.customerDeliveryApproval.approverName}</strong> • {new Date(selectedInst.customerDeliveryApproval.approvedAt).toLocaleString('tr-TR')}
                    </div>
                    {selectedInst.customerDeliveryApproval.notes && (
                      <div className="mt-1 text-xs text-slate-600 italic">
                        "{selectedInst.customerDeliveryApproval.notes}"
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
              Görüntülemek için soldan bir montaj iş emri seçiniz.
            </div>
          )}
        </div>
      </div>

      {/* YENİ MONTAJ İŞ EMRİ MODALI */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Yeni Montaj İş Emri Oluştur</h3>
              <button onClick={() => setShowNewModal(false)} className="text-slate-400">✕</button>
            </div>

            <NewInstallationForm
              customers={customers}
              users={users}
              products={products}
              onClose={() => setShowNewModal(false)}
              onSave={(newInst) => {
                const updated = [newInst, ...installations];
                onSaveInstallations(updated);
                setSelectedInst(newInst);
                setShowNewModal(false);
                storage.logAudit('INSTALLATION_CREATED', 'installation', newInst.id, newInst.installationNumber, null, newInst);
              }}
            />
          </div>
        </div>
      )}

      {/* SAHA MONTAJ FOTOĞRAFI BÜYÜK ÖNİZLEME MODALI (LIGHTBOX) */}
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
                <Camera size={16} className="text-emerald-600" />
                <span className="font-bold text-slate-900 text-sm">
                  {previewPhoto.type === 'before' ? 'Saha Keşif & Montaj Öncesi Fotoğrafı' :
                   previewPhoto.type === 'in_progress' ? 'Montaj & Kablolama Esnası Fotoğrafı' : 'Montaj Tamamlandı & Çalışır Teslimat Kanıtı'}
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
                alt="Montaj Kanıt Fotoğrafı" 
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

// Alt Form Bileşeni
interface NewInstallationFormProps {
  customers: Customer[];
  users: User[];
  products: Product[];
  onClose: () => void;
  onSave: (inst: Installation) => void;
}

const NewInstallationForm: React.FC<NewInstallationFormProps> = ({ customers, users, products, onClose, onSave }) => {
  const [customerId, setCustomerId] = useState(customers[0]?.id || '');
  const [projectName, setProjectName] = useState('');
  const [scheduledDate, setScheduledDate] = useState(new Date().toISOString().split('T')[0]);
  const [scheduledTime, setScheduledTime] = useState('09:30');
  const [tasksDescription, setTasksDescription] = useState('');
  const [assignedUserId, setAssignedUserId] = useState(users[2]?.id || users[0]?.id || '');

  const selectedCustomer = customers.find(c => c.id === customerId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || !projectName.trim()) {
      alert('Lütfen müşteri ve proje adını giriniz.');
      return;
    }

    const techUser = users.find(u => u.id === assignedUserId);
    const installationNumber = `3AS-MON-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newInst: Installation = {
      id: 'inst-' + Date.now(),
      installationNumber,
      customerId: selectedCustomer.id,
      customerName: selectedCustomer.name,
      customerPhone: selectedCustomer.phone,
      fullAddress: selectedCustomer.address || 'Adres belirtilmedi',
      projectName,
      scheduledDate,
      scheduledTime,
      status: 'scheduled',
      assignedTechnicians: [
        {
          userId: assignedUserId,
          fullName: techUser?.fullName || 'Teknisyen',
          isLead: true,
        }
      ],
      tasksDescription: tasksDescription || 'Sistem kurulumu ve testleri.',
      checklist: [
        { id: 'c1', text: 'Kablo hatları ve kanal çekimi', isCompleted: false },
        { id: 'c2', text: 'Cihaz montajları ve açı ayarları', isCompleted: false },
        { id: 'c3', text: 'Network switch ve internet bağlantısı', isCompleted: false },
        { id: 'c4', text: 'Mobil uygulama kurulumu ve kullanıcı eğitimi', isCompleted: false },
      ],
      materials: [
        {
          id: 'm1',
          productId: products[0]?.id || 'p1',
          productName: products[0]?.name || '4 Kanal Kamera Seti',
          sku: products[0]?.sku || 'CAM-01',
          usedQty: 1,
          unit: 'Set',
        }
      ],
      photos: [],
      deliveryApprovalToken: '3as_deliv_' + Math.random().toString(36).substring(2, 10),
      secureDeliveryToken: '3as_deliv_' + Math.random().toString(36).substring(2, 10),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSave(newInst);
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

      <div>
        <label className="block font-bold text-slate-700 mb-1">Proje / Kurulum Adı <span className="text-red-500">*</span></label>
        <input
          type="text"
          required
          placeholder="Örn: 8 Kameralı Fabrika Güvenlik Sistemi"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block font-bold text-slate-700 mb-1">Montaj Tarihi</label>
          <input
            type="date"
            value={scheduledDate}
            onChange={(e) => setScheduledDate(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg"
          />
        </div>
        <div>
          <label className="block font-bold text-slate-700 mb-1">Başlama Saati</label>
          <input
            type="time"
            value={scheduledTime}
            onChange={(e) => setScheduledTime(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg"
          />
        </div>
      </div>

      <div>
        <label className="block font-bold text-slate-700 mb-1">Görevli Teknisyen</label>
        <select
          value={assignedUserId}
          onChange={(e) => setAssignedUserId(e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
        >
          {users.map(u => (
            <option key={u.id} value={u.id}>{u.fullName} ({u.roleTitle})</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block font-bold text-slate-700 mb-1">Yapılacak İş Detayları</label>
        <textarea
          rows={3}
          placeholder="Kablo çekimi, cihaz montajları, switch yapılandırması..."
          value={tasksDescription}
          onChange={(e) => setTasksDescription(e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg"
        />
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
          className="px-4 py-2 font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg"
        >
          İş Emrini Başlat
        </button>
      </div>
    </form>
  );
};
