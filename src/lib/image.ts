/**
 * يقرأ ملف صورة ويُعيد صورة مصغَّرة (data URL بصيغة JPEG) بأقصى بُعد maxSize.
 * التصغير يجري في المتصفح لإبقاء الحجم المخزَّن في قاعدة البيانات صغيراً.
 */
export function fileToThumbnail(file: File, maxSize = 200, quality = 0.72): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('canvas غير مدعوم'));
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('تعذّرت قراءة الصورة'));
    };
    img.src = url;
  });
}
