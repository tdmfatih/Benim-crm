import React, { useState, useEffect } from 'react';
import { 
  Customer, Lead, Offer, ServiceTicket, Installation, 
  Invoice, Product, CompanySettings, User, Role, 
  AuditLogEntry, WhatsAppLog, AutomationRule 
} from './types';
import { storage } from './services/storageService';
import { RBACService } from './services/rbacService';

// Layout Components
import { Sidebar, NavigationTab } from './components/layout/Sidebar';
import { Topbar } from './components/layout/Topbar';

// Module Views
import { DashboardView } from './modules/dashboard/DashboardView';
import { LeadManagementView } from './modules/crm/LeadManagementView';
import { CustomerListView } from './modules/customers/CustomerListView';
import { OfferManagementView } from './modules/offers/OfferManagementView';
import { ServiceDeskView } from './modules/service/ServiceDeskView';
import { InstallationPlanningView } from './modules/installations/InstallationPlanningView';
import { ProjectsView } from './modules/projects/ProjectsView';
import { InventoryView } from './modules/inventory/InventoryView';
import { InvoiceView } from './modules/invoices/InvoiceView';
import { PaymentsView } from './modules/invoices/PaymentsView';
import { CalendarView } from './modules/calendar/CalendarView';
import { ReportsView } from './modules/reports/ReportsView';
import { CommunicationsView } from './modules/communications/CommunicationsView';
import { AutomationsView } from './modules/automations/AutomationsView';
import { SettingsView } from './modules/settings/SettingsView';
import { UserManagementView } from './modules/users/UserManagementView';

// Public Customer Portals
import { PublicOfferApproval } from './public-views/PublicOfferApproval';
import { PublicServiceApproval } from './public-views/PublicServiceApproval';
import { PublicDeliveryConfirm } from './public-views/PublicDeliveryConfirm';

