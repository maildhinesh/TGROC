"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { DashboardLayout } from "@/components/dashboard-layout";
import { PageHeader, Card, Button, Input, Select, Spinner } from "@/components/ui";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { z } from "zod";

const editUserSchema = z.object({
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  phone: z.string().optional(),
  dateOfBirth: z.string().optional(),
  membershipExpiry: z.string().optional(),
  role: z.enum(["ADMIN", "OFFICE_BEARER", "MEMBER"]),
  status: z.enum(["ACTIVE", "INACTIVE", "PENDING"]),
  membershipType: z
    .enum(["INDIVIDUAL", "FAMILY", "STUDENT_INDIVIDUAL", "STUDENT_FAMILY"])
    .optional()
    .or(z.literal("")),
  newPassword: z.string().optional(),
  confirmNewPassword: z.string().optional(),
}).superRefine((data, ctx) => {
  const hasPasswordInput = !!data.newPassword || !!data.confirmNewPassword;
  if (!hasPasswordInput) return;

  if (!data.newPassword || data.newPassword.length < 8) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["newPassword"],
      message: "New password must be at least 8 characters",
    });
  }

  if (data.newPassword !== data.confirmNewPassword) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["confirmNewPassword"],
      message: "Passwords do not match",
    });
  }
});

type EditUserInput = z.infer<typeof editUserSchema>;

const ALL_SCHOOL_ROLES = [
  { value: "SCHOOL_PARENT", label: "School Parent" },
  { value: "SCHOOL_TEACHER", label: "School Teacher" },
  { value: "SCHOOL_ADMIN", label: "School Admin" },
] as const;

