import { Router, Response } from 'express';
import { query, isDatabaseConnected, fallbackStorage } from '../db/db';
import { optionalAuth, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// GET /api/audit-logs
router.get('/', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (isDatabaseConnected()) {
      const result = await query('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 200');
      const logs = result.rows.map((r) => ({
        id: r.id,
        userId: r.user_id,
        userName: r.user_name,
        userRole: r.user_role,
        action: r.action,
        entityType: r.entity_type,
        entityId: r.entity_id,
        entityName: r.entity_name,
        oldValues: r.old_values,
        newValues: r.new_values,
        clientIp: r.client_ip,
        userAgent: r.user_agent,
        timestamp: r.created_at,
      }));
      return res.json(logs);
    }

    const logs = fallbackStorage.get<any[]>('audit_logs', []);
    res.json(logs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
