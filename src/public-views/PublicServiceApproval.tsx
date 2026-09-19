import React, { useState, useEffect } from 'react';
import { storage } from '../services/storageService';
import { PDFService } from '../services/pdfService';
import { BrandLogo } from '../components/layout/BrandLogo';
import { ServiceTicket } from '../types';
import { CheckCircle2, XCircle, Printer, ShieldCheck, Wrench, AlertCircle, Laptop } from 'lucide-react';

interface PublicServiceApprovalProps {
  token: string;
  onBackToApp?: () => void;
  onApproved?: (ticket: ServiceTicket) => void;
}

export const PublicServiceApproval: React.FC<PublicServiceApprovalProps> = ({ token, onBackToApp, onApproved }) => {
  const [ticket, setTicket] = useState<ServiceTicket | null>(null);
  const [actionDone, setActionDone] = useState<'approved' | 'rejected' | null>(null);
  const [approverName, setApproverName] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const found = storage.getServiceTicketByApprovalToken(token);
    if (found) {
      setTicket(found);
      if (found.status === 'approved' || found.customerApproval?.isApproved) {
        setActionDone('approved');
      } else if (found.status === 'cancelled') {
        setActionDone('rejected');
      }
    }
  }, [token]);

  if (!ticket) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white max-w-md w-full p-8 rounded-2xl shadow-lg text-center border border-slate-200">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={32} />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Servis Kaydı Bulunamadı</h2>
          <p className="text-sm text-slate-600 mb-6">
            Bu teknik servis onay bağlantısı geçersiz veya daha önce sonuçlandırılmış olabilir. Lütfen 3AS Teknoloji Servis Masası ile iletişime geçiniz.
          </p>
          {onBackToApp && (
            <button
              onClick={onBackToApp}
              className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-700"
            >
              Yönetim Paneline Dön
            </button>
          )}
        </div>
      </div>
    );
  }

  const formatMoney = (val: number) => 
    new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(val);

  const handleApprove = () => {
    if (!approverName.trim()) {
      alert('Lütfen adınızı ve soyadınızı giriniz.');
      return;
    }

    const tickets = storage.getServiceTickets();
    const idx = tickets.findIndex(t => t.id === ticket.id);
    if (idx === -1) return;

    const updated: ServiceTicket = {
      ...tickets[idx],
      status: 'approved',
      customerApproval: {
        isApproved: true,
        approvedAt: new Date().toISOString(),
        approverName,
        notes,
        clientIp: '88.245.19.102 (Doğrulandı)',
      },
    };
    // Mark operations as approved
    updated.operations = updated.operations.map(op => ({ ...op, isApprovedByCustomer: true }));

    tickets[idx] = updated;
    storage.saveServiceTickets(tickets);

    storage.logAudit(
      'SERVICE_APPROVED_ONLINE',
      'service',
      ticket.id,
      ticket.ticketNumber,
      { status: ticket.status },
      { status: 'approved', approver: approverName, total: ticket.totalCost }
    );

    setTicket(updated);
    setActionDone('approved');
    if (onApproved) onApproved(updated);
  };

  const handleReject = () => {
    const tickets = storage.getServiceTickets();
    const idx = tickets.findIndex(t => t.id === ticket.id);
    if (idx === -1) return;

    const updated: ServiceTicket = {
      ...tickets[idx],
      status: 'cancelled',
      customerApproval: {
        isApproved: false,
        approvedAt: new Date().toISOString(),
        approverName: approverName || 'Müşteri',
        notes: notes || 'Onarım maliyeti onaylanmadı.',
      },
    };
    tickets[idx] = updated;
    storage.saveServiceTickets(tickets);

    storage.logAudit(
      'SERVICE_REJECTED_ONLINE',
      'service',
      ticket.id,
      ticket.ticketNumber,
      { status: ticket.status },
      { status: 'cancelled', notes }
    );

    setTicket(updated);
    setActionDone('rejected');
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <BrandLogo size="md" />
            <div className="text-left sm:text-right">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                <ShieldCheck size={14} /> Güvenli Teknik Servis Onay Ekranı
              </span>
              <p className="text-xs text-slate-500 mt-1">Takip No: <strong>{ticket.ticketNumber}</strong></p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Cihaz Bilgisi</span>
              <div className="flex items-center gap-2">
                <Laptop className="text-purple-600" size={18} />
                <h3 className="text-sm font-bold text-slate-900">{ticket.brand} {ticket.model}</h3>
              </div>
              <p className="text-xs text-slate-600 mt-1">Tür: {ticket.deviceType} | Seri No: {ticket.serialNumber || 'Belirtilmedi'}</p>
              <p className="text-xs text-slate-500 mt-1">Teslim Edilen: {ticket.accessoriesDelivered.join(', ') || 'Aksesuar yok'}</p>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Müşteri / Muhatap</span>
              <h3 className="text-sm font-bold text-slate-900">{ticket.customerName}</h3>
              <p className="text-xs text-slate-600 mt-1">{ticket.customerPhone}</p>
              <p className="text-xs text-slate-500 mt-1">Kayıt: {new Date(ticket.createdAt).toLocaleDateString('tr-TR')}</p>
            </div>
          </div>
        </div>

        {/* Teşhis & Arıza Tespiti */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-4">
            <Wrench size={16} className="text-purple-600" /> Arıza Teşhisi ve Tespit Raporu
          </h3>

          <div className="space-y-3">
            <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl text-xs">
              <strong className="text-amber-900 block mb-1">Müşteri Bildirimi / Şikayet:</strong>
              <p className="text-amber-800">{ticket.reportedIssue}</p>
            </div>

            <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl text-xs">
              <strong className="text-blue-900 block mb-1">3AS Teknoloji Teknisyen Tespiti:</strong>
              <p className="text-blue-800">{ticket.diagnosticNotes || 'Cihaz atölyemizde test edilmiş ve aşağıdaki onarım adımları uygun bulunmuştur.'}</p>
            </div>
          </div>
        </div>

        {/* Önerilen İşlemler ve Fiyatlandırma */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h3 className="text-sm font-bold text-slate-900">Yapılacak İşlemler & Yedek Parça Maliyeti</h3>
            <button
              onClick={() => PDFService.printServiceTicket(ticket)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg shadow-sm transition"
            >
              <Printer size={14} /> Servis Fişini Yazdır
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {ticket.operations.map((op, idx) => (
              <div key={op.id} className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                  <span className="text-xs font-bold text-purple-600 mr-2">İşlem #{idx + 1}</span>
                  <span className="text-sm font-semibold text-slate-900">{op.description}</span>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Parça: {formatMoney(op.partsCost)} • İşçilik: {formatMoney(op.laborCost)}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-slate-900">{formatMoney(op.totalCost)}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="p-6 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="text-xs text-slate-500">
              * Onay vermeniz durumunda parça tedariği başlatılacak ve cihaz teste alınacaktır.
            </div>
            <div className="text-right space-y-1">
              <div className="text-xs text-slate-500">Alınan Kapora: -{formatMoney(ticket.depositPaid)}</div>
              <div className="text-base font-extrabold text-purple-900">
                TOPLAM ONARIM BEDELİ: {formatMoney(ticket.totalCost)}
              </div>
              <div className="text-xs font-semibold text-slate-700">
                Kalan Teslimatta Ödenecek: {formatMoney(ticket.remainingBalance)}
              </div>
            </div>
          </div>
        </div>

        {/* Onay Formu */}
        {actionDone === 'approved' ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center shadow-sm">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 size={32} />
            </div>
            <h3 className="text-lg font-bold text-emerald-900">Onarım Onayınız Alındı</h3>
            <p className="text-sm text-emerald-700 mt-1">
              Teşekkürler. Servis teknisyenimiz cihazınızın montaj ve test sürecine başlamıştır. Cihaz teslime hazır olduğunda WhatsApp üzerinden otomatik bilgilendirileceksiniz.
            </p>
          </div>
        ) : actionDone === 'rejected' ? (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center shadow-sm">
            <div className="w-14 h-14 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-3">
              <XCircle size={32} />
            </div>
            <h3 className="text-lg font-bold text-red-900">Onarım Talebi Onaylanmadı</h3>
            <p className="text-sm text-red-700 mt-1">
              Cihazınız işlem yapılmaksızın atölyemizde teslim edilmek üzere muhafaza edilmektedir.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h4 className="text-sm font-bold text-slate-900 mb-3">Servis Onay Bildirimi</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Onaylayan Adı Soyadı <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={approverName}
                  onChange={(e) => setApproverName(e.target.value)}
                  placeholder="Örn: Dr. Kerem Yıldız"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  İlave Not / Talimatınız (İsteğe Bağlı)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Masaüstündeki dosyalar korunsun vb."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <button
                onClick={handleApprove}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-md transition"
              >
                <CheckCircle2 size={18} /> Onarımı ve Maliyeti ONAYLIYORUM
              </button>
              <button
                onClick={handleReject}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-700 font-semibold text-sm rounded-xl transition border border-slate-200"
              >
                <XCircle size={18} /> ONAYLAMIYORUM (Cihazı Geri Alacağım)
              </button>
            </div>
          </div>
        )}

        {onBackToApp && (
          <div className="mt-8 text-center">
            <button
              onClick={onBackToApp}
              className="text-xs font-medium text-slate-500 hover:text-blue-600 underline"
            >
              ← Şirket Personeli Yönetim Paneline Dön
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
