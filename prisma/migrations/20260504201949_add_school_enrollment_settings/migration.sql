-- CreateTable
CREATE TABLE "school_enrollment_settings" (
    "id" TEXT NOT NULL,
    "isEnrollmentEnabled" BOOLEAN NOT NULL DEFAULT false,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "school_enrollment_settings_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "school_enrollment_settings" ADD CONSTRAINT "school_enrollment_settings_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
