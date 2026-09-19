// 3AS TEKNOLOJİ - Kurumsal CRM, ERP, Saha/Montaj ve Teknik Servis Yönetim Sistemi

export type Currency = 'TRY' | 'USD' | 'EUR';

// ==================== RBAC & USERS ====================
export type PermissionKey =
  | 'crm.view'
  | 'crm.edit'
  | 'crm.delete'
  | 'customers.view'
  | 'customers.edit'
  | 'customers.delete'
  | 'offers.view'
  | 'offers.create'
  | 'offers.edit'
  | 'offers.delete'
  | 'offers.view_cost'
  | 'projects.view'
  | 'projects.edit'
  | 'installation.view'
  | 'installation.edit'
  | 'installation.complete'
  | 'service.view'
  | 'service.edit'
  | 'service.approve_override'
  | 'inventory.view'
  | 'inventory.edit'
  | 'inventory.adjust'
  | 'invoice.view'
  | 'invoice.create'
  | 'payments.manage'
  | 'reports.view'
  | 'automations.manage'
  | 'settings.manage'
  | 'users.manage'
  | 'audit.view';

export interface Role {
  id: string;
  name: string;
  slug: string;
  code?: string;
  description: string;
  isSystem?: boolean;
  canViewCost?: boolean;
  permissions: PermissionKey[];
}

export interface User {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  roleId: string;
  roleTitle: string;
  avatarUrl?: string;
  isActive: boolean;
  department: 'Yönetim' | 'Satış' | 'Teknik Servis' | 'Saha Montaj' | 'Muhasebe' | string;
  permissions?: PermissionKey[];
  canViewCost?: boolean;
  notes?: string;
  createdAt: string;
}

// ==================== HİZMET KATALOGU ====================
export interface ServiceCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  iconName: string;
  isActive: boolean;
  orderIndex: number;
}

export interface ServiceItem {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  basePrice: number;
  unit: string; // 'Metre', 'Adet', 'Saat', 'Proje'
  vatRate: number; // 20, 10, 0
  isActive: boolean;
}

// ==================== CRM & LEADLER ====================
export type LeadSource = 
  | 'Web Sitesi' 
  | 'Telefon' 
  | 'WhatsApp' 
  | 'Google' 
  | 'Instagram' 
  | 'Referans' 
  | 'Manuel';

export type LeadStage = 
  | 'new' 
  | 'contacted' 
  | 'discovery_scheduled' 
  | 'offer_preparing' 
  | 'offer_sent' 
  | 'won' 
  | 'lost';

export interface LeadActivity {
  id: string;
  leadId: string;
  userId: string;
  userName: string;
  type: 'call' | 'whatsapp' | 'meeting' | 'discovery' | 'note';
  summary: string;
  notes?: string;
  createdAt: string;
}

export interface Lead {
  id: string;
  fullName: string;
  companyName?: string;
  company?: string;
  contactName?: string;
  phone: string;
  email?: string;
  city?: string;
  interestedServiceCategory: string; // e.g., 'Güvenlik Kamerası Sistemleri'
  serviceCategory?: string;
  serviceDetails?: string;
  message?: string;
  source: LeadSource;
  stage: LeadStage;
  status?: LeadStage;
  assignedUserId?: string;
  assignedUserName?: string;
  assignedToUserName?: string;
  discoveryDate?: string;
  budgetEstimate?: number;
  customerId?: string; // If converted to customer
  convertedOfferId?: string;
  createdAt: string;
  updatedAt: string;
  activities: LeadActivity[];
}

// ==================== MÜŞTERİ YÖNETİMİ ====================
export type CustomerType = 'individual' | 'corporate';

export interface CustomerContact {
  id: string;
  name: string;
  title: string;
  phone: string;
  email: string;
  isPrimary: boolean;
}

export interface CustomerAddress {
  id: string;
  title: string;
  city: string;
  district: string;
  fullAddress: string;
  coordinates?: { lat: number; lng: number };
  isDefault: boolean;
}

