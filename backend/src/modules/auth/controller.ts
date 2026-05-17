import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { prisma } from "../../utils/db";
import { redis } from "../../utils/redis";
import { config } from "../../config";
import { success, error } from "../../utils/response";
import { logger } from "../../utils/logger";
import { queueNotification } from "../../utils/notifications";
import { AuthRequest } from "../../middleware/auth";
import {
  registerIndividualSchema,
  registerGovernmentSchema,
  loginSchema,
  passwordResetRequestSchema,
  passwordResetSchema,
  changePasswordSchema,
  verifyOtpSchema,
  createSubUserSchema,
} from "./validator";

function generateTokens(userId: string, accountId: string, role: string, email: string) {
  const payload = { userId, accountId, role, email };
  const accessToken = jwt.sign(payload, config.jwt.privateKey, {
    algorithm: config.jwt.algorithm,
    expiresIn: config.jwt.accessTokenExpiry,
  });
  const refreshToken = jwt.sign({ userId, type: "refresh" }, config.jwt.privateKey, {
    algorithm: config.jwt.algorithm,
    expiresIn: config.jwt.refreshTokenExpiry,
  });
  return { accessToken, refreshToken };
}

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function hashPassword(pw: string): Promise<string> {
  return bcrypt.hash(pw, 12);
}

async function checkPasswordHistory(userId: string, newPassword: string, history: string[]): Promise<boolean> {
  for (const oldHash of history.slice(-config.passwordPolicy.historyCount)) {
    if (await bcrypt.compare(newPassword, oldHash)) return true;
  }
  return false;
}

export async function registerIndividual(req: Request, res: Response) {
  const parsed = registerIndividualSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(error("VALIDATION_ERROR", "Invalid registration data", parsed.error.flatten()));
    return;
  }

  const data = parsed.data;
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) {
    res.status(409).json(error("EMAIL_EXISTS", "An account with this email already exists"));
    return;
  }

  const passwordHash = await hashPassword(data.password);
  const account = await prisma.customerAccount.create({
    data: {
      accountType: data.accountType,
      status: "PENDING_APPROVAL",
      organisationName: data.organisationName || null,
      physicalAddress: data.physicalAddress,
      tin: data.tin || null,
    },
  });

  const user = await prisma.user.create({
    data: {
      accountId: account.id,
      email: data.email,
      passwordHash,
      fullName: data.fullName,
      mobile: data.mobile,
      role: "ACCOUNT_ADMIN",
    },
  });

  const otp = generateOtp();
  await redis.setex(`otp:mobile:${data.mobile}`, 600, otp);
  logger.info("Mobile OTP generated", { mobile: data.mobile, userId: user.id });

  await queueNotification({
    accountId: account.id,
    userId: user.id,
    eventType: "NEW_ACCOUNT_REGISTRATION",
    channels: ["EMAIL", "SMS"],
    subjectEn: "Welcome to ZICTIA Customer Portal",
    contentEn: `Hi ${user.fullName}, your registration has been submitted and is pending approval. You will be notified once your account is activated.`,
  });

  res.status(201).json(success({
    message: "Registration submitted. Your account is pending approval by ZICTIA staff.",
    accountId: account.id,
  }));
}

export async function registerGovernment(req: Request, res: Response) {
  const parsed = registerGovernmentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(error("VALIDATION_ERROR", "Invalid registration data", parsed.error.flatten()));
    return;
  }

  const d = parsed.data;
  const passwordHash = await hashPassword(d.password);

  const account = await prisma.customerAccount.create({
    data: {
      accountType: "GOVERNMENT",
      status: "PENDING_APPROVAL",
      organisationName: d.institutionName,
      ministry: d.ministry,
      physicalAddress: d.physicalAddress,
      governmentRegNo: d.governmentRegNo,
    },
  });

  const user = await prisma.user.create({
    data: {
      accountId: account.id,
      email: d.ictOfficerEmail,
      passwordHash,
      fullName: d.ictOfficerName,
      mobile: d.ictOfficerMobile,
      role: "ACCOUNT_ADMIN",
    },
  });

  res.status(201).json(success({
    message: "Government institution registration submitted. Pending ZICTIA approval.",
    accountId: account.id,
  }));
}

