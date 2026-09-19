import { AutomationTrigger } from '../types';
import { storage } from './storageService';
import { WhatsAppService } from './whatsappService';

export class AutomationEngine {
  /**
   * Bir iş akışı olayını tetikler ve kuralları çalıştırır
   */
  static async triggerEvent(trigger: AutomationTrigger, payload: {
    customerName: string;
    customerPhone: string;
    entityId: string;
    entityNumber: string;
    entityType: 'offer' | 'service' | 'installation' | 'invoice' | 'lead';
    variables?: Record<string, string>;
  }): Promise<number> {
    const rules = storage.getAutomations().filter(r => r.isActive && r.trigger === trigger);
    let executedCount = 0;

    for (const rule of rules) {
      try {
        if (rule.actionType === 'SEND_WHATSAPP' && rule.templateCode) {
          // Eğer kural Yeni Lead Bildirimi veya Yönetici Bildirimi ise alıcı yönetici telefonudur
          let recipientPhone = payload.customerPhone;
          let recipientName = payload.customerName;

          if (trigger === 'LEAD_CREATED' || rule.templateCode === 'NEW_LEAD_MANAGER_ALERT') {
            const settings = storage.getSettings();
            const users = storage.getUsers();
            const managerUser = users.find(u => u.roleId === 'role-super-admin' || u.department === 'Yönetim') || users[0];
            recipientPhone = settings.managerWhatsAppNumber || 
              settings.leadNotificationPhone || 
              settings.whatsappNumber || 
              managerUser?.phone || 
              '0532 999 88 77';
            recipientName = managerUser?.fullName ? `${managerUser.fullName} (Yönetici)` : 'Genel Yönetici';
          }

          await WhatsAppService.sendMessage({
            recipientName,
            recipientPhone,
            templateCode: rule.templateCode,
            variables: payload.variables,
            relatedEntity: {
              type: payload.entityType,
              id: payload.entityId,
              number: payload.entityNumber,
            },
          });
          executedCount++;
        } else if (rule.actionType === 'SEND_GOOGLE_REVIEW_INVITE') {
          const settings = storage.getSettings();
          await WhatsAppService.sendMessage({
            recipientName: payload.customerName,
            recipientPhone: payload.customerPhone,
            templateCode: 'GOOGLE_REVIEW_INVITE',
            variables: {
              musteri_adi: payload.customerName,
              google_review_linki: settings.googleReviewUrl,
            },
            relatedEntity: {
              type: payload.entityType,
              id: payload.entityId,
              number: payload.entityNumber,
            },
          });
          executedCount++;
        }
      } catch (err) {
        console.error(`Otomasyon kuralı çalışırken hata [${rule.name}]:`, err);
      }
    }

    if (executedCount > 0) {
      storage.logAudit(
        'AUTOMATION_TRIGGERED', 
        payload.entityType, 
        payload.entityId, 
        payload.entityNumber, 
        null, 
        { trigger, executedRules: executedCount }
      );
    }

    return executedCount;
  }
}
