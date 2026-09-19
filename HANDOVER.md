# 3AS TEKNOLOJİ CRM / ERP - Production Handover Document

**Sistem:** 3AS TEKNOLOJİ Kurumsal CRM & ERP Sistemi  
**Hedef Alan Adı:** `https://panel.3asteknoloji.com`  
**Sürüm:** 1.0.0-PROD  
**Tarih:** 2026-09-19  
**Firma:** 3AS TEKNOLOJİ ve BİLİŞİM HİZMETLERİ  

---

## 1. Mimari Genel Bakış ve Teknoloji Yığını (Architecture & Tech Stack)

3AS TEKNOLOJİ CRM/ERP platformu; zayıf akım, güvenlik sistemleri, saha montaj ve bilişim servis süreçlerini yönetmek üzere tasarlanmış, yüksek performanslı ve tam bağımsız bir **Full-Stack** kurumsal web uygulamasıdır:

- **Frontend (Kullanıcı Arayüzü):** React 19, TypeScript, Tailwind CSS, Vite, Lucide Icons, Recharts, Motion.
- **Backend (API Katmanı):** Node.js 22 + Express 4.x REST API (`server.ts`).
- **Veritabanı (İlişkisel Veri Deposu):** PostgreSQL 14/16 (`server/db/schema.sql`).
- **Resilient Fallback Storage:** `DATABASE_URL` tanımlanmadığında veya sunucu erişilemediğinde sistem durmaz; `data_store/` dizini altında dosya bazlı güvenli veri deposu çalışır.
- **Güvenlik & Yetkilendirme (RBAC):** JWT (JSON Web Token), bcrypt hashleme, 5 seviyeli rol tabanlı yetki matrisi (`Super Admin`, `Admin`, `Sales`, `Technician`, `Service Specialist`).
- **İş Mantığı & Finansal Doğrulama:**
  - `financialValidator.ts`: Teklif ve faturalarda KDV, tevkifat, iskonto, ara toplam ve maliyet doğrulayıcı.
  - `sequenceService.ts`: `FOR UPDATE` transaction kilitleri ile thread-safe, çakışmasız belge numarası üretimi (`3AS-TEK-...`, `3AS-MON-...`, `3AS-FAT-...`, `3AS-SRV-...`).
  - `inventoryLedger.ts`: İdempotency korumalı çift çıkış önleyici stok hareket defteri ve eksi stok blokajı.
