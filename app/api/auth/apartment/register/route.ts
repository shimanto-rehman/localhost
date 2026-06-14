import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { encrypt } from '@/lib/encryption';
import { hashPassword, defaultPasswordHash } from '@/lib/password';
import { createAptToken, createMemberToken, setAptCookie, setMemberCookie } from '@/lib/auth';
import { apartmentRegisterSchema, zodFieldErrors } from '@/lib/validation';
import { generateRegistrationId } from '@/lib/utils';
import { seedApartmentDefaults } from '@/lib/apartment-data';
import { jsonOk, jsonError, handleApiError } from '@/lib/api-helpers';
import { sendRegistrationWelcomeEmail } from '@/lib/email';
import { DEFAULT_PASSWORD } from '@/lib/constants';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = apartmentRegisterSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError('Validation failed', 400, zodFieldErrors(parsed.error));
    }
    const d = parsed.data;

    const fieldErrors: Record<string, string> = {};

    const existingName = await prisma.apartment.findUnique({ where: { name: d.apt_name } });
    if (existingName) {
      fieldErrors.apt_name = 'This apartment name is already taken';
    }

    const existingEmail = await prisma.apartment.findFirst({
      where: { registrantEmail: { equals: d.registrant_email, mode: 'insensitive' } },
    });
    if (existingEmail) {
      fieldErrors.registrant_email = 'This email is already registered';
    }

    const existingMemberEmail = await prisma.member.findFirst({
      where: { email: { equals: d.registrant_email, mode: 'insensitive' } },
    });
    if (existingMemberEmail) {
      fieldErrors.registrant_email = 'This email is already registered';
    }

    const existingPhone = await prisma.apartment.findFirst({
      where: { registrantPhone: d.registrant_phone },
    });
    if (existingPhone) {
      fieldErrors.registrant_phone = 'This phone number is already registered';
    }

    const existingMemberPhone = await prisma.member.findFirst({
      where: { phone: d.registrant_phone },
    });
    if (existingMemberPhone) {
      fieldErrors.registrant_phone = 'This phone number is already registered';
    }

    if (Object.keys(fieldErrors).length > 0) {
      return jsonError('Validation failed', 400, fieldErrors);
    }

    const registrationId = generateRegistrationId();
    const aptPasswordHash = await hashPassword(d.apt_password);
    const memberPasswordHash = await defaultPasswordHash();

    const result = await prisma.$transaction(async (tx) => {
      const apartment = await tx.apartment.create({
        data: {
          registrationId,
          name: d.apt_name,
          passwordHash: aptPasswordHash,
          addressRoad: d.address_road,
          addressPostal: d.address_postal,
          addressCity: d.address_city,
          addressCountry: d.address_country,
          aptFloor: d.apt_floor || null,
          aptType: d.apt_type,
          moveInDate: d.move_in_date ? new Date(d.move_in_date) : null,
          memberCountHint: d.member_count_hint,
          registrantName: d.registrant_name,
          registrantNid: d.registrant_nid ? encrypt(d.registrant_nid) : '',
          registrantPhone: d.registrant_phone,
          registrantEmail: d.registrant_email,
        },
      });

      const member = await tx.member.create({
        data: {
          apartmentId: apartment.id,
          name: d.registrant_name,
          email: d.registrant_email,
          phone: d.registrant_phone,
          nid: d.registrant_nid ? encrypt(d.registrant_nid) : null,
          passwordHash: memberPasswordHash,
          country: d.address_country,
        },
      });

      await tx.apartment.update({
        where: { id: apartment.id },
        data: { adminMemberId: member.id, billManagerId: member.id },
      });

      return { apartment, member };
    });

    await seedApartmentDefaults(result.apartment.id, [result.member.id]);

    const emailSent = await sendRegistrationWelcomeEmail({
      to: d.registrant_email,
      registrantName: d.registrant_name,
      apartmentName: d.apt_name,
      registrationId,
      apartmentPassword: d.apt_password,
      memberDefaultPassword: DEFAULT_PASSWORD,
    });

    const aptToken = await createAptToken(result.apartment.id);
    const { token: memberToken } = await createMemberToken({
      apartmentId: result.apartment.id,
      memberId: result.member.id,
      isAdmin: true,
      isBillManager: true,
    });

    const response = jsonOk({
      registrationId,
      apartmentId: result.apartment.id,
      redirect: '/settings',
      emailSent,
      message: emailSent
        ? 'Registration complete! Check your email for your apartment ID and credentials.'
        : 'Registration complete! Save your registration ID — email delivery is not configured.',
    });
    setAptCookie(response, aptToken);
    setMemberCookie(response, memberToken);
    return response;
  } catch (err) {
    return handleApiError(err);
  }
}
