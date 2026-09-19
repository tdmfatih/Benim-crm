/**
 * 3AS TEKNOLOJİ CRM / ERP - Production API Client
 * Target: panel.3asteknoloji.com
 */

const API_BASE = '/api';

export class ApiService {
  private static token: string | null = localStorage.getItem('3as_auth_token');

  static setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('3as_auth_token', token);
    } else {
      localStorage.removeItem('3as_auth_token');
    }
  }

  static getToken(): string | null {
    if (!this.token) {
      this.token = localStorage.getItem('3as_auth_token');
    }
    return this.token;
  }

  private static async request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const res = await fetch(url, { ...options, headers });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${res.status}: ${res.statusText}`);
      }
      return await res.json();
    } catch (err: any) {
      console.warn(`[API] Error on ${endpoint}:`, err.message);
      throw err;
    }
  }

  // Health
  static async getHealth() {
    return this.request('/health');
  }

  // Auth
  static async login(email: string, password: string) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (data.token) {
      this.setToken(data.token);
    }
    return data;
  }

  static async getMe() {
    return this.request('/auth/me');
  }

  // Customers
  static async getCustomers() {
    return this.request('/customers');
  }

  static async createCustomer(data: any) {
    return this.request('/customers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static async updateCustomer(id: string, data: any) {
    return this.request(`/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Leads
  static async getLeads() {
    return this.request('/leads');
  }

  static async createLead(data: any) {
    return this.request('/leads', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static async convertLead(id: string) {
    return this.request(`/leads/${id}/convert`, { method: 'POST' });
  }

  // Offers
  static async getOffers() {
    return this.request('/offers');
  }

  static async createOffer(data: any) {
    return this.request('/offers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static async updateOffer(id: string, data: any) {
    return this.request(`/offers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Public Offer Approval
  static async getPublicOffer(token: string) {
    return this.request(`/offers/public/${token}`);
  }

  static async approvePublicOffer(token: string, approverName: string, notes?: string) {
    return this.request(`/offers/public/${token}/approve`, {
      method: 'POST',
      body: JSON.stringify({ approverName, notes }),
    });
  }

  static async rejectPublicOffer(token: string, reason: string) {
    return this.request(`/offers/public/${token}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  // Services
  static async getServices() {
    return this.request('/services');
  }

  static async createService(data: any) {
    return this.request('/services', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static async updateService(id: string, data: any) {
    return this.request(`/services/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Public Service Approval
  static async getPublicServiceApproval(token: string) {
    return this.request(`/services/public-approval/${token}`);
  }

  static async approvePublicService(token: string, approverName: string, notes?: string) {
    return this.request(`/services/public-approval/${token}/approve`, {
      method: 'POST',
      body: JSON.stringify({ approverName, notes }),
    });
  }

  static async rejectPublicService(token: string, notes?: string) {
    return this.request(`/services/public-approval/${token}/reject`, {
      method: 'POST',
      body: JSON.stringify({ notes }),
    });
  }

  // Installations
  static async getInstallations() {
    return this.request('/installations');
  }

  static async createInstallation(data: any) {
    return this.request('/installations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static async completeInstallation(id: string, payload: { materials: any[]; technicianNotes?: string; photos?: string[] }) {
    return this.request(`/installations/${id}/complete`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // Public Delivery Confirmation
  static async getPublicDelivery(token: string) {
    return this.request(`/installations/public-delivery/${token}`);
  }

  static async confirmPublicDelivery(token: string, payload: { signedBy: string; satisfactionScore?: number; notes?: string; signatureDataUrl?: string }) {
    return this.request(`/installations/public-delivery/${token}/approve`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // Inventory & Products
  static async getProducts() {
    return this.request('/inventory/products');
  }

  static async createProduct(data: any) {
    return this.request('/inventory/products', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static async getInventoryMovements() {
    return this.request('/inventory/movements');
  }

  static async recordInventoryMovement(data: any) {
    return this.request('/inventory/movements', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Invoices & Payments
  static async getInvoices() {
    return this.request('/invoices');
  }

  static async createInvoice(data: any) {
    return this.request('/invoices', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static async recordPayment(invoiceId: string, paymentData: any) {
    return this.request(`/invoices/${invoiceId}/payments`, {
      method: 'POST',
      body: JSON.stringify(paymentData),
    });
  }

  // WhatsApp
  static async sendWhatsApp(data: any) {
    return this.request('/whatsapp/send', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static async getWhatsAppLogs() {
    return this.request('/whatsapp/logs');
  }

  // Automations
  static async getAutomations() {
    return this.request('/automations');
  }

  static async saveAutomation(data: any) {
    return this.request('/automations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Settings & System
  static async getSettings() {
    return this.request('/settings');
  }

  static async saveSettings(data: any) {
    return this.request('/settings', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static async getRoles() {
    return this.request('/roles');
  }

  static async getUsers() {
    return this.request('/users');
  }

  static async saveUser(data: any) {
    return this.request('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static async getAuditLogs() {
    return this.request('/audit-logs');
  }

  // File Upload
  static async uploadFile(file: File): Promise<{ url: string; filename: string }> {
    const formData = new FormData();
    formData.append('file', file);

    const headers: Record<string, string> = {};
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      body: formData,
      headers,
    });

    if (!res.ok) {
      throw new Error('Dosya yüklenemedi.');
    }

    return await res.json();
  }
}