- **Dış Entegrasyon Adaptörleri:**
  - `whatsappAdapter.ts`: Meta WhatsApp Business Cloud API & Webhook adaptörü (Kimlik bilgisi girilmediğinde CRM kesintisiz çalışmaya devam eder).
  - `eInvoiceAdapter.ts`: GİB standartlarında e-Fatura / e-Arşiv XML ve entegratör adaptörü (Sağlayıcı bilgisi olmadan da faturalar ERP'de arşivlenir).

---

## 2. Dizin Yapısı

```
/
├── server.ts                   # Backend Express sunucu giriş noktası ve API yönlendirmeleri
├── server/
│   ├── db/
│   │   ├── db.ts               # PostgreSQL havuz bağlantısı ve resilient storage yöneticisi
│   │   ├── schema.sql          # 18 tablodan oluşan tam ilişkisel veritabanı şeması
│   │   ├── migrate.ts          # Veritabanı tablolarını oluşturan geçiş betiği
│   │   └── seed.ts             # Varsayılan roller, yetkiler ve yönetici tohumlama betiği
│   ├── middleware/
│   │   ├── auth.ts             # JWT doğrulama ve RBAC yetki kontrol ara yazılımları
│   │   └── audit.ts            # Değiştirilemez denetim izi (audit log) kayıt motoru
│   ├── routes/                 # Modüler REST API uç noktaları (auth, customer, offer, ...)
│   └── services/               # Finansal doğrulama, stok defteri, WhatsApp ve e-Fatura adaptörleri
├── src/                        # React 19 Frontend kaynak kodları
│   ├── modules/                # ERP modülleri (dashboard, crm, offers, inventory, ...)
│   ├── public-views/           # Müşteri onay portalları (PublicOfferApproval, PublicDelivery, ...)
│   ├── services/               # Frontend API istemcisi, PDF motoru, yerel depolama
│   └── types/                  # TypeScript arayüz ve veri modelleri
├── Dockerfile                  # Çok aşamalı (multi-stage) üretim Docker imaj tanımı
├── docker-compose.yml          # PostgreSQL 16 + Node.js 22 tek komutla orkestrasyon dosyası
├── nginx.conf                  # panel.3asteknoloji.com için SSL ve Reverse Proxy ayarları
├── .env.example                # Tüm ortam değişkenlerinin ayrıntılı şablonu
└── package.json                # Bağımlılıklar ve derleme betikleri
```

---

## 3. Kurulum ve Başlatma Talimatları (Installation Instructions)

Uygulama iki farklı yöntemle sunucunuza kurulabilir:

### Yöntem A: Docker Compose ile Otomatik Kurulum (Önerilen)

Docker kurulu olan herhangi bir Linux sunucuda (Ubuntu 22.04 / 24.04 LTS):

1. **Kodları sunucuya çekin:**
   ```bash
   git clone <repo-url> /var/www/3as-panel
   cd /var/www/3as-panel
   ```

2. **Ortam değişkenlerini hazırlayın:**
   ```bash
   cp .env.example .env
   nano .env
   ```
   *(DB_PASSWORD ve JWT_SECRET değerlerini güçlü rastgele metinlerle değiştirin).*

3. **Konteynerleri başlatın:**
   ```bash
   docker-compose up -d --build
   ```
   *Bu komut PostgreSQL 16 veritabanını başlatır, `schema.sql` dosyasındaki tabloları otomatik oluşturur, Node.js uygulamasını derler ve `http://127.0.0.1:3000` portunda ayağa kaldırır.*

4. **Konteyner durumunu kontrol edin:**
   ```bash
   docker-compose ps
   docker-compose logs -f app
   ```

---

### Yöntem B: Doğrudan VPS / Node.js & Yerel PostgreSQL Kurulumu

1. **Gereksinimler:** Node.js 22 LTS, npm 10+, PostgreSQL 14+
2. **Bağımlılıkları yükleyin:**
   ```bash
   npm ci
   ```
3. **PostgreSQL Veritabanını oluşturun:**
   ```bash
   sudo -u postgres psql
   ```
   ```sql
   CREATE USER as3_admin WITH ENCRYPTED PASSWORD 'CokGucluSifre2026!';
   CREATE DATABASE as3_crm_erp OWNER as3_admin;
   GRANT ALL PRIVILEGES ON DATABASE as3_crm_erp TO as3_admin;
   \q
   ```
4. **.env dosyasını ayarlayın:**
   ```bash
   cp .env.example .env
   # .env içerisine DATABASE_URL tanımlayın:
   # DATABASE_URL=postgresql://as3_admin:CokGucluSifre2026!@127.0.0.1:5432/as3_crm_erp
   ```
5. **Veritabanı Migrasyon ve Tohumlama:**
   ```bash
   npm run db:migrate
   npm run db:seed
   ```
6. **Üretim Derlemesi ve Başlatma (PM2 ile):**
   ```bash
   npm run build
   npm install -g pm2
   pm2 start dist/server.cjs --name "3as-erp"
   pm2 save
   pm2 startup
   ```

---

## 4. PostgreSQL DATABASE_URL Alma Rehberi

Eğer veritabanını sunucunuzda değil, bulut sağlayıcılarda (Neon, Supabase, AWS RDS vb.) barındırmak isterseniz:

### Neon Serverless PostgreSQL (Ücretsiz ve Hızlı Kurulum):
1. [neon.tech](https://neon.tech) adresine gidin ve ücretsiz hesap açın.
2. **Create Project** butonuna tıklayın, Proje Adı: `3as-crm-erp`, Bölge: `Frankfurt (eu-central-1)` seçin.
3. Dashboard üzerinde verilen **Connection Details** bölümünden bağlantı dizesini kopyalayın:
   ```
   postgresql://as3_owner:abcd1234efgh@ep-cool-fog-123456.eu-central-1.aws.neon.tech/as3_crm_erp?sslmode=require
   ```
4. Kopyaladığınız bu bağlantıyı `.env` dosyanızdaki `DATABASE_URL` karşısına yapıştırın ve `DATABASE_SSL=true` yapın.
5. `npm run db:migrate` ve `npm run db:seed` komutlarını çalıştırarak tabloları anında oluşturun.

---

## 5. Domain, Ters Vekil Sunucu ve SSL Kurulumu (`panel.3asteknoloji.com`)

1. **DNS A Kaydı:** Alan adı DNS yönetim panelinizden `panel.3asteknoloji.com` A kaydını sunucunuzun statik IP adresine yönlendirin.
2. **Nginx Kurulumu ve Yapılandırma:**
   ```bash
   sudo apt install -y nginx certbot python3-certbot-nginx
   sudo cp nginx.conf /etc/nginx/sites-available/panel.3asteknoloji.com
   sudo ln -s /etc/nginx/sites-available/panel.3asteknoloji.com /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   ```
3. **Ücretsiz Let's Encrypt SSL Sertifikası Alma:**
   ```bash
   sudo certbot --nginx -d panel.3asteknoloji.com
   ```
   *Certbot SSL sertifikasını otomatik kurar ve `https://panel.3asteknoloji.com` adresini güvenli hale getirir.*

---

## 6. Kimlik Doğrulama ve Rol Tabanlı Yetki Matrisi (RBAC)

Varsayılan tohumlama sonrası sistemde tanımlı roller:

| Rol | Kod | Yetki Kapsamı | Maliyet ve Kar Marjı |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `SUPER_ADMIN` | Sistem genelindeki tüm modüllere, şirket ayarlarına ve kullanıcılara sınırsız erişim | Görüntüleyebilir |
| **Sistem Yöneticisi** | `ADMIN` | CRM, Teklif, Saha Montaj, Fatura, Stok, Kullanıcı ve Raporlama yönetimi | Görüntüleyebilir |
| **Satış & Proje Masası** | `SALES` | Müşteri, Lead, Teklif ve Satış Faturası süreçleri | **Gizli (Göremez)** |
| **Saha & Montaj Şefi** | `TECHNICIAN` | Montaj iş emirleri, malzeme kontrolü, checklist ve iş teslimi | **Gizli (Göremez)** |
| **Teknik Servis Uzmanı**| `SERVICE` | Cihaz kabulü, arıza tespiti, onarım işlemleri, servis teslimi | **Gizli (Göremez)** |

### Varsayılan Yönetici Giriş Bilgileri:
- **E-Posta:** `admin@3asteknoloji.com`
- **Geçici Parola:** `3AS!Teknoloji2026`
- **Giriş URL:** `https://panel.3asteknoloji.com`  
*(İlk girişten sonra Kullanıcılar menüsünden parolayı değiştiriniz).*

---

## 7. Dosya Depolama ve Ekler (File Storage)

- **Konum:** `/app/uploads` (Docker birimi: `app_uploads`).
- **Desteklenen Dosyalar:** Saha montaj fotoğrafları, teknik servis kabul fotoğrafları, arıza görselleri, müşteri dijital imza verileri ve şirket logosu.
- **Erişim:** `/api/files/:filename` uç noktası üzerinden güvenli olarak sunulur.
- **Kapasite ve Güvenlik:** Multer ara yazılımı ile dosya tipleri doğrulanır, Nginx tarafında maksimum gövde boyutu `25MB` ile sınırlandırılmıştır.

---

## 8. Veritabanı Yedekleme ve Kurtarma (Backup & Restore)

### Otomatik Günlük Yedekleme (Cron Job):
Sunucuda `crontab -e` komutunu çalıştırın ve aşağıdaki satırı ekleyin:
```bash
0 3 * * * docker exec 3as_postgres pg_dump -U as3_admin as3_crm_erp | gzip > /var/backups/3as_erp_$(date +\%F).sql.gz
```

### Yedekten Geri Yükleme (Restore):
```bash
gunzip < /var/backups/3as_erp_2026-09-19.sql.gz | docker exec -i 3as_postgres psql -U as3_admin as3_crm_erp
```

---

## 9. Dış Entegrasyonlar ve Kalan Dış Yapılandırmalar (External Integrations)

Sistem; WhatsApp ve e-Fatura API kimlik bilgileriniz henüz olmasa bile **CRM/ERP fonksiyonlarının tamamını eksiksiz çalıştıracak şekilde** tasarlanmıştır:

1. **Meta WhatsApp Business Cloud API (İsteğe Bağlı):**
   - API anahtarınız olmadığında sistem uyarı vermez, mesajları simüle edilmiş gönderim günlüğü olarak veritabanına kaydeder.
   - Meta Business hesabınız açıldığında `.env` dosyasına `WHATSAPP_PHONE_NUMBER_ID` ve `WHATSAPP_ACCESS_TOKEN` eklemeniz yeterlidir; yeniden kod yazımı gerekmez.
2. **Türkiye e-Fatura / e-Arşiv Entegratörü (İsteğe Bağlı):**
   - Entegratörünüz (Uyumsoft, Paraşüt, EDM, Foriba vb.) ile anlaştığınızda `.env` içine `EINVOICE_API_KEY` ve `EINVOICE_API_SECRET` bilgilerinizi girip `EINVOICE_SANDBOX=false` yapmanız yeterlidir.

---

## 10. Bilinen Sınırlar (Known Limitations)

1. Canlı WhatsApp API ve e-Fatura GİB gönderimi, geçerli dış API anahtarları `.env` dosyasına girilene kadar sandbox/simülasyon modunda işlem kaydı tutar.
2. Teklif veya montaj onayında müşteriye SMS ile OTP gönderilmek istenirse Netgsm / İletiMerkezi gibi bir SMS sağlayıcı API bilgisi eklenmelidir (Şu an doğrudan WhatsApp ve Güvenli Web Token linki kullanılmaktadır).

---

## 11. Tam Kaynak Kodunu İndirme / Dışa Aktarma Adımları (Source Code Export)

Google AI Studio Build ortamından tüm kaynak kodları yerel bilgisayarınıza aktarmak için:

1. **Yöntem 1 (ZIP Olarak İndirme):**
   - Ekranın sağ üst köşesindeki **Ayarlar (Dişli)** veya **Menü** butonuna tıklayın.
   - **"Download as ZIP"** veya **"Export Project"** seçeneğini seçin.
   - Tüm proje dosyaları (.ts, .sql, Dockerfile, nginx.conf vb.) tek bir arşiv olarak iner.

2. **Yöntem 2 (GitHub Deposuna Gönderme):**
   - Sağ üst menüden **"Export to GitHub"** seçeneğine tıklayın.
   - Kendi GitHub hesabınızla yetkilendirip dilediğiniz bir depoya (`3as-crm-erp`) commit atın.
   - Sunucunuzda `git clone <depo_url>` komutuyla kodları çekin.