export async function login(req: Request, res: Response) {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(error("VALIDATION_ERROR", "Invalid login data", parsed.error.flatten()));
    return;
  }

  const { email, password, rememberDevice } = parsed.data;
  const user = await prisma.user.findUnique({
    where: { email },
    include: { account: true },
  });

  if (!user || !user.passwordHash) {
    res.status(401).json(error("INVALID_CREDENTIALS", "Invalid email or password"));
    return;
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    res.status(423).json(error("ACCOUNT_LOCKED", "Account is temporarily locked due to multiple failed attempts"));
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    const attempts = user.failedLoginAttempts + 1;
    const lockedUntil = attempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null;
    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: attempts, lockedUntil },
    });
    res.status(401).json(error("INVALID_CREDENTIALS", "Invalid email or password"));
    return;
  }

  if (user.account.status !== "ACTIVE") {
    res.status(403).json(error("ACCOUNT_NOT_ACTIVE", "Your account is pending approval or has been suspended"));
    return;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
  });

  const tokens = generateTokens(user.id, user.accountId, user.role, user.email);
  const sessionExpiry = rememberDevice
    ? new Date(Date.now() + config.session.rememberDays * 24 * 60 * 60 * 1000)
    : new Date(Date.now() + config.session.timeoutMinutes * 60 * 1000);

  const tokenHash = await bcrypt.hash(tokens.accessToken, 6);
  const refreshHash = await bcrypt.hash(tokens.refreshToken, 6);

  await prisma.session.create({
    data: {
      userId: user.id,
      tokenHash,
      refreshTokenHash: refreshHash,
      ipAddress: req.ip || null,
      userAgent: req.headers["user-agent"] || null,
      expiresAt: sessionExpiry,
    },
  });

  res.json(success({
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresIn: rememberDevice ? config.session.rememberDays * 86400 : config.session.timeoutMinutes * 60,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      accountId: user.accountId,
      accountType: user.account.accountType,
      mfaEnabled: user.mfaEnabled,
    },
  }));
}

export async function refreshToken(req: Request, res: Response) {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    res.status(400).json(error("MISSING_TOKEN", "Refresh token is required"));
    return;
  }

  try {
    const decoded = jwt.verify(refreshToken, config.jwt.publicKey, {
      algorithms: [config.jwt.algorithm],
    }) as { userId: string; type: string };

    if (decoded.type !== "refresh") throw new Error("Invalid token type");

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { account: true },
    });

    if (!user || user.account.status !== "ACTIVE") {
      res.status(401).json(error("UNAUTHORIZED", "User not found or inactive"));
      return;
    }

    const tokens = generateTokens(user.id, user.accountId, user.role, user.email);
    res.json(success(tokens));
  } catch {
    res.status(401).json(error("UNAUTHORIZED", "Invalid refresh token"));
  }
}

export async function logout(req: AuthRequest, res: Response) {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    await redis.setex(`denylist:token:${token}`, 900, "1");
  }
  if (req.user) {
    await prisma.session.deleteMany({ where: { userId: req.user.userId } });
  }
  res.json(success({ message: "Logged out successfully" }));
}

export async function requestPasswordReset(req: Request, res: Response) {
  const parsed = passwordResetRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(error("VALIDATION_ERROR", "Invalid email", parsed.error.flatten()));
    return;
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user) {
    res.json(success({ message: "If an account exists with this email, a reset link has been sent." }));
    return;
  }

  const token = uuidv4();
  const tokenHash = await bcrypt.hash(token, 6);
  await prisma.passwordResetToken.upsert({
    where: { email: user.email },
    create: { email: user.email, tokenHash, expiresAt: new Date(Date.now() + 15 * 60 * 1000) },
    update: { tokenHash, expiresAt: new Date(Date.now() + 15 * 60 * 1000) },
  });

  await queueNotification({
    accountId: user.accountId,
    userId: user.id,
    eventType: "PASSWORD_RESET",
    channels: ["EMAIL"],
    subjectEn: "ZICTIA Portal — Password Reset Request",
    contentEn: `You requested a password reset. Use this token to reset your password: ${token}. This token expires in 15 minutes.`,
  });

  res.json(success({ message: "If an account exists with this email, a reset link has been sent." }));
}

export async function resetPassword(req: Request, res: Response) {
  const parsed = passwordResetSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(error("VALIDATION_ERROR", "Invalid data", parsed.error.flatten()));
    return;
  }

  const record = await prisma.passwordResetToken.findFirst({
    where: { expiresAt: { gt: new Date() } },
  });
  if (!record) {
    res.status(400).json(error("INVALID_TOKEN", "Token expired or invalid"));
    return;
  }

  const valid = await bcrypt.compare(parsed.data.token, record.tokenHash);
  if (!valid) {
    res.status(400).json(error("INVALID_TOKEN", "Token expired or invalid"));
    return;
  }

  const newHash = await hashPassword(parsed.data.newPassword);
  await prisma.user.update({
    where: { email: record.email },
    data: {
      passwordHash: newHash,
      passwordChangedAt: new Date(),
      previousPasswords: { push: newHash },
    },
  });
  await prisma.passwordResetToken.delete({ where: { email: record.email } });

  res.json(success({ message: "Password reset successful. Please log in." }));
}

