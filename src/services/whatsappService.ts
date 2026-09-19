import { CommunicationLog, CommunicationTemplate, Lead } from '../types';
import { storage } from './storageService';

export class WhatsAppService {
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
    let content = params.customContent || '';

    if (params.templateCode) {
      const templates = storage.getCommunicationTemplates();
      const tmpl = templates.find(t => t.code === params.templateCode);
      if (tmpl) {
        content = this.renderTemplate(tmpl.content, params.variables || {});
      }
    }

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

  /**
   * Doğrudan tarayıcıda veya mobilde WhatsApp uygulamasını açar (wa.me)
   */
  static openWhatsAppDirect(phone: string, message: string): void {
    const cleanPhone = phone.replace(/\D/g, '');
    const normalizedPhone = cleanPhone.startsWith('0') 
      ? '90' + cleanPhone.substring(1) 
      : cleanPhone.startsWith('90') ? cleanPhone : '90' + cleanPhone;
    
    const encoded = encodeURIComponent(message);
    const url = `https://wa.me/${normalizedPhone}?text=${encoded}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}
