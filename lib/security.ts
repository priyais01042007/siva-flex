import { z } from "zod";
import crypto from "crypto";
import path from "path";

// 1. Password Policy Schema
export const PasswordSchema = z
  .string()
  .min(6, "Password must be at least 6 characters long")
  .max(100, "Password must not exceed 100 characters");

// 2. Login Input Validation
export const LoginSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

// 3. Dealer Registration Validation
export const RegisterSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Business / Dealer name must be at least 2 characters")
    .max(100, "Business name cannot exceed 100 characters")
    .regex(/^[A-Za-z0-9\s._&-]+$/, "Name contains invalid characters"),
  email: z.string().trim().email("Please enter a valid email address"),
  mobile: z
    .string()
    .trim()
    .regex(/^[0-9]{10}$/, "Mobile number must be a valid 10-digit number"),
  address: z.string().trim().max(300).optional().default(""),
  gst: z
    .string()
    .trim()
    .max(20)
    .regex(/^[A-Z0-9]*$/, "Invalid GST format")
    .optional()
    .default(""),
  password: PasswordSchema,
});

// 4. Password Change Validation
export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: PasswordSchema,
});

// 5. Admin Reset Dealer Password Validation
export const AdminResetPasswordSchema = z.object({
  dealerId: z.coerce.number().positive(),
  newPassword: PasswordSchema,
});

// 6. Secure File Upload Sanitization and Validation
export const ALLOWED_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".pdf",
  ".tif",
  ".tiff",
  ".psd",
  ".cdr",
  ".ai",
  ".eps",
  ".webp",
] as const;

export const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/pjpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "image/tiff",
  "image/x-tiff",
  "image/vnd.adobe.photoshop",
  "image/x-photoshop",
  "application/x-photoshop",
  "application/photoshop",
  "application/postscript",
  "application/illustrator",
  "application/coreldraw",
  "application/x-cdr",
  "application/octet-stream", // standard browser fallback for .cdr, .tif, .psd
] as const;

export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 Megabytes for flex printing artwork

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  cleanFilename?: string;
  ext?: string;
}

export function validateAndSanitizeFile(
  originalFilename: string,
  mimeType: string,
  sizeBytes: number
): FileValidationResult {
  // Check Size
  if (sizeBytes > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds the 50MB limit. Current size: ${(sizeBytes / (1024 * 1024)).toFixed(2)} MB.`,
    };
  }

  if (sizeBytes <= 0) {
    return { valid: false, error: "Empty file cannot be uploaded." };
  }

  // Check Extension
  const rawExt = path.extname(originalFilename || "").toLowerCase();
  if (!rawExt || !ALLOWED_EXTENSIONS.includes(rawExt as (typeof ALLOWED_EXTENSIONS)[number])) {
    return {
      valid: false,
      error: `Invalid file extension (${rawExt || "none"}). Allowed formats: JPG, PNG, PDF, TIFF, PSD, CDR, AI, EPS.`,
    };
  }

  // Check MIME Type (if provided; if octet-stream or empty, extension check suffices)
  const cleanMime = (mimeType || "").toLowerCase().trim();
  if (cleanMime && cleanMime !== "application/octet-stream") {
    const isMimeAllowed = ALLOWED_MIME_TYPES.some((m) => cleanMime.startsWith(m));
    if (!isMimeAllowed) {
      return {
        valid: false,
        error: `Invalid file type: ${cleanMime}. Allowed formats: JPG, PNG, PDF, TIFF, PSD, CDR, AI, EPS.`,
      };
    }
  }

  // Generate Safe Filename: timestamp + random uuid prefix + safe original base
  const rawBase = path.basename(originalFilename, rawExt);
  const safeBase = rawBase
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 50)
    .replace(/^_+|_+$/g, "") || "artwork";
  const uniqueId = crypto.randomBytes(6).toString("hex");
  const cleanFilename = `Upload_${Date.now()}_${uniqueId}_${safeBase}${rawExt}`;

  return {
    valid: true,
    cleanFilename,
    ext: rawExt,
  };
}
