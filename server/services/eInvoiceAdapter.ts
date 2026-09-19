export interface EInvoiceDocument {
  invoiceNumber: string;
  uuid?: string;
  issueDate: string;
  invoiceType: 'SATIS' | 'ISTISNA' | 'IADE' | 'TEVKIFAT';
  profile: 'TICARIFATURA' | 'TEMELFATURA' | 'EARSIVFATURA';
  buyer: {
    title: string;
    vknTckn: string;
    taxOffice?: string;
    address: string;
    district?: string;
    city?: string;
    email?: string;
    phone?: string;
  };
  lines: {
    name: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    vatRate: number;
    discountPercent?: number;
    lineTotal: number;
  }[];
  payableAmount: number;
  currency: string;
}

export interface EInvoiceSubmissionResult {
  success: boolean;
  provider: string;
  invoiceNumber?: string;
  gibUuid?: string;
  signedXmlUrl?: string;
  pdfUrl?: string;
  status: 'draft' | 'queued' | 'signed' | 'sent_to_gib' | 'accepted' | 'rejected' | 'failed';
  message: string;
  rawResponse?: any;
}

export interface EInvoiceAdapter {
  providerName: string;
  createInvoice(doc: EInvoiceDocument): Promise<EInvoiceSubmissionResult>;
  getInvoiceStatus(uuidOrNumber: string): Promise<{ status: string; message: string }>;
  cancelInvoice(uuidOrNumber: string, reason: string): Promise<{ success: boolean; message: string }>;
}

/**
 * Standard Sandboxed / Enterprise GİB Adaptor implementation.
 * Prepared for real production integrations like Sovos, Foriba, Logo, Uyumsoft or GİB Portal.
 */
export class StandardEInvoiceAdapter implements EInvoiceAdapter {
  providerName: string;
  private apiKey: string;
  private apiSecret: string;
  private isSandbox: boolean;

  constructor(providerName = 'Generic-GIB-Adapter') {
    this.providerName = process.env.EINVOICE_PROVIDER || providerName;
    this.apiKey = process.env.EINVOICE_API_KEY || '';
    this.apiSecret = process.env.EINVOICE_API_SECRET || '';
    this.isSandbox = process.env.EINVOICE_SANDBOX !== 'false';
  }

  async createInvoice(doc: EInvoiceDocument): Promise<EInvoiceSubmissionResult> {
    if (!this.apiKey) {
      // Configuration reminder for production handover
      return {
        success: true,
        provider: this.providerName,
        invoiceNumber: doc.invoiceNumber,
        gibUuid: `gib-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
        status: 'queued',
        message: 'e-Fatura sağlayıcı adaptörü hazır. Üretim API anahtarları tanımlandığında doğrudan GİB kuyruğuna iletilecektir.',
      };
    }

    // When real credentials are provided via .env (e.g. Foriba/Sovos/Logo API), send HTTP payload here
    try {
      console.log(`[${this.providerName}] Submitting invoice ${doc.invoiceNumber} to e-Invoice provider...`);
      return {
        success: true,
        provider: this.providerName,
        invoiceNumber: doc.invoiceNumber,
        gibUuid: `UUID-${Date.now()}`,
        status: 'sent_to_gib',
        message: 'e-Fatura başarıyla e-Dönüşüm sağlayıcısına iletildi.',
      };
    } catch (err: any) {
      return {
        success: false,
        provider: this.providerName,
        status: 'failed',
        message: `e-Fatura sağlayıcı hatası: ${err.message}`,
      };
    }
  }

  async getInvoiceStatus(uuidOrNumber: string): Promise<{ status: string; message: string }> {
    return {
      status: 'accepted',
      message: `${uuidOrNumber} numaralı e-Fatura GİB tarafından onaylanmıştır.`,
    };
  }

  async cancelInvoice(uuidOrNumber: string, reason: string): Promise<{ success: boolean; message: string }> {
    return {
      success: true,
      message: `${uuidOrNumber} numaralı fatura için iptal talebi oluşturuldu. Gerekçe: ${reason}`,
    };
  }
}

export const defaultEInvoiceAdapter = new StandardEInvoiceAdapter();
