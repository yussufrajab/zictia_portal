import { z } from "zod";

export const registerIndividualSchema = z.object({
  fullName: z.string().min(2).max(100),
  email: z.string().email(),
  mobile: z.string().regex(/^\+255[0-9]{9}$/, "Mobile must be in Tanzania format +255xxxxxxxxx"),
  password: z.string().min(10).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])/, "Password must include uppercase, lowercase, digit, and special character"),
  accountType: z.enum(["INDIVIDUAL", "SME", "CORPORATE", "GOVERNMENT", "ISP"]),
  organisationName: z.string().optional(),
  physicalAddress: z.string().min(5).max(300),
  tin: z.string().optional(),
  termsAccepted: z.literal(true, { errorMap: () => ({ message: "You must accept the terms and conditions" }) }),
});

export const registerGovernmentSchema = z.object({
  institutionName: z.string().min(2).max(200),
  ministry: z.string().min(2).max(200),
  physicalAddress: z.string().min(5).max(300),
  governmentRegNo: z.string().min(2).max(100),
  ictOfficerName: z.string().min(2).max(100),
  ictOfficerEmail: z.string().email(),
  ictOfficerMobile: z.string().regex(/^\+255[0-9]{9}$/),
  financeOfficerName: z.string().min(2).max(100),
  financeOfficerEmail: z.string().email(),
  financeOfficerMobile: z.string().regex(/^\+255[0-9]{9}$/),
  password: z.string().min(10).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])/),
  termsAccepted: z.literal(true),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  rememberDevice: z.boolean().optional(),
});

export const passwordResetRequestSchema = z.object({
  email: z.string().email(),
});

export const passwordResetSchema = z.object({
  token: z.string().uuid(),
  newPassword: z.string().min(10).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])/),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(10).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])/),
});

export const verifyOtpSchema = z.object({
  mobile: z.string().regex(/^\+255[0-9]{9}$/),
  otp: z.string().length(6),
});

export const createSubUserSchema = z.object({
  fullName: z.string().min(2).max(100),
  email: z.string().email(),
  mobile: z.string().regex(/^\+255[0-9]{9}$/),
  role: z.enum(["ACCOUNT_ADMIN", "TECHNICAL_USER", "BILLING_USER", "READ_ONLY"]),
});
