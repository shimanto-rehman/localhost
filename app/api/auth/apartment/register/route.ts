import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { encrypt } from '@/lib/encryption';
import { hashPassword, defaultPasswordHash } from '@/lib/password';
import { createAptToken, createMemberToken, setAptCookie, setMemberCookie } from '@/lib/auth';
import { apartmentRegisterSchema, zodFieldErrors } from '@/lib/validation';
import { generateRegistrationId } from '@/lib/utils';
import { seedApartmentDefaults } from '@/lib/apartment-data';
import { jsonOk, jsonError, handleApiError } from '@/lib/api-helpers';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = apartmentRegisterSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError('Validation failed', 400, zodFieldErrors(parsed.error));
    }
    const d = parsed.data;

    const existingName = await prisma.apartment.findUnique({ where: { name: d.apt_name } });
    if (existingName) {
      return jsonError('Validation failed', 400, { apt_name: 'This apartment name is already taken' });
    }
    const existingEmail = await prisma.apartment.findUnique({ where: { registrantEmail: d.registrant_email } });
    if (existingEmail) {
      return jsonError('Validation failed', 400, { registrant_email: 'This email is already registered' });
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
          aptFloor: d.apt_floor,
          aptType: d.apt_type,
          moveInDate: d.move_in_date ? new Date(d.move_in_date) : null,
          memberCountHint: d.member_count_hint,
          registrantName: d.registrant_name,
          registrantNid: encrypt(d.registrant_nid),
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
          nid: encrypt(d.registrant_nid),
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
    });
    setAptCookie(response, aptToken);
    setMemberCookie(response, memberToken);
    return response;
  } catch (err) {
    return handleApiError(err);
  }
}
