import { Offer, CompanySettings } from '../types';
import { storage } from './storageService';

export class OfferImageService {
  private static formatCurrency(val: number, currency: string = 'TRY'): string {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency }).format(val);
  }

  private static formatDate(dateStr: string): string {
    try {
      return new Date(dateStr).toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' });
    } catch {
      return dateStr;
    }
  }

  /**
   * Teklifi yüksek çözünürlüklü (Retina 2x) HTML5 Canvas üzerinde çizer ve HTMLCanvasElement döner
   */
  static async renderOfferToCanvas(offer: Offer): Promise<HTMLCanvasElement> {
    const settings: CompanySettings = storage.getSettings();
    const width = 840;
    
    // Yükseklik hesaplaması: Kalem sayısına göre dinamik esner
    const headerHeight = 160;
    const metaHeight = 130;
    const tableHeaderHeight = 44;
    const itemRowHeight = 46;
    const itemsHeight = Math.max(offer.items.length * itemRowHeight, 90);
    const totalsHeight = 150;
    const termsHeight = 90;
    const approvalNoticeHeight = 85;
    const footerHeight = 75;

    const totalHeight = headerHeight + metaHeight + tableHeaderHeight + itemsHeight + totalsHeight + termsHeight + approvalNoticeHeight + footerHeight;

    const canvas = document.createElement('canvas');
    const scale = 2; // 2x Retina kalitesi
    canvas.width = width * scale;
    canvas.height = totalHeight * scale;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context alınamadı');

    ctx.scale(scale, scale);

    // 1. Arka Plan
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, totalHeight);

    // 2. Üst Banner (Kurumsal 3AS Lacivert)
    const headerGrad = ctx.createLinearGradient(0, 0, width, 0);
    headerGrad.addColorStop(0, '#1e3a8a');
    headerGrad.addColorStop(1, '#1e40af');
    ctx.fillStyle = headerGrad;
    ctx.fillRect(0, 0, width, headerHeight);

    // Şirket Logo / İkon Kutusu
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.beginPath();
    ctx.roundRect(32, 28, 64, 64, 12);
    ctx.fill();

    // 3AS Logosu Yazısı
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('3AS', 44, 68);

    // Şirket Adı & Slogan
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(settings.companyName || '3AS TEKNOLOJİ', 112, 54);

    ctx.fillStyle = '#93c5fd';
    ctx.font = 'bold 10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText((settings.slogan || 'GÜVENLİK • ZAYIF AKIM • BİLİŞİM HİZMETLERİ').toUpperCase(), 112, 74);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(`Tel: ${settings.phone || '+90 505 037 59 59'}  •  Tekirdağ / Süleymanpaşa`, 112, 94);

    // Sağ Üst Teklif Rozeti
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.beginPath();
    ctx.roundRect(width - 240, 32, 208, 60, 10);
    ctx.fill();

    ctx.fillStyle = '#fde047';
    ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('KURUMSAL FİYAT TEKLİFİ', width - 224, 52);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 15px monospace';
    ctx.fillText(`${offer.offerNumber} (v${offer.currentVersion})`, width - 224, 76);

    // 3. Meta Bilgi Kutuları (Müşteri & Teklif Detayı)
    let currentY = headerHeight + 20;

    // Müşteri Kutusu
    ctx.fillStyle = '#f8fafc';
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(32, currentY, 360, 100, 10);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('MÜŞTERİ / CARİ BİLGİLERİ', 46, currentY + 22);

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    const custName = offer.customerName.length > 32 ? offer.customerName.substring(0, 32) + '...' : offer.customerName;
    ctx.fillText(custName, 46, currentY + 44);

    ctx.fillStyle = '#475569';
    ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(`Tel: ${offer.customerPhone}`, 46, currentY + 66);
    ctx.fillText(offer.customerAddress || 'Tekirdağ / Süleymanpaşa', 46, currentY + 86);

    // Teklif Detay Kutusu
    ctx.fillStyle = '#f8fafc';
    ctx.strokeStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.roundRect(412, currentY, 396, 100, 10);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('TEKLİF ŞARTLARI & GEÇERLİLİK', 426, currentY + 22);

    ctx.fillStyle = '#1e3a8a';
    ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(`Hizmet Grubu: ${offer.serviceCategory}`, 426, currentY + 44);

    ctx.fillStyle = '#475569';
    ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(`Düzenleme Tarihi: ${this.formatDate(offer.createdAt)}`, 426, currentY + 66);
    ctx.fillText(`Son Geçerlilik: ${this.formatDate(offer.validUntil)}`, 426, currentY + 86);

    // 4. Kalemler Tablosu
    currentY += 120;

    // Tablo Başlığı
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.roundRect(32, currentY, width - 64, 36, 6);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('#', 46, currentY + 22);
    ctx.fillText('Ürün / Hizmet Açıklaması', 74, currentY + 22);
    ctx.fillText('Miktar', 490, currentY + 22);
    ctx.fillText('Birim Fiyat', 570, currentY + 22);
    ctx.fillText('KDV', 670, currentY + 22);
    ctx.fillText('Toplam Tutar', 720, currentY + 22);

    currentY += 38;

    // Satırlar
    offer.items.forEach((item, index) => {
      const isEven = index % 2 === 0;
      ctx.fillStyle = isEven ? '#f8fafc' : '#ffffff';
      ctx.fillRect(32, currentY, width - 64, itemRowHeight);

      ctx.strokeStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.moveTo(32, currentY + itemRowHeight);
      ctx.lineTo(width - 32, currentY + itemRowHeight);
      ctx.stroke();

      // Sıra No
      ctx.fillStyle = '#94a3b8';
      ctx.font = '12px monospace';
      ctx.fillText(String(index + 1), 46, currentY + 26);

      // Ürün Adı
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      const itemName = item.name.length > 42 ? item.name.substring(0, 42) + '...' : item.name;
      ctx.fillText(itemName, 74, currentY + 20);

      // Ürün Açıklaması
      if (item.description) {
        ctx.fillStyle = '#64748b';
        ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        const itemDesc = item.description.length > 55 ? item.description.substring(0, 55) + '...' : item.description;
        ctx.fillText(itemDesc, 74, currentY + 36);
      }

      // Miktar
      ctx.fillStyle = '#334155';
      ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(`${item.quantity} ${item.unit}`, 490, currentY + 26);

      // Birim Fiyat
      ctx.fillStyle = '#475569';
      ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(this.formatCurrency(item.unitPrice, offer.currency), 570, currentY + 26);

      // KDV
      ctx.fillStyle = '#64748b';
      ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(`%${item.vatRate}`, 670, currentY + 26);

      // Toplam
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(this.formatCurrency(item.total, offer.currency), 720, currentY + 26);

      currentY += itemRowHeight;
    });

    // 5. Toplamlar Kutusu (Sağ Taraf)
    currentY += 16;
    const totalsBoxWidth = 340;
    const totalsBoxX = width - 32 - totalsBoxWidth;

    ctx.fillStyle = '#f8fafc';
    ctx.strokeStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.roundRect(totalsBoxX, currentY, totalsBoxWidth, 126, 8);
    ctx.fill();
    ctx.stroke();

    ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#475569';
    ctx.fillText('Ara Toplam:', totalsBoxX + 16, currentY + 26);
    ctx.fillStyle = '#0f172a';
    ctx.fillText(this.formatCurrency(offer.subtotal, offer.currency), totalsBoxX + totalsBoxWidth - 120, currentY + 26);

    if (offer.discountTotal > 0) {
      ctx.fillStyle = '#dc2626';
      ctx.fillText('İskonto:', totalsBoxX + 16, currentY + 48);
      ctx.fillText(`-${this.formatCurrency(offer.discountTotal, offer.currency)}`, totalsBoxX + totalsBoxWidth - 120, currentY + 48);
    }

    ctx.fillStyle = '#475569';
    ctx.fillText('KDV Tutarı:', totalsBoxX + 16, currentY + 70);
    ctx.fillStyle = '#0f172a';
    ctx.fillText(this.formatCurrency(offer.taxTotal, offer.currency), totalsBoxX + totalsBoxWidth - 120, currentY + 70);

    // GENEL TOPLAM ÇİZGİSİ
    ctx.fillStyle = '#1e3a8a';
    ctx.fillRect(totalsBoxX, currentY + 84, totalsBoxWidth, 42);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('GENEL TOPLAM:', totalsBoxX + 16, currentY + 110);

    ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(this.formatCurrency(offer.grandTotal, offer.currency), totalsBoxX + totalsBoxWidth - 136, currentY + 110);

    // Sol Taraf: Ticari & Garanti Şartları
    ctx.fillStyle = '#fffbeb';
    ctx.strokeStyle = '#fef08a';
    ctx.beginPath();
    ctx.roundRect(32, currentY, width - 64 - totalsBoxWidth - 16, 126, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#854d0e';
    ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('ÖDEME & GARANTİ ŞARTLARI', 44, currentY + 24);

    ctx.fillStyle = '#713f12';
    ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    const payTerms = (offer.paymentTerms || settings.offerTermsDefault || 'Peşinat %50 siparişte, kalan teslimatta.').substring(0, 85);
    ctx.fillText(`• Ödeme: ${payTerms}`, 44, currentY + 46);

    const warTerms = (offer.warrantyTerms || settings.serviceWarrantyTerms || 'İşçilik ve montaj 1 yıl, donanımlar 2 yıl resmi garantilidir.').substring(0, 85);
    ctx.fillText(`• Garanti: ${warTerms}`, 44, currentY + 68);

    ctx.fillText(`• Yetkili: 3AS Teknoloji Mühendislik & Satış Masası`, 44, currentY + 90);

    // 6. WHATSAPP ONAY BİLGİLENDİRME ŞERİDİ (KULLANICININ İSTEDİĞİ ONLİNE ONAY ÇAĞRISI)
    currentY += 140;

    const noticeGrad = ctx.createLinearGradient(32, currentY, width - 32, currentY);
    noticeGrad.addColorStop(0, '#065f46');
    noticeGrad.addColorStop(1, '#047857');
    ctx.fillStyle = noticeGrad;
    ctx.beginPath();
    ctx.roundRect(32, currentY, width - 64, 70, 10);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('✅ TEKLİF ONAY BİLGİSİ & WHATSAPP DİJİTAL ONAY BUTONU', 48, currentY + 28);

    ctx.fillStyle = '#a7f3d0';
    ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('Bu teklifi WhatsApp mesajınızdaki ONAY BUTONU bağlantısına tıklayarak veya bu mesaja ONAYLIYORUM yazarak', 48, currentY + 46);
    ctx.fillText('hemen onaylayabilirsiniz. Onayınız ile birlikte projeniz ve montaj randevunuz sisteme işlenir.', 48, currentY + 60);

    // 7. Alt Footer Bilgisi
    currentY += 82;
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(`${settings.companyName}  |  ${settings.address} - ${settings.district}/${settings.city}`, 32, currentY + 16);
    ctx.fillText(`Vergi Dairesi: ${settings.taxOffice} - No: ${settings.taxNumber}  |  Banka: ${settings.bankName} - IBAN: ${settings.iban}`, 32, currentY + 32);

    return canvas;
  }

  /**
   * Teklifi PNG Blob olarak üretir
   */
  static async getOfferImageBlob(offer: Offer): Promise<Blob> {
    const canvas = await this.renderOfferToCanvas(offer);
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Canvas blob üretilemedi'));
      }, 'image/png');
    });
  }

  /**
   * Teklifi Base64 Data URL olarak üretir (Önizlemeler için)
   */
  static async getOfferImageDataUrl(offer: Offer): Promise<string> {
    const canvas = await this.renderOfferToCanvas(offer);
    return canvas.toDataURL('image/png');
  }

  /**
   * Teklif görselini doğrudan kullanıcının bilgisayarına indirir
   */
  static async downloadOfferImage(offer: Offer): Promise<void> {
    const blob = await this.getOfferImageBlob(offer);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `3AS-Teklif-${offer.offerNumber}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Teklif görselini doğrudan işletim sistemi / tarayıcı panosuna kopyalar (Ctrl+V ile WhatsApp'a yapıştırılabilir)
   */
  static async copyOfferImageToClipboard(offer: Offer): Promise<boolean> {
    try {
      const blob = await this.getOfferImageBlob(offer);
      if (navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ]);
        return true;
      }
      return false;
    } catch (err) {
      console.warn('Clipboard image copy failed, falling back to download:', err);
      return false;
    }
  }
}