export async function changePassword(req: AuthRequest, res: Response) {
  const parsed = changePasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(error("VALIDATION_ERROR", "Invalid data", parsed.error.flatten()));
    return;
  }

  const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
  if (!user) {
    res.status(404).json(error("NOT_FOUND", "User not found"));
    return;
  }

  const valid = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
  if (!valid) {
    res.status(401).json(error("INVALID_PASSWORD", "Current password is incorrect"));
    return;
  }

  const inHistory = await checkPasswordHistory(user.id, parsed.data.newPassword, user.previousPasswords);
  if (inHistory) {
    res.status(400).json(error("PASSWORD_HISTORY", "You cannot reuse a recent password"));
    return;
  }

  const newHash = await hashPassword(parsed.data.newPassword);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: newHash,
      passwordChangedAt: new Date(),
      previousPasswords: { push: user.passwordHash },
    },
  });

  res.json(success({ message: "Password changed successfully" }));
}

export async function verifyMobileOtp(req: Request, res: Response) {
  const parsed = verifyOtpSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(error("VALIDATION_ERROR", "Invalid OTP data", parsed.error.flatten()));
    return;
  }

  const { mobile, otp } = parsed.data;
  const stored = await redis.get(`otp:mobile:${mobile}`);
  if (stored !== otp) {
    res.status(400).json(error("INVALID_OTP", "Invalid or expired OTP"));
    return;
  }

  await redis.del(`otp:mobile:${mobile}`);
  await prisma.user.updateMany({
    where: { mobile },
    data: { mobileVerified: true },
  });

  res.json(success({ message: "Mobile number verified successfully" }));
}

export async function getMe(req: AuthRequest, res: Response) {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    include: { account: true },
  });

  if (!user) {
    res.status(404).json(error("NOT_FOUND", "User not found"));
    return;
  }

  res.json(success({
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    mobile: user.mobile,
    role: user.role,
    mfaEnabled: user.mfaEnabled,
    emailVerified: user.emailVerified,
    mobileVerified: user.mobileVerified,
    account: {
      id: user.account.id,
      type: user.account.accountType,
      status: user.account.status,
      creditLimit: user.account.creditLimit,
      creditUtilised: user.account.creditUtilised,
    },
  }));
}

export async function createSubUser(req: AuthRequest, res: Response) {
  const parsed = createSubUserSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(error("VALIDATION_ERROR", "Invalid data", parsed.error.flatten()));
    return;
  }

  const accountId = req.user!.accountId;
  const currentUser = await prisma.user.findUnique({ where: { id: req.user!.userId } });
  if (!currentUser || currentUser.role !== "ACCOUNT_ADMIN") {
    res.status(403).json(error("FORBIDDEN", "Only Account Administrators can manage sub-users"));
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) {
    res.status(409).json(error("EMAIL_EXISTS", "A user with this email already exists"));
    return;
  }

  const tempPassword = Math.random().toString(36).slice(2, 12) + "A1!";
  const passwordHash = await hashPassword(tempPassword);

  const newUser = await prisma.user.create({
    data: {
      accountId,
      email: parsed.data.email,
      passwordHash,
      fullName: parsed.data.fullName,
      mobile: parsed.data.mobile,
      role: parsed.data.role,
    },
  });

  await queueNotification({
    accountId,
    userId: newUser.id,
    eventType: "SUB_USER_INVITED",
    channels: ["EMAIL"],
    subjectEn: "Invitation to ZICTIA Customer Portal",
    contentEn: `You have been invited to the ZICTIA Customer Portal by ${currentUser?.fullName || "your account administrator"}. Your temporary password is: ${tempPassword}. Please log in and change your password immediately.`,
  });

  res.status(201).json(success({
    id: newUser.id,
    email: newUser.email,
    fullName: newUser.fullName,
    role: newUser.role,
    message: "Sub-user invited. A temporary password has been emailed.",
  }));
}

export async function listSubUsers(req: AuthRequest, res: Response) {
  const accountId = req.user!.accountId;
  const users = await prisma.user.findMany({
    where: { accountId },
    select: { id: true, email: true, fullName: true, mobile: true, role: true, lastLoginAt: true, createdAt: true },
  });
  res.json(success(users));
}

export async function removeSubUser(req: AuthRequest, res: Response) {
  const { userId } = req.params;
  const accountId = req.user!.accountId;

  const currentUser = await prisma.user.findUnique({ where: { id: req.user!.userId } });
  if (!currentUser || currentUser.role !== "ACCOUNT_ADMIN") {
    res.status(403).json(error("FORBIDDEN", "Only Account Administrators can manage sub-users"));
    return;
  }

  if (userId === req.user!.userId) {
    res.status(400).json(error("INVALID_REQUEST", "You cannot remove yourself"));
    return;
  }

  const target = await prisma.user.findFirst({ where: { id: userId, accountId } });
  if (!target) {
    res.status(404).json(error("NOT_FOUND", "User not found in your account"));
    return;
  }

  await prisma.user.delete({ where: { id: userId } });
  res.json(success({ message: "User removed successfully" }));
}
