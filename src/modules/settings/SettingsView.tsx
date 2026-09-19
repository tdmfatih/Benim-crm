import React, { useState } from 'react';
import { CompanySettings, User, Role, AuditLogEntry } from '../../types';
import { storage } from '../../services/storageService';
import { RBACService } from '../../services/rbacService';
import { UserManagementView } from '../users/UserManagementView';
import { compressImageFile } from '../../utils/imageUtils';
import { 
  Building2, Shield, Users, Download, Upload, RefreshCw, 
  CheckCircle2, FileText, Lock, Eye, Database, KeyRound, UserPlus,
  Image as ImageIcon, RotateCcw, Trash2, Camera
} from 'lucide-react';

interface SettingsViewProps {
  settings: CompanySettings;
  users: User[];
  roles: Role[];
  auditLogs: AuditLogEntry[];
  currentUser?: User;
  onUsersChange?: (users: User[]) => void;
  onSwitchUser?: (userId: string) => void;
  onSaveSettings: (settings: CompanySettings) => void;
  onResetData: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  users,
  roles,
  auditLogs,
  currentUser,
  onUsersChange,
  onSwitchUser,
  onSaveSettings,
  onResetData,
}) => {
  const [activeTab, setActiveTab] = useState<'users' | 'company' | 'rbac' | 'audit' | 'backup'>('users');
  const [formState, setFormState] = useState<CompanySettings>(settings);
  const [isExporting, setIsExporting] = useState(false);

  // Requirement: "Add a feature to automatically trigger a browser download of the current 'settings' and 'data' storage snapshot as a JSON file, triggered manually by a button in SettingsView"
  const handleExportSnapshot = () => {
    setIsExporting(true);
    try {
      const snapshot = storage.exportSnapshot();
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(snapshot, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      downloadAnchor.setAttribute('download', `3as_teknoloji_backup_snapshot_${timestamp}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      storage.logAudit('BACKUP_EXPORTED', 'settings', 'backup', 'JSON Snapshot İndirildi');
      alert('Sistem ve veri yedeği JSON dosyası olarak başarıyla indirildi.');
    } catch (err) {
      console.error(err);
      alert('Yedekleme sırasında bir hata oluştu.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportSnapshot = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], 'UTF-8');
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          storage.importSnapshot(parsed);
          alert('Yedek başarıyla geri yüklendi! Sayfa yenilenecektir.');
          window.location.reload();
        } catch (err) {
          alert('Geçersiz JSON yedek dosyası.');
        }
      };
    }
  };

  const handleSubmitCompany = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(formState);
    storage.logAudit('SETTINGS_UPDATED', 'settings', 'company', 'Şirket ve Fatura Bilgileri Güncellendi');
    alert('Şirket ayarları başarıyla kaydedildi.');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Üst Sekmeler */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-2">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
            activeTab === 'users' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <UserPlus size={15} /> Kullanıcılar & Yetkiler ({users.length})
        </button>
        <button
          onClick={() => setActiveTab('company')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
            activeTab === 'company' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Building2 size={15} /> Şirket & Fatura Bilgileri
        </button>
        <button
          onClick={() => setActiveTab('rbac')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
            activeTab === 'rbac' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Shield size={15} /> RBAC & Yetki Matrisi
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
            activeTab === 'audit' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <FileText size={15} /> Denetim İzi (Audit Log)
        </button>
        <button
          onClick={() => setActiveTab('backup')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
            activeTab === 'backup' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Database size={15} /> Veri Yedeği (JSON Snapshot)
        </button>
      </div>

      {/* KULLANICILAR & YETKİ YÖNETİMİ SEKMESİ */}
      {activeTab === 'users' && (
        <UserManagementView
          users={users}
          roles={roles}
          currentUser={currentUser || users[0]}
          onUsersChange={onUsersChange || (() => {})}
          onSwitchUser={onSwitchUser}
        />
      )}

      {/* ŞİRKET BİLGİLERİ SEKMESİ */}
      {activeTab === 'company' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs max-w-3xl">
          <h3 className="text-sm font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">
            Resmi Şirket & e-Fatura Ayarları
          </h3>

          {/* KURUMSAL ŞİRKET LOGOSU YÖNETİMİ */}
          <div className="mb-6 p-4 rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50/50 to-indigo-50/30">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                  <ImageIcon size={15} className="text-blue-600" /> Kurumsal Şirket Logosu
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Yüklenen logo üst menüde, teklif PDF çıktılarında, servis formlarında ve müşteri online onay ekranlarında otomatik kullanılır.
                </p>
              </div>
              {formState.logoUrl && (
                <button
                  type="button"
                  onClick={() => setFormState({ ...formState, logoUrl: '' })}
                  className="text-[11px] font-bold text-red-600 hover:text-red-700 flex items-center gap-1 px-2 py-1 rounded bg-red-50"
                  title="Özel logoyu kaldırıp varsayılan logoya döner"
                >
                  <RotateCcw size={12} /> Varsayılana Sıfırla
                </button>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              {/* Canlı Logo Önizleme Kutusu */}
              <div className="w-full sm:w-48 h-24 rounded-xl border-2 border-dashed border-blue-200 bg-white flex flex-col items-center justify-center p-2 text-center relative overflow-hidden shadow-xs">
                {formState.logoUrl ? (
                  <img
                    src={formState.logoUrl}
                    alt="Şirket Logosu Önizleme"
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <div className="flex flex-col items-center text-slate-400">
                    <ImageIcon size={28} className="text-slate-300 mb-1" />
                    <span className="text-[10px] font-bold text-slate-500">Varsayılan 3AS Logosu</span>
                    <span className="text-[9px] text-slate-400">Aktif Kullanımda</span>
                  </div>
                )}
              </div>

              {/* Yükleme Butonu ve URL Girişi */}
              <div className="flex-1 space-y-2 w-full">
                <div className="flex items-center gap-2">
                  <label className="cursor-pointer px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-xs">
                    <Upload size={14} /> Bilgisayardan / Telefondan Logo Seç
                    <input
                      type="file"
                      accept="image/png, image/jpeg, image/webp, image/svg+xml"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          try {
                            const compressed = await compressImageFile(file, 400, 160, 0.85);
                            setFormState({ ...formState, logoUrl: compressed });
                          } catch {
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              if (event.target?.result) {
                                setFormState({ ...formState, logoUrl: event.target.result as string });
                              }
                            };
                            reader.readAsDataURL(file);
                          }
                        }
                      }}
                    />
                  </label>
                  <span className="text-[11px] text-slate-400">PNG, JPG, SVG (Önerilen: Şeffaf arka plan)</span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    placeholder="Veya harici logo URL adresi girin (https://...)"
                    value={formState.logoUrl || ''}
                    onChange={(e) => setFormState({ ...formState, logoUrl: e.target.value })}
                    className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                  />
                  {formState.logoUrl && (
                    <button
                      type="button"
                      onClick={() => setFormState({ ...formState, logoUrl: '' })}
                      className="px-2.5 py-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50"
                      title="Temizle"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmitCompany} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Firma Ticari Unvanı</label>
                <input
                  type="text"
                  value={formState.companyName || formState.name || ''}
                  onChange={(e) => setFormState({ 
                    ...formState, 
                    companyName: e.target.value,
                    name: e.target.value 
                  })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold text-slate-900"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Kısa Ticari İsim</label>
                <input
                  type="text"
                  value={formState.tradeName || ''}
                  onChange={(e) => setFormState({ ...formState, tradeName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Vergi Dairesi</label>
                <input
                  type="text"
                  value={formState.taxOffice || ''}
                  onChange={(e) => setFormState({ ...formState, taxOffice: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Vergi Kimlik Numarası (VKN)</label>
                <input
                  type="text"
                  value={formState.taxNumber || ''}
                  onChange={(e) => setFormState({ ...formState, taxNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Sabit Telefon Numarası</label>
                <input
                  type="text"
                  value={formState.phone || ''}
                  onChange={(e) => setFormState({ ...formState, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">E-Posta Adresi</label>
                <input
                  type="email"
                  value={formState.email || ''}
                  onChange={(e) => setFormState({ ...formState, email: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl">
              <div>
                <label className="block font-bold text-emerald-900 mb-1 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  Şirket Müşteri WhatsApp Hattı
                </label>
                <input
                  type="text"
                  placeholder="0532 912 33 00"
                  value={formState.whatsappNumber || ''}
                  onChange={(e) => setFormState({ ...formState, whatsappNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-emerald-300 rounded-lg bg-white font-medium"
                />
                <p className="text-[10px] text-emerald-700 mt-1">Müşterilere teklif ve servis linklerinin gönderildiği resmi hat.</p>
              </div>

              <div>
                <label className="block font-bold text-emerald-900 mb-1 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Yönetici WhatsApp Bildirim Hattı (Lead Uyarısı)
                </label>
                <input
                  type="text"
                  placeholder="0532 999 88 77"
                  value={formState.managerWhatsAppNumber || formState.leadNotificationPhone || ''}
                  onChange={(e) => setFormState({ 
                    ...formState, 
                    managerWhatsAppNumber: e.target.value,
                    leadNotificationPhone: e.target.value,
                  })}
                  className="w-full px-3 py-2 border border-emerald-300 rounded-lg bg-white font-medium text-slate-900"
                />
                <p className="text-[10px] text-emerald-700 mt-1">
                  <strong>🔔 Kritik:</strong> Yeni bir müşteri talebi (Lead) geldiğinde anlık bildirim bu numaraya gider.
                </p>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Şirket Adresi</label>
              <textarea
                rows={2}
                value={formState.address || ''}
                onChange={(e) => setFormState({ ...formState, address: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>

            <div className="pt-3 border-t border-slate-100">
              <h4 className="text-xs font-bold text-slate-900 mb-2">Banka Hesap & IBAN Bilgileri</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Banka Adı</label>
                  <input
                    type="text"
                    value={formState.bankName || formState.bankAccounts?.[0]?.bankName || ''}
                    onChange={(e) => {
                      const bankName = e.target.value;
                      setFormState({
                        ...formState,
                        bankName,
                        bankAccounts: [{ bankName, iban: formState.iban || '' }],
                      });
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">IBAN Numarası</label>
                  <input
                    type="text"
                    value={formState.iban || formState.bankAccounts?.[0]?.iban || ''}
                    onChange={(e) => {
                      const iban = e.target.value;
                      setFormState({
                        ...formState,
                        iban,
                        bankAccounts: [{ bankName: formState.bankName || '', iban }],
                      });
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3">
              <button
                type="submit"
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs"
              >
                Bilgileri Güncelle
              </button>
            </div>
          </form>
        </div>
      )}

      {/* RBAC YETKİ MATRİSİ */}
      {activeTab === 'rbac' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Rol Tabanlı Yetki ve Erişim Matrisi (RBAC)</h3>
              <p className="text-xs text-slate-500">
                Sistemde hiçbir rol veya yetki hardcoded değildir. Dinamik veri modeline göre kontrol edilir.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {roles.map(role => (
              <div key={role.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{role.name}</h4>
                    <span className="text-[10px] text-slate-400 font-mono">Rol Kodu: {role.code}</span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    role.canViewCost ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {role.canViewCost ? 'Alış/Maliyet Görür' : 'Maliyet Gizli'}
                  </span>
                </div>

                <p className="text-xs text-slate-600">{role.description}</p>

                <div className="pt-2 border-t border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Tanımlı Yetkiler</span>
                  <div className="flex flex-wrap gap-1">
                    {role.permissions.map(perm => (
                      <span key={perm} className="text-[10px] px-2 py-0.5 rounded bg-white border border-slate-200 font-mono text-slate-700">
                        {perm}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* DENETİM İZİ (AUDIT LOGS) */}
      {activeTab === 'audit' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 mb-2">Kurumsal Denetim İzi & Olay Günlüğü</h3>
          <p className="text-xs text-slate-500 mb-4">Kim, ne zaman, hangi kayıtta ne değişiklik yaptı?</p>

          <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
            {auditLogs.map(log => (
              <div key={log.id} className="py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-blue-900">{log.userName}</span>
                    <span className="text-slate-400">•</span>
                    <span className="font-mono text-slate-700 font-semibold bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">
                      {log.action}
                    </span>
                    <span className="font-medium text-slate-800">{log.entityName}</span>
                  </div>
                  {log.newValues && (
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                      Detay: {JSON.stringify(log.newValues)}
                    </div>
                  )}
                </div>

                <span className="text-[11px] text-slate-400 font-mono">
                  {new Date(log.createdAt || log.timestamp || Date.now()).toLocaleString('tr-TR')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* JSON SNAPSHOT & YEDEKLEME (USER REQUIREMENT) */}
      {activeTab === 'backup' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs max-w-2xl space-y-6">
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">
              Veri Yedekleme ve JSON Snapshot Yönetimi
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Bu özellik, şirketinizin tüm CRM, ERP, Servis, Montaj, Fatura, Ürün ve Sistem Ayarları verilerini
              tek bir JSON dosyası halinde anında tarayıcınıza indirmenizi sağlar.
            </p>
          </div>

          <div className="p-4 bg-blue-50/80 rounded-2xl border border-blue-200 space-y-3">
            <div className="flex items-center gap-2 text-blue-900 font-bold text-xs">
              <Download size={18} className="text-blue-700" />
              Manuel JSON Snapshot İndirme:
            </div>
            <p className="text-xs text-slate-600">
              Aşağıdaki butona tıkladığınızda tüm canlı sistem verisi bilgisayarınıza <code className="font-mono text-blue-800">.json</code> formatında indirilecektir.
            </p>

            <button
              id="btn-download-json-snapshot"
              onClick={handleExportSnapshot}
              disabled={isExporting}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-2 transition"
            >
              <Download size={15} />
              {isExporting ? 'Yedek Hazırlanıyor...' : 'Mevcut Veri ve Ayarları JSON Olarak İndir'}
            </button>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-center gap-2 text-slate-800 font-bold text-xs">
              <Upload size={18} className="text-slate-600" />
              Yedekten Geri Yükle (JSON Import):
            </div>
            <p className="text-xs text-slate-500">
              Daha önce indirdiğiniz bir JSON yedek dosyasını yükleyerek verilerinizi geri yükleyebilirsiniz.
            </p>

            <label className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl cursor-pointer shadow-xs">
              <Upload size={14} /> JSON Dosyası Seç ve Yükle
              <input type="file" accept=".json" onChange={handleImportSnapshot} className="hidden" />
            </label>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
            <div className="text-xs text-slate-500">
              Sistemi fabrika ayarlarına ve başlangıç demo verilerine sıfırlamak için:
            </div>
            <button
              onClick={() => {
                if (confirm('Tüm mevcut değişiklikler silinecek ve başlangıç demo verileri yüklenecek. Emin misiniz?')) {
                  onResetData();
                  alert('Sistem başlangıç durumuna sıfırlandı.');
                }
              }}
              className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold rounded-xl border border-red-200 flex items-center gap-1"
            >
              <RefreshCw size={13} /> Demo Verilerini Sıfırla
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
