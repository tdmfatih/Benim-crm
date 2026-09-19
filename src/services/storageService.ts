import { 
  CompanySettings, Role, User, ServiceCategory, ServiceItem, Product, 
  Customer, Lead, Offer, Installation, ServiceTicket, Invoice, 
  PaymentRecord, AutomationRule, CommunicationTemplate, CommunicationLog, 
  AuditLogEntry, SystemSnapshot, InventoryMovement
} from '../types';
import { 
  initialCompanySettings, initialRoles, initialUsers, initialServiceCategories, 
  initialServices, initialProducts, initialCustomers, initialLeads, 
  initialOffers, initialInstallations, initialServiceTickets, initialInvoices, 
  initialAutomations, initialCommunicationTemplates, initialCommunicationLogs, 
  initialAuditLogs 
} from '../data/seedData';

const STORAGE_KEY_PREFIX = '3as_erp_';

function sanitizeAuditValue(val: any, depth = 0): any {
  if (val === null || val === undefined) return val;
  if (depth > 2) return '[Nesne Özeti]';

  if (typeof val === 'string') {
    if (val.startsWith('data:image') || val.length > 200) {
      return '[Görsel / Uzun Veri]';
    }
    return val;
  }

  if (Array.isArray(val)) {
    return val.slice(0, 5).map(item => sanitizeAuditValue(item, depth + 1));
  }

  if (typeof val === 'object') {
    const clean: Record<string, any> = {};
    for (const k of Object.keys(val)) {
      if (['logoUrl', 'photos', 'proofPhotos', 'beforePhotos', 'afterPhotos', 'signatureData'].includes(k)) {
        clean[k] = val[k] ? '[Görsel Verisi Mevcut]' : null;
      } else {
        clean[k] = sanitizeAuditValue(val[k], depth + 1);
      }
    }
    return clean;
  }

  return val;
}

function loadOrSeed<T>(key: string, seed: T): T {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PREFIX + key);
    if (!raw) return seed;
    return JSON.parse(raw);
  } catch (e) {
    console.error(`Failed to parse storage for ${key}:`, e);
    return seed;
  }
}

function save<T>(key: string, data: T): void {
  try {
    localStorage.setItem(STORAGE_KEY_PREFIX + key, JSON.stringify(data));
  } catch (e: any) {
    console.error(`Failed to save storage for ${key}:`, e);
    // Kota aşımı (QuotaExceededError) durumunda akıllı temizlik ve kurtarma
    const isQuotaError = 
      e?.name === 'QuotaExceededError' || 
      e?.code === 22 || 
      e?.number === -2147024882 || 
      String(e).toLowerCase().includes('quota');

    if (isQuotaError) {
      try {
        if (key === 'audit_logs') {
          // Audit loglar için son 15 kaydı sakla, fazlasını sil
          const trimmed = Array.isArray(data) ? (data as any[]).slice(0, 15) : [];
          localStorage.setItem(STORAGE_KEY_PREFIX + key, JSON.stringify(trimmed));
          return;
        }

        // Diğer veriler kaydedilirken yer açmak için audit ve iletişim geçmişini buda
        localStorage.removeItem(STORAGE_KEY_PREFIX + 'audit_logs');
        const commLogsRaw = localStorage.getItem(STORAGE_KEY_PREFIX + 'comm_logs');
        if (commLogsRaw) {
          try {
            const commLogs = JSON.parse(commLogsRaw);
            if (Array.isArray(commLogs)) {
              localStorage.setItem(STORAGE_KEY_PREFIX + 'comm_logs', JSON.stringify(commLogs.slice(0, 15)));
            }
          } catch {
            localStorage.removeItem(STORAGE_KEY_PREFIX + 'comm_logs');
          }
        }

        // Asıl veriyi tekrar kaydetmeyi dene
        localStorage.setItem(STORAGE_KEY_PREFIX + key, JSON.stringify(data));
      } catch (retryErr) {
        console.error(`Critical: Recovery save failed for ${key}:`, retryErr);
      }
    }
  }
}

class StorageService {
  // Current user state (for RBAC & Audit log tracking)
  private currentUserId: string = 'usr-1';

  getCurrentUser(): User {
    const users = this.getUsers();
    return users.find(u => u.id === this.currentUserId) || users[0];
  }

  setCurrentUser(userOrId: string | User): void {
    this.currentUserId = typeof userOrId === 'string' ? userOrId : userOrId.id;
  }

