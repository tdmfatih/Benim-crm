import { CommunicationLog, CommunicationTemplate, Lead } from '../types';
import { storage } from './storageService';

export class WhatsAppService {
  /**
   * Telefon numarasını uluslararası WhatsApp formatına (905xxxxxxxxx) dönüştürür
   */
  static normalizePhone(phone: string): string {
    if (!phone) return '';
    const digits = phone.replace(/\D/g, '');
    if (digits.startsWith('90')) return digits;
    if (digits.startsWith('0')) return '90' + digits.substring(1);
    if (digits.length === 10 && digits.startsWith('5')) return '90' + digits;
    return digits;
  }

  /**
   * Doğrudan mobil veya masaüstü WhatsApp wa.me linki üretir
   */
  static buildWhatsAppUrl(phone: string, message: string): string {
    const normalized = this.normalizePhone(phone);
    const encoded = encodeURIComponent(message || '');
    return `https://wa.me/${normalized}?text=${encoded}`;
  }

  /**
   * Tarayıcı üzerinden WhatsApp Web linki üretir
   */
  static buildWebWhatsAppUrl(phone: string, message: string): string {
    const normalized = this.normalizePhone(phone);
    const encoded = encodeURIComponent(message || '');
    return `https://web.whatsapp.com/send?phone=${normalized}&text=${encoded}`;
  }

