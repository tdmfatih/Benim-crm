import { Router, Response } from 'express';
import { query, isDatabaseConnected, fallbackStorage } from '../db/db';
import { optionalAuth, AuthenticatedRequest } from '../middleware/auth';
import { logAudit } from '../middleware/audit';
import { SequenceService } from '../services/sequenceService';
import { FinancialValidator } from '../services/financialValidator';
import { defaultEInvoiceAdapter } from '../services/eInvoiceAdapter';

const router = Router();

// GET /api/invoices
router.get('/', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (isDatabaseConnected()) {
      const result = await query('SELECT * FROM invoices ORDER BY created_at DESC');
      const invoices = result.rows.map((r) => ({
        id: r.id,
        invoiceNumber: r.invoice_number,
        customerId: r.customer_id,
        customerName: r.customer_name,
        customerPhone: r.customer_phone,
        customerEmail: r.customer_email,
        customerAddress: r.customer_address,
        customerTaxOffice: r.customer_tax_office,
        customerTaxNumber: r.customer_tax_number,
        type: r.type,
        status: r.status,
        issueDate: r.issue_date,
        dueDate: r.due_date,
        items: r.items || [],
        subtotal: Number(r.subtotal) || 0,
        discountTotal: Number(r.discount_total) || 0,
        taxTotal: Number(r.tax_total) || 0,
        grandTotal: Number(r.grand_total) || 0,
        paidAmount: Number(r.paid_amount) || 0,
        remainingAmount: Number(r.remaining_amount) || 0,
        payments: r.payments || [],
        notes: r.notes,
        relatedOfferId: r.related_offer_id,
        relatedInstallationId: r.related_installation_id,
        relatedServiceTicketId: r.related_service_ticket_id,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }));
      return res.json(invoices);
    }

    const invoices = fallbackStorage.get<any[]>('invoices', []);
    res.json(invoices);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/invoices
router.post('/', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  const body = req.body;

  if (!body.customerId || !body.customerName) {
    return res.status(400).json({ error: 'Müşteri bilgileri zorunludur.' });
  }

  try {
    const invoiceNumber = body.invoiceNumber && body.invoiceNumber.startsWith('FAT-')
      ? body.invoiceNumber
      : await SequenceService.getNextNumber('invoice');

    const calculated = FinancialValidator.calculateInvoiceTotals(body.items || [], body.paidAmount || 0);
    const id = body.id || `inv-${Date.now()}`;
    const issueDate = body.issueDate || new Date().toISOString().split('T')[0];
    const dueDate = body.dueDate || new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const newInvoice = {
      id,
      invoiceNumber,
      customerId: body.customerId,
      customerName: body.customerName,
      customerPhone: body.customerPhone || '',
      customerEmail: body.customerEmail || '',
      customerAddress: body.customerAddress || '',
      customerTaxOffice: body.customerTaxOffice || '',
      customerTaxNumber: body.customerTaxNumber || '',
      type: body.type || 'sales',
      status: calculated.remainingAmount === 0 ? 'paid' : calculated.paidAmount > 0 ? 'partial' : 'issued',
      issueDate,
      dueDate,
      items: calculated.items,
      subtotal: calculated.subtotal,
      discountTotal: calculated.discountTotal,
      taxTotal: calculated.taxTotal,
      grandTotal: calculated.grandTotal,
      paidAmount: calculated.paidAmount,
      remainingAmount: calculated.remainingAmount,
      payments: body.payments || [],
      notes: body.notes || '',
      relatedOfferId: body.relatedOfferId || null,
      relatedInstallationId: body.relatedInstallationId || null,
      relatedServiceTicketId: body.relatedServiceTicketId || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (isDatabaseConnected()) {
      await query(
        `INSERT INTO invoices 
         (id, invoice_number, customer_id, customer_name, customer_phone, customer_email, customer_address, customer_tax_office, customer_tax_number, type, status, issue_date, due_date, items, subtotal, discount_total, tax_total, grand_total, paid_amount, remaining_amount, payments, notes, related_offer_id, related_installation_id, related_service_ticket_id, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, NOW(), NOW())`,
        [
          id,
          invoiceNumber,
          newInvoice.customerId,
          newInvoice.customerName,
          newInvoice.customerPhone,
          newInvoice.customerEmail,
          newInvoice.customerAddress,
          newInvoice.customerTaxOffice,
          newInvoice.customerTaxNumber,
          newInvoice.type,
          newInvoice.status,
          issueDate,
          dueDate,
          JSON.stringify(calculated.items),
          calculated.subtotal,
          calculated.discountTotal,
          calculated.taxTotal,
          calculated.grandTotal,
          calculated.paidAmount,
          calculated.remainingAmount,
          JSON.stringify(newInvoice.payments),
          newInvoice.notes,
          newInvoice.relatedOfferId,
          newInvoice.relatedInstallationId,
          newInvoice.relatedServiceTicketId,
        ]
      );
    } else {
      const invoices = fallbackStorage.get<any[]>('invoices', []);
      invoices.unshift(newInvoice);
      fallbackStorage.save('invoices', invoices);
    }

    await logAudit({
      req,
      user: req.user,
      action: 'INVOICE_CREATED',
      entityType: 'invoice',
      entityId: id,
      entityName: `${invoiceNumber} - ${body.customerName}`,
      newValues: { grandTotal: calculated.grandTotal, status: newInvoice.status },
    });

    res.status(201).json({ success: true, invoice: newInvoice });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/invoices/:id/payments (Add Partial / Full Payment)
router.post('/:id/payments', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { amount, method, notes, reference } = req.body;

  const payAmount = Number(amount);
  if (!payAmount || payAmount <= 0) {
    return res.status(400).json({ error: 'Geçerli bir ödeme tutarı giriniz.' });
  }

  try {
    const paymentRecord = {
      id: `pay-${Date.now()}`,
      amount: payAmount,
      method: method || 'Havale/EFT',
      date: new Date().toISOString(),
      notes: notes || '',
      reference: reference || '',
      recordedBy: req.user?.fullName || 'Muhasebe',
    };

    if (isDatabaseConnected()) {
      const invRes = await query('SELECT * FROM invoices WHERE id = $1', [id]);
      if (invRes.rows.length === 0) return res.status(404).json({ error: 'Fatura bulunamadı.' });
      const inv = invRes.rows[0];

      const payments = inv.payments || [];
      payments.push(paymentRecord);

      const newPaid = Number((Number(inv.paid_amount) + payAmount).toFixed(2));
      const grandTotal = Number(inv.grand_total);
      const remaining = Number(Math.max(0, grandTotal - newPaid).toFixed(2));
      const newStatus = remaining === 0 ? 'paid' : 'partial';

      await query(
        `UPDATE invoices SET paid_amount = $1, remaining_amount = $2, status = $3, payments = $4, updated_at = NOW() WHERE id = $5`,
        [newPaid, remaining, newStatus, JSON.stringify(payments), id]
      );

      // Update customer balance
      await query(`UPDATE customers SET balance = balance - $1 WHERE id = $2`, [payAmount, inv.customer_id]);
    } else {
      const invoices = fallbackStorage.get<any[]>('invoices', []);
      const idx = invoices.findIndex((i) => i.id === id);
      if (idx === -1) return res.status(404).json({ error: 'Fatura bulunamadı.' });

      const inv = invoices[idx];
      inv.payments = inv.payments || [];
      inv.payments.push(paymentRecord);

      const newPaid = Number(((inv.paidAmount || 0) + payAmount).toFixed(2));
      inv.paidAmount = newPaid;
      inv.remainingAmount = Number(Math.max(0, (inv.grandTotal || 0) - newPaid).toFixed(2));
      inv.status = inv.remainingAmount === 0 ? 'paid' : 'partial';
      fallbackStorage.save('invoices', invoices);

      // Customer balance
      const customers = fallbackStorage.get<any[]>('customers', []);
      const cIdx = customers.findIndex((c) => c.id === inv.customerId);
      if (cIdx >= 0) {
        customers[cIdx].balance = Number(((customers[cIdx].balance || 0) - payAmount).toFixed(2));
        fallbackStorage.save('customers', customers);
      }
    }

    await logAudit({
      req,
      user: req.user,
      action: 'PAYMENT_RECORDED',
      entityType: 'invoice',
      entityId: id,
      entityName: `Ödeme: ${payAmount} TL`,
      newValues: { amount: payAmount, method },
    });

    res.json({ success: true, message: 'Tahsilat başarıyla kaydedildi.', payment: paymentRecord });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/invoices/:id/submit-einvoice (Adapter execution)
router.post('/:id/submit-einvoice', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  try {
    let inv: any = null;
    if (isDatabaseConnected()) {
      const resInv = await query('SELECT * FROM invoices WHERE id = $1', [id]);
      if (resInv.rows.length === 0) return res.status(404).json({ error: 'Fatura bulunamadı.' });
      inv = resInv.rows[0];
    } else {
      const invoices = fallbackStorage.get<any[]>('invoices', []);
      inv = invoices.find((i) => i.id === id);
      if (!inv) return res.status(404).json({ error: 'Fatura bulunamadı.' });
    }

    const submission = await defaultEInvoiceAdapter.createInvoice({
      invoiceNumber: inv.invoice_number || inv.invoiceNumber,
      issueDate: inv.issue_date || inv.issueDate,
      invoiceType: 'SATIS',
      profile: (inv.customer_tax_number || inv.customerTaxNumber)?.length === 10 ? 'TICARIFATURA' : 'EARSIVFATURA',
      buyer: {
        title: inv.customer_name || inv.customerName,
        vknTckn: inv.customer_tax_number || inv.customerTaxNumber || '11111111111',
        taxOffice: inv.customer_tax_office || inv.customerTaxOffice,
        address: inv.customer_address || inv.customerAddress || 'Adres belirtilmedi',
      },
      lines: (inv.items || []).map((it: any) => ({
        name: it.description || 'Hizmet',
        quantity: it.quantity || 1,
        unit: 'Adet',
        unitPrice: it.unitPrice || 0,
        vatRate: it.vatRate || 20,
        lineTotal: it.total || 0,
      })),
      payableAmount: inv.grand_total || inv.grandTotal,
      currency: 'TRY',
    });

    res.json(submission);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
