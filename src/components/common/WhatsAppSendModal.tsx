import React, { useState } from 'react';
import { WhatsAppService } from '../../services/whatsappService';
import { PDFService } from '../../services/pdfService';
import { OfferImageService } from '../../services/offerImageService';
import { Offer } from '../../types';
import { 
  MessageSquare, Send, Copy, Check, ExternalLink, 
  X, Phone, User, CheckCircle2, ShieldCheck, Globe,
  FileText, Image as ImageIcon, Download, Eye, Sparkles, AlertCircle
} from 'lucide-react';

export interface WhatsAppSendModalProps {
  isOpen: boolean;
  title: string;
  recipientName: string;
  recipientPhone: string;
  initialMessage: string;
  relatedEntityType?: 'offer' | 'service' | 'installation' | 'invoice' | 'lead';
  relatedEntityId?: string;
  relatedEntityNumber?: string;
  offer?: Offer;
  onClose: () => void;
  onSent?: (phone: string, message: string) => void;
}

export const WhatsAppSendModal: React.FC<WhatsAppSendModalProps> = ({
  isOpen,
  title,
  recipientName,
  recipientPhone,
  initialMessage,
  relatedEntityType,
  relatedEntityId,
  relatedEntityNumber,
  offer,
  onClose,
  onSent,
}) => {
  const [phone, setPhone] = useState(recipientPhone);
  const [message, setMessage] = useState(initialMessage);
  const [copied, setCopied] = useState(false);
  const [hasSent, setHasSent] = useState(false);
  const [imageCopied, setImageCopied] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [previewImageDataUrl, setPreviewImageDataUrl] = useState<string | null>(null);

  // Sync when props change
  React.useEffect(() => {
    setPhone(recipientPhone);
    setMessage(initialMessage);
    setHasSent(false);
    setImageCopied(false);
    setPreviewImageDataUrl(null);
  }, [recipientPhone, initialMessage, isOpen]);

  if (!isOpen) return null;

  const waUrl = WhatsAppService.buildWhatsAppUrl(phone, message);
  const webWaUrl = WhatsAppService.buildWebWhatsAppUrl(phone, message);
  const normalized = WhatsAppService.normalizePhone(phone);

  const handleCopy = () => {
    navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleCopyOfferImage = async () => {
    if (!offer) return;
    setIsGeneratingImage(true);
    try {
      const success = await OfferImageService.copyOfferImageToClipboard(offer);
      if (success) {
        setImageCopied(true);
        setTimeout(() => setImageCopied(false), 4000);
      } else {
        // Fallback: clipboard direct image not supported in this browser, download instead
        await OfferImageService.downloadOfferImage(offer);
        alert('Tarayıcınız doğrudan resim kopyalamayı desteklemediği için teklif görseli bilgisayarınıza PNG olarak indirildi. WhatsApp sohbetine sürükleyip bırakabilirsiniz.');
      }
    } catch (err) {
      console.error('Image generation error:', err);
      alert('Görsel üretilirken bir sorun oluştu.');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleDownloadOfferImage = async () => {
    if (!offer) return;
    setIsGeneratingImage(true);
    try {
      await OfferImageService.downloadOfferImage(offer);
    } catch (err) {
      console.error('Download error:', err);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handlePreviewOfferImage = async () => {
    if (!offer) return;
    setIsGeneratingImage(true);
    try {
      const dataUrl = await OfferImageService.getOfferImageDataUrl(offer);
      setPreviewImageDataUrl(dataUrl);
    } catch (err) {
      console.error('Preview error:', err);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleRecordSend = () => {
    setHasSent(true);
    WhatsAppService.sendMessage({
      recipientPhone: phone,
      recipientName,
      customContent: message,
      relatedEntity: relatedEntityType && relatedEntityId && relatedEntityNumber ? {
        type: relatedEntityType,
        id: relatedEntityId,
        number: relatedEntityNumber,
      } : undefined,
    });

    if (onSent) {
      onSent(phone, message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Üst Başlık */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 px-5 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center text-white border border-white/20">
              <MessageSquare size={20} />
            </div>
            <div>
              <h3 className="font-bold text-sm leading-tight">{title}</h3>
              <p className="text-[11px] text-emerald-100 flex items-center gap-1.5 mt-0.5">
                <ShieldCheck size={12} /> 3AS Teknoloji WhatsApp İletim Merkezi
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* İçerik Alanı */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs flex-1">
          {/* Alıcı Bilgileri */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <div>
              <label className="text-[11px] font-bold text-slate-500 flex items-center gap-1 mb-1">
                <User size={12} className="text-slate-400" /> Alıcı Müşteri:
              </label>
              <div className="font-bold text-slate-900 text-xs truncate">{recipientName}</div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-500 flex items-center gap-1 mb-1">
                <Phone size={12} className="text-slate-400" /> WhatsApp Numarası:
              </label>
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="05xx xxx xx xx"
                  className="w-full px-2.5 py-1 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 bg-white"
                />
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                Hedef: +{normalized || 'Belirtilmedi'}
              </div>
            </div>
          </div>

          {/* TEKLİF BELGESİ (PDF VEYA GÖRSEL) SEÇENEKLERİ */}
          {offer && (
            <div className="bg-gradient-to-br from-blue-50/90 via-indigo-50/70 to-slate-50 border border-blue-200/90 rounded-2xl p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                    1
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-blue-950 flex items-center gap-1.5">
                      <Sparkles size={13} className="text-blue-600" /> Teklif Belgesi (PDF veya Görsel Olarak Gönder)
                    </h4>
                    <p className="text-[10px] text-blue-700">Müşteriye teklif detaylarını PDF dosyası veya yüksek çözünürlüklü görsel kartı olarak iletebilirsiniz:</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold bg-white text-blue-700 px-2.5 py-0.5 rounded-full border border-blue-200 shadow-2xs">
                  {offer.offerNumber}
                </span>
              </div>

              {/* PDF & Görsel Aksiyon Butonları */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                {/* PDF Seçeneği */}
                <div className="p-3 bg-white rounded-xl border border-slate-200 flex flex-col justify-between hover:border-blue-300 transition">
                  <div>
                    <div className="flex items-center gap-2 text-slate-800 font-bold text-xs mb-1">
                      <FileText size={16} className="text-red-500" />
                      <span>PDF Olarak Gönder</span>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-tight">
                      Resmi antetli A4 teklif belgesini indirin ve WhatsApp sohbetine belge olarak sürükleyin.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => PDFService.printOffer(offer)}
                    className="mt-2.5 w-full py-1.5 px-3 bg-slate-100 hover:bg-red-50 hover:text-red-700 text-slate-700 font-bold text-[11px] rounded-lg border border-slate-200 flex items-center justify-center gap-1.5 transition"
                  >
                    <FileText size={13} /> PDF İndir / Yazdır
                  </button>
                </div>

                {/* Görsel (PNG) Seçeneği */}
                <div className="p-3 bg-white rounded-xl border border-slate-200 flex flex-col justify-between hover:border-emerald-300 transition">
                  <div>
                    <div className="flex items-center gap-2 text-slate-800 font-bold text-xs mb-1">
                      <ImageIcon size={16} className="text-emerald-600" />
                      <span>Görsel Kartı Olarak Gönder</span>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-tight">
                      Teklif özetini panoya kopyalayıp WhatsApp sohbetine <strong>Ctrl+V</strong> ile hemen resim olarak yapıştırın.
                    </p>
                  </div>
                  <div className="mt-2.5 flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleCopyOfferImage}
                      disabled={isGeneratingImage}
                      className={`flex-1 py-1.5 px-2.5 text-[11px] font-bold rounded-lg border flex items-center justify-center gap-1.5 transition ${
                        imageCopied
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
                      }`}
                      title="Görseli kopyalayıp WhatsApp sohbetine Ctrl+V ile yapıştırın"
                    >
                      {imageCopied ? (
                        <>
                          <Check size={13} />
                          <span>Görsel Kopyalandı!</span>
                        </>
                      ) : (
                        <>
                          <Copy size={13} />
                          <span>Görseli Kopyala</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadOfferImage}
                      disabled={isGeneratingImage}
                      className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-200 transition"
                      title="Görseli PNG Olarak İndir"
                    >
                      <Download size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={handlePreviewOfferImage}
                      disabled={isGeneratingImage}
                      className="p-1.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-700 rounded-lg border border-slate-200 transition"
                      title="Teklif Görselini Önizle"
                    >
                      <Eye size={13} />
                    </button>
                  </div>
                </div>
              </div>

              {imageCopied && (
                <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 font-bold text-[11px] flex items-center gap-1.5 animate-in fade-in">
                  <CheckCircle2 size={14} className="text-emerald-600" />
                  <span>Teklif görseli panonuza kopyalandı! Şimdi WhatsApp Web sohbet penceresine tıklayıp <strong>Ctrl + V</strong> (Yapıştır) tuşlarına basarak görseli gönderiniz.</span>
                </div>
              )}
            </div>
          )}

          {/* Mesaj İçeriği */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-bold text-slate-700 flex items-center gap-1.5">
                {offer && (
                  <span className="w-5 h-5 rounded-md bg-emerald-600 text-white flex items-center justify-center font-bold text-[10px]">
                    2
                  </span>
                )}
                <span>WhatsApp Onay Butonlu Mesaj Metni</span>
                <span className="text-[10px] font-normal text-slate-400">(Onay bağlantısı içerir)</span>
              </label>
              <button
                type="button"
                onClick={handleCopy}
                className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded-md hover:bg-blue-100 transition"
              >
                {copied ? (
                  <>
                    <Check size={12} className="text-emerald-600" />
                    <span className="text-emerald-700">Kopyalandı!</span>
                  </>
                ) : (
                  <>
                    <Copy size={12} />
                    <span>Metni Kopyala</span>
                  </>
                )}
              </button>
            </div>

            <textarea
              rows={offer ? 7 : 9}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full p-3 border border-slate-200 rounded-xl text-xs font-sans text-slate-800 leading-relaxed bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          {hasSent && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-800 font-bold text-xs">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              <span>WhatsApp gönderimi başlatıldı ve CRM iletişim geçmişine işlendi.</span>
            </div>
          )}

          {/* Güvenli Popup ve İframe Notu */}
          <div className="p-2.5 bg-amber-50/70 border border-amber-200/80 rounded-xl text-[11px] text-amber-900 leading-normal">
            💡 <strong>Nasıl Çalışır?</strong> Aşağıdaki yeşil butona bastığınızda cihazınızdaki <strong>WhatsApp</strong> veya <strong>WhatsApp Web</strong> uygulaması doğrudan bu alıcı ve mesajla açılır.
          </div>
        </div>

        {/* Alt Aksiyon Butonları */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-2">
          <div className="flex flex-col sm:flex-row gap-2">
            {/* Doğrudan wa.me linki - Tarayıcı popup engelleyicisinden ASLA etkilenmez */}
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleRecordSend}
              className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-sm transition active:scale-[0.98]"
            >
              <MessageSquare size={16} /> WhatsApp Uygulamasında Aç & Gönder
            </a>

            {/* Alternatif WhatsApp Web linki */}
            <a
              href={webWaUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleRecordSend}
              className="px-3.5 py-2.5 bg-slate-700 hover:bg-slate-800 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition"
              title="Masaüstü Web Tarayıcı Sürümü"
            >
              <Globe size={14} /> Web Sürümü
            </a>
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={handleCopy}
              className="text-[11px] text-slate-500 hover:text-slate-800 font-semibold flex items-center gap-1 px-2 py-1"
            >
              <Copy size={12} /> {copied ? 'Panoya Kopyalandı' : 'Yalnızca Mesajı Kopyala'}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="text-xs font-bold text-slate-600 hover:text-slate-800 px-3 py-1 rounded-lg hover:bg-slate-200 transition"
            >
              Kapat
            </button>
          </div>
        </div>
      </div>

      {/* Görsel Canlı Önizleme Modalı */}
      {previewImageDataUrl && (
        <div 
          onClick={() => setPreviewImageDataUrl(null)}
          className="fixed inset-0 bg-black/80 backdrop-blur-xs z-60 flex items-center justify-center p-4 animate-in fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
          >
            <div className="p-3.5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ImageIcon size={16} className="text-emerald-400" />
                <span className="font-bold text-xs">Teklif Görseli Önizleme ({offer?.offerNumber})</span>
              </div>
              <button 
                onClick={() => setPreviewImageDataUrl(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-3 overflow-y-auto max-h-[70vh] bg-slate-100 flex items-center justify-center">
              <img 
                src={previewImageDataUrl} 
                alt="Teklif Görseli" 
                className="max-w-full h-auto rounded-lg shadow-sm border border-slate-200" 
              />
            </div>
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2">
              <span className="text-[11px] text-slate-500">Bu görsel müşterinize WhatsApp üzerinden iletilmeye hazırdır.</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyOfferImage}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5"
                >
                  <Copy size={13} /> {imageCopied ? 'Kopyalandı!' : 'Panoya Kopyala'}
                </button>
                <button
                  type="button"
                  onClick={handleDownloadOfferImage}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold flex items-center gap-1.5"
                >
                  <Download size={13} /> İndir (PNG)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