  /**
   * Şablon metnini değişkenlerle doldurur
   */
  static renderTemplate(templateContent: string, variables: Record<string, string>): string {
    let text = templateContent;
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\{${key}\\}`, 'g');
      text = text.replace(regex, value || '');
    }
    return text;
  }

  /**
   * Şablon koduna veya varsayılanlara göre mesaj içeriği üretir
   */
  static getMessageContent(templateCode?: string, customContent?: string, variables: Record<string, string> = {}): string {
    if (customContent) {
      return this.renderTemplate(customContent, variables);
    }

    if (templateCode) {
      const templates = storage.getCommunicationTemplates();
      const tmpl = templates.find(t => t.code === templateCode);
      if (tmpl) {
        return this.renderTemplate(tmpl.content, variables);
      }

      // Standart yedek şablonlar
      if (templateCode === 'OFFER_APPROVAL_REQUEST' || templateCode === 'OFFER_NOTIFICATION') {
        const approvalLink = variables.onay_linki || '';
        const pdfLink = approvalLink ? `${approvalLink}?view=pdf` : '';
        return `Sayın *${variables.musteri_adi || 'Müşterimiz'}*,

*3AS TEKNOLOJİ* olarak talebinize istinaden hazırladığımız *${variables.teklif_no || ''}* numaralı kurumsal fiyat teklifimiz ekteki PDF / Görsel döküm olarak bilgilerinize sunulmuştur.

📋 *Hizmet Grubu:* ${variables.kategori || 'Güvenlik & Bilişim'}
💰 *Genel Toplam:* ${variables.toplam_tutar || ''}
${variables.gecerlilik_tarihi ? `⏳ *Son Geçerlilik:* ${variables.gecerlilik_tarihi}\n` : ''}
✅ *TEKLİFİ ONAYLAMAK İÇİN TIKLAYINIZ (ONAY BUTONU):*
👉 ${approvalLink}

📄 *DİJİTAL TEKLİF & PDF BELGESİ:*
🔗 ${pdfLink || approvalLink}

*(Teklifinizin resmi PDF ve görsel dökümü bu mesaja eklenmiştir. Dilerseniz bu mesaja "ONAYLIYORUM" yazarak da teklife doğrudan onay verebilirsiniz.)*

*3AS TEKNOLOJİ ve BİLİŞİM HİZMETLERİ*
📍 Tekirdağ / Süleymanpaşa | 📞 +905050375959`;
      }

      if (templateCode === 'SERVICE_INTAKE_CONFIRMATION') {
        return `Sayın *${variables.musteri_adi || 'Müşterimiz'}*,

*${variables.servis_no || ''}* kayıt numaralı *${variables.cihaz_tanimi || 'cihazınız'}* 3AS Teknoloji teknik servis masamıza teslim alınmıştır.

📝 *Müşteri Şikayeti:* ${variables.sikayet || 'Belirtilmedi'}
ℹ️ Detaylı arıza tespiti tamamlandığında onayınız için tarafınıza bilgi iletilecektir.

*3AS TEKNOLOJİ ve BİLİSİM HİZMETLERİ*
📍 Tekirdağ Süleymanpaşa | 📞 +905050375959`;
      }

      if (templateCode === 'SERVICE_DIAGNOSIS_COST_APPROVAL' || templateCode === 'SERVICE_APPROVAL_REQUEST') {
        return `Sayın *${variables.musteri_adi || 'Müşterimiz'}*,

*${variables.servis_no || ''}* takip numaralı cihazınızın arıza tespit ve parça analizi tamamlanmıştır.

🔧 *Arıza Tespiti:* ${variables.ariza_tespiti || variables.teshis || 'Donanım/Yazılım arızası'}
💵 *Tahmini Onarım Tutarı:* ${variables.toplam_maliyet || variables.toplam_tutar || ''}

İşleme başlayabilmemiz için aşağıdaki güvenli bağlantıdan onarım onayınızı iletebilirsiniz:
🔗 ${variables.onay_linki || ''}

*3AS TEKNOLOJİ Teknik Servis Masası*
📞 +905050375959`;
      }

      if (templateCode === 'SERVICE_READY_FOR_PICKUP' || templateCode === 'SERVICE_READY_NOTICE') {
        return `Sayın *${variables.musteri_adi || 'Müşterimiz'}*,

*${variables.servis_no || ''}* numaralı cihazınızın onarım ve testleri başarıyla tamamlanmış olup *TESLİME HAZIRDIR*.

💳 *Kalan Ödenecek Tutar:* ${variables.kalan_bakiye || variables.kalan_tutar || '0,00 TL'}
📍 *Teslim Noktası:* Tekirdağ Süleymanpaşa Atölyemiz

Cihazınızı dilediğiniz zaman teslim alabilirsiniz.
*3AS TEKNOLOJİ ve BİLİSİM HİZMETLERİ*
📞 +905050375959`;
      }

      if (templateCode === 'LEAD_CUSTOMER_GREETING') {
        return `Sayın *${variables.musteri_adi || 'Müşterimiz'}*,

*3AS TEKNOLOJİ* ile iletişime geçtiğiniz için teşekkür ederiz. *${variables.hizmet_kategorisi || 'Güvenlik & Bilişim'}* konusundaki talebiniz uzman ekibimize ulaşmıştır.

İhtiyaçlarınızı en doğru şekilde projelendirmek ve teklifimizi hazırlamak üzere görüşmek isteriz. Detayları görüşmek için ne zaman müsait olursunuz?

*3AS TEKNOLOJİ ve BİLİSİM HİZMETLERİ*
📞 +905050375959`;
      }
    }

    return '';
  }

  /**
   * WhatsApp mesajı gönderir (Arka plan API adapter + communication_logs kaydı)
   */
  static async sendMessage(params: {
    recipientPhone: string;
    recipientName: string;
    templateCode?: string;
    customContent?: string;
    variables?: Record<string, string>;
    relatedEntity?: {
      type: 'offer' | 'service' | 'installation' | 'invoice' | 'lead';
      id: string;
      number: string;
    };
  }): Promise<CommunicationLog> {
    const content = this.getMessageContent(params.templateCode, params.customContent, params.variables || {});

    const log = storage.addCommunicationLog({
      channel: 'whatsapp',
      recipientPhone: params.recipientPhone,
      recipientName: params.recipientName,
      messageType: params.templateCode || 'Özel İleti',
      content,
      status: 'sent',
      sentAt: new Date().toISOString(),
      deliveredAt: new Date(Date.now() + 1200).toISOString(),
      relatedEntity: params.relatedEntity,
    });

    // Otomatik "okundu" simülasyonu (2 saniye sonra)
    setTimeout(() => {
      const logs = storage.getCommunicationLogs();
      const item = logs.find(l => l.id === log.id);
      if (item) {
        item.status = 'read';
        item.readAt = new Date().toISOString();
        storage.addCommunicationLog(item);
      }
    }, 2500);

    return log;
  }

  /**
   * Doğrudan tarayıcıda veya mobilde WhatsApp uygulamasını açar (wa.me)
   */
  static openWhatsAppDirect(phone: string, message: string): string {
    const url = this.buildWhatsAppUrl(phone, message);
    try {
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (e) {
      console.warn('Direct popup might have been blocked:', e);
    }
    return url;
  }

  /**
   * Yeni bir Müşteri Lead (talep) geldiğinde Yönetici WhatsApp hattına anlık bildirim iletir
   */
  static async notifyManagerNewLead(lead: Lead): Promise<CommunicationLog> {
    const settings = storage.getSettings();
    const users = storage.getUsers();
    
    // Yönetici telefon ve ad tespiti
    const managerUser = users.find(u => u.roleId === 'role-super-admin' || u.department === 'Yönetim') || users[0];
    const managerPhone = settings.managerWhatsAppNumber || 
      settings.leadNotificationPhone || 
      settings.whatsappNumber || 
      managerUser?.phone || 
      '0532 999 88 77';
    
    const managerName = managerUser?.fullName ? `${managerUser.fullName} (Yönetici)` : 'Genel Yönetici';

    const customerDisplay = lead.companyName 
      ? `${lead.fullName} - ${lead.companyName}` 
      : lead.fullName;

    const budgetText = lead.budgetEstimate 
      ? `${Number(lead.budgetEstimate).toLocaleString('tr-TR')} TL` 
      : 'Belirtilmedi';

    const variables: Record<string, string> = {
      musteri_adi: customerDisplay,
      telefon: lead.phone,
      eposta: lead.email || 'Belirtilmedi',
      sehir: lead.city || 'İstanbul',
      hizmet_kategorisi: lead.interestedServiceCategory || 'Güvenlik / Bilişim / Zayıf Akım',
      mesaj: lead.message || lead.serviceDetails || 'Müşteri detaylı not bırakmadı',
      kaynak: lead.source || 'Web Sitesi',
      tahmini_butce: budgetText,
      tarih: new Date().toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      atanan_temsilci: lead.assignedUserName || 'Henüz Atanmadı',
      lead_id: lead.id,
    };

    // Şablon yoksa kullanılacak zengin mesaj içeriği
    const defaultLeadAlertContent = 
`🚨 *YENİ MÜŞTERİ LEAD BİLDİRİMİ!*
---------------------------------------
Sayın Yönetici, web siteniz / CRM üzerinden yeni bir müşteri talebi ulaştı:

👤 *Müşteri / Kurum:* ${customerDisplay}
📞 *İletişim Hattı:* ${lead.phone}
📧 *E-Posta:* ${lead.email || 'Girilmedi'}
📍 *Bölge / Şehir:* ${lead.city || 'İstanbul'}
🎯 *İlgilenilen Alan:* ${lead.interestedServiceCategory || 'Genel Bilişim & Güvenlik'}
💬 *Müşteri Notu:* ${lead.message || lead.serviceDetails || 'Ön talep oluşturuldu'}
🌐 *Lead Kaynağı:* ${lead.source || 'Web Sitesi'}
💰 *Bütçe Beklentisi:* ${budgetText}
⏱️ *Geliş Zamanı:* ${variables.tarih}

👉 Müşteriye hızlı dönüş yapmak ve teklif hazırlamak için 3AS ERP CRM paneline giriş yapabilirsiniz.`;

    const log = await this.sendMessage({
      recipientPhone: managerPhone,
      recipientName: managerName,
      templateCode: 'NEW_LEAD_MANAGER_ALERT',
      customContent: defaultLeadAlertContent,
      variables,
      relatedEntity: {
        type: 'lead',
        id: lead.id,
        number: lead.fullName,
      },
    });

    return log;
  }
}
