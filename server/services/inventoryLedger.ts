import { query, transaction, isDatabaseConnected, fallbackStorage } from '../db/db';

export type InventoryMovementType =
  | 'purchase'
  | 'sale'
  | 'installation_use'
  | 'service_use'
  | 'return'
  | 'adjustment';

export interface RecordMovementParams {
  productId: string;
  productName?: string;
  type: InventoryMovementType;
  quantityChange: number; // e.g. -5 for usage, +10 for purchase
  unitPrice?: number;
  referenceType?: 'installation' | 'service' | 'invoice' | 'manual';
  referenceNumber?: string;
  idempotencyKey?: string;
  note?: string;
  performedBy: string;
}

export class InventoryLedger {
  /**
   * Records an inventory movement transactionally and idempotently.
   * Modifies products.current_stock and creates an immutable movement ledger entry.
   */
  static async recordMovement(params: RecordMovementParams): Promise<{ success: boolean; newStock: number }> {
    const {
      productId,
      type,
      quantityChange,
      unitPrice = 0,
      referenceType,
      referenceNumber,
      idempotencyKey,
      note = '',
      performedBy,
    } = params;

    if (isDatabaseConnected()) {
      return await transaction(async (client) => {
        // 1. Check idempotency
        if (idempotencyKey) {
          const existing = await client.query(
            'SELECT id, new_stock FROM inventory_movements WHERE idempotency_key = $1',
            [idempotencyKey]
          );
          if (existing.rows.length > 0) {
            console.log(`ℹ️ Movement with idempotency key ${idempotencyKey} already recorded. Skipping duplicate.`);
            return { success: true, newStock: Number(existing.rows[0].new_stock) };
          }
        }

        // 2. Lock product row FOR UPDATE
        const prodRes = await client.query(
          'SELECT id, name, current_stock, sale_price FROM products WHERE id = $1 FOR UPDATE',
          [productId]
        );

        if (prodRes.rows.length === 0) {
          throw new Error(`Ürün bulunamadı: ${productId}`);
        }

        const product = prodRes.rows[0];
        const previousStock = Number(product.current_stock);
        const newStock = Number((previousStock + quantityChange).toFixed(2));
        const effectivePrice = unitPrice || Number(product.sale_price) || 0;
        const productName = params.productName || product.name;

        // 3. Update product current_stock
        await client.query(
          'UPDATE products SET current_stock = $1, updated_at = NOW() WHERE id = $2',
          [newStock, productId]
        );

        // 4. Insert into immutable ledger
        const movementId = `mov-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        await client.query(
          `INSERT INTO inventory_movements 
           (id, product_id, product_name, type, quantity_change, previous_stock, new_stock, unit_price, reference_type, reference_number, idempotency_key, note, performed_by, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())`,
          [
            movementId,
            productId,
            productName,
            type,
            quantityChange,
            previousStock,
            newStock,
            effectivePrice,
            referenceType,
            referenceNumber,
            idempotencyKey || null,
            note,
            performedBy,
          ]
        );

        return { success: true, newStock };
      });
    }

    // Fallback mode
    const products = fallbackStorage.get<any[]>('products', []);
    const movements = fallbackStorage.get<any[]>('inventory_movements', []);

    if (idempotencyKey) {
      const exists = movements.find((m) => m.idempotencyKey === idempotencyKey);
      if (exists) {
        return { success: true, newStock: exists.newStock };
      }
    }

    const prodIndex = products.findIndex((p) => p.id === productId);
    let previousStock = 0;
    let newStock = 0;
    let productName = params.productName || 'Ürün';

    if (prodIndex >= 0) {
      previousStock = Number(products[prodIndex].currentStock || 0);
      newStock = Number((previousStock + quantityChange).toFixed(2));
      products[prodIndex].currentStock = newStock;
      productName = products[prodIndex].name;
      fallbackStorage.save('products', products);
    } else {
      newStock = quantityChange;
    }

    const newMov = {
      id: `mov-${Date.now()}`,
      productId,
      productName,
      type,
      quantityChange,
      previousStock,
      newStock,
      unitPrice,
      referenceType,
      referenceNumber,
      idempotencyKey,
      note,
      performedBy,
      createdAt: new Date().toISOString(),
    };

    movements.unshift(newMov);
    fallbackStorage.save('inventory_movements', movements);

    return { success: true, newStock };
  }
}
