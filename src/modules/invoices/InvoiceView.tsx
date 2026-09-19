import React, { useState } from 'react';
import { Invoice, PaymentRecord, Customer } from '../../types';
import { storage } from '../../services/storageService';
import { PDFService } from '../../services/pdfService';
import { WhatsAppService } from '../../services/whatsappService';
import { WhatsAppSendModal } from '../../components/common/WhatsAppSendModal';
import { 
  Plus, Search, Receipt, Printer, DollarSign, CheckCircle2, 
  Clock, AlertCircle, Calendar, ArrowRight, CreditCard, MessageSquare
} from 'lucide-react';

interface InvoiceViewProps {
  invoices: Invoice[];
  customers: Customer[];
  onSaveInvoices: (invoices: Invoice[]) => void;
}

export const InvoiceView: React.FC<InvoiceViewProps> = ({
  invoices,
  customers,
  onSaveInvoices,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(invoices[0] || null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [payAmount, setPayAmount] = useState(0);
  const [payMethod, setPayMethod] = useState<'Havale / EFT' | 'Kredi Kartı' | 'Nakit'>('Havale / EFT');
  const [payStage, setPayStage] = useState<'deposit' | 'progress' | 'completion'>('progress');
  const [payNotes, setPayNotes] = useState('');
  const [whatsAppModalData, setWhatsAppModalData] = useState<{
    isOpen: boolean;
    invoice: Invoice;
    customerPhone: string;
    message: string;
  } | null>(null);

  const formatMoney = (val: number) => 
    new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(val);

  const handleSendWhatsAppReminder = (invoice: Invoice) => {
    const customer = customers.find(c => c.id === invoice.customerId);
    const phone = customer?.phone || '+905050375959';
    const settings = storage.getSettings();

    const message = `Sayın *${invoice.customerName}*,

*3AS TEKNOLOJİ* bünyesinde düzenlenen *${invoice.invoiceNumber}* numaralı faturanıza ait bakiye bilgisi aşağıdadır:

💰 *Genel Toplam:* ${formatMoney(invoice.grandTotal)}
💳 *Kalan Ödenecek:* ${formatMoney(invoice.remainingAmount)}
📅 *Son Ödeme / Vade:* ${invoice.dueDate}
🏦 *Banka:* ${settings.bankName || 'Garanti BBVA'}
🏛️ *IBAN:* ${settings.iban || 'TR33 0006 2000 0001 2345 6789 01'}

Ödemenizi gerçekleştirdiğinizde dekontunuzu bu hat üzerinden iletebilirsiniz.
Teşekkür eder, iyi çalışmalar dileriz.
*3AS TEKNOLOJİ ve BİLİSİM HİZMETLERİ*
📞 +905050375959`;

    WhatsAppService.openWhatsAppDirect(phone, message);

    setWhatsAppModalData({
      isOpen: true,
      invoice,
      customerPhone: phone,
      message,
    });
  };

  const filtered = invoices.filter(inv => {
    const matchSearch = 
      inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.customerName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'all' || inv.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleAddPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice || payAmount <= 0) return;

    const newPayment: PaymentRecord = {
      id: 'pay-' + Date.now(),
      invoiceId: selectedInvoice.id,
      customerId: selectedInvoice.customerId,
      customerName: selectedInvoice.customerName,
      amount: Number(payAmount),
      paymentDate: new Date().toISOString().split('T')[0],
      paymentMethod: payMethod,
      stage: payStage,
      stageLabel: payStage === 'deposit' ? 'Kapora' : payStage === 'progress' ? 'Montaj Sonu Ödeme' : 'Teslimat / Bakiye Kapatma',
      notes: payNotes,
      receivedByUserId: storage.getCurrentUser().id,
      receivedByUserName: storage.getCurrentUser().fullName,
      createdAt: new Date().toISOString(),
    };

    const newPaidTotal = selectedInvoice.paidAmount + Number(payAmount);
    const newRemaining = Math.max(0, selectedInvoice.grandTotal - newPaidTotal);
    const newStatus = newRemaining === 0 ? 'paid' : 'partial';

    const updated = invoices.map(inv => {
      if (inv.id === selectedInvoice.id) {
        return {
          ...inv,
          paidAmount: newPaidTotal,
          remainingAmount: newRemaining,
          status: newStatus as any,
          payments: [newPayment, ...inv.payments],
          updatedAt: new Date().toISOString(),
        };
      }
      return inv;
    });

    onSaveInvoices(updated);
    if (selectedInvoice) {
      setSelectedInvoice(updated.find(i => i.id === selectedInvoice.id) || null);
    }
    storage.logAudit(
      'PAYMENT_RECORDED',
      'invoice',
      selectedInvoice.id,
      selectedInvoice.invoiceNumber,
      { previousRemaining: selectedInvoice.remainingAmount },
      { amount: payAmount, remaining: newRemaining }
    );

    setShowPaymentModal(false);
    setPayAmount(0);
    setPayNotes('');
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
              placeholder="Fatura No veya müşteri unvanı ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white focus:outline-none"
          >
            <option value="all">Tüm Durumlar</option>
            <option value="unpaid">Ödenmedi (Açık)</option>
            <option value="partial">Kısmi Tahsil Edildi</option>
            <option value="paid">Tamamı Ödendi</option>
          </select>
        </div>

        <div className="text-xs text-slate-500 font-semibold">
          Toplam Açık Alacak: <strong className="text-amber-700">{formatMoney(invoices.reduce((s, i) => s + i.remainingAmount, 0))}</strong>
        </div>
      </div>

      {/* Ana Çift Kolonlu Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Fatura Listesi */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-3.5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center text-xs font-bold text-slate-700">
            <span>Faturalar ({filtered.length})</span>
          </div>

          <div className="divide-y divide-slate-100 max-h-[calc(100vh-250px)] overflow-y-auto">
            {filtered.map(inv => {
              const isSelected = selectedInvoice?.id === inv.id;
              return (
                <div
                  key={inv.id}
                  onClick={() => setSelectedInvoice(inv)}
                  className={`p-3.5 transition cursor-pointer ${
                    isSelected ? 'bg-blue-50/80 border-l-4 border-l-blue-600' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-blue-900">{inv.invoiceNumber}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      inv.status === 'paid' ? 'bg-emerald-100 text-emerald-800' :
                      inv.status === 'partial' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {inv.status === 'paid' ? 'Ödendi' :
                       inv.status === 'partial' ? 'Kısmi Ödeme' : 'Ödeme Bekliyor'}
                    </span>
                  </div>

                  <div className="text-xs font-bold text-slate-900">{inv.customerName}</div>

                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className="font-extrabold text-slate-900">{formatMoney(inv.grandTotal)}</span>
                    <span className="text-[11px] font-semibold text-emerald-700">
                      Kalan: {formatMoney(inv.remainingAmount)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Fatura Detayı */}
        <div className="lg:col-span-2">
          {selectedInvoice ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              {/* Başlık ve Aksiyonlar */}
              <div className="p-5 border-b border-slate-100 bg-slate-50/60 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-blue-900">{selectedInvoice.invoiceNumber}</span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800 uppercase">
                      {selectedInvoice.type === 'service' ? 'Teknik Servis' : 'Satış ve Montaj'}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 mt-1">{selectedInvoice.customerName}</h3>
                  <p className="text-xs text-slate-500">
                    Düzenleme: {selectedInvoice.issueDate} • Vade: {selectedInvoice.dueDate}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => PDFService.printInvoice(selectedInvoice)}
                    className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs"
                  >
                    <Printer size={14} /> Resmi e-Fatura Yazdır
                  </button>

                  {selectedInvoice.remainingAmount > 0 && (
                    <>
                      <button
                        onClick={() => handleSendWhatsAppReminder(selectedInvoice)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs"
                        title="Müşteriye WhatsApp ile Bakiye ve IBAN Bilgisi Gönder"
                      >
                        <MessageSquare size={14} /> WhatsApp ile Hatırlat
                      </button>

                      <button
                        onClick={() => {
                          setPayAmount(selectedInvoice.remainingAmount);
                          setShowPaymentModal(true);
                        }}
                        className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs"
                      >
                        <DollarSign size={14} /> Tahsilat Gir
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Fatura Kalemleri */}
              <div className="p-5 space-y-4 text-xs">
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">Hizmet / Malzeme Tanımı</th>
                        <th className="py-2.5 px-3 text-center">Miktar</th>
                        <th className="py-2.5 px-3 text-right">Birim Fiyat</th>
                        <th className="py-2.5 px-3 text-center">KDV</th>
                        <th className="py-2.5 px-3 text-right">Tutar</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {selectedInvoice.items.map(item => (
                        <tr key={item.id}>
                          <td className="py-2.5 px-3 font-semibold text-slate-900">{item.description}</td>
                          <td className="py-2.5 px-3 text-center">{item.quantity}</td>
                          <td className="py-2.5 px-3 text-right">{formatMoney(item.unitPrice)}</td>
                          <td className="py-2.5 px-3 text-center text-slate-500">%{item.vatRate}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-900">{formatMoney(item.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mali Toplamlar */}
                <div className="flex justify-end">
                  <div className="w-72 bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1.5">
                    <div className="flex justify-between text-slate-600">
                      <span>Ara Toplam:</span>
                      <span className="font-semibold">{formatMoney(selectedInvoice.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>KDV Tutarı:</span>
                      <span className="font-semibold">{formatMoney(selectedInvoice.taxTotal)}</span>
                    </div>
                    <div className="pt-2 border-t border-slate-300 flex justify-between font-extrabold text-sm text-blue-950">
                      <span>GENEL TOPLAM:</span>
                      <span>{formatMoney(selectedInvoice.grandTotal)}</span>
                    </div>
                    <div className="flex justify-between text-emerald-700 font-bold pt-1">
                      <span>Tahsil Edilen:</span>
                      <span>{formatMoney(selectedInvoice.paidAmount)}</span>
                    </div>
                    <div className="flex justify-between text-red-600 font-extrabold">
                      <span>Kalan Bakiye:</span>
                      <span>{formatMoney(selectedInvoice.remainingAmount)}</span>
                    </div>
                  </div>
                </div>

                {/* Tahsilat Hareketleri */}
                <div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                    Tahsilat Hareketleri ({selectedInvoice.payments.length})
                  </h4>

                  {selectedInvoice.payments.length > 0 ? (
                    <div className="space-y-2">
                      {selectedInvoice.payments.map(p => (
                        <div key={p.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                          <div>
                            <div className="font-bold text-slate-900">{p.stageLabel || 'Tahsilat'} • {p.paymentMethod}</div>
                            <div className="text-[11px] text-slate-500">Tarih: {p.paymentDate} • Alan: {p.receivedByUserName}</div>
                          </div>
                          <div className="text-sm font-black text-emerald-700">{formatMoney(p.amount)}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-400 py-3 text-center">Henüz tahsilat kaydı girilmedi.</p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
              Görüntülemek için soldan bir fatura seçiniz.
            </div>
          )}
        </div>
      </div>

      {/* TAHSİLAT GİRİŞ MODALI */}
      {showPaymentModal && selectedInvoice && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Tahsilat Makbuzu Kaydı</h3>
              <button onClick={() => setShowPaymentModal(false)} className="text-slate-400">✕</button>
            </div>

            <form onSubmit={handleAddPayment} className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="font-bold text-slate-900">{selectedInvoice.customerName}</div>
                <div className="text-slate-600 mt-1">
                  Kalan Açık Bakiye: <strong className="text-red-600">{formatMoney(selectedInvoice.remainingAmount)}</strong>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Tahsil Edilen Tutar (TL) <span className="text-red-500">*</span></label>
                <input
                  type="number"
                  required
                  min="1"
                  max={selectedInvoice.remainingAmount}
                  value={payAmount}
                  onChange={(e) => setPayAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Ödeme Yöntemi</label>
                  <select
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="Havale / EFT">Havale / EFT</option>
                    <option value="Kredi Kartı">Kredi Kartı</option>
                    <option value="Nakit">Nakit</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Ödeme Aşaması</label>
                  <select
                    value={payStage}
                    onChange={(e) => setPayStage(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="deposit">Kapora (%40)</option>
                    <option value="progress">Montaj Bitimi (%40)</option>
                    <option value="completion">Teslimat & Bakiye Kapatma</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Dekont / Açıklama Notu</label>
                <input
                  type="text"
                  placeholder="İş Bankası dekont no veya POS slip no..."
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg"
                >
                  Tahsilatı Kaydet
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
          title={`Fatura & Bakiye Hatırlatması: ${whatsAppModalData.invoice.invoiceNumber}`}
          recipientName={whatsAppModalData.invoice.customerName}
          recipientPhone={whatsAppModalData.customerPhone}
          initialMessage={whatsAppModalData.message}
          relatedEntityType="invoice"
          relatedEntityId={whatsAppModalData.invoice.id}
          relatedEntityNumber={whatsAppModalData.invoice.invoiceNumber}
          onClose={() => setWhatsAppModalData(null)}
        />
      )}
    </div>
  );
};