export interface Customer {
  id: string;
  type: CustomerType;
  name: string; // Şahıs adı veya Ticari Unvan
  companyTitle?: string;
  tcIdentityNumber?: string;
  contactPerson?: string;
  taxOffice?: string;
  taxNumber?: string;
  phone: string;
  secondaryPhone?: string;
  email?: string;
  website?: string;
  address?: string;
  district?: string;
  city?: string;
  balance: number; // Cari Bakiye (Artı = Alacaklıyız)
  creditLimit?: number;
  contacts: CustomerContact[];
  addresses: CustomerAddress[];
  notes?: string;
  tags?: string[];
  createdAt: string;
}

// ==================== TEKLİF SİSTEMİ ====================
export type OfferStatus = 
  | 'draft' 
  | 'sent' 
  | 'viewed' 
  | 'approved' 
  | 'rejected' 
  | 'revised' 
  | 'expired';

export interface OfferLineItem {
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
  purchaseCost?: number; // Maliyet (yetkiye göre gizlenir)
  costPrice?: number;
  discountPercent: number;
  discountAmount?: number;
  vatRate: number;
  total: number;
}

export type OfferItem = OfferLineItem;

export interface OfferVersion {
  versionNumber: number;
  createdAt: string;
  createdBy: string;
  createdByName: string;
  items: OfferLineItem[];
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  grandTotal: number;
  totalCost?: number;
  marginPercentage?: number;
  terms?: string;
  changeNote?: string;
}

export interface Offer {
  id: string;
  offerNumber: string; // TEK-2026-0001
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  customerAddress?: string;
  serviceCategory: string;
  leadId?: string;
  status: OfferStatus;
  validUntil: string;
  currentVersion: number;
  versions: OfferVersion[];
  // Current active version shortcuts:
  items: OfferLineItem[];
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  grandTotal: number;
  totalCost?: number;
  marginPercentage?: number;
  exchangeRate?: number;
  currency: Currency;
  paymentTerms: string;
  notes: string;
  warrantyTerms: string;
  secureToken: string; // Public link token
  approvedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  clientIp?: string;
  convertedProjectId?: string;
  createdAt: string;
  updatedAt: string;
  sentAt?: string;
}

// ==================== SAHA VE MONTAJ YÖNETİMİ ====================
export type InstallationStatus = 
  | 'planned' 
  | 'scheduled'
  | 'dispatched' 
  | 'started' 
  | 'in_progress' 
  | 'paused' 
  | 'completed' 
  | 'cancelled';

export interface ChecklistItem {
  id: string;
  text: string;
  isCompleted: boolean;
  completedAt?: string;
  completedBy?: string;
}

export interface UsedMaterialItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  plannedQty?: number;
  usedQty: number;
  unit: string;
}

export interface Installation {
  id: string;
  installationNumber: string; // MNT-2026-0001
  projectId?: string;
  offerId?: string;
  relatedOfferId?: string;
  projectName: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  addressTitle?: string;
  fullAddress: string;
  city?: string;
  status: InstallationStatus;
  scheduledDate: string;
  scheduledTime: string;
  assignedTechnicians: {
    userId: string;
    fullName: string;
    phone?: string;
    isTeamLead?: boolean;
    isLead?: boolean;
  }[];
  tasksDescription: string;
  checklist: ChecklistItem[];
  materials: UsedMaterialItem[];
  photos: {
    id: string;
    url: string;
    caption: string;
    type: 'before' | 'in_progress' | 'after';
    uploadedAt: string;
  }[];
  startedAt?: string;
  completedAt?: string;
  technicianNotes?: string;
  secureDeliveryToken: string; // Public delivery confirmation link
  deliveryApprovalToken?: string;
  customerDeliveryApproval?: {
    isApproved: boolean;
    approvedAt: string;
    approverName: string;
    signatureData?: string;
    notes?: string;
    clientIp?: string;
  };
  createdAt: string;
  updatedAt?: string;
}

// ==================== TEKNİK SERVİS ====================
export type ServiceTicketStatus = 
  | 'received' 
  | 'inspecting' 
  | 'diagnosing'
  | 'waiting_approval' 
  | 'approved' 
  | 'waiting_parts' 
  | 'in_repair' 
  | 'testing' 
  | 'ready' 
  | 'delivered' 
  | 'cancelled';