  // AUDIT LOG
  getAuditLogs(): AuditLogEntry[] {
    try {
      const logs = loadOrSeed<AuditLogEntry[]>('audit_logs', initialAuditLogs);
      // Eğer mevcut log listesi 50'den büyükse otomatik buda
      if (Array.isArray(logs) && logs.length > 50) {
        const pruned = logs.slice(0, 40);
        save('audit_logs', pruned);
        return pruned;
      }
      return logs;
    } catch {
      return initialAuditLogs;
    }
  }

  logAudit(
    action: string,
    entityType: AuditLogEntry['entityType'],
    entityId: string,
    entityName: string,
    oldValues?: any,
    newValues?: any
  ): void {
    const logs = this.getAuditLogs();
    const currentUser = this.getCurrentUser();
    const entry: AuditLogEntry = {
      id: 'aud-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      userId: currentUser.id,
      userName: currentUser.fullName,
      userRole: currentUser.roleTitle,
      action,
      entityType,
      entityId,
      entityName,
      oldValues: sanitizeAuditValue(oldValues),
      newValues: sanitizeAuditValue(newValues),
      timestamp: new Date().toISOString(),
      clientIp: 'Yerel Oturum',
    };
    logs.unshift(entry);
    save('audit_logs', logs.slice(0, 40)); // keep last 40 entries
  }

  // SETTINGS
  getSettings(): CompanySettings {
    const s = loadOrSeed<CompanySettings>('settings', initialCompanySettings);
    // Kullanıcı şirket bilgilerini güncelle
    if (!s.companyName || s.companyName === '3AS TEKNOLOJİ') {
      s.companyName = '3AS TEKNOLOJİ ve BİLİSİM HİZMETLERİ';
      s.name = '3AS TEKNOLOJİ ve BİLİSİM HİZMETLERİ';
    }
    if (!s.tradeName) s.tradeName = '3AS TEKNOLOJİ';
    if (!s.phone || s.phone === '0212 912 33 00') s.phone = '+905050375959';
    if (!s.whatsappNumber || s.whatsappNumber === '0532 912 33 00') s.whatsappNumber = '+905050375959';
    if (!s.managerWhatsAppNumber || s.managerWhatsAppNumber === '0532 999 88 77') {
      s.managerWhatsAppNumber = '+905050375959';
    }
    if (!s.leadNotificationPhone) s.leadNotificationPhone = '+905050375959';
    if (!s.address || s.address.includes('Perpa')) s.address = 'Tekirdağ Süleymanpaşa';
    if (!s.city || s.city === 'İstanbul') s.city = 'Tekirdağ';
    if (!s.district || s.district === 'Şişli') s.district = 'Süleymanpaşa';
    if (!s.taxOffice || s.taxOffice === 'Şişli V.D.') s.taxOffice = 'Namık Kemal VD.';
    if (!s.taxNumber || s.taxNumber === '0010992384') s.taxNumber = '21976554076';

    return s;
  }

  saveSettings(settings: CompanySettings): void {
    this.logAudit('SETTINGS_UPDATED', 'settings', 'sys-1', 'Şirket Bilgileri', this.getSettings(), settings);
    save('settings', settings);
  }

  setSettings(settings: CompanySettings): void {
    save('settings', settings);
  }

  // USERS & ROLES
  getUsers(): User[] {
    return loadOrSeed<User[]>('users', initialUsers);
  }

  saveUsers(users: User[]): void {
    save('users', users);
  }

  getRoles(): Role[] {
    return loadOrSeed<Role[]>('roles', initialRoles);
  }

  saveRoles(roles: Role[]): void {
    this.logAudit('ROLES_UPDATED', 'role', 'role-matrix', 'Rol ve Yetki Matrisi', null, roles);
    save('roles', roles);
  }

  // SERVICES & CATEGORIES
  getCategories(): ServiceCategory[] {
    return loadOrSeed<ServiceCategory[]>('service_categories', initialServiceCategories);
  }

  saveCategories(categories: ServiceCategory[]): void {
    save('service_categories', categories);
  }

  getServices(): ServiceItem[] {
    return loadOrSeed<ServiceItem[]>('services', initialServices);
  }

  saveServices(services: ServiceItem[]): void {
    save('services', services);
  }

  // PRODUCTS & INVENTORY
  getProducts(): Product[] {
    return loadOrSeed<Product[]>('products', initialProducts);
  }

  saveProducts(products: Product[]): void {
    save('products', products);
  }

  setProducts(products: Product[]): void {
    this.saveProducts(products);
  }

