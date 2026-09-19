import React from 'react';
import { 
  Lead, Offer, Installation, ServiceTicket, Invoice, User, AuditLogEntry 
} from '../../types';
import { 
  TrendingUp, Users, FileText, Wrench, Cpu, DollarSign, 
  Clock, CheckCircle, AlertCircle, Calendar, ArrowUpRight,
  ShieldCheck, ArrowRight
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid 
} from 'recharts';

interface DashboardViewProps {
  leads: Lead[];
  offers: Offer[];
  installations: Installation[];
  services: ServiceTicket[];
  invoices: Invoice[];
  users?: User[];
  auditLogs?: AuditLogEntry[];
  onNavigate: (tab: any) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  leads,
  offers,
  installations,
  services,
  invoices,
  users = [],
  auditLogs = [],
  onNavigate,
}) => {
  const formatMoney = (val: number) => 
    new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(val);

  // KPIs
  const newLeads = leads.filter(l => l.stage === 'new').length;
  const pendingOffers = offers.filter(o => o.status === 'sent' || o.status === 'draft');
  const pendingOffersTotal = pendingOffers.reduce((sum, o) => sum + o.grandTotal, 0);
  const wonOffers = offers.filter(o => o.status === 'approved').length;

  const todayStr = '2026-09-18'; // Real or simulated today
  const todayInstallations = installations.filter(i => i.scheduledDate === todayStr).length;
  const inProgressInstallations = installations.filter(i => i.status === 'in_progress' || i.status === 'started').length;

  const openServices = services.filter(s => s.status !== 'delivered' && s.status !== 'cancelled').length;
  const readyServices = services.filter(s => s.status === 'ready').length;

  const pendingInvoiceBalance = invoices
    .filter(i => i.status !== 'paid' && i.status !== 'cancelled')
    .reduce((sum, i) => sum + i.remainingAmount, 0);

  const monthlySales = invoices
    .filter(i => i.status !== 'cancelled')
    .reduce((sum, i) => sum + i.grandTotal, 0);

  const monthlyCollections = invoices
    .flatMap(i => i.payments)
    .reduce((sum, p) => sum + p.amount, 0);

  // Pipeline Chart Data
  const pipelineData = [
    { stage: 'Yeni Lead', count: leads.filter(l => l.stage === 'new').length },
    { stage: 'İletişim', count: leads.filter(l => l.stage === 'contacted').length },
    { stage: 'Keşif Planı', count: leads.filter(l => l.stage === 'discovery_scheduled').length },
    { stage: 'Teklif Hazır', count: leads.filter(l => l.stage === 'offer_preparing').length },
    { stage: 'Teklif Gönderildi', count: offers.filter(o => o.status === 'sent').length },
    { stage: 'Kazanıldı', count: offers.filter(o => o.status === 'approved').length },
  ];

  // Technician Workload
  const technicians = users.filter(u => u.department === 'Saha Montaj' || u.department === 'Teknik Servis');
  const techWorkload = technicians.map(t => {
    const activeInstallations = installations.filter(
      i => i.assignedTechnicians.some(tech => tech.userId === t.id) && i.status !== 'completed'
    ).length;
    const activeServices = services.filter(
      s => s.assignedTechnicianId === t.id && s.status !== 'delivered' && s.status !== 'cancelled'
    ).length;
    return {
      ...t,
      workloadCount: activeInstallations + activeServices,
      activeInstallations,
      activeServices,
    };
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* KPI 1: Leadler */}
        <div 
          onClick={() => onNavigate('crm')}
          className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs hover:border-blue-300 hover:shadow-md transition cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Yeni Leadler</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition">
              <Users size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{newLeads}</div>
          <div className="text-[11px] text-blue-600 font-semibold mt-1 flex items-center gap-1">
            Toplam {leads.length} aktif talep <ArrowUpRight size={12} />
          </div>
        </div>

        {/* KPI 2: Bekleyen Teklifler */}
        <div 
          onClick={() => onNavigate('offers')}
          className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs hover:border-amber-300 hover:shadow-md transition cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Bekleyen Teklifler</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl group-hover:bg-amber-600 group-hover:text-white transition">
              <FileText size={16} />
            </div>
          </div>
          <div className="text-xl font-black text-slate-900">{formatMoney(pendingOffersTotal)}</div>
          <div className="text-[11px] text-amber-700 font-semibold mt-1">
            {pendingOffers.length} teklif yanıt bekliyor ({wonOffers} onaylandı)
          </div>
        </div>

        {/* KPI 3: Saha & Montaj */}
        <div 
          onClick={() => onNavigate('installations')}
          className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs hover:border-emerald-300 hover:shadow-md transition cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Bugünkü Montajlar</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl group-hover:bg-emerald-600 group-hover:text-white transition">
              <Wrench size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{todayInstallations}</div>
          <div className="text-[11px] text-emerald-700 font-semibold mt-1">
            {inProgressInstallations} montaj sahada devam ediyor
          </div>
        </div>

        {/* KPI 4: Teknik Servis */}
        <div 
          onClick={() => onNavigate('service')}
          className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs hover:border-purple-300 hover:shadow-md transition cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Teknik Servis Masası</span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-xl group-hover:bg-purple-600 group-hover:text-white transition">
              <Cpu size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{openServices} Cihaz</div>
          <div className="text-[11px] text-purple-700 font-semibold mt-1">
            {readyServices} cihaz teslime hazır
          </div>
        </div>
      </div>

      {/* Finansal KPI Özet Şeridi */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="bg-slate-900 text-white p-4 rounded-2xl flex items-center justify-between shadow-md">
          <div>
            <div className="text-xs text-slate-400 font-medium">Bu Ayki Düzenlenen Satış</div>
            <div className="text-xl font-black text-white mt-0.5">{formatMoney(monthlySales)}</div>
          </div>
          <div className="p-2.5 bg-blue-500/20 text-blue-400 rounded-xl">
            <TrendingUp size={22} />
          </div>
        </div>

        <div className="bg-slate-900 text-white p-4 rounded-2xl flex items-center justify-between shadow-md">
          <div>
            <div className="text-xs text-slate-400 font-medium">Bu Ay Tahsil Edilen Tutar</div>
            <div className="text-xl font-black text-emerald-400 mt-0.5">{formatMoney(monthlyCollections)}</div>
          </div>
          <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl">
            <DollarSign size={22} />
          </div>
        </div>

        <div className="bg-slate-900 text-white p-4 rounded-2xl flex items-center justify-between shadow-md">
          <div>
            <div className="text-xs text-slate-400 font-medium">Açık / Bekleyen Cari Alacak</div>
            <div className="text-xl font-black text-amber-400 mt-0.5">{formatMoney(pendingInvoiceBalance)}</div>
          </div>
          <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl">
            <Clock size={22} />
          </div>
        </div>
      </div>

      {/* Orta Blok: Satış Pipeline Grafiği & Yaklaşan Montajlar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Satış Pipeline Grafiği (2 Kolon) */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">CRM Satış Pipeline Akışı</h3>
              <p className="text-xs text-slate-500">Aşamalardaki lead ve teklif adetleri</p>
            </div>
            <button 
              onClick={() => onNavigate('crm')}
              className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-0.5"
            >
              Pipeline Panosu <ArrowRight size={12} />
            </button>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pipelineData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="stage" tick={{ fontSize: 11, fill: '#64748b' }} interval={0} angle={-15} textAnchor="end" />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', color: '#fff', fontSize: '12px', border: 'none' }}
                  formatter={(value: any) => [`${value} Adet`, 'Hacim']}
                />
                <Bar dataKey="count" fill="#2563eb" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Teknisyen İş Yükü (1 Kolon) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col">
          <h3 className="text-sm font-bold text-slate-900 mb-1">Teknisyen İş Yükü</h3>
          <p className="text-xs text-slate-500 mb-4">Saha montaj ve atölye görev dağılımı</p>

          <div className="space-y-3 flex-1 overflow-y-auto">
            {techWorkload.map(tech => (
              <div key={tech.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold text-[10px] flex items-center justify-center">
                      {tech.fullName.split(' ').map(n => n[0]).join('')}
                    </div>
                    <span className="text-xs font-bold text-slate-900">{tech.fullName}</span>
                  </div>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-800">
                    {tech.workloadCount} Aktif Görev
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 flex justify-between">
                  <span>Saha Montaj: <strong>{tech.activeInstallations}</strong></span>
                  <span>Teknik Servis: <strong>{tech.activeServices}</strong></span>
                </div>
              </div>
            ))}
          </div>

          <button 
            onClick={() => onNavigate('installations')}
            className="w-full mt-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition text-center"
          >
            Montaj Planını Aç
          </button>
        </div>
      </div>

      {/* Alt Blok: Yaklaşan Montajlar & Son Güvenlik / Audit Aktiviteleri */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Yaklaşan Saha Montajları */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Saha Montaj Ajandası</h3>
              <p className="text-xs text-slate-500">Planlanan ve devam eden kurulumlar</p>
            </div>
            <button
              onClick={() => onNavigate('installations')}
              className="text-xs text-blue-600 font-bold hover:underline"
            >
              Tümünü Gör
            </button>
          </div>

          <div className="space-y-3">
            {installations.slice(0, 3).map(inst => (
              <div key={inst.id} className="p-3.5 rounded-xl border border-slate-100 bg-slate-50 flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-blue-700">{inst.installationNumber}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      inst.status === 'completed' ? 'bg-emerald-100 text-emerald-800' :
                      inst.status === 'in_progress' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {inst.status === 'completed' ? 'Tamamlandı' : inst.status === 'in_progress' ? 'Devam Ediyor' : 'Planlandı'}
                    </span>
                  </div>
                  <div className="text-xs font-bold text-slate-900 mt-1">{inst.customerName}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{inst.projectName}</div>
                </div>
                <div className="text-right text-xs">
                  <span className="font-semibold text-slate-700 flex items-center gap-1">
                    <Calendar size={12} /> {inst.scheduledDate} {inst.scheduledTime}
                  </span>
                  <div className="text-[11px] text-slate-400 mt-1">
                    {inst.assignedTechnicians.map(t => t.fullName).join(', ')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Son Audit Log Akışı */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <ShieldCheck size={16} className="text-blue-600" /> Son Sistem ve Güvenlik Hareketleri
              </h3>
              <p className="text-xs text-slate-500">Kritik işlem logları ve kullanıcı audit geçmişi</p>
            </div>
            <button
              onClick={() => onNavigate('settings')}
              className="text-xs text-blue-600 font-bold hover:underline"
            >
              Audit Log Detayı
            </button>
          </div>

          <div className="space-y-2.5">
            {auditLogs.slice(0, 4).map(log => (
              <div key={log.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 text-[10px]">
                      {log.action}
                    </span>
                    <span>{log.entityName}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Yapan: <strong>{log.userName}</strong> ({log.userRole})
                  </div>
                </div>
                <span className="text-[10px] text-slate-400 shrink-0">
                  {new Date(log.timestamp).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
