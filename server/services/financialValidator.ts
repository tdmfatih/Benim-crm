export interface CalculatedLineItem {
  id: string;
  productId?: string;
  serviceId?: string;
  type: 'product' | 'service';
  name: string;
  description: string;
  imageUrl?: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  purchaseCost?: number;
  discountPercent: number;
  discountAmount: number;
  vatRate: number;
  vatAmount: number;
  total: number; // KDV Dahil Satır Toplamı
}

export interface FinancialCalculationResult {
  items: CalculatedLineItem[];
  subtotal: number; // KDV ve İndirim öncesi brüt toplam
  discountTotal: number; // Toplam indirim tutarı
  taxTotal: number; // Toplam KDV tutarı
  grandTotal: number; // Genel Toplam (Ödenecek Nihai Tutar)
  totalCost: number; // Toplam Maliyet
  marginPercentage: number; // Kar Marjı (%)
}

export class FinancialValidator {
  /**
   * Recalculates and validates all financial totals server-side with NUMERIC(14,2) precision.
   * Never trust client-calculated totals.
   */
  static calculateOfferTotals(items: any[]): FinancialCalculationResult {
    let subtotal = 0;
    let discountTotal = 0;
    let taxTotal = 0;
    let totalCost = 0;

    const validatedItems: CalculatedLineItem[] = (items || []).map((raw, idx) => {
      const quantity = Math.max(0, Number(raw.quantity) || 0);
      const unitPrice = Math.max(0, Number(raw.unitPrice) || 0);
      const purchaseCost = Math.max(0, Number(raw.purchaseCost || raw.costPrice) || 0);
      const discountPercent = Math.min(100, Math.max(0, Number(raw.discountPercent) || 0));
      const vatRate = Math.max(0, Number(raw.vatRate !== undefined ? raw.vatRate : 20));

      const lineGross = quantity * unitPrice;
      const discountAmount = Number(((lineGross * discountPercent) / 100).toFixed(2));
      const lineNet = lineGross - discountAmount;
      const vatAmount = Number(((lineNet * vatRate) / 100).toFixed(2));
      const lineTotal = Number((lineNet + vatAmount).toFixed(2));
      const lineCost = Number((quantity * purchaseCost).toFixed(2));

      subtotal += lineGross;
      discountTotal += discountAmount;
      taxTotal += vatAmount;
      totalCost += lineCost;

      return {
        id: raw.id || `item-${Date.now()}-${idx}`,
        productId: raw.productId,
        serviceId: raw.serviceId,
        type: raw.type || 'product',
        name: String(raw.name || 'Hizmet/Ürün Kalemi').trim(),
        description: String(raw.description || ''),
        imageUrl: raw.imageUrl,
        quantity,
        unit: String(raw.unit || 'Adet'),
        unitPrice,
        purchaseCost,
        discountPercent,
        discountAmount,
        vatRate,
        vatAmount,
        total: lineTotal,
      };
    });

    subtotal = Number(subtotal.toFixed(2));
    discountTotal = Number(discountTotal.toFixed(2));
    taxTotal = Number(taxTotal.toFixed(2));
    totalCost = Number(totalCost.toFixed(2));
    const grandTotal = Number((subtotal - discountTotal + taxTotal).toFixed(2));

    // Kar marjı hesabı
    let marginPercentage = 0;
    const netRevenue = subtotal - discountTotal;
    if (netRevenue > 0 && totalCost > 0) {
      marginPercentage = Number((((netRevenue - totalCost) / netRevenue) * 100).toFixed(2));
    } else if (netRevenue > 0 && totalCost === 0) {
      marginPercentage = 100;
    }

    return {
      items: validatedItems,
      subtotal,
      discountTotal,
      taxTotal,
      grandTotal,
      totalCost,
      marginPercentage,
    };
  }

  /**
   * Recalculates invoice items and balance.
   */
  static calculateInvoiceTotals(items: any[], paidAmount = 0): {
    items: any[];
    subtotal: number;
    taxTotal: number;
    discountTotal: number;
    grandTotal: number;
    paidAmount: number;
    remainingAmount: number;
  } {
    let subtotal = 0;
    let discountTotal = 0;
    let taxTotal = 0;

    const validatedItems = (items || []).map((raw, idx) => {
      const quantity = Math.max(0, Number(raw.quantity) || 0);
      const unitPrice = Math.max(0, Number(raw.unitPrice) || 0);
      const discountPercent = Math.min(100, Math.max(0, Number(raw.discountPercent) || 0));
      const vatRate = Math.max(0, Number(raw.vatRate !== undefined ? raw.vatRate : 20));

      const lineGross = quantity * unitPrice;
      const discountAmount = Number(((lineGross * discountPercent) / 100).toFixed(2));
      const lineNet = lineGross - discountAmount;
      const vatAmount = Number(((lineNet * vatRate) / 100).toFixed(2));
      const lineTotal = Number((lineNet + vatAmount).toFixed(2));

      subtotal += lineGross;
      discountTotal += discountAmount;
      taxTotal += vatAmount;

      return {
        id: raw.id || `inv-item-${Date.now()}-${idx}`,
        description: String(raw.description || 'Hizmet/Ürün'),
        quantity,
        unitPrice,
        vatRate,
        discountPercent,
        total: lineTotal,
      };
    });

    subtotal = Number(subtotal.toFixed(2));
    discountTotal = Number(discountTotal.toFixed(2));
    taxTotal = Number(taxTotal.toFixed(2));
    const grandTotal = Number((subtotal - discountTotal + taxTotal).toFixed(2));
    const validPaid = Math.max(0, Number(paidAmount) || 0);
    const remainingAmount = Number(Math.max(0, grandTotal - validPaid).toFixed(2));

    return {
      items: validatedItems,
      subtotal,
      discountTotal,
      taxTotal,
      grandTotal,
      paidAmount: validPaid,
      remainingAmount,
    };
  }
}
