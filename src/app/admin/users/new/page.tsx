"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { DashboardLayout } from "@/components/dashboard-layout";
import { PageHeader, Card, Button, Input, Select } from "@/components/ui";
import { createUserSchema, CreateUserInput } from "@/lib/validations";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import Link from "next/link";

export default function NewUserPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { role: "MEMBER", membershipType: "INDIVIDUAL" },
  });

  const role = watch("role");

  const onSubmit = async (data: CreateUserInput) => {
    setIsLoading(true);
    setServerError(null);

    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const json = await res.json();
    setIsLoading(false);

    if (!res.ok) {
      setServerError(json.error ?? "Failed to create user.");
    } else {
      router.push(`/admin/users/${json.user.id}`);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl">
        <div className="mb-6">
          <Link
            href="/admin/users"
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Users
          </Link>
          <PageHeader title="Create New User" description="Add a new member to TGROC." />
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
                  placeholder="John"
                />
                <Input
                  label="Last Name"
                  required
                  {...register("lastName")}
                  error={errors.lastName?.message}
                  placeholder="Doe"
                />
              </div>
              <Input
                label="Email Address"
                type="email"
                required
                {...register("email")}
                error={errors.email?.message}
                placeholder="john.doe@example.com"
              />
              <Input
                label="Phone Number"
                type="tel"
                {...register("phone")}
                placeholder="+1 (555) 000-0000"
              />
            </div>
          </Card>

          <Card title="Account Settings">
            <div className="space-y-4">
              <Select
                label="Role"
                required
                {...register("role")}
                error={errors.role?.message}
                options={[
                  { value: "MEMBER", label: "Member" },
                  { value: "OFFICE_BEARER", label: "Office Bearer" },
                  { value: "ADMIN", label: "Administrator" },
                ]}
              />
              {role === "MEMBER" && (
                <Select
                  label="Membership Type"
                  {...register("membershipType")}
                  options={[
                    { value: "INDIVIDUAL", label: "Individual" },
                    { value: "FAMILY", label: "Family" },
                    { value: "STUDENT_INDIVIDUAL", label: "Student – Individual" },
                    { value: "STUDENT_FAMILY", label: "Student – Family" },
                  ]}
                />
              )}
            </div>
          </Card>

          <Card title="Password">
            <div className="space-y-4">
              <div className="relative">
                <Input
                  label="Password"
                  type={showPassword ? "text" : "password"}
                  required
                  {...register("password")}
                  error={errors.password?.message}
                  placeholder="Min. 8 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-8 text-gray-400"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <Input
                label="Confirm Password"
                type="password"
                required
                {...register("confirmPassword")}
                error={errors.confirmPassword?.message}
                placeholder="Re-enter password"
              />
            </div>
          </Card>

          <div className="flex gap-3 justify-end">
            <Link href="/admin/users">
              <Button variant="secondary" type="button">
                Cancel
              </Button>
            </Link>
            <Button type="submit" isLoading={isLoading}>
              Create User
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
