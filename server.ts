import express from 'express';
import cors from 'cors';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { initDatabase, isDatabaseConnected } from './server/db/db';

// Route imports
import authRoutes from './server/routes/authRoutes';
import customerRoutes from './server/routes/customerRoutes';
import leadRoutes from './server/routes/leadRoutes';
import offerRoutes from './server/routes/offerRoutes';
import serviceRoutes from './server/routes/serviceRoutes';
import installationRoutes from './server/routes/installationRoutes';
import inventoryRoutes from './server/routes/inventoryRoutes';
import invoiceRoutes from './server/routes/invoiceRoutes';
import whatsappRoutes from './server/routes/whatsappRoutes';
import automationRoutes from './server/routes/automationRoutes';
import settingsRoutes from './server/routes/settingsRoutes';
import auditRoutes from './server/routes/auditRoutes';
import fileRoutes from './server/routes/fileRoutes';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Initialize Database adapter & auto-migration verification
  initDatabase();

  // Basic Middlewares
  app.use(cors({
    origin: true,
    credentials: true,
  }));
  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ extended: true, limit: '15mb' }));

  // Request logger in dev
  if (process.env.NODE_ENV !== 'production') {
    app.use((req, res, next) => {
      if (req.path.startsWith('/api')) {
        console.log(`[API] ${req.method} ${req.path}`);
      }
      next();
    });
  }

  // Health Check Endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: '3AS Teknoloji CRM & ERP Backend',
      version: '1.0.0-production',
      database: isDatabaseConnected() ? 'postgresql_connected' : 'local_storage_mode',
      targetDomain: 'panel.3asteknoloji.com',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  // Mount API Endpoints
  app.use('/api/auth', authRoutes);
  app.use('/api/customers', customerRoutes);
  app.use('/api/leads', leadRoutes);
  app.use('/api/offers', offerRoutes);
  app.use('/api/services', serviceRoutes);
  app.use('/api/installations', installationRoutes);
  app.use('/api/inventory', inventoryRoutes);
  app.use('/api/invoices', invoiceRoutes);
  app.use('/api/whatsapp', whatsappRoutes);
  app.use('/api/automations', automationRoutes);
  app.use('/api', settingsRoutes);
  app.use('/api/audit-logs', auditRoutes);
  app.use('/api', fileRoutes);

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 3AS CRM/ERP Production Server running on port ${PORT}`);
    console.log(`📍 Target Production Host: https://panel.3asteknoloji.com`);
    console.log(`🔗 API Base: http://localhost:${PORT}/api`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
