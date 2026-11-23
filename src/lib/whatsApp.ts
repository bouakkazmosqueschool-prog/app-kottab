export function whatsAppNumber(input?: string): string | undefined {
  const compact = input?.trim()
    .replace(/[٠-٩۰-۹]/g, (digit) => String(digit.charCodeAt(0) % 16))
    .replace(/[\s().-]/g, '');
  if (!compact) return;
  if (/^0[567]\d{8}$/.test(compact)) return `212${compact.slice(1)}`;
  const international = compact.replace(/^(?:\+|00)/, '');
  if (international.startsWith('212')) return /^212[567]\d{8}$/.test(international) ? international : undefined;
  if (international !== compact && /^[1-9]\d{7,14}$/.test(international)) return international;
}

export function parentWhatsAppLink(number: string | undefined, publicUrl: string): string | undefined {
  const recipient = whatsAppNumber(number);
  if (!recipient || !publicUrl) return;
  const message = `السلام عليكم، يمكنكم متابعة تقدّم التلميذ عبر هذا الرابط: ${publicUrl}`;
  return `https://wa.me/${recipient}?text=${encodeURIComponent(message)}`;
}
