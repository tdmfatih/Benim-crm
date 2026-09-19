import pg from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

async function runSeed() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.warn('⚠️ DATABASE_URL not found. Run seed with DATABASE_URL set.');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString,
    ssl: process.env.DATABASE_SSL === 'true' || connectionString.includes('sslmode=require')
      ? { rejectUnauthorized: false }
      : undefined,
  });

  try {
    const client = await pool.connect();
    console.log('🔄 Connected to database. Seeding production base data...');

    await client.query('BEGIN');

    // 1. Roles
    const roles = [
      {
        id: 'role-super-admin',
        name: 'Super Admin (Kurucu / Tam Yetkili)',
        slug: 'super-admin',
        code: 'SUPER_ADMIN',
        description: 'Sistem üzerindeki tüm modüllere ve şirket ayarlarına sınırsız erişim.',
        is_system: true,
        can_view_cost: true,
        permissions: JSON.stringify([
          'crm.view', 'crm.edit', 'crm.delete',
          'customers.view', 'customers.edit', 'customers.delete',
          'offers.view', 'offers.create', 'offers.edit', 'offers.delete', 'offers.view_cost',
          'projects.view', 'projects.edit',
          'installation.view', 'installation.edit', 'installation.complete',
          'service.view', 'service.edit', 'service.approve_override',
          'inventory.view', 'inventory.edit', 'inventory.adjust',
          'invoice.view', 'invoice.create', 'payments.manage',
          'reports.view', 'automations.manage', 'settings.manage', 'users.manage', 'audit.view'
        ])
      },
      {
        id: 'role-admin',
        name: 'Sistem Yöneticisi',
        slug: 'admin',
        code: 'ADMIN',
        description: 'Tüm operasyonel süreçleri yönetir, maliyet ve raporları görür.',
        is_system: true,
        can_view_cost: true,
        permissions: JSON.stringify([
          'crm.view', 'crm.edit', 'customers.view', 'customers.edit',
          'offers.view', 'offers.create', 'offers.edit', 'offers.view_cost',
          'projects.view', 'projects.edit', 'installation.view', 'installation.edit',
          'installation.complete', 'service.view', 'service.edit', 'service.approve_override',
          'inventory.view', 'inventory.edit', 'inventory.adjust',
          'invoice.view', 'invoice.create', 'payments.manage',
          'reports.view', 'automations.manage', 'settings.manage', 'users.manage', 'audit.view'
        ])
      },
      {
        id: 'role-sales',
        name: 'Satış & Proje Masası',
        slug: 'sales',
        code: 'SALES',
        description: 'Müşteri, lead ve teklif süreçlerini yönetir. Kar marjı ve maliyetleri göremez.',
        is_system: true,
        can_view_cost: false,
        permissions: JSON.stringify([
          'crm.view', 'crm.edit', 'customers.view', 'customers.edit',
          'offers.view', 'offers.create', 'offers.edit',
          'projects.view', 'inventory.view', 'invoice.view', 'reports.view'
        ])
      },
      {
        id: 'role-technician',
        name: 'Saha & Montaj Şefi',
        slug: 'technician',
        code: 'TECHNICIAN',
        description: 'Saha montaj planlarını, malzeme çıkışlarını ve iş teslimlerini yönetir.',
        is_system: true,
        can_view_cost: false,
        permissions: JSON.stringify([
          'installation.view', 'installation.edit', 'installation.complete',
          'inventory.view', 'customers.view'
        ])
      },
      {
        id: 'role-service',
        name: 'Teknik Servis Uzmanı',
        slug: 'service',
        code: 'SERVICE',
        description: 'Arıza tespiti, müşteri onayı, tamir ve cihaz teslimat süreçlerini yönetir.',
        is_system: true,
        can_view_cost: false,
        permissions: JSON.stringify([
          'service.view', 'service.edit', 'inventory.view', 'customers.view'
        ])
      },
      {
        id: 'role-accounting',
        name: 'Muhasebe & Finans',
        slug: 'accounting',
        code: 'ACCOUNTING',
        description: 'Faturalar, tahsilatlar, cari hesap bakiyeleri ve mali raporlar.',
        is_system: true,
        can_view_cost: true,
        permissions: JSON.stringify([
          'customers.view', 'customers.edit', 'offers.view',
          'invoice.view', 'invoice.create', 'payments.manage', 'reports.view'
        ])
      }
    ];

    for (const r of roles) {
      await client.query(`
        INSERT INTO roles (id, name, slug, code, description, is_system, can_view_cost, permissions)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          permissions = EXCLUDED.permissions,
          can_view_cost = EXCLUDED.can_view_cost
      `, [r.id, r.name, r.slug, r.code, r.description, r.is_system, r.can_view_cost, r.permissions]);
    }
    console.log('✅ RBAC Roles seeded.');

    // 2. Super Admin User
    const adminEmail = process.env.SUPERADMIN_EMAIL || 'bilgi@3asteknoloji.com';
    const adminPassword = process.env.SUPERADMIN_PASSWORD || '3AS!Teknoloji2026';
    const adminName = process.env.SUPERADMIN_NAME || 'Fatih Demir (Kurucu)';
    const adminPhone = process.env.SUPERADMIN_PHONE || '+905050375959';

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(adminPassword, salt);

    await client.query(`
      INSERT INTO users (id, full_name, email, password_hash, phone, role_id, role_title, department, is_active, can_view_cost)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, true)
      ON CONFLICT (email) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        role_id = EXCLUDED.role_id,
        role_title = EXCLUDED.role_title
    `, ['usr-admin-1', adminName, adminEmail, passwordHash, adminPhone, 'role-super-admin', 'Super Admin (Kurucu)', 'Yönetim']);

    console.log(`✅ Super Admin created (${adminEmail}). Password configured securely.`);

    // 3. Service Categories
    const categories = [
      { id: 'cat-cctv', name: 'Kamera ve Güvenlik Sistemleri', slug: 'kamera-guvenlik', description: 'IP ve AHD kamera, NVR kayıt cihazı, yapay zeka analiz sistemleri', icon: 'Camera' },
      { id: 'cat-alarm', name: 'Hırsız & Yangın Alarm Sistemleri', slug: 'alarm-sistemleri', description: 'Kablosuz/kablolu alarm panelleri, duman ve gaz dedektörleri', icon: 'Bell' },
      { id: 'cat-network', name: 'Ağ & Fiber Optik Altyapı', slug: 'ag-altyapi', description: 'Cat6/Cat7 kablolama, rack kabin, fiber sonlandırma, switch ve router kurulumu', icon: 'Network' },
      { id: 'cat-access', name: 'Geçiş Kontrol & Turnike Sistemleri', slug: 'gecis-kontrol', description: 'Yüz tanıma, parmak izi, kartlı geçiş ve kollu bariyer sistemleri', icon: 'Key' },
      { id: 'cat-audio', name: 'Seslendirme & Acil Anons', slug: 'seslendirme-anons', description: 'Bölgesel tavan hoparlörleri, anons mikrofonu ve yangın entegrasyonu', icon: 'Volume2' },
      { id: 'cat-service', name: 'Teknik Servis & Cihaz Onarımı', slug: 'teknik-servis', description: 'Güvenlik cihazları, kayıt cihazları, anakart ve adaptör onarımları', icon: 'Wrench' }
    ];

    for (let i = 0; i < categories.length; i++) {
      const c = categories[i];
      await client.query(`
        INSERT INTO service_categories (id, name, slug, description, icon_name, is_active, order_index)
        VALUES ($1, $2, $3, $4, $5, true, $6)
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description
      `, [c.id, c.name, c.slug, c.description, c.icon, i]);
    }
    console.log('✅ Service Categories seeded.');

    // 4. Communication Templates
    const templates = [
      {
        id: 'tmpl-offer-new',
        code: 'OFFER_NEW',
        title: 'Yeni Teklif Bildirimi',
        content: `Sayın *{{customer_name}}*,\n\n3AS TEKNOLOJİ olarak talep ettiğiniz *{{offer_number}}* numaralı fiyat teklifiniz hazırlanmıştır.\n\nToplam Tutar: *{{grand_total}}*\n\nTeklifi PDF olarak incelemek ve onaylamak için aşağıdaki bağlantıya tıklayabilirsiniz:\n{{approval_url}}\n\nSaygılarımızla,\n3AS TEKNOLOJİ\n0505 037 59 59`,
        variables: JSON.stringify(['customer_name', 'offer_number', 'grand_total', 'approval_url'])
      },
      {
        id: 'tmpl-srv-approval',
        code: 'SERVICE_APPROVAL',
        title: 'Teknik Servis Onay Talebi',
        content: `Sayın *{{customer_name}}*,\n\n*{{ticket_number}}* kayıt numaralı *{{device_model}}* cihazınızın arıza tespiti tamamlanmıştır.\n\nOnarım Maliyeti: *{{total_cost}}*\n\nİşlemlerin başlatılması için lütfen onay veriniz:\n{{approval_url}}\n\n3AS Teknik Servis`,
        variables: JSON.stringify(['customer_name', 'ticket_number', 'device_model', 'total_cost', 'approval_url'])
      },
      {
        id: 'tmpl-srv-ready',
        code: 'SERVICE_READY',
        title: 'Cihaz Teslime Hazır',
        content: `Sayın *{{customer_name}}*,\n\n*{{ticket_number}}* numaralı *{{device_model}}* cihazınızın testleri tamamlanmış ve teslime hazır hale getirilmiştir.\n\nServisimizden teslim alabilirsiniz.\n3AS TEKNOLOJİ`,
        variables: JSON.stringify(['customer_name', 'ticket_number', 'device_model'])
      },
      {
        id: 'tmpl-mnt-scheduled',
        code: 'INSTALLATION_SCHEDULED',
        title: 'Montaj Randevu Bildirimi',
        content: `Sayın *{{customer_name}}*,\n\n*{{project_name}}* projenizin saha montajı *{{date}}* günü saat *{{time}}* olarak planlanmıştır. Ekiplerimiz adreste olacaktır.\n\n3AS TEKNOLOJİ`,
        variables: JSON.stringify(['customer_name', 'project_name', 'date', 'time'])
      }
    ];

    for (const t of templates) {
      await client.query(`
        INSERT INTO communication_templates (id, code, title, content, variables)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (code) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content
      `, [t.id, t.code, t.title, t.content, t.variables]);
    }
    console.log('✅ Communication Templates seeded.');

    await client.query('COMMIT');
    console.log('🎉 Database seeding completed successfully.');
    client.release();
  } catch (err) {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runSeed();
