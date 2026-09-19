import { query, isDatabaseConnected, fallbackStorage } from '../db/db';
import { WhatsAppService } from './whatsappAdapter';

export type AutomationTrigger =
  | 'LEAD_CREATED'
  | 'OFFER_CREATED'
  | 'OFFER_APPROVED'
  | 'SERVICE_DIAGNOSIS_COMPLETED'
  | 'SERVICE_READY_FOR_DELIVERY'
  | 'SERVICE_DELIVERED'
  | 'INSTALLATION_SCHEDULED'
  | 'INSTALLATION_COMPLETED'
  | 'DELIVERY_CONFIRMED'
  | 'INVOICE_CREATED'
  | 'PAYMENT_RECEIVED';

export interface TriggerPayload {
  trigger: AutomationTrigger;
  entityId: string;
  entityNumber?: string;
  customerName: string;
  customerPhone: string;
  data: Record<string, any>;
}

export class AutomationEngine {
  /**
   * Dispatches trigger events to active automation rules.
   * Executes configured actions with failure handling, retry logic, and audit logging.
   */
  static async triggerEvent(payload: TriggerPayload): Promise<void> {
    const { trigger, entityId, entityNumber, customerName, customerPhone, data } = payload;
    console.log(`⚡ Automation event triggered: ${trigger} for ${entityNumber || entityId}`);

    let rules: any[] = [];

    if (isDatabaseConnected()) {
      try {
        const res = await query(
          'SELECT * FROM automation_rules WHERE trigger = $1 AND is_active = true',
          [trigger]
        );
        rules = res.rows;
      } catch (err) {
        console.error('Failed to fetch automation rules:', err);
      }
    } else {
      const allRules = fallbackStorage.get<any[]>('automations', []);
      rules = allRules.filter((r) => r.trigger === trigger && (r.isActive !== false && r.isEnabled !== false));
    }

    for (const rule of rules) {
      await this.executeRuleWithRetry(rule, payload, 2);
    }
  }

  private static async executeRuleWithRetry(rule: any, payload: TriggerPayload, maxRetries = 2): Promise<void> {
    let attempt = 0;
    let lastError = '';

    while (attempt <= maxRetries) {
      attempt++;
      try {
        await this.executeAction(rule, payload);

        // Record successful run
        await this.recordRun(rule.id, rule.name, payload.trigger, payload.entityId, 'success');
        return;
      } catch (err: any) {
        lastError = err.message || 'Bilinmeyen otomasyon hatası';
        console.warn(`⚠️ Automation attempt ${attempt} failed for rule "${rule.name}":`, lastError);
        if (attempt <= maxRetries) {
          await new Promise((res) => setTimeout(res, 500 * attempt)); // exponential backoff
        }
      }
    }

    // Record failed run
    await this.recordRun(rule.id, rule.name, payload.trigger, payload.entityId, 'failed', lastError);
  }

  private static async executeAction(rule: any, payload: TriggerPayload): Promise<void> {
    const { action_type, actionType, template_code, templateCode } = rule;
    const type = action_type || actionType;
    const code = template_code || templateCode;

    if (type === 'SEND_WHATSAPP') {
      if (!payload.customerPhone) {
        throw new Error('Müşteri telefon numarası bulunamadı.');
      }

      let content = `Sayın ${payload.customerName}, `;
      if (payload.trigger === 'OFFER_CREATED') {
        content += `3AS TEKNOLOJİ ${payload.entityNumber || ''} numaralı teklifiniz hazırlanmıştır. İncelemek ve onaylamak için tıklayınız: ${payload.data.approvalUrl || ''}`;
      } else if (payload.trigger === 'SERVICE_READY_FOR_DELIVERY') {
        content += `${payload.entityNumber || ''} numaralı cihazınızın onarımı tamamlanmış ve teslime hazırdır. 3AS Teknik Servis.`;
      } else if (payload.trigger === 'INSTALLATION_SCHEDULED') {
        content += `${payload.data.projectName || ''} montaj randevunuz ${payload.data.scheduledDate || ''} tarihinde planlanmıştır.`;
      } else if (payload.trigger === 'OFFER_APPROVED') {
        content += `${payload.entityNumber || ''} numaralı teklif onayınız alınmıştır. İş emri oluşturulmuştur. Teşekkür ederiz.`;
      } else {
        content += `İşleminiz güncellenmiştir. Takip No: ${payload.entityNumber || payload.entityId}`;
      }

      await WhatsAppService.sendMessage({
        recipientPhone: payload.customerPhone,
        recipientName: payload.customerName,
        messageType: payload.trigger,
        content,
        templateCode: code,
        relatedEntityType: 'offer',
        relatedEntityId: payload.entityId,
        relatedEntityNumber: payload.entityNumber,
      });
    } else if (type === 'SEND_GOOGLE_REVIEW_INVITE') {
      const reviewUrl = payload.data.reviewUrl || 'https://g.page/r/3asteknoloji/review';
      const content = `Sayın ${payload.customerName}, 3AS TEKNOLOJİ olarak sizlere hizmet vermekten memnuniyet duyduk. Deneyiminizi 1 dakikada Google'da paylaşmak ister misiniz? ${reviewUrl}`;
      await WhatsAppService.sendMessage({
        recipientPhone: payload.customerPhone,
        recipientName: payload.customerName,
        messageType: 'GOOGLE_REVIEW_REQUEST',
        content,
        relatedEntityId: payload.entityId,
        relatedEntityNumber: payload.entityNumber,
      });
    }
  }

  private static async recordRun(
    ruleId: string,
    ruleName: string,
    trigger: string,
    entityId: string,
    status: 'success' | 'failed' | 'skipped',
    errorMessage?: string
  ): Promise<void> {
    if (isDatabaseConnected()) {
      try {
        await query(
          `INSERT INTO automation_runs (id, rule_id, rule_name, trigger, entity_id, status, error_message, run_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
          [
            `run-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            ruleId,
            ruleName,
            trigger,
            entityId,
            status,
            errorMessage || null,
          ]
        );
      } catch (e) {
        console.error('Failed to log automation run in db:', e);
      }
    }
  }
}