import { Shield, Eye, ArrowLeft, CheckCircle2, LayoutDashboard, FileText, Wrench, Cpu, Menu } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavigationTab>('dashboard');
  const [currentUser, setCurrentUser] = useState<User>(() => storage.getCurrentUser());
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  // Public Portal State (when viewing as a customer via secure token)
  const [publicPortal, setPublicPortal] = useState<{
    type: 'offer' | 'service' | 'delivery' | null;
    token: string | null;
  }>(() => {
    // Check initial URL hash / path
    const path = window.location.pathname;
    const hash = window.location.hash;
    const target = hash.startsWith('#/') ? hash.replace('#', '') : path;

    if (target.startsWith('/offer/')) {
      const rawToken = target.replace('/offer/', '').split('?')[0].split('#')[0];
      return { type: 'offer', token: rawToken };
    }
    if (target.startsWith('/service-approval/')) {
      const rawToken = target.replace('/service-approval/', '').split('?')[0].split('#')[0];
      return { type: 'service', token: rawToken };
    }
    if (target.startsWith('/delivery-confirm/')) {
      const rawToken = target.replace('/delivery-confirm/', '').split('?')[0].split('#')[0];
      return { type: 'delivery', token: rawToken };
    }
    return { type: null, token: null };
  });

  // Enterprise Data Store (Hydrated from simulated PostgreSQL/localStorage)
  const [customers, setCustomers] = useState<Customer[]>(() => storage.getCustomers());
  const [leads, setLeads] = useState<Lead[]>(() => storage.getLeads());
  const [offers, setOffers] = useState<Offer[]>(() => storage.getOffers());
  const [services, setServices] = useState<ServiceTicket[]>(() => storage.getServiceTickets());
  const [installations, setInstallations] = useState<Installation[]>(() => storage.getInstallations());
  const [invoices, setInvoices] = useState<Invoice[]>(() => storage.getInvoices());
  const [products, setProducts] = useState<Product[]>(() => storage.getProducts());
  const [users, setUsers] = useState<User[]>(() => storage.getUsers());
  const [roles, setRoles] = useState<Role[]>(() => storage.getRoles());
  const [settings, setSettings] = useState<CompanySettings>(() => storage.getSettings());
  const [automationRules, setAutomationRules] = useState<AutomationRule[]>(() => storage.getAutomationRules());
  const [whatsAppLogs, setWhatsAppLogs] = useState<WhatsAppLog[]>(() => storage.getWhatsAppLogs());
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(() => storage.getAuditLogs());

  // Sync to StorageService
  useEffect(() => { storage.setCustomers(customers); }, [customers]);
  useEffect(() => { storage.setLeads(leads); }, [leads]);
  useEffect(() => { storage.setOffers(offers); }, [offers]);
  useEffect(() => { storage.setServices(services); }, [services]);
  useEffect(() => { storage.setInstallations(installations); }, [installations]);
  useEffect(() => { storage.setInvoices(invoices); }, [invoices]);
  useEffect(() => { storage.setProducts(products); }, [products]);
  useEffect(() => { storage.setSettings(settings); }, [settings]);
  useEffect(() => { storage.setAutomationRules(automationRules); }, [automationRules]);

  // Handle User Switcher (For testing RBAC: Admin vs Sales vs Tech)
  const handleUserChange = (user: User) => {
    storage.setCurrentUser(user);
    setCurrentUser(user);
  };

  // Cross-module actions
  const handleCreateInstallationFromOffer = (offer: Offer) => {
    const installationNumber = `3AS-MON-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const newInst: Installation = {
      id: 'inst-' + Date.now(),
      installationNumber,
      relatedOfferId: offer.id,
      customerId: offer.customerId,
      customerName: offer.customerName,
      customerPhone: offer.customerPhone,
      fullAddress: offer.customerAddress || 'Adres belirtilmedi',
      projectName: `${offer.serviceCategory} Kurulumu`,
      scheduledDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      scheduledTime: '09:30',
      status: 'scheduled',
      assignedTechnicians: [
        {
          userId: users[2]?.id || 'usr-3',
          fullName: users[2]?.fullName || 'Emre Kaya',
          isLead: true,
        }
      ],
      tasksDescription: `${offer.offerNumber} no'lu onaylı teklife istinaden anahtar teslim montaj ve testler.`,
      checklist: [
        { id: 'c1', text: 'Kablo hatları ve kanal çekimi', isCompleted: false },
        { id: 'c2', text: 'Cihaz montajları ve açı ayarları', isCompleted: false },
        { id: 'c3', text: 'Kayıt cihazı ve switch yapılandırması', isCompleted: false },
        { id: 'c4', text: 'Kullanıcı eğitimi ve teslimat kabulü', isCompleted: false },
      ],
      materials: offer.items.map(item => ({
        id: 'mat-' + item.id,
        productId: item.productId || ('prod-' + item.id),
        productName: item.name,
        sku: 'SKU-' + item.name.substring(0, 3).toUpperCase(),
        usedQty: item.quantity,
        unit: item.unit,
      })),
      photos: [],
      deliveryApprovalToken: '3as_deliv_' + Math.random().toString(36).substring(2, 10),
      secureDeliveryToken: '3as_deliv_' + Math.random().toString(36).substring(2, 10),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updated = [newInst, ...installations];
    setInstallations(updated);
    setActiveTab('installations');
    alert(`Montaj İş Emri (${installationNumber}) başarıyla oluşturuldu ve Saha Ajandasına eklendi!`);
  };

  const handleCreateInvoiceFromOffer = (offer: Offer) => {
    const invoiceNumber = `3AS-FAT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const newInvoice: Invoice = {
      id: 'inv-' + Date.now(),
      invoiceNumber,
      relatedOfferId: offer.id,
      customerId: offer.customerId,
      customerName: offer.customerName,
      customerPhone: offer.customerPhone,
      customerEmail: offer.customerEmail,
      type: 'sales',
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      status: 'unpaid',
      items: offer.items.map(i => ({
        id: i.id,
        description: i.name,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        vatRate: i.vatRate,
        total: i.total,
      })),
      subtotal: offer.subtotal,
      taxTotal: offer.taxTotal,
      grandTotal: offer.grandTotal,
      paidAmount: 0,
      remainingAmount: offer.grandTotal,
      payments: [],
      notes: `${offer.offerNumber} no'lu onaylı teklif faturasıdır.`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updated = [newInvoice, ...invoices];
    setInvoices(updated);
    setActiveTab('invoices');
    alert(`e-Fatura (${invoiceNumber}) oluşturuldu ve açık hesaplara eklendi!`);
  };

  const handleCreateInvoiceFromService = (ticket: ServiceTicket) => {
    const invoiceNumber = `3AS-FAT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const newInvoice: Invoice = {
      id: 'inv-' + Date.now(),
      invoiceNumber,
      relatedServiceId: ticket.id,
      customerId: ticket.customerId,
      customerName: ticket.customerName,
      customerPhone: ticket.customerPhone,
      customerEmail: ticket.customerEmail,
      type: 'service',
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      status: ticket.depositPaid >= ticket.totalCost ? 'paid' : (ticket.depositPaid > 0 ? 'partial' : 'unpaid'),
      items: ticket.operations.map(op => ({
        id: op.id,
        description: op.description,
        quantity: 1,
        unitPrice: op.totalCost / 1.2,
        vatRate: 20,
        total: op.totalCost,
      })),
      subtotal: ticket.totalCost / 1.2,
      taxTotal: ticket.totalCost - (ticket.totalCost / 1.2),
      grandTotal: ticket.totalCost,
      paidAmount: ticket.depositPaid,
      remainingAmount: Math.max(0, ticket.remainingBalance),
      payments: ticket.depositPaid > 0 ? [
        {
          id: 'pay-srv-dep',
          invoiceId: 'inv-' + ticket.id,
          customerId: ticket.customerId,
          customerName: ticket.customerName,
          amount: ticket.depositPaid,
          paymentDate: ticket.createdAt.split('T')[0],
          paymentMethod: 'Nakit',
          stage: 'deposit',
          stageLabel: 'Cihaz Kabul Kaporası',
          receivedByUserId: ticket.assignedTechnicianId || 'usr-1',
          receivedByUserName: ticket.assignedTechnicianName || 'Servis Departmanı',
          createdAt: new Date().toISOString(),
        }
      ] : [],
      notes: `${ticket.ticketNumber} no'lu teknik servis onarım ve parça faturasıdır.`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updated = [newInvoice, ...invoices];
    setInvoices(updated);
    setActiveTab('invoices');
    alert(`Teknik Servis Faturası (${invoiceNumber}) başarıyla kesildi!`);
  };

  // Reset to initial seed data
  const handleResetData = () => {
    storage.resetToSeed();
    setCustomers(storage.getCustomers());
    setLeads(storage.getLeads());
    setOffers(storage.getOffers());
    setServices(storage.getServiceTickets());
    setInstallations(storage.getInstallations());
    setInvoices(storage.getInvoices());
    setProducts(storage.getProducts());
    setSettings(storage.getSettings());
    setAutomationRules(storage.getAutomationRules());
    setWhatsAppLogs(storage.getWhatsAppLogs());
    setAuditLogs(storage.getAuditLogs());
  };

  // IF RENDERING PUBLIC CUSTOMER PORTAL
  if (publicPortal.token && publicPortal.type) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
        {/* Simülasyon Üst Barı (Yönetim Paneline Dönüş) */}
        <div className="bg-slate-950 border-b border-slate-800 px-4 py-2.5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-bold text-slate-300">
              Müşteri Güvenli Onay Portalı Simülasyonu
            </span>
            <span className="text-slate-500 font-mono text-[11px]">
              ({publicPortal.type.toUpperCase()}: {publicPortal.token})
            </span>
          </div>

          <button
            onClick={() => setPublicPortal({ type: null, token: null })}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold flex items-center gap-1.5 transition"
          >
            <ArrowLeft size={14} /> Şirket Yönetim Paneline Dön
          </button>
        </div>

        {/* Müşteri Ekranı */}
        <div className="flex-1">
          {publicPortal.type === 'offer' && (
            <PublicOfferApproval
              token={publicPortal.token}
              onApproved={(offer) => {
                const updated = offers.map(o => o.id === offer.id ? offer : o);
                setOffers(updated);
              }}
            />
          )}

          {publicPortal.type === 'service' && (
            <PublicServiceApproval
              token={publicPortal.token}
              onApproved={(ticket) => {
                const updated = services.map(s => s.id === ticket.id ? ticket : s);
                setServices(updated);
              }}
            />
          )}

          {publicPortal.type === 'delivery' && (
            <PublicDeliveryConfirm
              token={publicPortal.token}
              onApproved={(inst) => {
                const updated = installations.map(i => i.id === inst.id ? inst : i);
                setInstallations(updated);
              }}
            />
          )}
        </div>
      </div>
    );
  }

  // STANDARD SAAS MANAGEMENT APP
  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex font-sans antialiased">
      {/* Sol Sidebar (Masaüstü Sabit / Mobilde Açılır Drawer) */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        currentUser={currentUser}
        users={users}
        onUserChange={handleUserChange}
        pendingOffersCount={offers.filter(o => o.status === 'sent').length}
        activeServicesCount={services.filter(s => s.status !== 'delivered').length}
        todayInstallationsCount={installations.filter(i => i.status !== 'completed').length}
        isOpen={isMobileNavOpen}
        onClose={() => setIsMobileNavOpen(false)}
      />

      {/* Ana Çalışma Alanı */}
      <div className="flex-1 flex flex-col min-w-0 pb-16 md:pb-0">
        {/* Üst Topbar */}
        <Topbar
          activeTab={activeTab}
          currentUser={currentUser}
          offers={offers}
          services={services}
          installations={installations}
          onOpenMobileNav={() => setIsMobileNavOpen(true)}
          onOpenPublicPortal={(type, token) => setPublicPortal({ type, token })}
          onQuickNewOffer={() => setActiveTab('offers')}
          onQuickNewService={() => setActiveTab('service')}
          onQuickNewCustomer={() => setActiveTab('customers')}
        />

        {/* Ana İçerik Konteyneri */}
        <main className="flex-1 p-3 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto pb-24 lg:pb-8">
          {activeTab === 'dashboard' && (
            <DashboardView
              leads={leads}
              offers={offers}
              services={services}
              installations={installations}
              invoices={invoices}
              onNavigate={(tab) => setActiveTab(tab as NavigationTab)}
            />
          )}

          {activeTab === 'crm' && (
            <LeadManagementView
              leads={leads}
              users={users}
              onSaveLeads={setLeads}
              onConvertToCustomer={(lead) => {
                const newCust: Customer = {
                  id: 'cust-' + Date.now(),
                  name: lead.company ? `${lead.company} (${lead.contactName})` : (lead.contactName || 'İsimsiz Müşteri'),
                  type: lead.company ? 'corporate' : 'individual',
                  contactPerson: lead.contactName,
                  phone: lead.phone || '',
                  email: lead.email,
                  address: lead.company || 'Adres belirtilmedi',
                  balance: 0,
                  contacts: [],
                  addresses: [],
                  tags: lead.serviceCategory ? [lead.serviceCategory] : [],
                  createdAt: new Date().toISOString(),
                };
                setCustomers([newCust, ...customers]);
                setActiveTab('customers');
              }}
            />
          )}

          {activeTab === 'customers' && (
            <CustomerListView
              customers={customers}
              offers={offers}
              services={services}
              installations={installations}
              invoices={invoices}
              onSaveCustomers={setCustomers}
              onNewOfferForCustomer={(c) => setActiveTab('offers')}
              onNewServiceForCustomer={(c) => setActiveTab('service')}
            />
          )}

          {activeTab === 'offers' && (
            <OfferManagementView
              offers={offers}
              customers={customers}
              products={products}
              onSaveOffers={setOffers}
              onCreateInstallationFromOffer={handleCreateInstallationFromOffer}
              onCreateInvoiceFromOffer={handleCreateInvoiceFromOffer}
              onOpenPublicOffer={(token) => setPublicPortal({ type: 'offer', token })}
            />
          )}

          {activeTab === 'service' && (
            <ServiceDeskView
              services={services}
              customers={customers}
              users={users}
              onSaveServices={setServices}
              onOpenPublicService={(token) => setPublicPortal({ type: 'service', token })}
              onCreateInvoiceFromService={handleCreateInvoiceFromService}
            />
          )}

          {activeTab === 'installations' && (
            <InstallationPlanningView
              installations={installations}
              customers={customers}
              users={users}
              products={products}
              onSaveInstallations={setInstallations}
              onOpenPublicDelivery={(token) => setPublicPortal({ type: 'delivery', token })}
            />
          )}

          {activeTab === 'projects' && (
            <ProjectsView
              installations={installations}
              onNavigateToInstallation={(id) => setActiveTab('installations')}
            />
          )}

          {activeTab === 'inventory' && (
            <InventoryView
              products={products}
              onSaveProducts={setProducts}
            />
          )}

          {activeTab === 'invoices' && (
            <InvoiceView
              invoices={invoices}
              customers={customers}
              onSaveInvoices={setInvoices}
            />
          )}

          {activeTab === 'payments' && (
            <PaymentsView
              invoices={invoices}
            />
          )}

          {activeTab === 'calendar' && (
            <CalendarView
              installations={installations}
              services={services}
              leads={leads}
            />
          )}

          {activeTab === 'reports' && (
            <ReportsView
              offers={offers}
              invoices={invoices}
              services={services}
              installations={installations}
              products={products}
            />
          )}

          {activeTab === 'communications' && (
            <CommunicationsView
              logs={whatsAppLogs}
              templates={storage.getWhatsAppTemplates()}
            />
          )}

          {activeTab === 'automations' && (
            <AutomationsView
              rules={automationRules}
              onSaveRules={setAutomationRules}
            />
          )}

          {activeTab === 'users' && (
            <UserManagementView
              users={users}
              roles={roles}
              currentUser={currentUser}
              onUsersChange={setUsers}
              onSwitchUser={(userId) => {
                const u = users.find(x => x.id === userId);
                if (u) setCurrentUser(u);
              }}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              settings={settings}
              users={users}
              roles={roles}
              auditLogs={auditLogs}
              currentUser={currentUser}
              onUsersChange={setUsers}
              onSwitchUser={(userId) => {
                const u = users.find(x => x.id === userId);
                if (u) setCurrentUser(u);
              }}
              onSaveSettings={setSettings}
              onResetData={handleResetData}
            />
          )}
        </main>

        {/* Mobil Alt Hızlı Erişim Çubuğu (Bottom Navigation Bar) */}
        <div className="lg:hidden fixed bottom-0 inset-x-0 bg-slate-900 border-t border-slate-800 z-40 px-2 py-1 flex items-center justify-around shadow-2xl safe-area-bottom">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition min-w-[54px] ${
              activeTab === 'dashboard' ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LayoutDashboard size={18} />
            <span className="text-[10px] mt-0.5">Özet</span>
          </button>
          
          <button
            onClick={() => setActiveTab('offers')}
            className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition min-w-[54px] relative ${
              activeTab === 'offers' ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText size={18} />
            <span className="text-[10px] mt-0.5">Teklif</span>
            {offers.filter(o => o.status === 'sent').length > 0 && (
              <span className="absolute top-1 right-3 w-2 h-2 rounded-full bg-amber-500" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('installations')}
            className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition min-w-[54px] relative ${
              activeTab === 'installations' ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Wrench size={18} />
            <span className="text-[10px] mt-0.5">Montaj</span>
            {installations.filter(i => i.status !== 'completed').length > 0 && (
              <span className="absolute top-1 right-3 w-2 h-2 rounded-full bg-emerald-500" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('service')}
            className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition min-w-[54px] relative ${
              activeTab === 'service' ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cpu size={18} />
            <span className="text-[10px] mt-0.5">Servis</span>
            {services.filter(s => s.status !== 'delivered').length > 0 && (
              <span className="absolute top-1 right-3 w-2 h-2 rounded-full bg-purple-500" />
            )}
          </button>

          <button
            onClick={() => setIsMobileNavOpen(true)}
            className="flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition min-w-[54px] text-slate-400 hover:text-white"
          >
            <Menu size={18} />
            <span className="text-[10px] mt-0.5">Tüm Menü</span>
          </button>
        </div>
      </div>
    </div>
  );
}
