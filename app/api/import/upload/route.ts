import { NextRequest } from 'next/server';
import {
  requireAptSession,
  requireMemberSession,
  handleApiError,
  jsonError,
  jsonOk,
} from '@/lib/api-helpers';

const MONTH_KEY_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const XLSX_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export async function POST(req: NextRequest) {
  try {
    await requireAptSession(req);
    await requireMemberSession(req);

    const form = await req.formData();
    const monthKey = String(form.get('monthKey') || '');
    const file = form.get('file');

    if (!monthKey || !MONTH_KEY_RE.test(monthKey)) {
      return jsonError('Invalid monthKey. Expected YYYY-MM.', 400);
    }
    if (!(file instanceof File)) {
      return jsonError('No file uploaded.', 400);
    }
    if (file.size === 0) return jsonError('File is empty.', 400);
    if (file.size > MAX_BYTES) {
      return jsonError('File is too large (max 10 MB).', 400);
    }

    const looksXlsx =
      file.type === XLSX_MIME || file.name.toLowerCase().endsWith('.xlsx');
    if (!looksXlsx) return jsonError('Only .xlsx files are supported.', 400);

    // Validate that the upload really is an XLSX (zip) container by checking
    // the magic bytes — cheap and avoids accepting renamed files.
    const head = new Uint8Array(await file.slice(0, 4).arrayBuffer());
    const isZip =
      head[0] === 0x50 && head[1] === 0x4b && head[2] === 0x03 && head[3] === 0x04;
    if (!isZip) {
      return jsonError('File does not look like a valid Excel workbook.', 400);
    }

    // NOTE: full parsing + database write will be wired in a follow-up commit.
    // For now we acknowledge receipt so the UI flow is end-to-end.
    return jsonOk({
      fileName: file.name,
      size: file.size,
      monthKey,
      receivedAt: new Date().toISOString(),
      status: 'received',
      preview: { sheets: ['Dashboard', 'Meals', 'Costs'] },
      message:
        'File received and validated. The importer will parse and write data into the database in the next step.',
    });
  } catch (err) {
    return handleApiError(err);
  }
}
