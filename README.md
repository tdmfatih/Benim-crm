# 3AS TEKNOLOJİ - Kurumsal CRM, ERP & Teknik Servis Yönetim Sistemi

![Sürüm](https://img.shields.io/badge/Sürüm-1.0.0--PROD-blue)
![Hedef](https://img.shields.io/badge/Hedef-panel.3asteknoloji.com-success)
![Node](https://img.shields.io/badge/Node.js-22_LTS-green)
![Veritabanı](https://img.shields.io/badge/PostgreSQL-16-blue)
![Frontend](https://img.shields.io/badge/React-19-cyan)

3AS TEKNOLOJİ ve BİLİŞİM HİZMETLERİ için özel olarak geliştirilmiş; zayıf akım sistemleri, güvenlik kameraları, kurumsal ağ altyapısı, saha montaj iş emirleri, teknik servis takibi, teklif hazırlama ve cari hesap yönetimini tek merkezden yöneten kurumsal web platformudur.

---

## 🌟 Öne Çıkan Temel Özellikler

1. **Çok Modüllü Kurumsal ERP & CRM:**
   - Müşteri ve Cari Hesap Takibi (Borç/Alacak bakiyeleri, geçmiş işlem dökümü).
   - Potansiyel Müşteri (Lead) ve Satış Hattı (Kanban formatında aşama takibi).
   - Teklif ve Proje Yönetimi (Maliyet, kâr marjı analizi, versiyonlama ve anında PDF/PNG çıktısı).
   - Saha Montaj ve Kurulum Masası (Teknisyen atama, checklist, sarf malzeme çıkışı ve iş teslim onayı).
   - Teknik Servis Masası (Cihaz kabul, arıza teşhis, onarım operasyonları, parça/işçilik maliyeti).
   - İki Aşamalı Stok Defteri (İdempotent malzeme çıkışı, eksi stok blokajı).
   - Fatura & Tahsilat Yönetimi (Kısmi tahsilat, e-Fatura/e-Arşiv adaptörü).

2. **Güvenli Müşteri Onay Portalları:**
   - Müşteri WhatsApp üzerinden gelen güvenli bağlantı (`/offer/:token`, `/service-approval/:token`, `/delivery-confirm/:token`) ile şifresiz ama doğrulanmış portala erişir.
   - Teklifi veya servis maliyetini inceler, tek tıkla resmi onay verir veya red gerekçesi belirtir.
   - Onay anında IP ve zaman damgasıyla geriye dönük değiştirilemez denetim izine (audit log) kaydedilir.

3. **Üretim Düzeyinde Güvenlik & RBAC:**
   - 5 Seviyeli Rol Tabanlı Erişim Kontrolü (`Super Admin`, `Admin`, `Sales`, `Technician`, `Service`).
   - Satış, teknisyen ve servis personelleri için maliyet ve şirket kâr marjları otomatik olarak maskelenir.
   - JSON Web Token (JWT) ve bcrypt ile şifrelenmiş kimlik doğrulama.
   - Değiştirilemez Denetim Günlüğü (`audit_logs`) ile her işlem (kim, ne zaman, hangi IP) kayıt altındadır.

---

## 🏗️ Teknoloji Mimarisi

- **İstemci (Frontend):** React 19, TypeScript, Tailwind CSS, Vite, Lucide Icons, Recharts, Motion.
- **Sunucu (Backend API):** Node.js 22 LTS, Express 4.x REST API (`server.ts`).
- **Veritabanı:** PostgreSQL 16 (`server/db/schema.sql`) + Resilient Storage Fallback.
- **Dağıtım (Deployment):** Docker & Docker Compose, Nginx Reverse Proxy, Let's Encrypt SSL.

---

## 🚀 Hızlı Başlangıç ve Yerel Çalıştırma

### Gereksinimler
- Node.js 22+
- npm 10+
- (İsteğe Bağlı) PostgreSQL 14+ veya Docker

### Adımlar

1. **Bağımlılıkları Yükleyin:**
   ```bash
   npm install
   ```

2. **Ortam Değişkenlerini Oluşturun:**
   ```bash
   cp .env.example .env
   ```
   *(PostgreSQL kullanmak istiyorsanız `.env` içerisindeki `DATABASE_URL` satırını güncelleyin. Tanımlanmazsa sistem yerel depolama ile çalışır).*

3. **Geliştirme Sunucusunu Başlatın:**
   ```bash
   npm run dev
   ```
   Tarayıcınızda açın: `http://localhost:3000`

4. **Üretim Derlemesi Alın:**
   ```bash
   npm run build
   ```

---

## 📦 Kendi Sunucunuza Dağıtım (`panel.3asteknoloji.com`)

Projenin kendi sunucunuza (Ubuntu VPS/Dedicated) kurulumu, Nginx SSL ayarları, PostgreSQL kurulumu ve yedekleme stratejileri için lütfen kapsamlı devir belgesini inceleyin:

👉 **[HANDOVER.md](HANDOVER.md)**

---

## 🔑 Varsayılan Yönetici Giriş Bilgileri

İlk tohumlama sonrası geçerli olan hesap:
- **E-Posta:** `admin@3asteknoloji.com`
- **Geçici Parola:** `3AS!Teknoloji2026`
- **Rol:** Sistem Yöneticisi (Super Admin)

*Güvenlik uyarısı: İlk girişten sonra Kullanıcılar sekmesinden şifrenizi güncelleyiniz.*

---

## ⚙️ Dış Entegrasyon Durumu

| Entegrasyon | Durum | Açıklama |
| :--- | :--- | :--- |
| **Meta WhatsApp Business API** | İsteğe Bağlı & Hazır | Kimlik bilgileri olmadan CRM hatasız çalışır. Bilgiler `.env` dosyasına eklendiğinde canlı gönderim başlar. |
| **Türkiye e-Fatura / e-Arşiv** | İsteğe Bağlı & Hazır | Sağlayıcı bağımsız `eInvoiceAdapter.ts` yazılmıştır. Entegratör API anahtarları tanımlandığında doğrudan GİB akışı aktifleşir. |
| **PostgreSQL Veritabanı** | Hazır | `schema.sql`, `migrate.ts` ve `seed.ts` test edilmiştir. |

---

## 📄 Lisans ve Mülkiyet

Bu yazılım **3AS TEKNOLOJİ ve BİLİŞİM HİZMETLERİ** adına özel olarak geliştirilmiştir. Tüm hakları saklıdır.