export default function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [serverError, setServerError] = useState<string | null>(null);
  const [schoolRoles, setSchoolRoles] = useState<string[]>([]);
  const [isSchoolRolesLoading, setIsSchoolRolesLoading] = useState(false);
  const [schoolRolesError, setSchoolRolesError] = useState<string | null>(null);
  const [schoolRolesSaved, setSchoolRolesSaved] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<EditUserInput>({
    resolver: zodResolver(editUserSchema),
  });

  const role = watch("role");

  useEffect(() => {
    fetch(`/api/users/${id}/school-roles`)
      .then((r) => r.json())
      .then(({ assignments }) => {
        if (assignments) {
          setSchoolRoles(
            assignments
              .filter((a: { role: string; isActive: boolean }) => a.isActive)
              .map((a: { role: string; isActive: boolean }) => a.role)
          );
        }
      });
  }, [id]);

  useEffect(() => {
    fetch(`/api/users/${id}`)
      .then((r) => r.json())
      .then(({ user }) => {
        if (user) {
          reset({
            firstName: user.profile?.firstName ?? "",
            lastName: user.profile?.lastName ?? "",
            phone: user.profile?.phone ?? "",
            dateOfBirth: user.profile?.dateOfBirth
              ? new Date(user.profile.dateOfBirth).getUTCFullYear().toString()
              : "",
            role: user.role,
            status: user.status,
            membershipType: user.membershipType ?? "",
            membershipExpiry: user.membershipExpiry
              ? new Date(user.membershipExpiry).toISOString().split("T")[0]
              : "",
          });
        }
        setIsFetching(false);
      });
  }, [id, reset]);

  const onSubmit = async (data: EditUserInput) => {
    setIsLoading(true);
    setServerError(null);

    const res = await fetch(`/api/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        role: data.role,
        status: data.status,
        membershipType: data.membershipType || null,
        membershipExpiry: data.membershipExpiry || null,
        ...(data.newPassword ? { password: data.newPassword } : {}),
        profile: {
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
          dateOfBirth: data.dateOfBirth,
        },
      }),
    });

    const json = await res.json();
    setIsLoading(false);

    if (!res.ok) {
      setServerError(json.error ?? "Failed to update user.");
    } else {
      router.push(`/admin/users/${id}`);
    }
  };

  if (isFetching) {
    return (
      <DashboardLayout>
        <div className="flex justify-center py-20">
          <Spinner />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-2xl">
        <div className="mb-6">
          <Link
            href={`/admin/users/${id}`}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
          >
            <ArrowLeft className="w-4 h-4" /> Back to User
          </Link>
          <PageHeader title="Edit User" />
        </div>

        {serverError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <Card title="Personal Information">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="First Name"
                  required
                  {...register("firstName")}
                  error={errors.firstName?.message}
                />
                <Input
                  label="Last Name"
                  required
                  {...register("lastName")}
                  error={errors.lastName?.message}
                />
              </div>
              <Input
                label="Phone Number"
                type="tel"
                {...register("phone")}
              />
              <Input
                label="Year of Birth"
                type="number"
                min={1900}
                max={new Date().getUTCFullYear()}
                placeholder="e.g. 1985"
                {...register("dateOfBirth")}
              />
            </div>
          </Card>

          <Card title="Account Settings">
            <div className="space-y-4">
              <Select
                label="Role"
                required
                {...register("role")}
                options={[
                  { value: "MEMBER", label: "Member" },
                  { value: "OFFICE_BEARER", label: "Office Bearer" },
                  { value: "ADMIN", label: "Administrator" },
                ]}
              />
              <Select
                label="Status"
                required
                {...register("status")}
                options={[
                  { value: "ACTIVE", label: "Active" },
                  { value: "PENDING", label: "Pending" },
                  { value: "INACTIVE", label: "Inactive" },
                ]}
              />
              {role === "MEMBER" && (
                <Select
                  label="Membership Type"
                  {...register("membershipType")}
                  options={[
                    { value: "", label: "— None —" },
                    { value: "INDIVIDUAL", label: "Individual" },
                    { value: "FAMILY", label: "Family" },
                    { value: "STUDENT_INDIVIDUAL", label: "Student – Individual" },
                    { value: "STUDENT_FAMILY", label: "Student – Family" },
                  ]}
                />
              )}
              <Input
                label="Membership Expiry Date"
                type="date"
                {...register("membershipExpiry")}
                hint="Annual membership runs April 1 – March 31"
              />
            </div>
          </Card>

          <Card title="Reset Password" description="Set a new password for this user.">
            <div className="space-y-4">
              <Input
                label="New Password"
                type="password"
                {...register("newPassword")}
                error={errors.newPassword?.message}
                hint="Leave blank to keep the existing password"
              />
              <Input
                label="Confirm New Password"
                type="password"
                {...register("confirmNewPassword")}
                error={errors.confirmNewPassword?.message}
              />
            </div>
          </Card>

          <Card title="School Roles" description="Assign school roles to this user. Changes save immediately.">
            <div className="space-y-2">
              {ALL_SCHOOL_ROLES.map(({ value, label }) => (
                <label key={value} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-gray-300 text-blue-600"
                    checked={schoolRoles.includes(value)}
                    onChange={(e) => {
                      setSchoolRoles((prev) =>
                        e.target.checked ? [...prev, value] : prev.filter((r) => r !== value)
                      );
                      setSchoolRolesSaved(false);
                    }}
                  />
                  <span className="text-sm font-medium text-gray-700">{label}</span>
                </label>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-3">
              <Button
                type="button"
                variant="secondary"
                isLoading={isSchoolRolesLoading}
                onClick={async () => {
                  setIsSchoolRolesLoading(true);
                  setSchoolRolesError(null);
                  setSchoolRolesSaved(false);
                  const res = await fetch(`/api/users/${id}/school-roles`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ roles: schoolRoles }),
                  });
                  setIsSchoolRolesLoading(false);
                  if (res.ok) {
                    setSchoolRolesSaved(true);
                  } else {
                    const json = await res.json();
                    setSchoolRolesError(json.error ?? "Failed to save school roles.");
                  }
                }}
              >
                Save School Roles
              </Button>
              {schoolRolesSaved && (
                <span className="text-sm text-green-600">Saved!</span>
              )}
              {schoolRolesError && (
                <span className="text-sm text-red-600">{schoolRolesError}</span>
              )}
            </div>
          </Card>

          <div className="flex gap-3 justify-end">
            <Link href={`/admin/users/${id}`}>
              <Button variant="secondary" type="button">Cancel</Button>
            </Link>
            <Button type="submit" isLoading={isLoading}>
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