  getInventoryMovements(): InventoryMovement[] {
    return loadOrSeed<InventoryMovement[]>('inventory_movements', [
      {
        id: 'mov-1',
        productId: 'prod-1',
        productName: '4MP Gece Görüşlü IP Bullet Güvenlik Kamerası',
        type: 'installation_use',
        quantityChange: -16,
        previousStock: 64,
        newStock: 48,
        unitPrice: 1450,
        referenceType: 'installation',
        referenceNumber: 'MNT-2026-0001',
        note: 'Metro Lojistik montajı için stok çıkışı',
        performedBy: 'Burak Yılmaz',
        createdAt: '2026-09-18T09:40:00Z',
      }
    ]);
  }

  recordStockMovement(movement: Omit<InventoryMovement, 'id' | 'createdAt' | 'performedBy'>): void {
    const movements = this.getInventoryMovements();
    const products = this.getProducts();
    const currentUser = this.getCurrentUser();

    const productIndex = products.findIndex(p => p.id === movement.productId);
    if (productIndex >= 0) {
      products[productIndex].currentStock = movement.newStock;
      this.saveProducts(products);
    }

    const newMov: InventoryMovement = {
      ...movement,
      id: 'mov-' + Date.now(),
      performedBy: currentUser.fullName,
      createdAt: new Date().toISOString(),
    };

    movements.unshift(newMov);
    save('inventory_movements', movements);

    this.logAudit('INVENTORY_MOVEMENT', 'inventory', movement.productId, movement.productName, 
      { stock: movement.previousStock }, 
      { stock: movement.newStock, change: movement.quantityChange, type: movement.type }
    );
  }

  // CUSTOMERS
  getCustomers(): Customer[] {
    return loadOrSeed<Customer[]>('customers', initialCustomers);
  }

  saveCustomers(customers: Customer[]): void {
    save('customers', customers);
  }

  setCustomers(customers: Customer[]): void {
    this.saveCustomers(customers);
  }

  addCustomer(customerData: Partial<Customer>): Customer {
    const customers = this.getCustomers();
    const newCust: Customer = {
      id: 'cust-' + Date.now(),
      type: customerData.type || 'individual',
      name: customerData.name || 'İsimsiz Müşteri',
      contactPerson: customerData.contactPerson,
      phone: customerData.phone || '',
      secondaryPhone: customerData.secondaryPhone,
      email: customerData.email,
      address: customerData.address,
      district: customerData.district,
      city: customerData.city,
      taxOffice: customerData.taxOffice,
      taxNumber: customerData.taxNumber,
      tcIdentityNumber: customerData.tcIdentityNumber,
      balance: customerData.balance || 0,
      creditLimit: customerData.creditLimit || 50000,
      contacts: customerData.contacts || [],
      addresses: customerData.addresses || (customerData.address ? [{
        id: 'addr-1',
        title: 'Merkez',
        city: customerData.city || 'İstanbul',
        district: customerData.district || 'Merkez',
        fullAddress: customerData.address,
        isDefault: true,
      }] : []),
      notes: customerData.notes,
      createdAt: new Date().toISOString(),
    };
    customers.unshift(newCust);
    this.saveCustomers(customers);
    this.logAudit('CUSTOMER_CREATED', 'customer', newCust.id, newCust.name);
    return newCust;
  }

  getCustomerById(id: string): Customer | undefined {
    return this.getCustomers().find(c => c.id === id);
  }

  // LEADS
  getLeads(): Lead[] {
    return loadOrSeed<Lead[]>('leads', initialLeads);
  }

  saveLeads(leads: Lead[]): void {
    save('leads', leads);
  }

  setLeads(leads: Lead[]): void {
    this.saveLeads(leads);
  }

  addLead(leadData: Partial<Lead>): Lead {
    const leads = this.getLeads();
    const newLead: Lead = {
      id: 'lead-' + Date.now(),
      fullName: leadData.fullName || 'İsimsiz Müşteri',
      companyName: leadData.companyName,
      phone: leadData.phone || '',
      email: leadData.email,
      city: leadData.city || 'İstanbul',
      interestedServiceCategory: leadData.interestedServiceCategory || 'Güvenlik & Bilişim Sistemleri',
      serviceDetails: leadData.serviceDetails,
      message: leadData.message,
      source: leadData.source || 'Web Sitesi',
      stage: leadData.stage || 'new',
      assignedUserId: leadData.assignedUserId,
      assignedUserName: leadData.assignedUserName,
      budgetEstimate: leadData.budgetEstimate || 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      activities: leadData.activities || [
        {
          id: 'act-' + Date.now(),
          leadId: 'lead-' + Date.now(),
          userId: leadData.assignedUserId || 'usr-1',
          userName: leadData.assignedUserName || 'Sistem',
          type: 'note',
          summary: 'Yeni müşteri talebi sisteme ulaştı.',
          createdAt: new Date().toISOString(),
        }
      ],
    };
    leads.unshift(newLead);
    this.saveLeads(leads);
    this.logAudit('LEAD_CREATED', 'lead', newLead.id, newLead.fullName, null, newLead);
    return newLead;
  }

