import { Router, Response } from 'express';
import { query, isDatabaseConnected, fallbackStorage } from '../db/db';
import { optionalAuth, AuthenticatedRequest } from '../middleware/auth';
import { logAudit } from '../middleware/audit';
import { InventoryLedger, InventoryMovementType } from '../services/inventoryLedger';

const router = Router();

// GET /api/products
router.get('/products', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (isDatabaseConnected()) {
      const result = await query('SELECT * FROM products ORDER BY name ASC');
      const products = result.rows.map((r) => ({
        id: r.id,
        sku: r.sku,
        barcode: r.barcode,
        category: r.category,
        brand: r.brand,
        name: r.name,
        description: r.description,
        imageUrl: r.image_url,
        images: r.images || [],
        unit: r.unit,
        purchasePrice: Number(r.purchase_price) || 0,
        salePrice: Number(r.sale_price) || 0,
        vatRate: r.vat_rate || 20,
        currentStock: Number(r.current_stock) || 0,
        minStockLevel: Number(r.min_stock_level) || 5,
        location: r.location,
        isServiceItem: r.is_service_item,
        isActive: r.is_active,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }));
      return res.json(products);
    }

    const products = fallbackStorage.get<any[]>('products', []);
    res.json(products);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/products
router.post('/products', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  const body = req.body;
  if (!body.name || !body.category) {
    return res.status(400).json({ error: 'Ürün adı ve kategori zorunludur.' });
  }

  const id = body.id || `prod-${Date.now()}`;
  const sku = body.sku || `SKU-${Date.now().toString().slice(-6)}`;

  try {
    if (isDatabaseConnected()) {
      await query(
        `INSERT INTO products 
         (id, sku, barcode, category, brand, name, description, image_url, images, unit, purchase_price, sale_price, vat_rate, current_stock, min_stock_level, location, is_service_item, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, NOW(), NOW())`,
        [
          id,
          sku,
          body.barcode || null,
          body.category,
          body.brand || '3AS',
          body.name,
          body.description || null,
          body.imageUrl || null,
          JSON.stringify(body.images || []),
          body.unit || 'Adet',
          body.purchasePrice || 0,
          body.salePrice || 0,
          body.vatRate || 20,
          body.currentStock || 0,
          body.minStockLevel || 5,
          body.location || 'Depo A',
          body.isServiceItem || false,
          body.isActive !== false,
        ]
      );
    } else {
      const products = fallbackStorage.get<any[]>('products', []);
      const newProd = {
        ...body,
        id,
        sku,
        currentStock: Number(body.currentStock) || 0,
        createdAt: new Date().toISOString(),
      };
      products.push(newProd);
      fallbackStorage.save('products', products);
    }

    await logAudit({
      req,
      user: req.user,
      action: 'PRODUCT_CREATED',
      entityType: 'product',
      entityId: id,
      entityName: body.name,
      newValues: { sku, salePrice: body.salePrice, currentStock: body.currentStock },
    });

    res.status(201).json({ success: true, id, product: { ...body, id, sku } });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/inventory/movements (Immutable Stock Movement Ledger)
router.get('/movements', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (isDatabaseConnected()) {
      const result = await query('SELECT * FROM inventory_movements ORDER BY created_at DESC LIMIT 200');
      const movements = result.rows.map((r) => ({
        id: r.id,
        productId: r.product_id,
        productName: r.product_name,
        type: r.type,
        quantityChange: Number(r.quantity_change),
        previousStock: Number(r.previous_stock),
        newStock: Number(r.new_stock),
        unitPrice: Number(r.unit_price) || 0,
        referenceType: r.reference_type,
        referenceNumber: r.reference_number,
        note: r.note,
        performedBy: r.performed_by,
        createdAt: r.created_at,
      }));
      return res.json(movements);
    }

    const movements = fallbackStorage.get<any[]>('inventory_movements', []);
    res.json(movements);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/inventory/movements (Manual Adjustment / Purchase / Sale)
router.post('/movements', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { productId, productName, type, quantityChange, unitPrice, note, referenceNumber } = req.body;

  if (!productId || quantityChange === undefined) {
    return res.status(400).json({ error: 'Ürün ve miktar değişimi zorunludur.' });
  }

  try {
    const result = await InventoryLedger.recordMovement({
      productId,
      productName,
      type: (type as InventoryMovementType) || 'adjustment',
      quantityChange: Number(quantityChange),
      unitPrice: Number(unitPrice) || 0,
      referenceType: 'manual',
      referenceNumber,
      note,
      performedBy: req.user?.fullName || 'Yönetici',
    });

    await logAudit({
      req,
      user: req.user,
      action: 'INVENTORY_ADJUSTED',
      entityType: 'product',
      entityId: productId,
      entityName: productName || productId,
      newValues: { type, quantityChange, newStock: result.newStock },
    });

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
