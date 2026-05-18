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

export const schoolYearSchema = z.object({
  label: z.string().min(4, "Label is required"),
  startsOn: z.string().datetime().or(z.string().date()),
  endsOn: z.string().datetime().or(z.string().date()),
  enrollmentOpenOn: z.string().datetime().or(z.string().date()).optional().nullable(),
  enrollmentCloseOn: z.string().datetime().or(z.string().date()).optional().nullable(),
  status: z.enum(["PLANNED", "ACTIVE", "CLOSED"]).optional(),
});

export const schoolCalendarDaySchema = z.object({
  date: z.string().datetime().or(z.string().date()),
  isSchoolDay: z.boolean(),
  note: z.string().max(500).optional().nullable(),
});

export const schoolCalendarSchema = z.object({
  days: z.array(schoolCalendarDaySchema).min(1, "At least one calendar day is required"),
});

export const schoolEnrollmentSettingsSchema = z.object({
  isEnrollmentEnabled: z.boolean(),
});

export const studentProfileSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  dateOfBirth: z.string().datetime().or(z.string().date()),
  gender: z.string().max(50).optional().nullable(),
  emergencyContactName: z.string().max(255).optional().nullable(),
  emergencyContactPhone: z.string().max(50).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export const enrollmentMedicalInfoSchema = z.object({
  insuranceProviderName: z.string().min(1, "Insurance provider is required"),
  insurancePolicyNumber: z.string().min(1, "Insurance policy number is required"),
  insuranceGroupNumber: z.string().optional().nullable(),
  insurancePhone: z.string().optional().nullable(),
  policyHolderName: z.string().optional().nullable(),
  pediatricianName: z.string().min(1, "Pediatrician name is required"),
  pediatricianPhone: z.string().min(1, "Pediatrician phone is required"),
  pediatricianAddress: z.string().optional().nullable(),
  medicalNotes: z.string().max(2000).optional().nullable(),
});

export const enrollmentWaiverSchema = z.object({
  medicalWaiverAccepted: z.literal(true),
  medicalWaiverVersion: z.number().int().positive(),
  mediaWaiverAccepted: z.literal(true),
  mediaWaiverVersion: z.number().int().positive(),
});

export const schoolEnrollmentCreateSchema = z.object({
  schoolYearId: z.string().min(1, "School year is required"),
  studentProfileId: z.string().min(1, "Student profile is required"),
  medicalInfo: enrollmentMedicalInfoSchema,
  waivers: enrollmentWaiverSchema,
});

export const schoolEnrollmentUpdateSchema = z.object({
  medicalInfo: enrollmentMedicalInfoSchema.optional(),
  waivers: enrollmentWaiverSchema.optional(),
});

export const schoolEnrollmentReviewSchema = z
  .object({
    decision: z.enum(["APPROVED", "REJECTED"]),
    rejectionReason: z.string().max(2000).optional().nullable(),
  })
  .superRefine((value, ctx) => {
    if (value.decision === "REJECTED" && !value.rejectionReason?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["rejectionReason"],
        message: "Rejection reason is required when rejecting an enrollment",
      });
    }
  });

export const schoolClassSchema = z.object({
  schoolYearId: z.string().min(1, "School year is required"),
  classCode: z.string().min(1, "Class code is required").max(50),
  className: z.string().min(1, "Class name is required").max(255),
  levelOrGrade: z.string().min(1, "Level or grade is required").max(255),
  maxCapacity: z.number().int().positive().optional().nullable(),
  isActive: z.boolean().optional(),
});

export const classTeacherAssignmentSchema = z.object({
  teacherUserIds: z.array(z.string().min(1)).min(1, "At least one teacher is required"),
});

export const classStudentAssignmentSchema = z.object({
  studentProfileIds: z.array(z.string().min(1)).min(1, "At least one student is required"),
});

export const classSessionAttendanceSchema = z.object({
  entries: z
    .array(
      z.object({
        studentProfileId: z.string().min(1, "Student is required"),
        status: z.enum(["PRESENT", "ABSENT", "EXCUSED", "LATE"]),
        note: z.string().max(500).optional().nullable(),
      })
    )
    .min(1, "At least one attendance entry is required"),
});

export const gradeItemSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  categoryId: z.string().optional().nullable(),
  maxScore: z.number().positive("Max score must be greater than zero"),
  assignedOn: z.string().datetime().or(z.string().date()),
  dueOn: z.string().datetime().or(z.string().date()).optional().nullable(),
});

export const gradeEntrySchema = z.object({
  entries: z
    .array(
      z.object({
        studentProfileId: z.string().min(1, "Student is required"),
        score: z.number().nonnegative("Score cannot be negative"),
        letterGrade: z.string().max(10).optional().nullable(),
        comment: z.string().max(1000).optional().nullable(),
      })
    )
    .min(1, "At least one grade entry is required"),
});

export const campusClassroomSchema = z.object({
  roomCode: z.string().min(1, "Room code is required").max(50),
  roomName: z.string().min(1, "Room name is required").max(255),
  capacity: z.number().int().positive().optional().nullable(),
  isActive: z.boolean().optional(),
});

export const classSessionCreateSchema = z
  .object({
    calendarDate: z.string().datetime().or(z.string().date()),
    startTime: z.string().datetime(),
    endTime: z.string().datetime(),
    classroomId: z.string().min(1, "Classroom is required"),
    status: z.enum(["SCHEDULED", "COMPLETED", "CANCELLED"]).optional(),
  })
  .superRefine((value, ctx) => {
    if (new Date(value.startTime) >= new Date(value.endTime)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endTime"],
        message: "endTime must be after startTime",
      });
    }
  });

export const classSessionUpdateSchema = z.object({
  calendarDate: z.string().datetime().or(z.string().date()).optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  classroomId: z.string().min(1, "Classroom is required").optional(),
  status: z.enum(["SCHEDULED", "COMPLETED", "CANCELLED"]).optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
export type ContactInput = z.infer<typeof contactSchema>;
export type FamilyMemberInput = z.infer<typeof familyMemberSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type SchoolYearInput = z.infer<typeof schoolYearSchema>;
export type SchoolCalendarInput = z.infer<typeof schoolCalendarSchema>;
export type StudentProfileInput = z.infer<typeof studentProfileSchema>;
export type SchoolEnrollmentCreateInput = z.infer<typeof schoolEnrollmentCreateSchema>;
export type SchoolEnrollmentUpdateInput = z.infer<typeof schoolEnrollmentUpdateSchema>;
export type SchoolEnrollmentReviewInput = z.infer<typeof schoolEnrollmentReviewSchema>;
export type SchoolClassInput = z.infer<typeof schoolClassSchema>;
export type ClassTeacherAssignmentInput = z.infer<typeof classTeacherAssignmentSchema>;
export type ClassStudentAssignmentInput = z.infer<typeof classStudentAssignmentSchema>;
export type ClassSessionAttendanceInput = z.infer<typeof classSessionAttendanceSchema>;
export type GradeItemInput = z.infer<typeof gradeItemSchema>;
export type GradeEntryInput = z.infer<typeof gradeEntrySchema>;
export type CampusClassroomInput = z.infer<typeof campusClassroomSchema>;
export type ClassSessionCreateInput = z.infer<typeof classSessionCreateSchema>;
export type ClassSessionUpdateInput = z.infer<typeof classSessionUpdateSchema>;
