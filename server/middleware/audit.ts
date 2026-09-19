import { Request } from 'express';
import { query, isDatabaseConnected, fallbackStorage } from '../db/db';
import { AuthUser } from './auth';

export interface AuditLogParams {
  req?: Request;
  user?: AuthUser;
  action: string;
  entityType: string;
  entityId: string;
  entityName: string;
  oldValues?: any;
  newValues?: any;
}

export async function logAudit(params: AuditLogParams): Promise<void> {
  const { req, user, action, entityType, entityId, entityName, oldValues, newValues } = params;

  const clientIp = (req?.headers['x-forwarded-for'] as string) || req?.socket.remoteAddress || '127.0.0.1';
  const userAgent = (req?.headers['user-agent'] as string) || 'Browser/System';

  const userId = user?.id || 'sys-auto';
  const userName = user?.fullName || 'Sistem';
  const userRole = user?.roleTitle || 'Sistem / Arka Plan';

  const logId = `aud-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  if (isDatabaseConnected()) {
    try {
      await query(
        `INSERT INTO audit_logs 
         (id, user_id, user_name, user_role, action, entity_type, entity_id, entity_name, old_values, new_values, client_ip, user_agent, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())`,
        [
          logId,
          userId,
          userName,
          userRole,
          action,
          entityType,
          entityId,
          entityName,
          oldValues ? JSON.stringify(oldValues) : null,
          newValues ? JSON.stringify(newValues) : null,
          clientIp,
          userAgent,
        ]
      );
    } catch (err) {
      console.error('Failed to write audit log to PostgreSQL:', err);
    }
  } else {
    const logs = fallbackStorage.get<any[]>('audit_logs', []);
    logs.unshift({
      id: logId,
      userId,
      userName,
      userRole,
      action,
      entityType,
      entityId,
      entityName,
      oldValues,
      newValues,
      clientIp,
      timestamp: new Date().toISOString(),
    });
    fallbackStorage.save('audit_logs', logs.slice(0, 100));
  }
}
