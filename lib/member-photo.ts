export const MAX_MEMBER_PHOTO_BYTES = 200 * 1024;

export const MEMBER_PHOTO_ACCEPT = 'image/jpeg,image/png,image/webp';

const ALLOWED_PHOTO_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export function getDataUrlByteSize(dataUrl: string): number {
  const comma = dataUrl.indexOf(',');
  if (comma < 0) return dataUrl.length;
  const base64 = dataUrl.slice(comma + 1);
  const padding = (base64.match(/=+$/) || [''])[0].length;
  return Math.floor((base64.length * 3) / 4) - padding;
}

export function validateMemberPhotoDataUrl(dataUrl: string | null | undefined): string | null {
  if (!dataUrl) return null;
  if (!dataUrl.startsWith('data:image/jpeg') &&
      !dataUrl.startsWith('data:image/png') &&
      !dataUrl.startsWith('data:image/webp')) {
    return 'Photo must be JPG, PNG, or WebP';
  }
  if (getDataUrlByteSize(dataUrl) > MAX_MEMBER_PHOTO_BYTES) {
    return 'Photo must be 200KB or smaller';
  }
  return null;
}

export function validateMemberPhotoFile(file: File): string | null {
  if (!ALLOWED_PHOTO_TYPES.has(file.type)) {
    return 'Use JPG, PNG, or WebP';
  }
  if (file.size > MAX_MEMBER_PHOTO_BYTES) {
    return 'Photo must be 200KB or smaller';
  }
  return null;
}

export function readMemberPhotoFile(file: File): Promise<{ dataUrl: string } | { error: string }> {
  const fileError = validateMemberPhotoFile(file);
  if (fileError) return Promise.resolve({ error: fileError });

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result;
      if (typeof dataUrl !== 'string') {
        resolve({ error: 'Could not read photo' });
        return;
      }
      const dataError = validateMemberPhotoDataUrl(dataUrl);
      if (dataError) {
        resolve({ error: dataError });
        return;
      }
      resolve({ dataUrl });
    };
    reader.onerror = () => resolve({ error: 'Could not read photo' });
    reader.readAsDataURL(file);
  });
}

export function normalizeMemberPhotoUrl(photoUrl: string | null | undefined): string | null | undefined {
  if (photoUrl === undefined) return undefined;
  if (!photoUrl) return null;
  return photoUrl;
}