  // OFFERS
  getOffers(): Offer[] {
    return loadOrSeed<Offer[]>('offers', initialOffers);
  }

  saveOffers(offers: Offer[]): void {
    save('offers', offers);
  }

  setOffers(offers: Offer[]): void {
    this.saveOffers(offers);
  }

  getOfferByToken(token: string): Offer | undefined {
    return this.getOffers().find(o => o.secureToken === token);
  }

  // INSTALLATIONS
  getInstallations(): Installation[] {
    return loadOrSeed<Installation[]>('installations', initialInstallations);
  }

  saveInstallations(installations: Installation[]): void {
    save('installations', installations);
  }

  setInstallations(installations: Installation[]): void {
    this.saveInstallations(installations);
  }

  getInstallationByDeliveryToken(token: string): Installation | undefined {
    return this.getInstallations().find(i => i.secureDeliveryToken === token);
  }

  // SERVICE TICKETS
  getServiceTickets(): ServiceTicket[] {
    return loadOrSeed<ServiceTicket[]>('service_tickets', initialServiceTickets);
  }

  saveServiceTickets(tickets: ServiceTicket[]): void {
    save('service_tickets', tickets);
  }

  setServices(tickets: ServiceTicket[]): void {
    this.saveServiceTickets(tickets);
  }

  getServiceTicketByApprovalToken(token: string): ServiceTicket | undefined {
    return this.getServiceTickets().find(t => (t.secureApprovalToken === token || t.approvalToken === token));
  }

  // INVOICES & PAYMENTS
  getInvoices(): Invoice[] {
    return loadOrSeed<Invoice[]>('invoices', initialInvoices);
  }

  saveInvoices(invoices: Invoice[]): void {
    save('invoices', invoices);
  }

  setInvoices(invoices: Invoice[]): void {
    this.saveInvoices(invoices);
  }

  addPayment(invoiceId: string, payment: Omit<PaymentRecord, 'id' | 'createdAt'>): void {
    const invoices = this.getInvoices();
    const index = invoices.findIndex(inv => inv.id === invoiceId);
    if (index === -1) return;

    const inv = invoices[index];
    const newPayment: PaymentRecord = {
      ...payment,
      id: 'pay-' + Date.now(),
      createdAt: new Date().toISOString(),
    };

    inv.payments.push(newPayment);
    inv.paidAmount += payment.amount;
    inv.remainingAmount = Math.max(0, inv.grandTotal - inv.paidAmount);

    if (inv.remainingAmount <= 0) {
      inv.status = 'paid';
    } else {
      inv.status = 'partial';
    }

    // Customer balance update
    const customers = this.getCustomers();
    const custIdx = customers.findIndex(c => c.id === inv.customerId);
    if (custIdx >= 0) {
      customers[custIdx].balance = Math.max(0, customers[custIdx].balance - payment.amount);
      this.saveCustomers(customers);
    }

    this.saveInvoices(invoices);
    this.logAudit('PAYMENT_RECEIVED', 'invoice', inv.id, inv.invoiceNumber, null, {
      amount: payment.amount,
      method: payment.paymentMethod,
      remaining: inv.remainingAmount,
    });
  }

  // AUTOMATIONS
  getAutomations(): AutomationRule[] {
    const list = loadOrSeed<AutomationRule[]>('automations', initialAutomations);
    // Yeni kuralları mevcut listeye dahil et
    let changed = false;
    for (const initRule of initialAutomations) {
      if (!list.some(r => r.trigger === initRule.trigger && r.actionType === initRule.actionType)) {
        list.unshift(initRule);
        changed = true;
      }
    }
    if (changed) {
      this.saveAutomations(list);
    }
    return list;
  }

  saveAutomations(rules: AutomationRule[]): void {
    save('automations', rules);
  }

  getAutomationRules(): AutomationRule[] {
    return this.getAutomations();
  }

  setAutomationRules(rules: AutomationRule[]): void {
    this.saveAutomations(rules);
  }

