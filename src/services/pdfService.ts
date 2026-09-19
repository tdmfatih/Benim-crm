import { Offer, Installation, ServiceTicket, Invoice, CompanySettings } from '../types';
import { storage } from './storageService';

export class PDFService {
  private static formatCurrency(val: number): string {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(val);
  }

  private static formatDate(dateStr: string): string {
    try {
      return new Date(dateStr).toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' });
    } catch {
      return dateStr;
    }
  }

  /**
   * Yeni bir pencerede A4 baskı önizlemesi açar ve yazdırma diyaloğunu tetikler
   */
  private static openPrintWindow(title: string, bodyContent: string, settings: CompanySettings): void {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Lütfen tarayıcınızdan açılır pencerelere (pop-up) izin veriniz.');
      return;
    }

    const html = `
      <!DOCTYPE html>
      <html lang="tr">
      <head>
        <meta charset="UTF-8">
        <title>${title} - ${settings.companyName}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
          * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Plus Jakarta Sans', sans-serif; }
          body { background-color: #f8fafc; color: #1e293b; padding: 24px; }
          .sheet { background: white; width: 210mm; min-height: 297mm; margin: 0 auto; padding: 36px 40px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border-radius: 4px; position: relative; }
          .header-row { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 24px; border-bottom: 2px solid #2563eb; }
          .logo-title { font-size: 26px; font-weight: 800; color: #1e3a8a; letter-spacing: -0.5px; }
          .logo-sub { font-size: 10px; font-weight: 800; color: #475569; letter-spacing: 3px; margin-top: 2px; }
          .company-info { text-align: right; font-size: 11px; color: #64748b; line-height: 1.5; }
          .doc-badge { display: inline-block; background: #eff6ff; color: #1d4ed8; padding: 6px 14px; border-radius: 6px; font-weight: 700; font-size: 14px; margin-top: 16px; }
          .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin: 20px 0; }
          .meta-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 16px; font-size: 12px; }
          .meta-title { font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
          .meta-row { display: flex; justify-content: space-between; margin-bottom: 5px; }
          .meta-val { font-weight: 600; color: #0f172a; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 12px; }
          th { background: #f1f5f9; color: #334155; font-weight: 700; text-align: left; padding: 10px 12px; border-bottom: 1px solid #cbd5e1; }
          td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; color: #1e293b; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .totals-wrap { display: flex; justify-content: flex-end; margin-top: 16px; }
          .totals-table { width: 320px; font-size: 12px; }
          .totals-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f1f5f9; }
          .grand-total { font-size: 16px; font-weight: 800; color: #1e3a8a; border-top: 2px solid #cbd5e1; padding-top: 8px; margin-top: 4px; }
          .terms-block { margin-top: 24px; padding: 14px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; font-size: 11px; color: #92400e; line-height: 1.5; }
          .footer-sign { display: flex; justify-content: space-between; margin-top: 40px; padding-top: 20px; }
          .sign-box { width: 220px; text-align: center; border-top: 1px dashed #94a3b8; padding-top: 8px; font-size: 11px; color: #475569; }
          @media print {
            body { background: white; padding: 0; }
            .sheet { box-shadow: none; padding: 20px; width: 100%; }
            .no-print { display: none !important; }
          }
          .action-bar { max-width: 210mm; margin: 0 auto 16px auto; display: flex; justify-content: flex-end; gap: 10px; }
          .btn-print { background: #1d4ed8; color: white; border: none; padding: 10px 20px; font-size: 13px; font-weight: 600; border-radius: 6px; cursor: pointer; }
        </style>
      </head>
      <body>
        <div class="action-bar no-print">
          <button class="btn-print" onclick="window.print()">🖨️ Yazdır / PDF Olarak Kaydet</button>
        </div>
        <div class="sheet">
          <div class="header-row">
            <div style="display: flex; align-items: center; gap: 14px;">
              ${settings.logoUrl ? `
                <img src="${settings.logoUrl}" style="max-height: 52px; max-width: 190px; object-fit: contain; border-radius: 6px;" alt="Logo" />
              ` : `
                <div style="width: 48px; height: 48px; background-color: #2853a8; border-radius: 10px; display: flex; align-items: center; justify-content: center; padding: 7px;">
                  <svg viewBox="0 0 310 80" fill="none" xmlns="http://www.w3.org/2000/svg" style="width: 100%; height: auto;">
                    <path d="M 0 0 L 88 0 L 88 18 L 32 18 L 56 36 L 88 36 L 88 74 L 0 74 L 0 56 L 56 56 L 34 36 L 0 36 Z" fill="#FFFFFF" />
                    <path d="M 98 74 C 98 42 108 0 148 0 L 178 0 L 192 74 L 168 74 L 164 54 L 126 54 L 122 74 Z M 132 38 L 158 38 L 150 16 C 144 16 138 22 132 38 Z" fill="#FFFFFF" />
                    <path d="M 206 18 C 206 6 220 0 248 0 L 298 0 L 298 18 L 246 18 C 236 18 232 21 232 26 C 232 32 238 34 252 36 L 274 38 C 294 41 306 48 306 58 C 306 70 292 74 266 74 L 204 74 L 204 56 L 264 56 C 274 56 278 53 278 48 C 278 43 272 41 258 39 L 236 36 C 214 33 206 27 206 18 Z" fill="#FFFFFF" />
                  </svg>
                </div>
              `}
              <div>
                <div class="logo-title" style="color: #2853a8;">${settings.companyName}</div>
                <div class="logo-sub">${settings.slogan || 'GÜVENLİK • ZAYIF AKIM • BİLİŞİM'}</div>
              </div>
            </div>
            <div class="company-info">
              <div><strong>${settings.companyName}</strong></div>
              <div>${settings.address} - ${settings.district} / ${settings.city}</div>
              <div>Tel: ${settings.phone} | E-posta: ${settings.email}</div>
              <div>Vergi Dairesi: ${settings.taxOffice} - No: ${settings.taxNumber}</div>
              <div>Banka / IBAN: ${settings.bankName} - ${settings.iban}</div>
            </div>
          </div>
          ${bodyContent}
          <div class="footer-sign">
            <div class="sign-box">
              <strong>${settings.companyName}</strong><br>
              Kaşe / İmza
            </div>
            <div class="sign-box">
              <strong>Müşteri / Yetkili Onayı</strong><br>
              İsim / İmza / Kaşe
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  }

  /**
   * TEKLİF PDF / YAZDIRMA
   */
  static printOffer(offer: Offer): void {
    const settings = storage.getSettings();
    const bodyContent = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 16px;">
        <span class="doc-badge">KURUMSAL FİYAT TEKLİFİ</span>
        <span style="font-size: 12px; color: #64748b;">Tarih: <strong>${this.formatDate(offer.createdAt)}</strong></span>
      </div>

      <div class="grid-2">
        <div class="meta-box">
          <div class="meta-title">Müşteri / Cari Bilgileri</div>
          <div class="meta-row"><span>Cari Unvan:</span> <span class="meta-val">${offer.customerName}</span></div>
          <div class="meta-row"><span>Telefon:</span> <span class="meta-val">${offer.customerPhone}</span></div>
          <div class="meta-row"><span>E-posta:</span> <span class="meta-val">${offer.customerEmail || '-'}</span></div>
          <div class="meta-row"><span>Adres:</span> <span class="meta-val">${offer.customerAddress || '-'}</span></div>
        </div>
        <div class="meta-box">
          <div class="meta-title">Teklif Detayları</div>
          <div class="meta-row"><span>Teklif No:</span> <span class="meta-val" style="color: #1d4ed8;">${offer.offerNumber} (v${offer.currentVersion})</span></div>
          <div class="meta-row"><span>Hizmet Grubu:</span> <span class="meta-val">${offer.serviceCategory}</span></div>
          <div class="meta-row"><span>Geçerlilik:</span> <span class="meta-val">${this.formatDate(offer.validUntil)}</span></div>
          <div class="meta-row"><span>Durum:</span> <span class="meta-val">${offer.status.toUpperCase()}</span></div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th style="width: 25px;">#</th>
            <th style="width: 50px;" class="text-center">Görsel</th>
            <th>Ürün / Hizmet Açıklaması</th>
            <th class="text-center" style="width: 70px;">Miktar</th>
            <th class="text-right" style="width: 100px;">Birim Fiyat</th>
            <th class="text-center" style="width: 60px;">KDV</th>
            <th class="text-right" style="width: 110px;">Toplam Tutar</th>
          </tr>
        </thead>
        <tbody>
          ${offer.items.map((item, idx) => `
            <tr>
              <td>${idx + 1}</td>
              <td class="text-center">
                ${item.imageUrl ? `
                  <img src="${item.imageUrl}" style="width: 38px; height: 38px; object-fit: cover; border-radius: 6px; border: 1px solid #e2e8f0; display: inline-block;" alt="Ürün" />
                ` : `
                  <div style="width: 38px; height: 38px; background: #f1f5f9; border-radius: 6px; display: inline-flex; align-items: center; justify-content: center; font-size: 9px; color: #94a3b8; font-weight: bold;">
                    3AS
                  </div>
                `}
              </td>
              <td>
                <strong>${item.name}</strong>
                ${item.description ? `<br><span style="font-size: 10px; color: #64748b;">${item.description}</span>` : ''}
              </td>
              <td class="text-center">${item.quantity} ${item.unit}</td>
              <td class="text-right">${this.formatCurrency(item.unitPrice)}</td>
              <td class="text-center">%${item.vatRate}</td>
              <td class="text-right"><strong>${this.formatCurrency(item.total)}</strong></td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="totals-wrap">
        <div class="totals-table">
          <div class="totals-row"><span>Ara Toplam:</span> <strong>${this.formatCurrency(offer.subtotal)}</strong></div>
          ${offer.discountTotal > 0 ? `<div class="totals-row" style="color: #dc2626;"><span>İskonto Toplamı:</span> <strong>-${this.formatCurrency(offer.discountTotal)}</strong></div>` : ''}
          <div class="totals-row"><span>KDV Tutarı:</span> <strong>${this.formatCurrency(offer.taxTotal)}</strong></div>
          <div class="totals-row grand-total"><span>GENEL TOPLAM:</span> <span>${this.formatCurrency(offer.grandTotal)}</span></div>
        </div>
      </div>

