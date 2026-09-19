import { Router, Request, Response } from 'express';
import { query, isDatabaseConnected, fallbackStorage } from '../db/db';
import { optionalAuth, AuthenticatedRequest } from '../middleware/auth';
import { WhatsAppService, MessageStatus } from '../services/whatsappAdapter';

const router = Router();

// POST /api/whatsapp/send
router.post('/send', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  const {
    recipientPhone,
    recipientName,
    messageType,
    content,
    templateCode,
    relatedEntityType,
    relatedEntityId,
    relatedEntityNumber,
  } = req.body;

  if (!recipientPhone || !content) {
    return res.status(400).json({ error: 'Alıcı telefon numarası ve mesaj içeriği zorunludur.' });
  }

  try {
    const result = await WhatsAppService.sendMessage({
      recipientPhone,
      recipientName: recipientName || 'Müşteri',
      messageType: messageType || 'DIRECT_MESSAGE',
      content,
      templateCode,
      relatedEntityType,
      relatedEntityId,
      relatedEntityNumber,
    });

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/whatsapp/logs
router.get('/logs', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (isDatabaseConnected()) {
      const result = await query('SELECT * FROM communication_logs ORDER BY sent_at DESC LIMIT 100');
      const logs = result.rows.map((r) => ({
        id: r.id,
        channel: r.channel,
        recipientPhone: r.recipient_phone,
        recipientName: r.recipient_name,
        messageType: r.message_type,
        content: r.content,
        status: r.status,
        relatedEntityType: r.related_entity_type,
        relatedEntityId: r.related_entity_id,
        relatedEntityNumber: r.related_entity_number,
        sentAt: r.sent_at,
        deliveredAt: r.delivered_at,
        readAt: r.read_at,
      }));
      return res.json(logs);
    }

    const logs = fallbackStorage.get<any[]>('comm_logs', []);
    res.json(logs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/whatsapp/templates
router.get('/templates', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (isDatabaseConnected()) {
      const result = await query('SELECT * FROM communication_templates ORDER BY title ASC');
      return res.json(result.rows);
    }
    const templates = fallbackStorage.get<any[]>('comm_templates', []);
    res.json(templates);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/whatsapp/webhook (For Meta Cloud API status webhooks)
router.post('/webhook', async (req: Request, res: Response) => {
  const body = req.body;
  // Meta webhook verification and status ingestion
  if (body.entry && body.entry[0]?.changes && body.entry[0]?.changes[0]?.value?.statuses) {
    const statuses = body.entry[0].changes[0].value.statuses;
    for (const s of statuses) {
      const providerId = s.id;
      const status = s.status as MessageStatus;
      await WhatsAppService.updateStatusFromWebhook(providerId, status);
    }
  }
  res.sendStatus(200);
});

export default router;
