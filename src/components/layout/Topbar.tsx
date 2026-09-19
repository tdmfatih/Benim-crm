import React, { useState } from 'react';
import { User, Offer, ServiceTicket, Installation } from '../../types';
import { NavTab } from './Sidebar';
import { 
  Menu, Search, Plus, ExternalLink, Bell, 
  FileText, Wrench, Cpu, Users
} from 'lucide-react';

interface TopbarProps {
  currentTab?: NavTab;
  activeTab?: NavTab;
  currentUser: User;
  onOpenMobileNav?: () => void;
  onQuickAction?: (action: 'new_lead' | 'new_offer' | 'new_service' | 'new_installation') => void;
  onOpenPublicLink?: (type: 'offer' | 'service' | 'delivery') => void;
  offers?: Offer[];
  services?: ServiceTicket[];
  installations?: Installation[];
  onOpenPublicPortal?: (type: 'offer' | 'service' | 'delivery', token: string) => void;
  onQuickNewOffer?: () => void;
  onQuickNewService?: () => void;
  onQuickNewCustomer?: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({
  currentTab,
  activeTab,
  currentUser,
  onOpenMobileNav,
  onQuickAction,
  onOpenPublicLink,
  offers = [],
  services = [],
  installations = [],
  onOpenPublicPortal,
  onQuickNewOffer,
  onQuickNewService,
  onQuickNewCustomer,
}) => {
  const [showQuickMenu, setShowQuickMenu] = useState(false);
  const [showPortalMenu, setShowPortalMenu] = useState(false);

  const tab = activeTab || currentTab || 'dashboard';

  const tabTitles: Record<NavTab, { title: string; desc: string }> = {
    dashboard: { title: 'Yönetici Kontrol Paneli', desc: 'Anlık KPI metrikleri, montaj ajandası ve satış pipeline' },
    crm: { title: 'CRM ve Lead Yönetimi', desc: 'Gelen potansiyel talepler, keşif planları ve müşteri dönüşümleri' },
    customers: { title: 'Müşteriler & Cari Kartlar', desc: 'Bireysel ve kurumsal müşteri 360 derece operasyonel timeline' },
    offers: { title: 'Kurumsal Teklif Yönetimi', desc: 'Çok versiyonlu fiyat teklifleri, PDF çıktısı ve güvenli online onay' },
    projects: { title: 'Projeler ve İş Emirleri', desc: 'Devam eden anahtar teslim taahhüt ve montaj işleri' },
    installations: { title: 'Saha ve Montaj Planı', desc: 'Teknisyen görevlendirme, mobil checklist ve teslim tutanakları' },
    service: { title: 'Teknik Servis Masası', desc: 'Donanım tamiri, IT arıza teşhisi ve yedek parça maliyet onayları' },
    inventory: { title: 'Ürün Kataloğu & Stok Defteri', desc: 'Kamera, alarm, ağ donanımı, yedek parçalar ve stok hareketleri' },
    invoices: { title: 'Faturalar & e-Fatura', desc: 'Satış, servis ve proforma faturalar, KDV dökümleri' },
    payments: { title: 'Tahsilatlar & Parçalı Ödemeler', desc: 'Kapora, montaj sonu ve teslimat tahsilat takipleri' },
    calendar: { title: 'Takvim ve Operasyon Ajandası', desc: 'Keşif randevuları, montaj günleri ve servis teslimatları' },
    reports: { title: 'Raporlama & Verimlilik', desc: 'Ciro dağılımı, teknisyen performansları ve dönüşüm oranları' },
    communications: { title: 'WhatsApp İletişim Merkezi', desc: 'Otomatik giden şablonlu mesajlar ve teslimat bildirimleri' },
    automations: { title: 'Otomasyon Motoru (Rules)', desc: 'Tetikleyici (Trigger) ve eylem (Action) tabanlı iş akışları' },
    users: { title: 'Kullanıcılar & Granüler Yetki Yönetimi', desc: 'Yeni personel açma, departman atama ve fonksiyonel izin matrisi' },
    settings: { title: 'Sistem & Şirket Ayarları', desc: '3AS Teknoloji kurumsal kimlik, RBAC yetki matrisi ve hizmet kataloğu' },
  };

  const currentInfo = tabTitles[tab] || { title: '3AS Teknoloji', desc: '' };

  const handlePortalSelect = (type: 'offer' | 'service' | 'delivery') => {
    setShowPortalMenu(false);
    if (onOpenPublicLink) {
      onOpenPublicLink(type);
    } else if (onOpenPublicPortal) {
      if (type === 'offer') {
        const token = offers[0]?.secureToken || '3as_token_demo';
        onOpenPublicPortal('offer', token);
      } else if (type === 'service') {
        const token = services[0]?.secureApprovalToken || services[0]?.approvalToken || '3as_srv_demo';
        onOpenPublicPortal('service', token);
      } else if (type === 'delivery') {
        const token = installations[0]?.secureDeliveryToken || installations[0]?.deliveryApprovalToken || '3as_deliv_demo';
        onOpenPublicPortal('delivery', token);
      }
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 px-4 py-3 flex items-center justify-between shadow-xs">
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileNav}
          className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-xl"
          title="Menüyü Aç"
        >
          <Menu size={20} />
        </button>

        <div>
          <h1 className="text-base font-bold text-slate-900 leading-tight">
            {currentInfo.title}
          </h1>
          <p className="text-xs text-slate-500 hidden sm:block">
            {currentInfo.desc}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        {/* Public Portal Link Tester Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setShowPortalMenu(!showPortalMenu);
              setShowQuickMenu(false);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-semibold border border-blue-200 transition"
            title="Müşterinin gördüğü tokenlı onay sayfalarını test et"
          >
            <ExternalLink size={14} />
            <span className="hidden sm:inline">Müşteri Onay Sayfaları (Test)</span>
          </button>

          {showPortalMenu && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in zoom-in-95">
              <div className="px-2.5 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Müşteri Public Link Önizleme
              </div>
              <button
                onClick={() => handlePortalSelect('offer')}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-xl text-left"
              >
                <FileText size={14} className="text-blue-600" />
                <div>
                  <div className="font-bold">Teklif Onay Ekranı</div>
                  <div className="text-[10px] text-slate-400">/offer/3as_token_8f93...</div>
                </div>
              </button>
              <button
                onClick={() => handlePortalSelect('service')}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-xl text-left"
              >
                <Cpu size={14} className="text-purple-600" />
                <div>
                  <div className="font-bold">Teknik Servis Onay Ekranı</div>
                  <div className="text-[10px] text-slate-400">/service-approval/3as_srv...</div>
                </div>
              </button>
              <button
                onClick={() => handlePortalSelect('delivery')}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-xl text-left"
              >
                <Wrench size={14} className="text-emerald-600" />
                <div>
                  <div className="font-bold">Montaj Teslim Onay Ekranı</div>
                  <div className="text-[10px] text-slate-400">/delivery-confirm/3as_deliv...</div>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* Quick Action Button */}
        <div className="relative">
          <button
            onClick={() => {
              setShowQuickMenu(!showQuickMenu);
              setShowPortalMenu(false);
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">Hızlı İşlem</span>
          </button>

          {showQuickMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in zoom-in-95">
              <button
                onClick={() => {
                  if (onQuickAction) onQuickAction('new_lead');
                  if (onQuickNewCustomer) onQuickNewCustomer();
                  setShowQuickMenu(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl text-left"
              >
                <Users size={14} className="text-blue-600" /> Yeni Lead / Talep Girişi
              </button>
              <button
                onClick={() => {
                  if (onQuickAction) onQuickAction('new_offer');
                  if (onQuickNewOffer) onQuickNewOffer();
                  setShowQuickMenu(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl text-left"
              >
                <FileText size={14} className="text-amber-600" /> Yeni Fiyat Teklifi Hazırla
              </button>
              <button
                onClick={() => {
                  if (onQuickAction) onQuickAction('new_installation');
                  setShowQuickMenu(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl text-left"
              >
                <Wrench size={14} className="text-emerald-600" /> Montaj İş Emri Oluştur
              </button>
              <button
                onClick={() => {
                  if (onQuickAction) onQuickAction('new_service');
                  if (onQuickNewService) onQuickNewService();
                  setShowQuickMenu(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl text-left"
              >
                <Cpu size={14} className="text-purple-600" /> Cihaz Kabul / Servis Fişi
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
