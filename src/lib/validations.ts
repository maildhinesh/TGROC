import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const registerSchema = z
  .object({
    firstName: z.string().min(2, "First name must be at least 2 characters"),
    lastName: z.string().min(2, "Last name must be at least 2 characters"),
    email: z.string().email("Please enter a valid email"),
    phone: z.string().optional(),
    dateOfBirth: z.string().regex(/^\d{4}$/, "Please enter a valid year").optional().or(z.literal("")),
    membershipType: z.enum([
      "INDIVIDUAL",
      "FAMILY",
      "STUDENT_INDIVIDUAL",
      "STUDENT_FAMILY",
    ]),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const profileSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  dateOfBirth: z.string().regex(/^\d{4}$/, "Please enter a valid year").optional().or(z.literal("")),
  phone: z.string().optional(),
});

export const contactSchema = z.object({
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  country: z.string().optional(),
});

export const familyMemberSchema = z.object({
  relationship: z.enum(["SPOUSE", "CHILD"]),
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  dateOfBirth: z.string().regex(/^\d{4}$/, "Please enter a valid year").optional().or(z.literal("")),
  email: z.string().email("Please enter a valid email").optional().or(z.literal("")),
  phone: z.string().optional(),
});

export const createUserSchema = z
  .object({
    firstName: z.string().min(2, "First name must be at least 2 characters"),
    lastName: z.string().min(2, "Last name must be at least 2 characters"),
    email: z.string().email("Please enter a valid email"),
    phone: z.string().optional(),
    role: z.enum(["ADMIN", "OFFICE_BEARER", "MEMBER"]),
    membershipType: z
      .enum(["INDIVIDUAL", "FAMILY", "STUDENT_INDIVIDUAL", "STUDENT_FAMILY"])
      .optional(),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "New password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
export type ContactInput = z.infer<typeof contactSchema>;
export type FamilyMemberInput = z.infer<typeof familyMemberSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
