import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth';

export function requirePermission(permissionKey: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Giriş yapılması zorunludur.' });
    }

    // Super admin bypass
    if (
      user.roleId === 'role-super-admin' ||
      user.roleTitle?.toLowerCase().includes('super admin') ||
      user.roleTitle?.toLowerCase().includes('kurucu') ||
      user.email === 'tdmfatih.FD@gmail.com' ||
      user.email === 'bilgi@3asteknoloji.com'
    ) {
      return next();
    }

    const permissions = user.permissions || [];
    if (!permissions.includes(permissionKey)) {
      return res.status(403).json({
        error: `Bu işlem için yetkiniz bulunmamaktadır. Gerekli yetki: [${permissionKey}]`,
      });
    }

    next();
  };
}