export interface ServiceOperationItem {
  id: string;
  description: string;
  partsCost: number;
  laborCost: number;
  totalCost: number;
  isApprovedByCustomer?: boolean;
}

export type ServiceOperation = ServiceOperationItem;

export interface ServiceTicket {
  id: string;
  ticketNumber: string; // SRV-2026-0001
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  deviceType: string; // Laptop, PC, NVR, Kamera vb.
  brand: string;
  model: string;
  serialNumber?: string;
  accessoriesDelivered: string[];
  reportedIssue: string;
  diagnosticNotes?: string;
  physicalCondition: string;
  status: ServiceTicketStatus;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  assignedTechnicianId?: string;
  assignedTechnicianName?: string;
  operations: ServiceOperationItem[];
  totalPartsCost: number;
  totalLaborCost: number;
  totalCost: number;
  depositPaid: number;
  remainingBalance: number;
  secureApprovalToken: string; // Public approval link
  approvalToken?: string;
  customerApproval?: {
    isApproved: boolean;
    approvedAt: string;
    approverName: string;
    notes?: string;
    clientIp?: string;
  };
  photos: string[];
  servicePhotos?: {
    id: string;
    url: string;
    caption?: string;
    stage: 'intake' | 'repair' | 'delivered';
    uploadedAt: string;
  }[];
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  deliveredAt?: string;
}

// ==================== ÜRÜN & STOK ====================
export type ProductCategory = string;

export type InventoryMovementType = 
  | 'purchase' 
  | 'sale' 
  | 'installation_use' 
  | 'service_use' 
  | 'return' 
  | 'adjustment'
  | 'in'
  | 'out';

export interface InventoryMovement {
  id: string;
  productId: string;
  productName: string;
  type: InventoryMovementType;
  quantityChange: number; // Pozitif veya negatif
  previousStock: number;
  newStock: number;
  unitPrice: number;
  referenceType?: 'installation' | 'service' | 'invoice' | 'manual' | 'manual_adjustment';
  referenceNumber?: string;
  note?: string;
  performedBy: string;
  createdAt: string;
}

export type StockMovement = InventoryMovement;

export interface Product {
  id: string;
  sku: string;
  barcode?: string;
  category: string;
  brand: string;
  name: string;
  description?: string;
  imageUrl?: string;
  images?: string[];
  unit: string; // Adet, Metre, Paket vb.
  purchasePrice: number;
  salePrice: number;
  vatRate: number;
  currentStock: number;
  stockQuantity?: number;
  minStockLevel: number;
  minStockAlert?: number;
  location?: string;
  isServiceItem: boolean;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  stockMovements?: InventoryMovement[];
}

// ==================== FATURA VE TAHSİLAT ====================
export type InvoiceStatus = 
  | 'draft' 
  | 'issued' 
  | 'unpaid'
  | 'partial' 
  | 'paid' 
  | 'overdue' 
  | 'cancelled';

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
  discountPercent?: number;
  total: number;
}

export interface PaymentRecord {
  id: string;
  invoiceId: string;
  customerId: string;
  customerName: string;
  amount: number;
  paymentDate: string;
  paymentMethod: 'Havale / EFT' | 'Kredi Kartı' | 'Nakit' | 'Çek';
  stage?: string;
  stageLabel?: string; // 'Kapora', 'Montaj Sonu', 'Teslimat'
  transactionRef?: string;
  receivedByUserId?: string;
  receivedByUserName?: string;
  notes?: string;
  createdAt: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string; // FAT-2026-0001
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  customerAddress?: string;
  customerTaxOffice?: string;
  customerTaxNumber?: string;
  type: 'sales' | 'service' | 'proforma';
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string;
  items: InvoiceItem[];
  subtotal: number;
  taxTotal: number;
  discountTotal?: number;
  grandTotal: number;
  paidAmount: number;
  remainingAmount: number;
  payments: PaymentRecord[];
  notes?: string;
  relatedOfferId?: string;
  relatedInstallationId?: string;
  relatedServiceTicketId?: string;
  relatedServiceId?: string;
  createdAt: string;
  updatedAt?: string;
}

