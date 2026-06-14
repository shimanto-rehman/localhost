import { z } from 'zod';
import { validateMemberPhotoDataUrl } from './member-photo';
import {
  normalizePhone,
  sanitizeEmail,
  sanitizeNid,
  sanitizeText,
} from './sanitize';
import { isValidInternationalPhone } from './phone-countries';

const phoneSchema = z
  .string()
  .transform((v) => sanitizeText(v, 20))
  .refine((v) => isValidInternationalPhone(v), 'Enter a valid mobile number');

const optionalNidSchema = z
  .string()
  .transform((v) => sanitizeNid(v))
  .refine((v) => !v || /^(\d{10}|\d{17})$/.test(v), 'NID must be 10 or 17 digits');

export const monthKeySchema = z.string().regex(/^\d{4}-\d{2}$/, 'Invalid month key');

export const apartmentRegisterSchema = z.object({
  apt_name: z.string().transform((v) => sanitizeText(v, 80)).pipe(z.string().min(2).max(80)),
  apt_password: z.string().min(8).regex(/\d/, 'Must contain a number').regex(/[a-zA-Z]/, 'Must contain a letter'),
  apt_password_confirm: z.string(),
  address_road: z.string().transform((v) => sanitizeText(v, 100)).pipe(z.string().min(2).max(100)),
  address_postal: z.string().transform((v) => sanitizeText(v, 10)).pipe(z.string().min(4).max(10)),
  address_city: z.string().transform((v) => sanitizeText(v, 60)).pipe(z.string().min(2).max(60)),
  address_country: z.string().transform((v) => sanitizeText(v, 60)).pipe(z.string().min(2).max(60)).default('Bangladesh'),
  registrant_name: z.string().transform((v) => sanitizeText(v, 80)).pipe(z.string().min(2).max(80)),
  registrant_nid: optionalNidSchema.optional().or(z.literal('')).transform((v) => v || ''),
  registrant_phone: phoneSchema,
  registrant_email: z.string().transform((v) => sanitizeEmail(v)).pipe(z.string().email('Enter a valid email address')),
  member_count_hint: z.number().int().min(1).max(20).optional(),
  apt_floor: z.string().transform((v) => sanitizeText(v, 30)).optional().or(z.literal('')),
  apt_type: z.enum(['Mess', 'Bachelor Flat', 'Family Flat', 'Shared House']).optional(),
  move_in_date: z.string().optional(),
}).refine((d) => d.apt_password === d.apt_password_confirm, {
  message: 'Passwords do not match',
  path: ['apt_password_confirm'],
});