  // COMMUNICATIONS & WHATSAPP
  getCommunicationTemplates(): CommunicationTemplate[] {
    const list = loadOrSeed<CommunicationTemplate[]>('comm_templates', initialCommunicationTemplates);
    let changed = false;
    for (const initTmpl of initialCommunicationTemplates) {
      if (!list.some(t => t.code === initTmpl.code)) {
        list.unshift(initTmpl);
        changed = true;
      }
    }
    if (changed) {
      this.saveCommunicationTemplates(list);
    }
    return list;
  }

  getWhatsAppTemplates(): CommunicationTemplate[] {
    return this.getCommunicationTemplates();
  }

  saveCommunicationTemplates(templates: CommunicationTemplate[]): void {
    save('comm_templates', templates);
  }

  getCommunicationLogs(): CommunicationLog[] {
    return loadOrSeed<CommunicationLog[]>('comm_logs', initialCommunicationLogs);
  }

  getWhatsAppLogs(): CommunicationLog[] {
    return this.getCommunicationLogs();
  }

  resetToSeed(): void {
    this.resetAllData();
  }

  addCommunicationLog(log: Omit<CommunicationLog, 'id'>): CommunicationLog {
    const logs = this.getCommunicationLogs();
    const newLog: CommunicationLog = {
      ...log,
      id: 'log-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5),
    };
    logs.unshift(newLog);
    save('comm_logs', logs.slice(0, 300));
    return newLog;
  }

  // FULL SNAPSHOT EXPORT & IMPORT
  exportSnapshot(): SystemSnapshot {
    return {
      version: '2.0-Production-3AS',
      exportedAt: new Date().toISOString(),
      settings: this.getSettings(),
      users: this.getUsers(),
      roles: this.getRoles(),
      serviceCategories: this.getCategories(),
      services: this.getServices(),
      customers: this.getCustomers(),
      leads: this.getLeads(),
      offers: this.getOffers(),
      installations: this.getInstallations(),
      serviceTickets: this.getServiceTickets(),
      products: this.getProducts(),
      inventoryMovements: this.getInventoryMovements(),
      invoices: this.getInvoices(),
      payments: this.getInvoices().flatMap(i => i.payments),
      automationRules: this.getAutomations(),
      communicationLogs: this.getCommunicationLogs(),
      communicationTemplates: this.getCommunicationTemplates(),
      auditLogs: this.getAuditLogs(),
    };
  }

  importSnapshot(snapshot: SystemSnapshot): boolean {
    try {
      if (snapshot.settings) save('settings', snapshot.settings);
      if (snapshot.users) save('users', snapshot.users);
      if (snapshot.roles) save('roles', snapshot.roles);
      if (snapshot.serviceCategories) save('service_categories', snapshot.serviceCategories);
      if (snapshot.services) save('services', snapshot.services);
      if (snapshot.customers) save('customers', snapshot.customers);
      if (snapshot.leads) save('leads', snapshot.leads);
      if (snapshot.offers) save('offers', snapshot.offers);
      if (snapshot.installations) save('installations', snapshot.installations);
      if (snapshot.serviceTickets) save('service_tickets', snapshot.serviceTickets);
      if (snapshot.products) save('products', snapshot.products);
      if (snapshot.inventoryMovements) save('inventory_movements', snapshot.inventoryMovements);
      if (snapshot.invoices) save('invoices', snapshot.invoices);
      if (snapshot.automationRules) save('automations', snapshot.automationRules);
      if (snapshot.communicationTemplates) save('comm_templates', snapshot.communicationTemplates);
      if (snapshot.communicationLogs) save('comm_logs', snapshot.communicationLogs);
      if (snapshot.auditLogs) save('audit_logs', snapshot.auditLogs);

      this.logAudit('SNAPSHOT_RESTORED', 'settings', 'sys-1', 'Sistem Yedekten Geri Yüklendi');
      return true;
    } catch (e) {
      console.error('Failed to import snapshot:', e);
      return false;
    }
  }

  resetAllData(): void {
    localStorage.clear();
    save('settings', initialCompanySettings);
    save('users', initialUsers);
    save('roles', initialRoles);
    save('service_categories', initialServiceCategories);
    save('services', initialServices);
    save('products', initialProducts);
    save('customers', initialCustomers);
    save('leads', initialLeads);
    save('offers', initialOffers);
    save('installations', initialInstallations);
    save('service_tickets', initialServiceTickets);
    save('invoices', initialInvoices);
    save('automations', initialAutomations);
    save('comm_templates', initialCommunicationTemplates);
    save('comm_logs', initialCommunicationLogs);
    save('audit_logs', initialAuditLogs);
  }
}

export const storage = new StorageService();
