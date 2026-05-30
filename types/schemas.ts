import { z } from "zod";

// More permissive email regex that allows short local parts (like "a@domain.com")
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

//login
export const loginSchema = z.object({
  email: z.string()
    .min(1, 'Email is required')
    .regex(emailRegex, 'Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export type LoginFormData = z.infer<typeof loginSchema>;

// Password validation: at least 8 characters, 1 uppercase letter, 1 number, 1 special character
// Supports both Latin (A-Z) and Cyrillic (А-Я) uppercase letters
const passwordValidation = z
  .string()
  .trim() // Remove whitespace from start and end
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-ZА-ЯЁ]/, 'Password must contain at least 1 uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least 1 number')
  .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, 'Password must contain at least 1 special character');

//register
export const registerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string()
    .min(1, 'Email is required')
    .regex(emailRegex, 'Invalid email address'),
  password: passwordValidation,
  confirmPassword: z.string().trim(),
  consent: z.boolean().refine((val) => val === true, {
    message: 'You must agree to the Privacy Policy to continue',
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export type RegisterFormData = z.infer<typeof registerSchema>;


export const forgotPasswordSchema = z.object({
  email: z.string()
    .min(1, 'Email is required')
    .regex(emailRegex, 'Invalid email address'),
});

export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;


export const resetPasswordSchema = z.object({
  password: passwordValidation,
  confirmPassword: z.string().trim(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;


export const reservationSchema = z.object({
  name: z.string().min(2, 'Last Name is required'),
  number: z.string().min(1, 'Booking reservation ID is required'),
});

export type ReservationFormData = z.infer<typeof reservationSchema>;


export const guestDetailsSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be less than 50 characters'),
  last_name: z.string()
    .min(2, 'Last name must be at least 2 characters')
    .max(50, 'Last name must be less than 50 characters'),
  email: z.string()
    .min(1, 'Email is required')
    .regex(emailRegex, 'Invalid email address'),
  phone: z.string()
    .min(10, 'Phone number must be at least 10 digits')
    .regex(/^[0-9+\s()-]+$/, 'Invalid phone number format'),
    company_name: z.string().optional().or(z.literal('')),
    street_address: z.string()
      .min(2, 'Street address must be at least 2 characters')
      .max(100, 'Street address must be less than 100 characters'),
    house_number: z.string()
      .min(1, 'House number is required')
      .max(20, 'House number must be less than 20 characters'),
    postal_code: z.string()
      .min(4, 'Postal code must be at least 4 characters'),
    city: z.string()
      .min(2, 'City must be at least 2 characters')
      .max(50, 'City must be less than 50 characters'),
    country: z.string()
      .min(2, 'Country is required')
      .max(50, 'Country must be less than 50 characters'),
  consent: z.boolean().refine((val) => val === true, {
    message: 'You must agree to the Privacy Policy to continue',
  }),
})

export type GuestDetailsFormData = z.infer<typeof guestDetailsSchema>


// Profile details schema - for profile page (phone is optional)
export const profileDetailsSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be less than 50 characters'),
  last_name: z.string()
    .min(2, 'Last name must be at least 2 characters')
    .max(50, 'Last name must be less than 50 characters'),
  email: z.string()
    .min(1, 'Email is required')
    .regex(emailRegex, 'Invalid email address'),
  phone: z.string()
    .optional()
    .or(z.literal('')),
})

export type ProfileDetailsFormData = z.infer<typeof profileDetailsSchema>


// Password change schema - for email/password users
export const changePasswordSchema = z.object({
  currentPassword: z.string().trim().min(6, 'Current password must be at least 6 characters'),
  newPassword: passwordValidation,
  confirmPassword: z.string().trim(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>


// Set password schema - for OAuth users
export const setPasswordSchema = z.object({
  newPassword: passwordValidation,
  confirmPassword: z.string().trim(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

export type SetPasswordFormData = z.infer<typeof setPasswordSchema>


// Guest info schema - for updating guest details
export const guestInfoSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters'),
  idNumber: z.string()
    .min(5, 'ID number must be at least 5 characters')
    .max(50, 'ID number must be less than 50 characters'),
  nationality: z.string()
    .min(2, 'Nationality must be at least 2 characters')
    .max(50, 'Nationality must be less than 50 characters'),
  birthdate: z.string()
    .min(1, 'Birth date is required')
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  address: z.string()
    .min(5, 'Address must be at least 5 characters')
    .max(200, 'Address must be less than 200 characters'),
})

export type GuestInfoFormData = z.infer<typeof guestInfoSchema>


// Pending services payload schema. Used by /api/services/save-pending to
// reject malformed input before it reaches `pending_services` (which is then
// trusted by validateServicesPayment and the Adyen webhook). The shape
// mirrors AddExtrasService in `store/useAddExtras.ts`.
// YYYY-MM-DD only — extra characters rejected. The validator and helper
// later compare these against Apaleo date strings sliced to 10 chars, so a
// trailing-junk acceptance here would have masked malformed input.
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected ISO date (YYYY-MM-DD)')

export const addExtrasServiceSchema = z.object({
  serviceId: z.string().min(1),
  count: z.number().int().nonnegative().optional(),
  price: z.number().nonnegative().optional(),
  dates: z
    .array(
      z.object({
        serviceDate: isoDate,
        count: z.number().int().nonnegative().optional(),
        amount: z
          .object({
            amount: z.number().nonnegative(),
            currency: z.string().min(1),
          })
          .optional(),
        isExisting: z.boolean().optional(),
      }),
    )
    .optional(),
})

// Write side: save-pending requires at least one service — no point in
// staging an empty payment.
export const pendingServicesPayloadSchema = z
  .array(addExtrasServiceSchema)
  .min(1, 'services must be a non-empty array')

// Read side: no length floor. The validator must tolerate any historical
// empty array written before this PR shipped, otherwise such rows would
// pay-and-refund. validateServicesPayment then fail-fasts on
// `services.length === 0` with a precise `unavailable` reason, so the
// loose schema doesn't widen the attack surface.
export const pendingServicesReadSchema = z.array(addExtrasServiceSchema)

export type PendingServicesPayload = z.infer<typeof pendingServicesPayloadSchema>
