import { Router, Response } from 'express';
import { query, isDatabaseConnected, fallbackStorage } from '../db/db';
import { optionalAuth, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// GET /api/automations
router.get('/', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (isDatabaseConnected()) {
      const result = await query('SELECT * FROM automation_rules ORDER BY created_at ASC');
      return res.json(
        result.rows.map((r) => ({
          id: r.id,
          name: r.name,
          trigger: r.trigger,
          description: r.description,
          actionType: r.action_type,
          templateCode: r.template_code,
          delayMinutes: r.delay_minutes,
          isActive: r.is_active,
          isEnabled: r.is_active,
        }))
      );
    }
    const rules = fallbackStorage.get<any[]>('automations', []);
    res.json(rules);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/automations
router.post('/', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  const body = req.body;
  const id = body.id || `rule-${Date.now()}`;
  const isActive = body.isActive !== undefined ? body.isActive : body.isEnabled !== undefined ? body.isEnabled : true;

  try {
    if (isDatabaseConnected()) {
      await query(
        `INSERT INTO automation_rules (id, name, trigger, description, action_type, template_code, delay_minutes, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           trigger = EXCLUDED.trigger,
           description = EXCLUDED.description,
           action_type = EXCLUDED.action_type,
           is_active = EXCLUDED.is_active`,
        [id, body.name, body.trigger, body.description || '', body.actionType || 'SEND_WHATSAPP', body.templateCode || null, body.delayMinutes || 0, isActive]
      );
    } else {
      const rules = fallbackStorage.get<any[]>('automations', []);
      const idx = rules.findIndex((r) => r.id === id);
      const ruleObj = { ...body, id, isActive, isEnabled: isActive };
      if (idx >= 0) rules[idx] = ruleObj;
      else rules.push(ruleObj);
      fallbackStorage.save('automations', rules);
    }

    res.json({ success: true, message: 'Otomasyon kuralı kaydedildi.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/automations/logs
router.get('/logs', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (isDatabaseConnected()) {
      const result = await query('SELECT * FROM automation_runs ORDER BY run_at DESC LIMIT 100');
      return res.json(result.rows);
    }
    res.json([]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
