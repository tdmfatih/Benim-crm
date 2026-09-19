import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { query, isDatabaseConnected, fallbackStorage } from '../db/db';
import { optionalAuth, AuthenticatedRequest } from '../middleware/auth';
import { logAudit } from '../middleware/audit';
import { SequenceService } from '../services/sequenceService';
import { FinancialValidator } from '../services/financialValidator';
import { AutomationEngine } from '../services/automationService';

const router = Router();

// GET /api/offers
router.get('/', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (isDatabaseConnected()) {
      const result = await query('SELECT * FROM offers ORDER BY created_at DESC');
      const offers = result.rows.map((r) => ({
        id: r.id,
        offerNumber: r.offer_number,
        customerId: r.customer_id,
        customerName: r.customer_name,
        customerPhone: r.customer_phone,
        customerEmail: r.customer_email,
        customerAddress: r.customer_address,
        serviceCategory: r.service_category,
        leadId: r.lead_id,
        status: r.status,
        validUntil: r.valid_until,
        currentVersion: r.current_version,
        currency: r.currency || 'TRY',
        exchangeRate: Number(r.exchange_rate) || 1,
        subtotal: Number(r.subtotal) || 0,
        discountTotal: Number(r.discount_total) || 0,
        taxTotal: Number(r.tax_total) || 0,
        grandTotal: Number(r.grand_total) || 0,
        totalCost: Number(r.total_cost) || 0,
        marginPercentage: Number(r.margin_percentage) || 0,
        paymentTerms: r.payment_terms,
        warrantyTerms: r.warranty_terms,
        notes: r.notes,
        secureToken: r.secure_token,
        approvedAt: r.approved_at,
        rejectedAt: r.rejected_at,
        rejectionReason: r.rejection_reason,
        clientIp: r.client_ip,
        convertedProjectId: r.converted_project_id,
        items: r.items || [],
        versions: r.versions || [],
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        sentAt: r.sent_at,
      }));
      return res.json(offers);
    }

    const offers = fallbackStorage.get<any[]>('offers', []);
    res.json(offers);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/offers
router.post('/', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  const body = req.body;

  if (!body.customerId || !body.customerName) {
    return res.status(400).json({ error: 'Müşteri bilgisi zorunludur.' });
  }

  try {
    // 1. Generate concurrency-safe offer number if not provided
    const offerNumber = body.offerNumber && body.offerNumber.startsWith('TEK-')
      ? body.offerNumber
      : await SequenceService.getNextNumber('offer');

    // 2. Server-side financial recalculation (never trust client)
    const calculation = FinancialValidator.calculateOfferTotals(body.items || []);

    // 3. Cryptographically secure public token
    const secureToken = crypto.randomBytes(32).toString('hex');
    const id = body.id || `off-${Date.now()}`;
    const validUntil = body.validUntil || new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const version1 = {
      versionNumber: 1,
      createdAt: new Date().toISOString(),
      createdBy: req.user?.id || 'usr-1',
      createdByName: req.user?.fullName || 'Satış Yöneticisi',
      items: calculation.items,
      subtotal: calculation.subtotal,
      discountTotal: calculation.discountTotal,
      taxTotal: calculation.taxTotal,
      grandTotal: calculation.grandTotal,
      totalCost: calculation.totalCost,
      marginPercentage: calculation.marginPercentage,
      terms: body.paymentTerms || '',
      changeNote: 'İlk teklif oluşturuldu.',
    };

    const newOffer = {
      id,
      offerNumber,
      customerId: body.customerId,
      customerName: body.customerName,
      customerPhone: body.customerPhone || '',
      customerEmail: body.customerEmail || '',
      customerAddress: body.customerAddress || '',
      serviceCategory: body.serviceCategory || 'Güvenlik & Bilişim',
      leadId: body.leadId || null,
      status: body.status || 'draft',
      validUntil,
      currentVersion: 1,
      currency: body.currency || 'TRY',
      exchangeRate: body.exchangeRate || 1,
      subtotal: calculation.subtotal,
      discountTotal: calculation.discountTotal,
      taxTotal: calculation.taxTotal,
      grandTotal: calculation.grandTotal,
      totalCost: calculation.totalCost,
      marginPercentage: calculation.marginPercentage,
      paymentTerms: body.paymentTerms || '%50 Peşin, %50 Montaj Sonu',
      warrantyTerms: body.warrantyTerms || '2 Yıl Yerinde Birebir Değişim Garantisi',
      notes: body.notes || '',
      secureToken,
      items: calculation.items,
      versions: [version1],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (isDatabaseConnected()) {
      await query(
        `INSERT INTO offers 
         (id, offer_number, customer_id, customer_name, customer_phone, customer_email, customer_address, service_category, lead_id, status, valid_until, current_version, currency, exchange_rate, subtotal, discount_total, tax_total, grand_total, total_cost, margin_percentage, payment_terms, warranty_terms, notes, secure_token, items, versions, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 1, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, NOW(), NOW())`,
        [
          id,
          offerNumber,
          body.customerId,
          body.customerName,
          body.customerPhone || '',
          body.customerEmail || null,
          body.customerAddress || null,
          body.serviceCategory || 'Genel',
          body.leadId || null,
          newOffer.status,
          validUntil,
          newOffer.currency,
          newOffer.exchangeRate,
          calculation.subtotal,
          calculation.discountTotal,
          calculation.taxTotal,
          calculation.grandTotal,
          calculation.totalCost,
          calculation.marginPercentage,
          newOffer.paymentTerms,
          newOffer.warrantyTerms,
          newOffer.notes,
          secureToken,
          JSON.stringify(calculation.items),
          JSON.stringify([version1]),
        ]
      );
    } else {
      const offers = fallbackStorage.get<any[]>('offers', []);
      offers.unshift(newOffer);
      fallbackStorage.save('offers', offers);
    }

    await logAudit({
      req,
      user: req.user,
      action: 'OFFER_CREATED',
      entityType: 'offer',
      entityId: id,
      entityName: `${offerNumber} - ${body.customerName}`,
      newValues: { grandTotal: calculation.grandTotal, itemsCount: calculation.items.length },
    });

    // Trigger automation event
    const appUrl = process.env.APP_URL || 'https://panel.3asteknoloji.com';
    AutomationEngine.triggerEvent({
      trigger: 'OFFER_CREATED',
      entityId: id,
      entityNumber: offerNumber,
      customerName: body.customerName,
      customerPhone: body.customerPhone,
      data: {
        grandTotal: calculation.grandTotal,
        approvalUrl: `${appUrl}/offer/${secureToken}`,
      },
    }).catch(console.error);

    res.status(201).json({ success: true, offer: newOffer });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/offers/:id (Update or create new version)
router.put('/:id', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const body = req.body;

  try {
    const calculation = FinancialValidator.calculateOfferTotals(body.items || []);

    if (isDatabaseConnected()) {
      await query(
        `UPDATE offers SET 
           status = $1, valid_until = $2, current_version = $3, subtotal = $4,
           discount_total = $5, tax_total = $6, grand_total = $7, total_cost = $8,
           margin_percentage = $9, payment_terms = $10, warranty_terms = $11, notes = $12,
           items = $13, versions = $14, updated_at = NOW()
         WHERE id = $15`,
        [
          body.status,
          body.validUntil,
          body.currentVersion || 1,
          calculation.subtotal,
          calculation.discountTotal,
          calculation.taxTotal,
          calculation.grandTotal,
          calculation.totalCost,
          calculation.marginPercentage,
          body.paymentTerms,
          body.warrantyTerms,
          body.notes,
          JSON.stringify(calculation.items),
          JSON.stringify(body.versions || []),
          id,
        ]
      );
    } else {
      const offers = fallbackStorage.get<any[]>('offers', []);
      const idx = offers.findIndex((o) => o.id === id);
      if (idx >= 0) {
        offers[idx] = {
          ...offers[idx],
          ...body,
          ...calculation,
          updatedAt: new Date().toISOString(),
        };
        fallbackStorage.save('offers', offers);
      }
    }

    await logAudit({
      req,
      user: req.user,
      action: 'OFFER_UPDATED',
      entityType: 'offer',
      entityId: id,
      entityName: body.offerNumber || id,
      newValues: { grandTotal: calculation.grandTotal, status: body.status },
    });

    res.json({ success: true, message: 'Teklif güncellendi.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== PUBLIC CUSTOMER APPROVAL PORTAL ====================
// GET /api/public/offers/:token
router.get('/public/:token', async (req: Request, res: Response) => {
  const { token } = req.params;
  const cleanToken = token.split('?')[0];

  try {
    let offer: any = null;

    if (isDatabaseConnected()) {
      const result = await query('SELECT * FROM offers WHERE secure_token = $1', [cleanToken]);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Teklif bulunamadı veya bağlantı geçersiz.' });
      }
      const r = result.rows[0];
      offer = {
        id: r.id,
        offerNumber: r.offer_number,
        customerId: r.customer_id,
        customerName: r.customer_name,
        customerPhone: r.customer_phone,
        customerEmail: r.customer_email,
        customerAddress: r.customer_address,
        serviceCategory: r.service_category,
        status: r.status,
        validUntil: r.valid_until,
        currency: r.currency,
        subtotal: Number(r.subtotal) || 0,
        discountTotal: Number(r.discount_total) || 0,
        taxTotal: Number(r.tax_total) || 0,
        grandTotal: Number(r.grand_total) || 0,
        paymentTerms: r.payment_terms,
        warrantyTerms: r.warranty_terms,
        notes: r.notes,
        secureToken: r.secure_token,
        approvedAt: r.approved_at,
        rejectedAt: r.rejected_at,
        rejectionReason: r.rejection_reason,
        items: (r.items || []).map((item: any) => ({
          ...item,
          // Hide internal purchase cost from public view!
          purchaseCost: undefined,
          costPrice: undefined,
        })),
        createdAt: r.created_at,
      };
    } else {
      const offers = fallbackStorage.get<any[]>('offers', []);
      const found = offers.find((o) => o.secureToken === cleanToken);
      if (!found) {
        return res.status(404).json({ error: 'Teklif bulunamadı veya bağlantı geçersiz.' });
      }
      // sanitize purchase costs
      offer = {
        ...found,
        items: (found.items || []).map((item: any) => ({
          ...item,
          purchaseCost: undefined,
          costPrice: undefined,
        })),
        totalCost: undefined,
        marginPercentage: undefined,
      };
    }

    res.json(offer);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/public/offers/:token/approve
router.post('/public/:token/approve', async (req: Request, res: Response) => {
  const { token } = req.params;
  const { approverName, notes } = req.body;
  const cleanToken = token.split('?')[0];

  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
  const userAgent = (req.headers['user-agent'] as string) || '';

  try {
    let offer: any = null;

    if (isDatabaseConnected()) {
      const resOffer = await query('SELECT * FROM offers WHERE secure_token = $1', [cleanToken]);
      if (resOffer.rows.length === 0) return res.status(404).json({ error: 'Teklif bulunamadı.' });
      offer = resOffer.rows[0];

      if (offer.status === 'approved') {
        return res.json({ success: true, message: 'Bu teklif daha önce onaylanmıştır.' });
      }

      await query(
        `UPDATE offers SET 
           status = 'approved', approved_at = NOW(), client_ip = $1, user_agent = $2, updated_at = NOW()
         WHERE secure_token = $3`,
        [clientIp, userAgent, cleanToken]
      );
    } else {
      const offers = fallbackStorage.get<any[]>('offers', []);
      const idx = offers.findIndex((o) => o.secureToken === cleanToken);
      if (idx === -1) return res.status(404).json({ error: 'Teklif bulunamadı.' });

      offer = offers[idx];
      offers[idx].status = 'approved';
      offers[idx].approvedAt = new Date().toISOString();
      offers[idx].clientIp = clientIp;
      fallbackStorage.save('offers', offers);
    }

    await logAudit({
      req,
      action: 'PUBLIC_OFFER_APPROVED',
      entityType: 'offer',
      entityId: offer.id,
      entityName: `${offer.offer_number || offer.offerNumber} - ${offer.customer_name || offer.customerName}`,
      newValues: { approverName, notes, clientIp, userAgent },
    });

    // Trigger automation: notify team
    AutomationEngine.triggerEvent({
      trigger: 'OFFER_APPROVED',
      entityId: offer.id,
      entityNumber: offer.offer_number || offer.offerNumber,
      customerName: offer.customer_name || offer.customerName,
      customerPhone: offer.customer_phone || offer.customerPhone,
      data: { approverName, notes },
    }).catch(console.error);

    res.json({ success: true, message: 'Teklif başarıyla onaylandı. İş emriniz hazırlanıyor.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/public/offers/:token/reject
router.post('/public/:token/reject', async (req: Request, res: Response) => {
  const { token } = req.params;
  const { reason } = req.body;
  const cleanToken = token.split('?')[0];

  try {
    if (isDatabaseConnected()) {
      await query(
        `UPDATE offers SET status = 'rejected', rejected_at = NOW(), rejection_reason = $1, updated_at = NOW() WHERE secure_token = $2`,
        [reason || 'Müşteri tarafından reddedildi.', cleanToken]
      );
    } else {
      const offers = fallbackStorage.get<any[]>('offers', []);
      const idx = offers.findIndex((o) => o.secureToken === cleanToken);
      if (idx >= 0) {
        offers[idx].status = 'rejected';
        offers[idx].rejectedAt = new Date().toISOString();
        offers[idx].rejectionReason = reason;
        fallbackStorage.save('offers', offers);
      }
    }

    res.json({ success: true, message: 'Teklif ret bildiriminiz iletildi.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