      <div class="terms-block">
        <strong>Ödeme & Ticari Şartlar:</strong> ${offer.paymentTerms || settings.offerTermsDefault}<br>
        <strong>Garanti Şartları:</strong> ${offer.warrantyTerms || settings.serviceWarrantyTerms}
        ${offer.notes ? `<br><strong>Özel Notlar:</strong> ${offer.notes}` : ''}
      </div>
    `;

    this.openPrintWindow(`Teklif_${offer.offerNumber}`, bodyContent, settings);
  }

  /**
   * MONTAJ / TESLİM TUTANAĞI PDF
   */
  static printInstallationDelivery(inst: Installation): void {
    const settings = storage.getSettings();
    const bodyContent = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 16px;">
        <span class="doc-badge" style="background: #ecfdf5; color: #047857;">SAHA MONTAJ VE TESLİM TUTANAĞI</span>
        <span style="font-size: 12px; color: #64748b;">Tarih: <strong>${this.formatDate(inst.scheduledDate)}</strong></span>
      </div>

      <div class="grid-2">
        <div class="meta-box">
          <div class="meta-title">Müşteri & Saha Lokasyonu</div>
          <div class="meta-row"><span>Müşteri:</span> <span class="meta-val">${inst.customerName}</span></div>
          <div class="meta-row"><span>Telefon:</span> <span class="meta-val">${inst.customerPhone}</span></div>
          <div class="meta-row"><span>Adres:</span> <span class="meta-val">${inst.fullAddress}</span></div>
        </div>
        <div class="meta-box">
          <div class="meta-title">İş Emri Bilgileri</div>
          <div class="meta-row"><span>Montaj No:</span> <span class="meta-val" style="color: #047857;">${inst.installationNumber}</span></div>
          <div class="meta-row"><span>Proje:</span> <span class="meta-val">${inst.projectName}</span></div>
          <div class="meta-row"><span>Teknisyen:</span> <span class="meta-val">${inst.assignedTechnicians.map(t => t.fullName).join(', ')}</span></div>
        </div>
      </div>

      <div style="margin: 16px 0; font-size: 12px;">
        <div class="meta-title">Yapılan İş ve Kurulum Kapsamı</div>
        <p style="line-height: 1.6; color: #334155;">${inst.tasksDescription}</p>
      </div>

      <div class="meta-title" style="margin-top: 20px;">Montaj Checklist ve Kalite Kontrol</div>
      <table>
        <thead>
          <tr>
            <th>Kontrol Maddesi</th>
            <th class="text-center" style="width: 100px;">Durum</th>
            <th class="text-right" style="width: 140px;">Kontrol Zamanı</th>
          </tr>
        </thead>
        <tbody>
          ${inst.checklist.map(c => `
            <tr>
              <td>${c.text}</td>
              <td class="text-center"><strong>${c.isCompleted ? '✓ TAMAMLANDI' : 'BEKLEMEDE'}</strong></td>
              <td class="text-right">${c.completedAt ? this.formatDate(c.completedAt) : '-'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="meta-title" style="margin-top: 20px;">Kullanılan Malzeme ve Donanım Dökümü</div>
      <table>
        <thead>
          <tr>
            <th>Ürün Adı</th>
            <th>SKU</th>
            <th class="text-center" style="width: 90px;">Miktar</th>
          </tr>
        </thead>
        <tbody>
          ${inst.materials.map(m => `
            <tr>
              <td><strong>${m.productName}</strong></td>
              <td>${m.sku}</td>
              <td class="text-center">${m.usedQty} ${m.unit}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      ${inst.photos && inst.photos.length > 0 ? `
        <div style="margin-top: 16px;">
          <div class="meta-title">Saha Montaj ve Devreye Alma Fotoğrafları (${inst.photos.length} Adet)</div>
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 8px;">
            ${inst.photos.map(p => `
              <div style="border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden;">
                <img src="${p}" style="width: 100%; height: 110px; object-fit: cover;" alt="Montaj Fotoğrafı" />
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <div class="terms-block" style="background: #f8fafc; border-color: #cbd5e1; color: #334155;">
        Yukarıda belirtilen sistemler ve donanımlar eksiksiz monte edilmiş, testleri yapılmış ve çalışır vaziyette tarafıma teslim edilmiştir.
      </div>
    `;

    this.openPrintWindow(`Montaj_Teslim_${inst.installationNumber}`, bodyContent, settings);
  }

  /**
   * TEKNİK SERVİS FORMU / MAKBUZ
   */
  static printServiceTicket(ticket: ServiceTicket): void {
    const settings = storage.getSettings();

    const allServicePhotos = [
      ...(ticket.servicePhotos?.map(p => ({ url: p.url, caption: p.caption || (p.stage === 'intake' ? 'Cihaz Kabul' : p.stage === 'repair' ? 'Onarım Süreci' : 'Teslimat Kanıtı') })) || []),
      ...(ticket.photos?.map(url => ({ url, caption: 'Servis Fotoğrafı' })) || [])
    ];

    const photosBlock = allServicePhotos.length > 0 ? `
      <div style="margin-top: 18px;">
        <div class="meta-title">Fotoğraflı Arıza & Onarım Kanıtları (${allServicePhotos.length} Adet)</div>
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-top: 8px;">
          ${allServicePhotos.map(item => `
            <div style="border: 1px solid #cbd5e1; border-radius: 6px; overflow: hidden; background: #fff;">
              <img src="${item.url}" style="width: 100%; height: 90px; object-fit: cover;" alt="Servis Fotoğrafı" />
              <div style="padding: 3px 6px; font-size: 9px; color: #475569; background: #f8fafc; font-weight: bold; text-align: center; border-top: 1px solid #f1f5f9; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                ${item.caption}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    ` : '';

    const bodyContent = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 16px;">
        <div>
          <span class="doc-badge" style="background: #fdf4ff; color: #a21caf;">TEKNİK SERVİS VE ONARIM FORMU</span>
          <span style="font-size: 11px; margin-left: 8px; font-family: monospace; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-weight: bold;">
            BARKOD: ${ticket.ticketNumber}
          </span>
        </div>
        <span style="font-size: 12px; color: #64748b;">Tarih: <strong>${this.formatDate(ticket.createdAt)}</strong></span>
      </div>

      <div class="grid-2">
        <div class="meta-box">
          <div class="meta-title">Müşteri Bilgileri</div>
          <div class="meta-row"><span>Müşteri:</span> <span class="meta-val">${ticket.customerName}</span></div>
          <div class="meta-row"><span>İletişim:</span> <span class="meta-val">${ticket.customerPhone}</span></div>
          <div class="meta-row"><span>E-posta:</span> <span class="meta-val">${ticket.customerEmail || '-'}</span></div>
        </div>
        <div class="meta-box">
          <div class="meta-title">Cihaz Tanımı</div>
          <div class="meta-row"><span>Servis No:</span> <span class="meta-val" style="color: #a21caf; font-weight: bold;">${ticket.ticketNumber}</span></div>
          <div class="meta-row"><span>Cihaz / Model:</span> <span class="meta-val">${ticket.brand} ${ticket.model} (${ticket.deviceType})</span></div>
          <div class="meta-row"><span>Seri No:</span> <span class="meta-val font-mono">${ticket.serialNumber || '-'}</span></div>
          <div class="meta-row"><span>Aksesuarlar:</span> <span class="meta-val">${ticket.accessoriesDelivered.join(', ') || 'Yok'}</span></div>
        </div>
      </div>

      <div style="margin: 14px 0; font-size: 12px;">
        <div class="meta-title">Müşteri Şikayeti</div>
        <p style="background: #f8fafc; padding: 8px 12px; border-radius: 6px; border: 1px solid #f1f5f9;">${ticket.reportedIssue}</p>
        <div class="meta-title" style="margin-top: 12px;">Teknisyen Arıza Tespiti & Teşhis</div>
        <p style="background: #f8fafc; padding: 8px 12px; border-radius: 6px; border: 1px solid #f1f5f9;">${ticket.diagnosticNotes || 'İnceleme aşamasında'}</p>
      </div>

      <div class="meta-title" style="margin-top: 20px;">Uygulanan / Önerilen İşlemler & Parçalar</div>
      <table>
        <thead>
          <tr>
            <th>İşlem / Parça Tanımı</th>
            <th class="text-right" style="width: 100px;">Yedek Parça</th>
            <th class="text-right" style="width: 100px;">İşçilik</th>
            <th class="text-right" style="width: 110px;">Toplam Tutar</th>
          </tr>
        </thead>
        <tbody>
          ${ticket.operations.map(op => `
            <tr>
              <td><strong>${op.description}</strong></td>
              <td class="text-right">${this.formatCurrency(op.partsCost)}</td>
              <td class="text-right">${this.formatCurrency(op.laborCost)}</td>
              <td class="text-right"><strong>${this.formatCurrency(op.totalCost)}</strong></td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="totals-wrap">
        <div class="totals-table">
          <div class="totals-row"><span>Toplam Parça:</span> <strong>${this.formatCurrency(ticket.totalPartsCost)}</strong></div>
          <div class="totals-row"><span>Toplam İşçilik:</span> <strong>${this.formatCurrency(ticket.totalLaborCost)}</strong></div>
          <div class="totals-row"><span>Alınan Kapora:</span> <strong style="color: #047857;">-${this.formatCurrency(ticket.depositPaid)}</strong></div>
          <div class="totals-row grand-total"><span>KALAN ÖDENECEK:</span> <span>${this.formatCurrency(ticket.remainingBalance)}</span></div>
        </div>
      </div>

      ${photosBlock}

      <div class="terms-block">
        <strong>Garanti & Teslimat Hükümleri:</strong> ${settings.serviceWarrantyTerms}
      </div>
    `;

    this.openPrintWindow(`Servis_${ticket.ticketNumber}`, bodyContent, settings);
  }

  /**
   * TEKNİK SERVİS CİHAZ KABUL FİŞİ (GİRİŞ MAKBUZU)
   */
  static printServiceIntakeReceipt(ticket: ServiceTicket): void {
    const settings = storage.getSettings();

    const intakePhotos = ticket.servicePhotos?.filter(p => p.stage === 'intake') || [];

    const bodyContent = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 16px;">
        <div>
          <span class="doc-badge" style="background: #ecfeff; color: #0891b2;">CİHAZ SERVİS GİRİŞ & KABUL MAKBUZU</span>
          <span style="font-size: 11px; margin-left: 8px; font-family: monospace; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-weight: bold;">
            TAKİP KODU: ${ticket.ticketNumber}
          </span>
        </div>
        <span style="font-size: 12px; color: #64748b;">Kabul Tarihi: <strong>${this.formatDate(ticket.createdAt)}</strong></span>
      </div>

      <div class="grid-2">
        <div class="meta-box">
          <div class="meta-title">Müşteri Bilgileri</div>
          <div class="meta-row"><span>Müşteri:</span> <span class="meta-val">${ticket.customerName}</span></div>
          <div class="meta-row"><span>Telefon:</span> <span class="meta-val">${ticket.customerPhone}</span></div>
          <div class="meta-row"><span>E-posta:</span> <span class="meta-val">${ticket.customerEmail || '-'}</span></div>
        </div>
        <div class="meta-box">
          <div class="meta-title">Teslim Alınan Cihaz Bilgisi</div>
          <div class="meta-row"><span>Kayıt No:</span> <span class="meta-val font-bold" style="color: #0891b2;">${ticket.ticketNumber}</span></div>
          <div class="meta-row"><span>Cihaz / Model:</span> <span class="meta-val">${ticket.brand} ${ticket.model} (${ticket.deviceType})</span></div>
          <div class="meta-row"><span>Seri No:</span> <span class="meta-val font-mono">${ticket.serialNumber || 'Belirtilmedi'}</span></div>
          <div class="meta-row"><span>Fiziksel Durum:</span> <span class="meta-val">${ticket.physicalCondition || 'Normal'}</span></div>
          <div class="meta-row"><span>Beraberinde Alınan:</span> <span class="meta-val">${ticket.accessoriesDelivered.join(', ') || 'Yok (Yalnızca Cihaz)'}</span></div>
        </div>
      </div>

      <div style="margin: 14px 0; font-size: 12px;">
        <div class="meta-title">Müşteri Şikayeti / Arıza Bildirimi</div>
        <p style="background: #f8fafc; padding: 10px 12px; border-radius: 6px; border: 1px solid #e2e8f0; font-size: 12px; line-height: 1.5;">
          ${ticket.reportedIssue}
        </p>
      </div>

      ${intakePhotos.length > 0 ? `
        <div style="margin-top: 14px;">
          <div class="meta-title">Kabul Anında Çekilen Cihaz Durum Fotoğrafları</div>
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-top: 6px;">
            ${intakePhotos.map(p => `
              <div style="border: 1px solid #cbd5e1; border-radius: 6px; overflow: hidden;">
                <img src="${p.url}" style="width: 100%; height: 85px; object-fit: cover;" alt="Kabul Fotoğrafı" />
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <div class="meta-box" style="margin-top: 16px; background: #fffbeb; border-color: #fde68a;">
        <div class="meta-title" style="color: #b45309;">Mali Durum & Kapora</div>
        <div style="display: flex; justify-content: space-between; font-size: 12px; margin-top: 4px;">
          <span>Alınan Kapora / Ön Ödeme:</span>
          <strong style="color: #047857;">${this.formatCurrency(ticket.depositPaid)}</strong>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 12px; margin-top: 2px;">
          <span>Tahmini Maliyet:</span>
          <strong>${ticket.totalCost > 0 ? this.formatCurrency(ticket.totalCost) : 'Teşhis sonrasında bildirilecektir.'}</strong>
        </div>
      </div>

      <div class="terms-block" style="font-size: 9.5px; line-height: 1.4; margin-top: 14px;">
        <strong>Cihaz Kabul Şartları:</strong><br>
        1. Cihazınız servisimize arıza tespiti amacıyla kabul edilmiştir. Tespit sonrasında onayınız alınmadan herhangi bir ücretli onarım veya parça değişimi yapılmaz.<br>
        2. Arızası giderilen cihazların 90 gün içinde teslim alınması gerekmektedir. Teslim alınmayan cihazlardan firmamız sorumlu değildir.<br>
        3. Cihaz içerisindeki verilerin yedeğinin alınması müşteri sorumluluğundadır. Donanım veya yazılım testleri sırasında veri kayıplarından servisimiz sorumlu tutulamaz.
      </div>
    `;

    this.openPrintWindow(`ServisKabul_${ticket.ticketNumber}`, bodyContent, settings);
  }

  /**
   * FATURA YAZDIRMA
   */
  static printInvoice(invoice: Invoice): void {
    const settings = storage.getSettings();
    const bodyContent = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 16px;">
        <span class="doc-badge" style="background: #eff6ff; color: #1e3a8a;">SATIŞ VE HİZMET FATURASI</span>
        <span style="font-size: 12px; color: #64748b;">Düzenlenme Tarihi: <strong>${this.formatDate(invoice.issueDate)}</strong></span>
      </div>

      <div class="grid-2">
        <div class="meta-box">
          <div class="meta-title">Sayın (Müşteri)</div>
          <div class="meta-row"><span>Ticari Unvan:</span> <span class="meta-val">${invoice.customerName}</span></div>
          <div class="meta-row"><span>Vergi Dairesi / No:</span> <span class="meta-val">${invoice.customerTaxOffice || '-'} / ${invoice.customerTaxNumber || '-'}</span></div>
          <div class="meta-row"><span>Adres:</span> <span class="meta-val">${invoice.customerAddress || '-'}</span></div>
        </div>
        <div class="meta-box">
          <div class="meta-title">Fatura Detayları</div>
          <div class="meta-row"><span>Fatura No:</span> <span class="meta-val" style="color: #1e3a8a;">${invoice.invoiceNumber}</span></div>
          <div class="meta-row"><span>Vade Tarihi:</span> <span class="meta-val">${this.formatDate(invoice.dueDate)}</span></div>
          <div class="meta-row"><span>Ödeme Durumu:</span> <span class="meta-val">${invoice.status.toUpperCase()}</span></div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Hizmet / Mal Kalemi</th>
            <th class="text-center" style="width: 70px;">Miktar</th>
            <th class="text-right" style="width: 100px;">Birim Fiyat</th>
            <th class="text-center" style="width: 70px;">KDV</th>
            <th class="text-right" style="width: 110px;">Toplam</th>
          </tr>
        </thead>
        <tbody>
          ${invoice.items.map(item => `
            <tr>
              <td><strong>${item.description}</strong></td>
              <td class="text-center">${item.quantity}</td>
              <td class="text-right">${this.formatCurrency(item.unitPrice)}</td>
              <td class="text-center">%${item.vatRate}</td>
              <td class="text-right"><strong>${this.formatCurrency(item.total)}</strong></td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="totals-wrap">
        <div class="totals-table">
          <div class="totals-row"><span>Ara Toplam:</span> <strong>${this.formatCurrency(invoice.subtotal)}</strong></div>
          <div class="totals-row"><span>KDV (%20):</span> <strong>${this.formatCurrency(invoice.taxTotal)}</strong></div>
          <div class="totals-row grand-total"><span>GENEL TOPLAM:</span> <span>${this.formatCurrency(invoice.grandTotal)}</span></div>
          <div class="totals-row" style="color: #047857; margin-top: 6px;"><span>Tahsil Edilen:</span> <strong>${this.formatCurrency(invoice.paidAmount)}</strong></div>
          <div class="totals-row" style="color: #dc2626;"><span>Kalan Bakiye:</span> <strong>${this.formatCurrency(invoice.remainingAmount)}</strong></div>
        </div>
      </div>

      ${invoice.payments.length > 0 ? `
        <div class="meta-title" style="margin-top: 20px;">Tahsilat Hareketleri</div>
        <table>
          <thead>
            <tr>
              <th>Tahsilat Aşaması</th>
              <th>Ödeme Yöntemi</th>
              <th>Tarih</th>
              <th class="text-right">Tahsil Edilen Tutar</th>
            </tr>
          </thead>
          <tbody>
            ${invoice.payments.map(p => `
              <tr>
                <td><strong>${p.stageLabel || 'Tahsilat'}</strong></td>
                <td>${p.paymentMethod}</td>
                <td>${this.formatDate(p.paymentDate)}</td>
                <td class="text-right"><strong>${this.formatCurrency(p.amount)}</strong></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      ` : ''}
    `;

    this.openPrintWindow(`Fatura_${invoice.invoiceNumber}`, bodyContent, settings);
  }
}