export const apartmentLoginSchema = z.object({
  identifier: z.string().transform((v) => sanitizeText(v, 80)).pipe(z.string().min(1, 'Apartment name or ID is required')),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const apartmentRequestResetSchema = z.object({
  identifier: z.string().transform((v) => sanitizeText(v, 80)).pipe(z.string().min(1)),
  email: z.string().transform((v) => sanitizeEmail(v)).pipe(z.string().email('Enter a valid email address')),
});

export const memberLoginSchema = z.object({
  memberId: z.string().uuid(),
  password: z.string().min(1),
});

export const memberCreateSchema = z.object({
  name: z.string().transform((v) => sanitizeText(v, 80)).pipe(z.string().min(2).max(80)),
  photoUrl: z
    .union([z.string(), z.literal(''), z.null()])
    .optional()
    .transform((v) => (v ? v : undefined))
    .refine((v) => validateMemberPhotoDataUrl(v) === null, {
      message: 'Photo must be JPG, PNG, or WebP and 200KB or smaller',
    }),
  email: z
    .union([z.string().email(), z.literal('')])
    .optional()
    .transform((v) => (v && v !== '' ? sanitizeEmail(v) : undefined)),
  phone: z
    .string()
    .optional()
    .or(z.literal(''))
    .transform((v) => (v ? sanitizeText(v, 20) : ''))
    .refine((v) => !v || isValidInternationalPhone(v), 'Enter a valid mobile number'),
  nid: optionalNidSchema.optional().or(z.literal('')),
  hometown: z.string().trim().min(2).max(80).optional().or(z.literal('')),
  country: z.string().max(60).optional(),
  moveInDate: z.string().optional(),
});

export const costItemSchema = z.object({
  name: z.string().trim().min(2).max(80),
  amount: z.number().int().min(0).max(9999999),
});

export const adjustmentSchema = z.object({
  memberId: z.string().uuid(),
  type: z.enum(['lend', 'borrow']),
  label: z.string().trim().min(1).max(120),
  amount: z.number().int().positive(),
});

export const mealShoppingSchema = z.object({
  memberId: z.string().uuid(),
  itemName: z.string().trim().min(1).max(80),
  amount: z.number().int().positive(),
  purchaseDate: z.string(),
});

export const mealSettingsSchema = z.object({
  mealsPerDay: z.number().int().min(1).max(6),
  mealNames: z.array(z.string().trim().min(1).max(40)).min(1).max(6),
  weekStartDay: z.number().int().min(0).max(6),
  rateOverride: z.number().int().positive().nullable().optional(),
}).refine((d) => d.mealNames.length === d.mealsPerDay, {
  message: 'Meal names count must match meals per day',
  path: ['mealNames'],
});

export const mealMemberSlotsPatchSchema = z.object({
  memberId: z.string().uuid(),
  slots: z.record(z.string(), z.boolean()),
});

export const expenseSchema = z.object({
  memberId: z.string().uuid().optional(),
  itemName: z.string().trim().min(1).max(80),
  price: z.number().int().positive(),
  category: z.string().max(40).default('Other'),
  expenseDate: z.string().optional(),
});

export const bankAccountSchema = z.object({
  accountNumber: z.string().regex(/^\d{9,18}$/),
  bankName: z.string().trim().min(2).max(80),
  branchName: z.string().trim().min(2).max(80).optional(),
  routingNumber: z.string().regex(/^\d{9}$/).optional().or(z.literal('')),
  accountType: z.enum(['Savings', 'Current', 'DPS', 'Other']).optional(),
  mobileBankingNumber: z.string().regex(/^\+880\d{10}$/).optional().or(z.literal('')),
  mobileBankingType: z.enum(['bKash', 'Nagad', 'Rocket', 'Other']).optional(),
});

const mfsWalletEnum = z.enum([
  'Bkash', 'Rocket', 'Nagad', 'Upay', 'Tap', 'Surecash', 'OkWallet', 'UCash',
]);

export const bankPaymentMethodSchema = z.object({
  type: z.literal('bank'),
  bankName: z.string().trim().min(2, 'Bank name is required').max(80),
  accountNumber: z
    .string()
    .trim()
    .min(3, 'Account number must be at least 3 digits')
    .max(30)
    .regex(/^\d+$/, 'Account number must contain digits only'),
  branchName: z
    .string()
    .trim()
    .max(80)
    .optional()
    .or(z.literal(''))
    .transform((v) => v || undefined),
  routingNumber: z
    .string()
    .trim()
    .optional()
    .or(z.literal(''))
    .transform((v) => v || undefined)
    .refine((v) => v === undefined || /^\d{9}$/.test(v), 'Routing number must be 9 digits'),
});

export const mfsPaymentMethodSchema = z.object({
  type: z.literal('mfs'),
  walletType: mfsWalletEnum,
  accountNumber: z
    .string()
    .trim()
    .transform((v) => v.replace(/\s+/g, ''))
    .pipe(
      z
        .string()
        .min(11, 'Use format 01XXXXXXXXX')
        .max(14)
        .regex(/^(\+8801|8801|01)\d{9}$/, 'Use a valid Bangladesh mobile number (01XXXXXXXXX)'),
    )
    .transform((v) => {
      if (v.startsWith('+880')) return v.slice(3);
      if (v.startsWith('880')) return v.slice(2);
      return v;
    }),
});

export const paymentMethodSchema = z.discriminatedUnion('type', [
  bankPaymentMethodSchema,
  mfsPaymentMethodSchema,
]);

export function zodFieldErrors(err: z.ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  err.errors.forEach((e) => {
    const key = e.path.join('.') || '_form';
    fields[key] = e.message;
  });
  return fields;
}
