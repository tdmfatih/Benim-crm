export function formatCurrency(amount: number | undefined | null, currency = '₺'): string {
  if (amount === undefined || amount === null || isNaN(amount)) return `0,00 ${currency}`;
  return new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount) + ` ${currency}`;
}

export function formatDate(dateString: string | undefined): string {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return new Intl.DateTimeFormat('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(d);
  } catch {
    return dateString;
  }
}

export function formatDateTime(dateString: string | undefined): string {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return new Intl.DateTimeFormat('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return dateString;
  }
}

/**
 * WhatsApp için telefon numarasını uluslararası formata normalize eder (Örn: 905XXXXXXXXX)
 */
export function cleanPhoneNumberForWhatsApp(phone: string): string {
  if (!phone) return '';
  // Rakam haricindeki her şeyi temizle
  let clean = phone.replace(/\D/g, '');
  
  // Eğer başında 0 ile 11 hane ise (05321234567) -> başındaki 0'ı kaldırıp 90 ekle
  if (clean.startsWith('0') && clean.length === 11) {
    clean = '90' + clean.substring(1);
  } else if (clean.length === 10 && clean.startsWith('5')) {
    // 5321234567 -> 905321234567
    clean = '90' + clean;
  }
  
  return clean;
}

/**
 * WhatsApp doğrudan sohbet bağlantısı üretir
 */
export function createWhatsAppLink(phone: string, message: string): string {
  const cleanPhone = cleanPhoneNumberForWhatsApp(phone);
  const encodedText = encodeURIComponent(message);
  if (!cleanPhone) {
    return `https://wa.me/?text=${encodedText}`;
  }
  return `https://wa.me/${cleanPhone}?text=${encodedText}`;
}

/**
 * Şablon değişkenlerini doldurur
 */
export function renderTemplate(template: string, variables: Record<string, string | number>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{${key}}|\\[${key}\\]`, 'gi');
    result = result.replace(regex, String(value ?? ''));
  }
  return result;
}
