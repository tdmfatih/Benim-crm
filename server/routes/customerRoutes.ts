import { Router, Response } from 'express';
import { query, isDatabaseConnected, fallbackStorage } from '../db/db';
import { authenticateToken, optionalAuth, AuthenticatedRequest } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { logAudit } from '../middleware/audit';

const router = Router();

// GET /api/customers
router.get('/', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (isDatabaseConnected()) {
      const result = await query('SELECT * FROM customers ORDER BY created_at DESC');
      const customers = result.rows.map((r) => ({
        id: r.id,
        type: r.type,
        name: r.name,
        companyTitle: r.company_title,
        contactPerson: r.contact_person,
        tcIdentityNumber: r.tc_identity_number,
        taxOffice: r.tax_office,
        taxNumber: r.tax_number,
        phone: r.phone,
        secondaryPhone: r.secondary_phone,
        email: r.email,
        website: r.website,
        address: r.address,
        district: r.district,
        city: r.city,
        balance: Number(r.balance) || 0,
        creditLimit: Number(r.credit_limit) || 50000,
        contacts: r.contacts || [],
        addresses: r.addresses || [],
        notes: r.notes,
        tags: r.tags || [],
        createdAt: r.created_at,
      }));
      return res.json(customers);
    }

    const customers = fallbackStorage.get<any[]>('customers', []);
    res.json(customers);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/customers
router.post('/', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  const data = req.body;
  if (!data.name || !data.phone) {
    return res.status(400).json({ error: 'Müşteri adı ve telefon numarası zorunludur.' });
  }

  const cleanPhone = String(data.phone).trim();
  const id = data.id || `cust-${Date.now()}`;

  try {
    if (isDatabaseConnected()) {
      // Check duplicate
      const dupCheck = await query('SELECT id, name FROM customers WHERE phone = $1', [cleanPhone]);
      if (dupCheck.rows.length > 0) {
        return res.status(409).json({
          error: `Bu telefon numarasıyla kayıtlı bir müşteri zaten var: ${dupCheck.rows[0].name}`,
        });
      }

      await query(
        `INSERT INTO customers 
         (id, type, name, company_title, contact_person, tc_identity_number, tax_office, tax_number, phone, secondary_phone, email, website, address, district, city, balance, credit_limit, contacts, addresses, notes, tags, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, NOW())`,
        [
          id,
          data.type || 'individual',
          data.name,
          data.companyTitle || null,
          data.contactPerson || null,
          data.tcIdentityNumber || null,
          data.taxOffice || null,
          data.taxNumber || null,
          cleanPhone,
          data.secondaryPhone || null,
          data.email || null,
          data.website || null,
          data.address || null,
          data.district || null,
          data.city || null,
          data.balance || 0,
          data.creditLimit || 50000,
          JSON.stringify(data.contacts || []),
          JSON.stringify(data.addresses || []),
          data.notes || null,
          JSON.stringify(data.tags || []),
        ]
      );
    } else {
      const customers = fallbackStorage.get<any[]>('customers', []);
      const newCust = {
        ...data,
        id,
        phone: cleanPhone,
        balance: data.balance || 0,
        createdAt: new Date().toISOString(),
      };
      customers.unshift(newCust);
      fallbackStorage.save('customers', customers);
    }

    await logAudit({
      req,
      user: req.user,
      action: 'CUSTOMER_CREATED',
      entityType: 'customer',
      entityId: id,
      entityName: data.name,
      newValues: { name: data.name, phone: cleanPhone, type: data.type },
    });

    res.status(201).json({ success: true, id, customer: { ...data, id } });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/customers/:id
router.put('/:id', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const data = req.body;

  try {
    if (isDatabaseConnected()) {
      await query(
        `UPDATE customers SET 
           type = $1, name = $2, company_title = $3, contact_person = $4, tc_identity_number = $5,
           tax_office = $6, tax_number = $7, phone = $8, secondary_phone = $9, email = $10,
           website = $11, address = $12, district = $13, city = $14, credit_limit = $15,
           contacts = $16, addresses = $17, notes = $18, tags = $19, updated_at = NOW()
         WHERE id = $20`,
        [
          data.type || 'individual',
          data.name,
          data.companyTitle || null,
          data.contactPerson || null,
          data.tcIdentityNumber || null,
          data.taxOffice || null,
          data.taxNumber || null,
          data.phone,
          data.secondaryPhone || null,
          data.email || null,
          data.website || null,
          data.address || null,
          data.district || null,
          data.city || null,
          data.creditLimit || 50000,
          JSON.stringify(data.contacts || []),
          JSON.stringify(data.addresses || []),
          data.notes || null,
          JSON.stringify(data.tags || []),
          id,
        ]
      );
    } else {
      const customers = fallbackStorage.get<any[]>('customers', []);
      const idx = customers.findIndex((c) => c.id === id);
      if (idx >= 0) {
        customers[idx] = { ...customers[idx], ...data, updatedAt: new Date().toISOString() };
        fallbackStorage.save('customers', customers);
      }
    }

    await logAudit({
      req,
      user: req.user,
      action: 'CUSTOMER_UPDATED',
      entityType: 'customer',
      entityId: id,
      entityName: data.name || id,
      newValues: data,
    });

    res.json({ success: true, message: 'Müşteri bilgileri güncellendi.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
