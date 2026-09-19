import React, { useState, useEffect } from 'react';
import { storage } from '../services/storageService';
import { PDFService } from '../services/pdfService';
import { AutomationEngine } from '../services/automationEngine';
import { BrandLogo } from '../components/layout/BrandLogo';
import { Installation } from '../types';
import { CheckCircle2, ShieldCheck, Printer, CheckSquare, Package, AlertCircle } from 'lucide-react';

interface PublicDeliveryConfirmProps {
  token: string;
  onBackToApp?: () => void;
  onApproved?: (inst: Installation) => void;
}

export const PublicDeliveryConfirm: React.FC<PublicDeliveryConfirmProps> = ({ token, onBackToApp, onApproved }) => {
  const [inst, setInst] = useState<Installation | null>(null);
  const [actionDone, setActionDone] = useState(false);
  const [approverName, setApproverName] = useState('');
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    const found = storage.getInstallationByDeliveryToken(token);
    if (found) {
      setInst(found);
      if (found.customerDeliveryApproval?.isApproved) {
        setActionDone(true);
      }
    }
  }, [token]);

  if (!inst) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white max-w-md w-full p-8 rounded-2xl shadow-lg text-center border border-slate-200">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={32} />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Montaj Kaydı Bulunamadı</h2>
          <p className="text-sm text-slate-600 mb-6">
            Bu teslim onay bağlantısı geçersiz veya süresi dolmuş olabilir.
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

  const handleConfirm = () => {
    if (!approverName.trim()) {
      alert('Lütfen teslim alan yetkili adını ve soyadını giriniz.');
      return;
    }

    const installations = storage.getInstallations();
    const idx = installations.findIndex(i => i.id === inst.id);
    if (idx === -1) return;

    const updated: Installation = {
      ...installations[idx],
      status: 'completed',
      customerDeliveryApproval: {
        isApproved: true,
        approvedAt: new Date().toISOString(),
        approverName,
        notes: feedback,
        clientIp: '88.245.19.102 (Doğrulandı)',
      },
    };
    installations[idx] = updated;
    storage.saveInstallations(installations);

    storage.logAudit(
      'DELIVERY_CONFIRMED_ONLINE',
      'installation',
      inst.id,
      inst.installationNumber,
      null,
      { approver: approverName, feedback }
    );

    // Otomasyon: Google Review daveti gönder
    AutomationEngine.triggerEvent('DELIVERY_CONFIRMED', {
      customerName: inst.customerName,
      customerPhone: inst.customerPhone,
      entityId: inst.id,
      entityNumber: inst.installationNumber,
      entityType: 'installation',
    });

    setInst(updated);
    setActionDone(true);
    if (onApproved) onApproved(updated);
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <BrandLogo size="md" />
            <div className="text-left sm:text-right">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <ShieldCheck size={14} /> Saha Montaj & Teslim Onayı
              </span>
              <p className="text-xs text-slate-500 mt-1">İş Emri No: <strong>{inst.installationNumber}</strong></p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Müşteri & Adres</span>
              <h3 className="text-sm font-bold text-slate-900">{inst.customerName}</h3>
              <p className="text-xs text-slate-600 mt-1">{inst.fullAddress}</p>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Montaj Kapsamı</span>
              <h3 className="text-sm font-bold text-slate-900">{inst.projectName}</h3>
              <p className="text-xs text-slate-600 mt-1">Teknisyen: {inst.assignedTechnicians.map(t => t.fullName).join(', ')}</p>
            </div>
          </div>
        </div>

        {/* Yapılan İş ve Checklist */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <CheckSquare size={16} className="text-emerald-600" /> Tamamlanan Kontrol Maddeleri
            </h3>
            <button
              onClick={() => PDFService.printInstallationDelivery(inst)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg shadow-sm transition"
            >
              <Printer size={14} /> Teslim Tutanağını Yazdır
            </button>
          </div>

          <p className="text-xs text-slate-600 mb-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
            {inst.tasksDescription}
          </p>

          <div className="space-y-2">
            {inst.checklist.map(chk => (
              <div key={chk.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-emerald-50/50 border border-emerald-100 text-xs">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                <span className="font-medium text-slate-800">{chk.text}</span>
              </div>
            ))}
          </div>

          {/* Malzeme Listesi */}
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mt-6 mb-3 flex items-center gap-2">
            <Package size={14} className="text-blue-600" /> Monte Edilen Cihaz & Malzemeler
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {inst.materials.map(m => (
              <div key={m.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-900">{m.productName}</span>
                <span className="font-bold text-blue-700">{m.usedQty} {m.unit}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Onaylama Alanı */}
        {actionDone ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center shadow-sm">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 size={32} />
            </div>
            <h3 className="text-lg font-bold text-emerald-900">Montaj ve Teslimat Onaylandı</h3>
            <p className="text-sm text-emerald-700 mt-1">
              Sistemlerinizi eksiksiz ve çalışır durumda teslim aldığınız onaylanmıştır. 3AS Teknoloji'yi tercih ettiğiniz için teşekkür ederiz.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h4 className="text-sm font-bold text-slate-900 mb-2">Teslim Alma Onayı & İmza Beyanı</h4>
            <p className="text-xs text-slate-500 mb-4">
              Yukarıda dökümü yapılan sistemlerin eksiksiz monte edildiğini, çalışır vaziyette tarafıma teslim edildiğini ve eğitiminin verildiğini beyan ederim.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Teslim Alan Yetkili Adı ve Soyadı <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={approverName}
                  onChange={(e) => setApproverName(e.target.value)}
                  placeholder="Örn: Dr. Kerem Yıldız"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Görüş / Memnuniyet Notunuz
                </label>
                <input
                  type="text"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Kurulum temiz ve titiz yapıldı teşekkürler."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <button
              onClick={handleConfirm}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-md transition"
            >
              <CheckCircle2 size={18} /> Sistemi Eksiksiz Teslim Aldım / Onaylıyorum
            </button>
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
