import { Router, Request, Response } from 'express';
import { query, isDatabaseConnected, fallbackStorage } from '../db/db';
import { optionalAuth, AuthenticatedRequest } from '../middleware/auth';
import { logAudit } from '../middleware/audit';
import { AutomationEngine } from '../services/automationService';

const router = Router();

// GET /api/leads
router.get('/', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (isDatabaseConnected()) {
      const result = await query('SELECT * FROM leads ORDER BY created_at DESC');
      const leads = result.rows.map((r) => ({
        id: r.id,
        fullName: r.full_name,
        companyName: r.company_name,
        phone: r.phone,
        email: r.email,
        city: r.city,
        interestedServiceCategory: r.interested_service_category,
        serviceDetails: r.service_details,
        message: r.message,
        source: r.source,
        stage: r.stage,
        assignedUserId: r.assigned_user_id,
        assignedUserName: r.assigned_user_name,
        discoveryDate: r.discovery_date,
        budgetEstimate: Number(r.budget_estimate) || 0,
        customerId: r.customer_id,
        convertedOfferId: r.converted_offer_id,
        activities: r.activities || [],
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }));
      return res.json(leads);
    }

    const leads = fallbackStorage.get<any[]>('leads', []);
    res.json(leads);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/leads
router.post('/', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  const data = req.body;
  if (!data.fullName || !data.phone) {
    return res.status(400).json({ error: 'Ad Soyad ve telefon numarası zorunludur.' });
  }

  const id = data.id || `lead-${Date.now()}`;
  const cleanPhone = String(data.phone).trim();

  try {
    if (isDatabaseConnected()) {
      await query(
        `INSERT INTO leads 
         (id, full_name, company_name, phone, email, city, interested_service_category, service_details, message, source, stage, assigned_user_id, assigned_user_name, budget_estimate, activities, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW())`,
        [
          id,
          data.fullName,
          data.companyName || null,
          cleanPhone,
          data.email || null,
          data.city || 'Tekirdağ',
          data.interestedServiceCategory || 'Güvenlik & Bilişim Sistemleri',
          data.serviceDetails || null,
          data.message || null,
          data.source || 'Manuel',
          data.stage || 'new',
          data.assignedUserId || null,
          data.assignedUserName || null,
          data.budgetEstimate || 0,
          JSON.stringify(data.activities || []),
        ]
      );
    } else {
      const leads = fallbackStorage.get<any[]>('leads', []);
      const newLead = {
        ...data,
        id,
        phone: cleanPhone,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      leads.unshift(newLead);
      fallbackStorage.save('leads', leads);
    }

    await logAudit({
      req,
      user: req.user,
      action: 'LEAD_CREATED',
      entityType: 'lead',
      entityId: id,
      entityName: data.fullName,
      newValues: { fullName: data.fullName, phone: cleanPhone, source: data.source },
    });

    // Trigger automation event
    AutomationEngine.triggerEvent({
      trigger: 'LEAD_CREATED',
      entityId: id,
      customerName: data.fullName,
      customerPhone: cleanPhone,
      data: { serviceCategory: data.interestedServiceCategory, source: data.source },
    }).catch(console.error);

    res.status(201).json({ success: true, id, lead: { ...data, id } });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/public/leads (External Website Webhook)
router.post('/public-webhook', async (req: Request, res: Response) => {
  const { fullName, name, phone, email, city, serviceCategory, message, source } = req.body;

  const leadName = fullName || name;
  if (!leadName || !phone) {
    return res.status(400).json({ error: 'İsim ve telefon numarası zorunludur.' });
  }

  const id = `lead-web-${Date.now()}`;
  const cleanPhone = String(phone).trim();

  try {
    const activity = [
      {
        id: `act-${Date.now()}`,
        leadId: id,
        userId: 'sys-web',
        userName: '3AS Web Sitesi Entegrasyonu',
        type: 'note',
        summary: 'Web sitesi formundan otomatik lead girişi yapıldı.',
        createdAt: new Date().toISOString(),
      },
    ];

    if (isDatabaseConnected()) {
      await query(
        `INSERT INTO leads 
         (id, full_name, phone, email, city, interested_service_category, message, source, stage, activities, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'new', $9, NOW(), NOW())`,
        [
          id,
          leadName,
          cleanPhone,
          email || null,
          city || 'Tekirdağ',
          serviceCategory || 'Web Sitesi İletişim',
          message || null,
          source || 'Web Sitesi',
          JSON.stringify(activity),
        ]
      );
    } else {
      const leads = fallbackStorage.get<any[]>('leads', []);
      leads.unshift({
        id,
        fullName: leadName,
        phone: cleanPhone,
        email,
        city: city || 'Tekirdağ',
        interestedServiceCategory: serviceCategory || 'Web Sitesi Talebi',
        message,
        source: source || 'Web Sitesi',
        stage: 'new',
        activities: activity,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      fallbackStorage.save('leads', leads);
    }

    // Trigger automation to notify manager
    AutomationEngine.triggerEvent({
      trigger: 'LEAD_CREATED',
      entityId: id,
      customerName: leadName,
      customerPhone: cleanPhone,
      data: { serviceCategory: serviceCategory || 'Web Talebi', source: 'Web Sitesi' },
    }).catch(console.error);

    res.status(201).json({
      success: true,
      message: 'Talebiniz 3AS TEKNOLOJİ CRM sistemine başarıyla kaydedildi. Temsilcimiz en kısa sürede iletişime geçecektir.',
      id,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/leads/:id/convert (Convert to customer reliably without duplicate)
router.post('/:id/convert', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  try {
    let lead: any = null;

    if (isDatabaseConnected()) {
      const resLead = await query('SELECT * FROM leads WHERE id = $1', [id]);
      if (resLead.rows.length === 0) return res.status(404).json({ error: 'Lead bulunamadı.' });
      lead = resLead.rows[0];

      // Check if already customer
      let customerId = lead.customer_id;
      if (!customerId) {
        // Check phone duplicate in customers
        const custCheck = await query('SELECT id FROM customers WHERE phone = $1', [lead.phone]);
        if (custCheck.rows.length > 0) {
          customerId = custCheck.rows[0].id;
        } else {
          customerId = `cust-${Date.now()}`;
          await query(
            `INSERT INTO customers (id, type, name, phone, email, city, balance, created_at)
             VALUES ($1, 'individual', $2, $3, $4, $5, 0.00, NOW())`,
            [customerId, lead.full_name, lead.phone, lead.email, lead.city || 'Tekirdağ']
          );
        }

        await query('UPDATE leads SET customer_id = $1, stage = $2, updated_at = NOW() WHERE id = $3', [
          customerId,
          'won',
          id,
        ]);
      }

      return res.json({ success: true, customerId, message: 'Lead başarıyla cari müşteriye dönüştürüldü.' });
    }

    const leads = fallbackStorage.get<any[]>('leads', []);
    const leadObj = leads.find((l) => l.id === id);
    if (!leadObj) return res.status(404).json({ error: 'Lead bulunamadı.' });

    const customers = fallbackStorage.get<any[]>('customers', []);
    let cust = customers.find((c) => c.phone === leadObj.phone);
    if (!cust) {
      cust = {
        id: `cust-${Date.now()}`,
        type: 'individual',
        name: leadObj.fullName,
        phone: leadObj.phone,
        email: leadObj.email,
        city: leadObj.city || 'Tekirdağ',
        balance: 0,
        createdAt: new Date().toISOString(),
      };
      customers.unshift(cust);
      fallbackStorage.save('customers', customers);
    }

    leadObj.customerId = cust.id;
    leadObj.stage = 'won';
    leadObj.updatedAt = new Date().toISOString();
    fallbackStorage.save('leads', leads);

    res.json({ success: true, customerId: cust.id, message: 'Lead başarıyla cari müşteriye dönüştürüldü.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
