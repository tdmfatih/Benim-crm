import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { query, isDatabaseConnected, fallbackStorage } from '../db/db';
import { optionalAuth, AuthenticatedRequest } from '../middleware/auth';
import { logAudit } from '../middleware/audit';

const router = Router();

// GET /api/settings
router.get('/settings', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (isDatabaseConnected()) {
      const result = await query('SELECT * FROM company_settings LIMIT 1');
      if (result.rows.length > 0) {
        const r = result.rows[0];
        return res.json({
          companyName: r.company_name,
          tradeName: r.trade_name,
          slogan: r.slogan,
          phone: r.phone,
          whatsappNumber: r.whatsapp_number,
          managerWhatsAppNumber: r.manager_whatsapp_number,
          leadNotificationPhone: r.lead_notification_phone,
          email: r.email,
          website: r.website,
          address: r.address,
          city: r.city,
          district: r.district,
          taxOffice: r.tax_office,
          taxNumber: r.tax_number,
          bankName: r.bank_name,
          iban: r.iban,
          bankAccounts: r.bank_accounts || [],
          googleReviewUrl: r.google_review_url,
          currency: r.currency || 'TRY',
          serviceWarrantyTerms: r.service_warranty_terms,
          offerTermsDefault: r.offer_terms_default,
          logoUrl: r.logo_url,
        });
      }
    }
    const settings = fallbackStorage.get<any>('company_settings', {
      companyName: '3AS TEKNOLOJİ ve BİLİŞİM HİZMETLERİ',
      tradeName: '3AS TEKNOLOJİ',
      phone: '+905050375959',
      whatsappNumber: '+905050375959',
      email: 'bilgi@3asteknoloji.com',
      website: 'https://3asteknoloji.com',
      city: 'Tekirdağ',
    });
    res.json(settings);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/settings
router.post('/settings', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  const body = req.body;
  try {
    if (isDatabaseConnected()) {
      await query(
        `INSERT INTO company_settings (id, company_name, trade_name, phone, whatsapp_number, email, website, address, city, district, tax_office, tax_number, bank_name, iban, google_review_url, updated_at)
         VALUES ('sys-1', $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())
         ON CONFLICT (id) DO UPDATE SET
           company_name = EXCLUDED.company_name,
           trade_name = EXCLUDED.trade_name,
           phone = EXCLUDED.phone,
           whatsapp_number = EXCLUDED.whatsapp_number,
           email = EXCLUDED.email,
           website = EXCLUDED.website,
           address = EXCLUDED.address,
           city = EXCLUDED.city,
           tax_office = EXCLUDED.tax_office,
           tax_number = EXCLUDED.tax_number,
           bank_name = EXCLUDED.bank_name,
           iban = EXCLUDED.iban,
           google_review_url = EXCLUDED.google_review_url,
           updated_at = NOW()`,
        [
          body.companyName,
          body.tradeName || '3AS TEKNOLOJİ',
          body.phone,
          body.whatsappNumber,
          body.email,
          body.website,
          body.address,
          body.city || 'Tekirdağ',
          body.district || 'Süleymanpaşa',
          body.taxOffice,
          body.taxNumber,
          body.bankName,
          body.iban,
          body.googleReviewUrl,
        ]
      );
    } else {
      fallbackStorage.save('company_settings', body);
    }

    await logAudit({
      req,
      user: req.user,
      action: 'SETTINGS_UPDATED',
      entityType: 'settings',
      entityId: 'sys-1',
      entityName: 'Şirket Ayarları',
      newValues: body,
    });

    res.json({ success: true, message: 'Şirket ayarları güncellendi.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/roles
router.get('/roles', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (isDatabaseConnected()) {
      const result = await query('SELECT * FROM roles ORDER BY name ASC');
      return res.json(
        result.rows.map((r) => ({
          id: r.id,
          name: r.name,
          slug: r.slug,
          code: r.code,
          description: r.description,
          isSystem: r.is_system,
          canViewCost: r.can_view_cost,
          permissions: r.permissions || [],
        }))
      );
    }
    const roles = fallbackStorage.get<any[]>('roles', []);
    res.json(roles);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/users
router.get('/users', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (isDatabaseConnected()) {
      const result = await query(
        `SELECT u.id, u.full_name as "fullName", u.email, u.phone, u.role_id as "roleId",
                u.role_title as "roleTitle", u.department, u.is_active as "isActive",
                u.can_view_cost as "canViewCost", u.permissions, u.created_at as "createdAt"
         FROM users u ORDER BY u.created_at ASC`
      );
      return res.json(result.rows);
    }
    const users = fallbackStorage.get<any[]>('users', []);
    res.json(
      users.map((u) => ({
        ...u,
        passwordHash: undefined, // Never expose password hash
      }))
    );
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/users (Add or Update User with Bcrypt Password Hash)
router.post('/users', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  const body = req.body;
  const id = body.id || `usr-${Date.now()}`;

  try {
    let passwordHash: string | undefined = undefined;
    if (body.password) {
      const salt = await bcrypt.genSalt(10);
      passwordHash = await bcrypt.hash(body.password, salt);
    }

    if (isDatabaseConnected()) {
      if (body.id) {
        // Update
        const updateSql = passwordHash
          ? `UPDATE users SET full_name = $1, email = $2, phone = $3, role_id = $4, role_title = $5, department = $6, is_active = $7, can_view_cost = $8, password_hash = $9, updated_at = NOW() WHERE id = $10`
          : `UPDATE users SET full_name = $1, email = $2, phone = $3, role_id = $4, role_title = $5, department = $6, is_active = $7, can_view_cost = $8, updated_at = NOW() WHERE id = $9`;

        const params = passwordHash
          ? [body.fullName, body.email.toLowerCase(), body.phone, body.roleId, body.roleTitle, body.department || 'Operasyon', body.isActive !== false, body.canViewCost || false, passwordHash, id]
          : [body.fullName, body.email.toLowerCase(), body.phone, body.roleId, body.roleTitle, body.department || 'Operasyon', body.isActive !== false, body.canViewCost || false, id];

        await query(updateSql, params);
      } else {
        // Insert
        if (!passwordHash) {
          const salt = await bcrypt.genSalt(10);
          passwordHash = await bcrypt.hash('3AS!Teknoloji2026', salt);
        }

        await query(
          `INSERT INTO users (id, full_name, email, password_hash, phone, role_id, role_title, department, is_active, can_view_cost)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [id, body.fullName, body.email.toLowerCase(), passwordHash, body.phone, body.roleId, body.roleTitle, body.department || 'Operasyon', body.isActive !== false, body.canViewCost || false]
        );
      }
    } else {
      const users = fallbackStorage.get<any[]>('users', []);
      const idx = users.findIndex((u) => u.id === id);
      const userObj = {
        ...body,
        id,
        passwordHash: passwordHash || (idx >= 0 ? users[idx].passwordHash : undefined),
      };
      if (idx >= 0) users[idx] = userObj;
      else users.push(userObj);
      fallbackStorage.save('users', users);
    }

    res.json({ success: true, message: 'Kullanıcı hesabı kaydedildi.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/service-categories
router.get('/service-categories', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (isDatabaseConnected()) {
      const result = await query('SELECT * FROM service_categories ORDER BY order_index ASC');
      return res.json(result.rows);
    }
    const cats = fallbackStorage.get<any[]>('service_categories', []);
    res.json(cats);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
