import React, { useState } from 'react';
import { Invoice } from '../../types';
import { CreditCard, Search, Calendar, CheckCircle2, DollarSign } from 'lucide-react';

interface PaymentsViewProps {
  invoices: Invoice[];
}

export const PaymentsView: React.FC<PaymentsViewProps> = ({ invoices }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [methodFilter, setMethodFilter] = useState('all');

  const formatMoney = (val: number) => 
    new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(val);

  // Flatten payments with customer info
  const allPayments = invoices.flatMap(inv => 
    inv.payments.map(p => ({
      ...p,
      customerName: inv.customerName,
      invoiceNumber: inv.invoiceNumber,
    }))
  );

  const filtered = allPayments.filter(p => {
    const matchSearch = 
      p.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.notes && p.notes.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchMethod = methodFilter === 'all' || p.paymentMethod === methodFilter;
    return matchSearch && matchMethod;
  });

  const totalCollected = filtered.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-5 pb-12">
      {/* KPI Kartları */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-semibold">Toplam Tahsilat</span>
          <div className="text-2xl font-black text-emerald-600 mt-1">{formatMoney(totalCollected)}</div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">{filtered.length} adet işlem</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-semibold">Havale / EFT Payı</span>
          <div className="text-2xl font-black text-blue-700 mt-1">
            {formatMoney(filtered.filter(p => p.paymentMethod === 'Havale / EFT').reduce((s, p) => s + p.amount, 0))}
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Banka hesabı hareketleri</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-semibold">Nakit / POS Tahsilatı</span>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {formatMoney(filtered.filter(p => p.paymentMethod !== 'Havale / EFT').reduce((s, p) => s + p.amount, 0))}
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Saha veya mağaza ödemeleri</span>
        </div>
      </div>

      {/* Filtre Barı */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Müşteri, fatura no veya dekont..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white focus:outline-none"
          >
            <option value="all">Tüm Ödeme Yöntemleri</option>
            <option value="Havale / EFT">Havale / EFT</option>
            <option value="Kredi Kartı">Kredi Kartı</option>
            <option value="Nakit">Nakit</option>
          </select>
        </div>
      </div>

      {/* Tahsilatlar Tablosu */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
            <tr>
              <th className="py-3 px-4">Tarih</th>
              <th className="py-3 px-4">Müşteri</th>
              <th className="py-3 px-4">Fatura No</th>
              <th className="py-3 px-4">Aşama / Kapsam</th>
              <th className="py-3 px-4">Ödeme Yöntemi</th>
              <th className="py-3 px-4">Tahsil Eden</th>
              <th className="py-3 px-4 text-right">Tahsil Edilen Tutar</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {filtered.map(p => (
              <tr key={p.id} className="hover:bg-slate-50 transition">
                <td className="py-3.5 px-4 font-mono text-slate-500">{p.paymentDate}</td>
                <td className="py-3.5 px-4 font-bold text-slate-900">{p.customerName}</td>
                <td className="py-3.5 px-4 font-semibold text-blue-700">{p.invoiceNumber}</td>
                <td className="py-3.5 px-4">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    {p.stageLabel || 'Tahsilat'}
                  </span>
                </td>
                <td className="py-3.5 px-4 font-medium">{p.paymentMethod}</td>
                <td className="py-3.5 px-4 text-slate-500">{p.receivedByUserName}</td>
                <td className="py-3.5 px-4 text-right font-black text-emerald-600 text-sm">
                  {formatMoney(p.amount)}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-400">
                  Tahsilat kaydı bulunamadı.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
