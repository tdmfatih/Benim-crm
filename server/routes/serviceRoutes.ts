import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { query, isDatabaseConnected, fallbackStorage } from '../db/db';
import { optionalAuth, AuthenticatedRequest } from '../middleware/auth';
import { logAudit } from '../middleware/audit';
import { SequenceService } from '../services/sequenceService';
import { AutomationEngine } from '../services/automationService';

const router = Router();

// GET /api/services
router.get('/', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (isDatabaseConnected()) {
      const result = await query('SELECT * FROM service_tickets ORDER BY created_at DESC');
      const tickets = result.rows.map((r) => ({
        id: r.id,
        ticketNumber: r.ticket_number,
        customerId: r.customer_id,
        customerName: r.customer_name,
        customerPhone: r.customer_phone,
        customerEmail: r.customer_email,
        deviceType: r.device_type,
        brand: r.brand,
        model: r.model,
        serialNumber: r.serial_number,
        accessoriesDelivered: r.accessories_delivered || [],
        reportedIssue: r.reported_issue,
        diagnosticNotes: r.diagnostic_notes,
        physicalCondition: r.physical_condition,
        status: r.status,
        priority: r.priority,
        assignedTechnicianId: r.assigned_technician_id,
        assignedTechnicianName: r.assigned_technician_name,
        operations: r.operations || [],
        totalPartsCost: Number(r.total_parts_cost) || 0,
        totalLaborCost: Number(r.total_labor_cost) || 0,
        totalCost: Number(r.total_cost) || 0,
        depositPaid: Number(r.deposit_paid) || 0,
        remainingBalance: Number(r.remaining_balance) || 0,
        secureApprovalToken: r.secure_approval_token,
        customerApproval: r.customer_approval,
        photos: r.photos || [],
        servicePhotos: r.service_photos || [],
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        completedAt: r.completed_at,
        deliveredAt: r.delivered_at,
      }));
      return res.json(tickets);
    }

    const tickets = fallbackStorage.get<any[]>('service_tickets', []);
    res.json(tickets);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/services
router.post('/', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  const body = req.body;

  if (!body.customerName || !body.customerPhone || !body.deviceType) {
    return res.status(400).json({ error: 'Müşteri bilgileri ve cihaz türü zorunludur.' });
  }

  try {
    const ticketNumber = body.ticketNumber && body.ticketNumber.startsWith('SRV-')
      ? body.ticketNumber
      : await SequenceService.getNextNumber('service');

    const id = body.id || `srv-${Date.now()}`;
    const secureApprovalToken = crypto.randomBytes(32).toString('hex');

    const newTicket = {
      id,
      ticketNumber,
      customerId: body.customerId || `cust-${Date.now()}`,
      customerName: body.customerName,
      customerPhone: body.customerPhone,
      customerEmail: body.customerEmail || '',
      deviceType: body.deviceType,
      brand: body.brand || 'Belirtilmedi',
      model: body.model || 'Belirtilmedi',
      serialNumber: body.serialNumber || '',
      accessoriesDelivered: body.accessoriesDelivered || [],
      reportedIssue: body.reportedIssue || '',
      diagnosticNotes: body.diagnosticNotes || '',
      physicalCondition: body.physicalCondition || 'Normal',
      status: body.status || 'received',
      priority: body.priority || 'normal',
      assignedTechnicianId: body.assignedTechnicianId || null,
      assignedTechnicianName: body.assignedTechnicianName || null,
      operations: body.operations || [],
      totalPartsCost: Number(body.totalPartsCost) || 0,
      totalLaborCost: Number(body.totalLaborCost) || 0,
      totalCost: Number(body.totalCost) || 0,
      depositPaid: Number(body.depositPaid) || 0,
      remainingBalance: (Number(body.totalCost) || 0) - (Number(body.depositPaid) || 0),
      secureApprovalToken,
      photos: body.photos || [],
      servicePhotos: body.servicePhotos || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (isDatabaseConnected()) {
      await query(
        `INSERT INTO service_tickets 
         (id, ticket_number, customer_id, customer_name, customer_phone, customer_email, device_type, brand, model, serial_number, accessories_delivered, reported_issue, diagnostic_notes, physical_condition, status, priority, assigned_technician_id, assigned_technician_name, operations, total_parts_cost, total_labor_cost, total_cost, deposit_paid, remaining_balance, secure_approval_token, photos, service_photos, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, NOW(), NOW())`,
        [
          id,
          ticketNumber,
          newTicket.customerId,
          newTicket.customerName,
          newTicket.customerPhone,
          newTicket.customerEmail || null,
          newTicket.deviceType,
          newTicket.brand,
          newTicket.model,
          newTicket.serialNumber || null,
          JSON.stringify(newTicket.accessoriesDelivered),
          newTicket.reportedIssue,
          newTicket.diagnosticNotes,
          newTicket.physicalCondition,
          newTicket.status,
          newTicket.priority,
          newTicket.assignedTechnicianId,
          newTicket.assignedTechnicianName,
          JSON.stringify(newTicket.operations),
          newTicket.totalPartsCost,
          newTicket.totalLaborCost,
          newTicket.totalCost,
          newTicket.depositPaid,
          newTicket.remainingBalance,
          secureApprovalToken,
          JSON.stringify(newTicket.photos),
          JSON.stringify(newTicket.servicePhotos),
        ]
      );
    } else {
      const tickets = fallbackStorage.get<any[]>('service_tickets', []);
      tickets.unshift(newTicket);
      fallbackStorage.save('service_tickets', tickets);
    }

    await logAudit({
      req,
      user: req.user,
      action: 'SERVICE_TICKET_CREATED',
      entityType: 'service_ticket',
      entityId: id,
      entityName: `${ticketNumber} - ${body.deviceType} (${body.customerName})`,
      newValues: { status: newTicket.status, brand: newTicket.brand, model: newTicket.model },
    });

    res.status(201).json({ success: true, ticket: newTicket });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/services/:id
router.put('/:id', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const body = req.body;

  try {
    const totalCost = (Number(body.totalPartsCost) || 0) + (Number(body.totalLaborCost) || 0);
    const remainingBalance = totalCost - (Number(body.depositPaid) || 0);

    if (isDatabaseConnected()) {
      await query(
        `UPDATE service_tickets SET 
           status = $1, priority = $2, diagnostic_notes = $3, operations = $4,
           total_parts_cost = $5, total_labor_cost = $6, total_cost = $7,
           deposit_paid = $8, remaining_balance = $9, service_photos = $10,
           assigned_technician_id = $11, assigned_technician_name = $12,
           completed_at = CASE WHEN $1 = 'ready' AND completed_at IS NULL THEN NOW() ELSE completed_at END,
           delivered_at = CASE WHEN $1 = 'delivered' AND delivered_at IS NULL THEN NOW() ELSE delivered_at END,
           updated_at = NOW()
         WHERE id = $13`,
        [
          body.status,
          body.priority,
          body.diagnosticNotes,
          JSON.stringify(body.operations || []),
          body.totalPartsCost || 0,
          body.totalLaborCost || 0,
          totalCost,
          body.depositPaid || 0,
          remainingBalance,
          JSON.stringify(body.servicePhotos || body.photos || []),
          body.assignedTechnicianId || null,
          body.assignedTechnicianName || null,
          id,
        ]
      );
    } else {
      const tickets = fallbackStorage.get<any[]>('service_tickets', []);
      const idx = tickets.findIndex((t) => t.id === id);
      if (idx >= 0) {
        tickets[idx] = {
          ...tickets[idx],
          ...body,
          totalCost,
          remainingBalance,
          updatedAt: new Date().toISOString(),
        };
        fallbackStorage.save('service_tickets', tickets);
      }
    }

    await logAudit({
      req,
      user: req.user,
      action: 'SERVICE_TICKET_UPDATED',
      entityType: 'service_ticket',
      entityId: id,
      entityName: body.ticketNumber || id,
      newValues: { status: body.status, totalCost },
    });

    // Automations for status changes
    if (body.status === 'ready') {
      AutomationEngine.triggerEvent({
        trigger: 'SERVICE_READY_FOR_DELIVERY',
        entityId: id,
        entityNumber: body.ticketNumber,
        customerName: body.customerName,
        customerPhone: body.customerPhone,
        data: { deviceModel: body.model || body.deviceType },
      }).catch(console.error);
    } else if (body.status === 'delivered') {
      AutomationEngine.triggerEvent({
        trigger: 'SERVICE_DELIVERED',
        entityId: id,
        entityNumber: body.ticketNumber,
        customerName: body.customerName,
        customerPhone: body.customerPhone,
        data: { deviceModel: body.model || body.deviceType },
      }).catch(console.error);
    }

    res.json({ success: true, message: 'Servis kaydı güncellendi.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== PUBLIC SERVICE APPROVAL ====================
// GET /api/public/service-approval/:token
router.get('/public-approval/:token', async (req: Request, res: Response) => {
  const { token } = req.params;
  const cleanToken = token.split('?')[0];

  try {
    let ticket: any = null;

    if (isDatabaseConnected()) {
      const resTicket = await query('SELECT * FROM service_tickets WHERE secure_approval_token = $1', [cleanToken]);
      if (resTicket.rows.length === 0) {
        return res.status(404).json({ error: 'Servis kaydı bulunamadı veya bağlantı geçersiz.' });
      }
      const r = resTicket.rows[0];
      ticket = {
        id: r.id,
        ticketNumber: r.ticket_number,
        customerName: r.customer_name,
        deviceType: r.device_type,
        brand: r.brand,
        model: r.model,
        reportedIssue: r.reported_issue,
        diagnosticNotes: r.diagnostic_notes,
        status: r.status,
        operations: r.operations || [],
        totalPartsCost: Number(r.total_parts_cost) || 0,
        totalLaborCost: Number(r.total_labor_cost) || 0,
        totalCost: Number(r.total_cost) || 0,
        depositPaid: Number(r.deposit_paid) || 0,
        remainingBalance: Number(r.remaining_balance) || 0,
        secureApprovalToken: r.secure_approval_token,
        customerApproval: r.customer_approval,
        createdAt: r.created_at,
      };
    } else {
      const tickets = fallbackStorage.get<any[]>('service_tickets', []);
      ticket = tickets.find((t) => t.secureApprovalToken === cleanToken);
      if (!ticket) return res.status(404).json({ error: 'Servis kaydı bulunamadı.' });
    }

    res.json(ticket);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/public/service-approval/:token/approve
router.post('/public-approval/:token/approve', async (req: Request, res: Response) => {
  const { token } = req.params;
  const { approvedBy, notes } = req.body;
  const cleanToken = token.split('?')[0];

  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';

  try {
    const approvalData = {
      approved: true,
      approvedAt: new Date().toISOString(),
      approvedBy: approvedBy || 'Müşteri',
      notes,
      clientIp,
    };

    if (isDatabaseConnected()) {
      await query(
        `UPDATE service_tickets SET 
           status = 'approved', customer_approval = $1, updated_at = NOW() 
         WHERE secure_approval_token = $2`,
        [JSON.stringify(approvalData), cleanToken]
      );
    } else {
      const tickets = fallbackStorage.get<any[]>('service_tickets', []);
      const idx = tickets.findIndex((t) => t.secureApprovalToken === cleanToken);
      if (idx >= 0) {
        tickets[idx].status = 'approved';
        tickets[idx].customerApproval = approvalData;
        fallbackStorage.save('service_tickets', tickets);
      }
    }

    res.json({ success: true, message: 'Onarım onayı alındı. Teknik servis işlemlerine başlanacaktır.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
