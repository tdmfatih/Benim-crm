import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { query, isDatabaseConnected, fallbackStorage } from '../db/db';

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  roleId: string;
  roleTitle: string;
  department: string;
  canViewCost?: boolean;
  permissions?: string[];
  isActive?: boolean;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

const JWT_SECRET = process.env.AUTH_SECRET || '3as-secure-jwt-super-secret-production-key-2026';

export function generateToken(user: AuthUser): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      roleId: user.roleId,
      fullName: user.fullName,
      roleTitle: user.roleTitle,
    },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

export async function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    // If running in development or no token header provided, check fallback user ID header for backward compatibility
    const fallbackUserId = req.headers['x-user-id'] as string;
    if (fallbackUserId) {
      const user = await findUserById(fallbackUserId);
      if (user) {
        req.user = user;
        return next();
      }
    }
    return res.status(401).json({ error: 'Yetkisiz erişim. Lütfen giriş yapınız.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const user = await findUserById(decoded.id);

    if (!user || user.isActive === false) {
      return res.status(403).json({ error: 'Kullanıcı hesabı aktif değil veya bulunamadı.' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Geçersiz veya süresi dolmuş oturum anahtarı.' });
  }
}

export async function optionalAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const user = await findUserById(decoded.id);
      if (user && user.isActive !== false) {
        req.user = user;
      }
    } catch {
      // ignore
    }
  } else {
    const fallbackUserId = req.headers['x-user-id'] as string;
    if (fallbackUserId) {
      const user = await findUserById(fallbackUserId);
      if (user) req.user = user;
    }
  }

  next();
}

async function findUserById(id: string): Promise<AuthUser | null> {
  if (isDatabaseConnected()) {
    try {
      const res = await query(
        `SELECT u.id, u.full_name as "fullName", u.email, u.role_id as "roleId", u.role_title as "roleTitle",
                u.department, u.is_active as "isActive", u.can_view_cost as "canViewCost",
                u.permissions, r.permissions as "rolePermissions", r.can_view_cost as "roleCanViewCost"
         FROM users u
         LEFT JOIN roles r ON u.role_id = r.id
         WHERE u.id = $1`,
        [id]
      );
      if (res.rows.length === 0) return null;
      const row = res.rows[0];
      const permissions = row.permissions || row.rolePermissions || [];
      return {
        id: row.id,
        fullName: row.fullName,
        email: row.email,
        roleId: row.roleId,
        roleTitle: row.roleTitle,
        department: row.department,
        canViewCost: row.canViewCost ?? row.roleCanViewCost,
        permissions,
        isActive: row.isActive,
      };
    } catch (e) {
      console.error('findUserById error:', e);
    }
  }

  const users = fallbackStorage.get<any[]>('users', []);
  const user = users.find((u) => u.id === id);
  if (!user) return null;

  const roles = fallbackStorage.get<any[]>('roles', []);
  const role = roles.find((r) => r.id === user.roleId);
  const permissions = user.permissions || role?.permissions || [];

  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    roleId: user.roleId,
    roleTitle: user.roleTitle,
    department: user.department,
    canViewCost: user.canViewCost ?? role?.canViewCost,
    permissions,
    isActive: user.isActive !== false,
  };
}
