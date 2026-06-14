import { prisma } from './prisma';
import { verifyPassword } from './password';
import { jsonError } from './api-helpers';

export async function requireDangerZonePassword(
  apartmentId: string,
  password: unknown,
): Promise<Response | null> {
  if (!password || typeof password !== 'string' || !password.trim()) {
    return jsonError('Apartment password is required', 400);
  }

  const apartment = await prisma.apartment.findUnique({
    where: { id: apartmentId },
    select: { passwordHash: true },
  });
  if (!apartment) return jsonError('Apartment not found', 404);

  const valid = await verifyPassword(password, apartment.passwordHash);
  if (!valid) return jsonError('Incorrect apartment password', 401);

  return null;
}
