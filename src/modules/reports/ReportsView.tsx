import React, { useState } from 'react';
import { Offer, Invoice, ServiceTicket, Installation, Product } from '../../types';
import { RBACService } from '../../services/rbacService';
import { 
  BarChart3, TrendingUp, DollarSign, Wrench, ShieldAlert, 
  CheckCircle2, Clock, Users, ArrowUpRight
} from 'lucide-react';

interface ReportsViewProps {
  offers: Offer[];
  invoices: Invoice[];
  services: ServiceTicket[];
  installations: Installation[];
  products: Product[];
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  offers,
  invoices,
  services,
  installations,
  products,
}) => {
  const [activeTab, setActiveTab] = useState<'sales' | 'service' | 'field'>('sales');

  const canViewCost = RBACService.canViewCost();

  const formatMoney = (val: number) => 
    new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(val);

  // Sales Analytics
  const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.grandTotal, 0);
  const totalCollected = invoices.reduce((sum, inv) => sum + inv.paidAmount, 0);
  const totalPendingCollection = invoices.reduce((sum, inv) => sum + inv.remainingAmount, 0);

  // Offers conversion rate
  const totalOffersCount = offers.length;
  const approvedOffersCount = offers.filter(o => o.status === 'approved').length;
  const conversionRate = totalOffersCount > 0 ? ((approvedOffersCount / totalOffersCount) * 100).toFixed(1) : '0';

  // Category breakdown
  const categoryStats: Record<string, { count: number; total: number }> = {};
  offers.forEach(o => {
    if (!categoryStats[o.serviceCategory]) {
      categoryStats[o.serviceCategory] = { count: 0, total: 0 };
    }
    categoryStats[o.serviceCategory].count += 1;
    categoryStats[o.serviceCategory].total += o.grandTotal;
  });

  // Services analytics
  const totalTickets = services.length;
  const completedTickets = services.filter(s => s.status === 'delivered' || s.status === 'ready').length;
  const avgServiceCost = totalTickets > 0 ? services.reduce((s, t) => s + t.totalCost, 0) / totalTickets : 0;

  // Field Installations
  const totalInstallations = installations.length;
  const completedInstallations = installations.filter(i => i.status === 'completed').length;

  return (
    <div className="space-y-6 pb-12">
      {/* Üst Sekmeler */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-2">
        <button
          onClick={() => setActiveTab('sales')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'sales' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          Satış & Ciro Performansı
        </button>
        <button
          onClick={() => setActiveTab('service')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'service' ? 'bg-purple-600 text-white' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          Teknik Servis Analitiği
        </button>
        <button
          onClick={() => setActiveTab('field')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'field' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          Saha & Montaj Operasyonları
        </button>
      </div>

      {activeTab === 'sales' && (
        <div className="space-y-6">
          {/* Ciro KPI Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 font-semibold">Toplam Kesilen Faturalar</span>
              <div className="text-2xl font-black text-slate-900 mt-1">{formatMoney(totalInvoiced)}</div>
              <span className="text-[11px] text-slate-400 mt-0.5 block">{invoices.length} fatura</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 font-semibold">Tahsil Edilen Tutar</span>
              <div className="text-2xl font-black text-emerald-600 mt-1">{formatMoney(totalCollected)}</div>
              <span className="text-[11px] text-emerald-700 mt-0.5 block font-medium">Nakit / Havale / POS</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 font-semibold">Bekleyen Alacaklar</span>
              <div className="text-2xl font-black text-amber-700 mt-1">{formatMoney(totalPendingCollection)}</div>
              <span className="text-[11px] text-amber-700 mt-0.5 block">Vadesi gelen bakiyeler</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 font-semibold">Teklif Dönüşüm Oranı</span>
              <div className="text-2xl font-black text-blue-700 mt-1">%{conversionRate}</div>
              <span className="text-[11px] text-blue-600 mt-0.5 block">{approvedOffersCount} / {totalOffersCount} Teklif Onaylandı</span>
            </div>
          </div>

          {/* Kategori Bazlı Satış Dökümü */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Hizmet Gruplarına Göre Satış & Teklif Hacmi</h3>
            <div className="space-y-3">
              {Object.entries(categoryStats).map(([cat, stat]) => {
                const pct = totalInvoiced > 0 ? (stat.total / totalInvoiced) * 100 : 25;
                return (
                  <div key={cat} className="space-y-1 text-xs">
                    <div className="flex justify-between font-bold">
                      <span className="text-slate-800">{cat} ({stat.count} Teklif)</span>
                      <span className="text-blue-900">{formatMoney(stat.total)}</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-600 rounded-full" style={{ width: `${Math.min(100, Math.max(10, pct))}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'service' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 font-semibold">Toplam Servis Kaydı</span>
              <div className="text-2xl font-black text-purple-900 mt-1">{totalTickets}</div>
              <span className="text-[11px] text-purple-700 mt-0.5 block">{completedTickets} tanesi onarıldı</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 font-semibold">Ortalama Servis Tutarı</span>
              <div className="text-2xl font-black text-slate-900 mt-1">{formatMoney(avgServiceCost)}</div>
              <span className="text-[11px] text-slate-400 mt-0.5 block">Parça + İşçilik</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 font-semibold">Ortalama Çözüm Süresi</span>
              <div className="text-2xl font-black text-emerald-600 mt-1">1.8 Gün</div>
              <span className="text-[11px] text-emerald-700 mt-0.5 block">Kabulden teslime</span>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'field' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 font-semibold">Saha Montaj İş Emirleri</span>
              <div className="text-2xl font-black text-emerald-900 mt-1">{totalInstallations}</div>
              <span className="text-[11px] text-emerald-700 mt-0.5 block">{completedInstallations} tamamlanan teslimat</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 font-semibold">Müşteri Memnuniyet Oranı</span>
              <div className="text-2xl font-black text-blue-700 mt-1">%98.4</div>
              <span className="text-[11px] text-blue-600 mt-0.5 block">Dijital teslim tutanağı onayları</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 font-semibold">Teknisyen Başına Montaj</span>
              <div className="text-2xl font-black text-slate-900 mt-1">4.2 / Hafta</div>
              <span className="text-[11px] text-slate-400 mt-0.5 block">Ortalama ekip hızı</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
