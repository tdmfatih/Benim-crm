import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { query, isDatabaseConnected, fallbackStorage } from '../db/db';
import { optionalAuth, AuthenticatedRequest } from '../middleware/auth';
import { logAudit } from '../middleware/audit';
import { SequenceService } from '../services/sequenceService';
import { InventoryLedger } from '../services/inventoryLedger';
import { AutomationEngine } from '../services/automationService';

const router = Router();

// GET /api/installations
router.get('/', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (isDatabaseConnected()) {
      const result = await query('SELECT * FROM installations ORDER BY created_at DESC');
      const list = result.rows.map((r) => ({
        id: r.id,
        installationNumber: r.installation_number,
        projectId: r.project_id,
        offerId: r.offer_id,
        projectName: r.project_name,
        customerId: r.customer_id,
        customerName: r.customer_name,
        customerPhone: r.customer_phone,
        addressTitle: r.address_title,
        fullAddress: r.full_address,
        city: r.city,
        status: r.status,
        scheduledDate: r.scheduled_date,
        scheduledTime: r.scheduled_time,
        assignedTechnicians: r.assigned_technicians || [],
        tasksDescription: r.tasks_description,
        checklist: r.checklist || [],
        materials: r.materials || [],
        photos: r.photos || [],
        startedAt: r.started_at,
        completedAt: r.completed_at,
        technicianNotes: r.technician_notes,
        secureDeliveryToken: r.secure_delivery_token,
        customerDeliveryApproval: r.customer_delivery_approval,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }));
      return res.json(list);
    }

    const list = fallbackStorage.get<any[]>('installations', []);
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/installations
router.post('/', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  const body = req.body;

  if (!body.customerName || !body.projectName) {
    return res.status(400).json({ error: 'Müşteri ve proje adı zorunludur.' });
  }

  try {
    const installationNumber = body.installationNumber && body.installationNumber.startsWith('MNT-')
      ? body.installationNumber
      : await SequenceService.getNextNumber('installation');

    const id = body.id || `inst-${Date.now()}`;
    const secureDeliveryToken = crypto.randomBytes(32).toString('hex');

    const newInst = {
      id,
      installationNumber,
      projectId: body.projectId || null,
      offerId: body.offerId || null,
      projectName: body.projectName,
      customerId: body.customerId || `cust-${Date.now()}`,
      customerName: body.customerName,
      customerPhone: body.customerPhone || '',
      addressTitle: body.addressTitle || 'Montaj Adresi',
      fullAddress: body.fullAddress || '',
      city: body.city || 'Tekirdağ',
      status: body.status || 'planned',
      scheduledDate: body.scheduledDate || new Date().toISOString().split('T')[0],
      scheduledTime: body.scheduledTime || '09:00 - 12:00',
      assignedTechnicians: body.assignedTechnicians || [],
      tasksDescription: body.tasksDescription || '',
      checklist: body.checklist || [],
      materials: body.materials || [],
      photos: body.photos || [],
      technicianNotes: body.technicianNotes || '',
      secureDeliveryToken,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (isDatabaseConnected()) {
      await query(
        `INSERT INTO installations 
         (id, installation_number, project_id, offer_id, project_name, customer_id, customer_name, customer_phone, address_title, full_address, city, status, scheduled_date, scheduled_time, assigned_technicians, tasks_description, checklist, materials, photos, technician_notes, secure_delivery_token, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, NOW(), NOW())`,
        [
          id,
          installationNumber,
          newInst.projectId,
          newInst.offerId,
          newInst.projectName,
          newInst.customerId,
          newInst.customerName,
          newInst.customerPhone,
          newInst.addressTitle,
          newInst.fullAddress,
          newInst.city,
          newInst.status,
          newInst.scheduledDate,
          newInst.scheduledTime,
          JSON.stringify(newInst.assignedTechnicians),
          newInst.tasksDescription,
          JSON.stringify(newInst.checklist),
          JSON.stringify(newInst.materials),
          JSON.stringify(newInst.photos),
          newInst.technicianNotes,
          secureDeliveryToken,
        ]
      );
    } else {
      const list = fallbackStorage.get<any[]>('installations', []);
      list.unshift(newInst);
      fallbackStorage.save('installations', list);
    }

    await logAudit({
      req,
      user: req.user,
      action: 'INSTALLATION_SCHEDULED',
      entityType: 'installation',
      entityId: id,
      entityName: `${installationNumber} - ${body.projectName}`,
      newValues: { scheduledDate: newInst.scheduledDate, scheduledTime: newInst.scheduledTime },
    });

    AutomationEngine.triggerEvent({
      trigger: 'INSTALLATION_SCHEDULED',
      entityId: id,
      entityNumber: installationNumber,
      customerName: newInst.customerName,
      customerPhone: newInst.customerPhone,
      data: { projectName: newInst.projectName, scheduledDate: newInst.scheduledDate },
    }).catch(console.error);

    res.status(201).json({ success: true, installation: newInst });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/installations/:id
router.put('/:id', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const body = req.body;

  try {
    if (isDatabaseConnected()) {
      await query(
        `UPDATE installations SET 
           status = $1, scheduled_date = $2, scheduled_time = $3, assigned_technicians = $4,
           tasks_description = $5, checklist = $6, materials = $7, photos = $8,
           technician_notes = $9, updated_at = NOW()
         WHERE id = $10`,
        [
          body.status,
          body.scheduledDate,
          body.scheduledTime,
          JSON.stringify(body.assignedTechnicians || []),
          body.tasksDescription,
          JSON.stringify(body.checklist || []),
          JSON.stringify(body.materials || []),
          JSON.stringify(body.photos || []),
          body.technicianNotes,
          id,
        ]
      );
    } else {
      const list = fallbackStorage.get<any[]>('installations', []);
      const idx = list.findIndex((i) => i.id === id);
      if (idx >= 0) {
        list[idx] = { ...list[idx], ...body, updatedAt: new Date().toISOString() };
        fallbackStorage.save('installations', list);
      }
    }

    res.json({ success: true, message: 'Montaj kaydı güncellendi.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/installations/:id/complete
// CRITICAL REQUIREMENT: Transactional & Idempotent material inventory deduction
router.post('/:id/complete', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { materials, technicianNotes, photos } = req.body;

  try {
    let installation: any = null;

    if (isDatabaseConnected()) {
      const selectRes = await query('SELECT * FROM installations WHERE id = $1', [id]);
      if (selectRes.rows.length === 0) return res.status(404).json({ error: 'Montaj iş emri bulunamadı.' });
      installation = selectRes.rows[0];

      const usedMaterials = materials || installation.materials || [];
      const instNumber = installation.installation_number;

      // Deduct each used material idempotently using unique idempotency key per installation & product
      for (const mat of usedMaterials) {
        if (!mat.productId || Number(mat.quantity) <= 0) continue;

        const idempotencyKey = `inst-${id}-prod-${mat.productId}`;
        await InventoryLedger.recordMovement({
          productId: mat.productId,
          productName: mat.name,
          type: 'installation_use',
          quantityChange: -Math.abs(Number(mat.quantity)),
          referenceType: 'installation',
          referenceNumber: instNumber,
          idempotencyKey,
          note: `${instNumber} numaralı ${installation.project_name} montajı kapsamında saha sarfiyatı`,
          performedBy: req.user?.fullName || 'Saha Şefi',
        });
      }

      await query(
        `UPDATE installations SET 
           status = 'completed', completed_at = NOW(), technician_notes = $1, photos = $2, materials = $3, updated_at = NOW()
         WHERE id = $4`,
        [technicianNotes || installation.technician_notes, JSON.stringify(photos || installation.photos || []), JSON.stringify(usedMaterials), id]
      );
    } else {
      const list = fallbackStorage.get<any[]>('installations', []);
      const idx = list.findIndex((i) => i.id === id);
      if (idx === -1) return res.status(404).json({ error: 'Montaj iş emri bulunamadı.' });

      installation = list[idx];
      const usedMaterials = materials || installation.materials || [];

      for (const mat of usedMaterials) {
        if (!mat.productId || Number(mat.quantity) <= 0) continue;
        const idempotencyKey = `inst-${id}-prod-${mat.productId}`;
        await InventoryLedger.recordMovement({
          productId: mat.productId,
          productName: mat.name,
          type: 'installation_use',
          quantityChange: -Math.abs(Number(mat.quantity)),
          referenceType: 'installation',
          referenceNumber: installation.installationNumber,
          idempotencyKey,
          note: `${installation.installationNumber} montajı saha kullanımı`,
          performedBy: req.user?.fullName || 'Saha Şefi',
        });
      }

      list[idx].status = 'completed';
      list[idx].completedAt = new Date().toISOString();
      list[idx].technicianNotes = technicianNotes || list[idx].technicianNotes;
      fallbackStorage.save('installations', list);
    }

    await logAudit({
      req,
      user: req.user,
      action: 'INSTALLATION_COMPLETED',
      entityType: 'installation',
      entityId: id,
      entityName: installation.project_name || installation.projectName || id,
      newValues: { status: 'completed' },
    });

    AutomationEngine.triggerEvent({
      trigger: 'INSTALLATION_COMPLETED',
      entityId: id,
      entityNumber: installation.installation_number || installation.installationNumber,
      customerName: installation.customer_name || installation.customerName,
      customerPhone: installation.customer_phone || installation.customerPhone,
      data: { projectName: installation.project_name || installation.projectName },
    }).catch(console.error);

    res.json({ success: true, message: 'Montaj tamamlandı ve malzeme stokları başarıyla düşüldü.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== PUBLIC DELIVERY CONFIRMATION ====================
// GET /api/public/delivery-confirm/:token
router.get('/public-delivery/:token', async (req: Request, res: Response) => {
  const { token } = req.params;
  const cleanToken = token.split('?')[0];

  try {
    let installation: any = null;

    if (isDatabaseConnected()) {
      const resInst = await query('SELECT * FROM installations WHERE secure_delivery_token = $1', [cleanToken]);
      if (resInst.rows.length === 0) return res.status(404).json({ error: 'Montaj iş emri bulunamadı.' });
      const r = resInst.rows[0];
      installation = {
        id: r.id,
        installationNumber: r.installation_number,
        projectName: r.project_name,
        customerName: r.customer_name,
        fullAddress: r.full_address,
        status: r.status,
        checklist: r.checklist || [],
        materials: r.materials || [],
        customerDeliveryApproval: r.customer_delivery_approval,
      };
    } else {
      const list = fallbackStorage.get<any[]>('installations', []);
      installation = list.find((i) => i.secureDeliveryToken === cleanToken);
      if (!installation) return res.status(404).json({ error: 'Montaj iş emri bulunamadı.' });
    }

    res.json(installation);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/public/delivery-confirm/:token/approve
router.post('/public-delivery/:token/approve', async (req: Request, res: Response) => {
  const { token } = req.params;
  const { signedBy, satisfactionScore, signatureDataUrl, notes } = req.body;
  const cleanToken = token.split('?')[0];

  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';

  try {
    const approvalData = {
      confirmed: true,
      confirmedAt: new Date().toISOString(),
      signedBy: signedBy || 'Müşteri',
      satisfactionScore: satisfactionScore || 5,
      signatureDataUrl: signatureDataUrl || null,
      notes,
      clientIp,
    };

    if (isDatabaseConnected()) {
      await query(
        `UPDATE installations SET customer_delivery_approval = $1, updated_at = NOW() WHERE secure_delivery_token = $2`,
        [JSON.stringify(approvalData), cleanToken]
      );
    } else {
      const list = fallbackStorage.get<any[]>('installations', []);
      const idx = list.findIndex((i) => i.secureDeliveryToken === cleanToken);
      if (idx >= 0) {
        list[idx].customerDeliveryApproval = approvalData;
        fallbackStorage.save('installations', list);
      }
    }

    res.json({ success: true, message: 'İş teslim onayı başarıyla kaydedildi. Teşekkür ederiz!' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