// ==================== OTOMASYON MOTORU ====================
export type AutomationTrigger = 
  | 'LEAD_CREATED'
  | 'OFFER_CREATED'
  | 'OFFER_APPROVED'
  | 'SERVICE_DIAGNOSIS_COMPLETED'
  | 'SERVICE_READY_FOR_DELIVERY'
  | 'SERVICE_DELIVERED'
  | 'INSTALLATION_SCHEDULED'
  | 'INSTALLATION_COMPLETED'
  | 'DELIVERY_CONFIRMED'
  | 'INVOICE_CREATED'
  | 'PAYMENT_RECEIVED';

export type AutomationActionType = 
  | 'SEND_WHATSAPP'
  | 'SEND_EMAIL'
  | 'CREATE_PROJECT'
  | 'CREATE_TASK'
  | 'SEND_GOOGLE_REVIEW_INVITE';

export interface AutomationRule {
  id: string;
  name: string;
  trigger: AutomationTrigger;
  description: string;
  actionType: AutomationActionType;
  templateCode?: string;
  delayMinutes?: number;
  isActive: boolean;
  isEnabled?: boolean;
}

// ==================== İLETİŞİM & WHATSAPP ====================
export type MessageDeliveryStatus = 
  | 'queued' 
  | 'sent' 
  | 'delivered' 
  | 'read' 
  | 'failed';

export interface CommunicationLog {
  id: string;
  channel: 'whatsapp' | 'sms' | 'email';
  recipientPhone: string;
  recipientName: string;
  messageType: string;
  content: string;
  status: MessageDeliveryStatus;
  sentAt: string;
  deliveredAt?: string;
  readAt?: string;
  relatedEntity?: {
    type: 'offer' | 'service' | 'installation' | 'invoice' | 'lead';
    id: string;
    number: string;
  };
}

export type WhatsAppLog = CommunicationLog;

export interface CommunicationTemplate {
  id: string;
  code: string;
  title: string;
  content: string;
  variables: string[];
}

export type WhatsAppTemplate = CommunicationTemplate;

// ==================== AUDIT LOG ====================
export interface AuditLogEntry {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  action: string;
  entityType: 'offer' | 'service' | 'installation' | 'invoice' | 'inventory' | 'customer' | 'lead' | 'settings' | 'role';
  entityId: string;
  entityName: string;
  oldValues?: any;
  newValues?: any;
  timestamp: string;
  createdAt?: string;
  clientIp?: string;
}

// ==================== ŞİRKET VE SİSTEM AYARLARI ====================
export interface CompanySettings {
  companyName: string; // 3AS TEKNOLOJİ
  name?: string; // Alias
  tradeName?: string;
  slogan: string;
  phone: string;
  whatsappNumber: string;
  managerWhatsAppNumber?: string; // Yöneticiye lead ve acil bildirimlerin gideceği hat
  leadNotificationPhone?: string;
  email: string;
  website: string;
  address: string;
  city: string;
  district: string;
  taxOffice: string;
  taxNumber: string;
  bankName: string;
  iban: string;
  bankAccounts?: { bankName: string; iban: string }[];
  googleReviewUrl: string;
  currency: Currency;
  serviceWarrantyTerms: string;
  offerTermsDefault: string;
  logoUrl?: string;
}

export interface SystemSnapshot {
  version: string;
  exportedAt: string;
  settings: CompanySettings;
  users: User[];
  roles: Role[];
  serviceCategories: ServiceCategory[];
  services: ServiceItem[];
  customers: Customer[];
  leads: Lead[];
  offers: Offer[];
  installations: Installation[];
  serviceTickets: ServiceTicket[];
  products: Product[];
  inventoryMovements: InventoryMovement[];
  invoices: Invoice[];
  payments: PaymentRecord[];
  automationRules: AutomationRule[];
  communicationLogs: CommunicationLog[];
  communicationTemplates: CommunicationTemplate[];
  auditLogs: AuditLogEntry[];
}
