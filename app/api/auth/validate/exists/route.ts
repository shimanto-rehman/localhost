import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sanitizeText, sanitizeEmail } from '@/lib/sanitize';
import { jsonOk, jsonError, handleApiError } from '@/lib/api-helpers';

type Field = 'apartment' | 'phone' | 'email';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const field = body.field as Field;
    const rawValue = String(body.value || '').trim();

    if (!rawValue) {
      return jsonOk({ exists: false });
    }

    if (field === 'apartment') {
      const value = sanitizeText(rawValue, 80);
      if (value.length < 2) return jsonOk({ exists: false });

      const apartment = await prisma.apartment.findFirst({
        where: {
          OR: [
            { name: value },
            { registrationId: value },
          ],
        },
        select: { id: true },
      });
      return jsonOk({ exists: !!apartment });
    }

    if (field === 'phone') {
      const value = sanitizeText(rawValue, 20);
      if (value.length < 5) return jsonOk({ exists: false });

      const [aptPhone, memberPhone] = await Promise.all([
        prisma.apartment.findFirst({
          where: { registrantPhone: value },
          select: { id: true },
        }),
        prisma.member.findFirst({
          where: { phone: value },
          select: { id: true },
        }),
      ]);
      return jsonOk({ exists: !!(aptPhone || memberPhone) });
    }

    if (field === 'email') {
      const value = sanitizeEmail(rawValue);
      if (value.length < 5 || !value.includes('@')) return jsonOk({ exists: false });

      const [aptEmail, memberEmail] = await Promise.all([
        prisma.apartment.findFirst({
          where: { registrantEmail: { equals: value, mode: 'insensitive' } },
          select: { id: true },
        }),
        prisma.member.findFirst({
          where: { email: { equals: value, mode: 'insensitive' } },
          select: { id: true },
        }),
      ]);
      return jsonOk({ exists: !!(aptEmail || memberEmail) });
    }

    return jsonError('Invalid field', 400);
  } catch (err) {
    return handleApiError(err);
  }
}
