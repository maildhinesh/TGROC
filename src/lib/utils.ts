import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function getMembershipLabel(type: string | null | undefined): string {
  const labels: Record<string, string> = {
    INDIVIDUAL: "Individual",
    FAMILY: "Family",
    STUDENT_INDIVIDUAL: "Student (Individual)",
    STUDENT_FAMILY: "Student (Family)",
  };
  return type ? labels[type] ?? type : "—";
}

export function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    ADMIN: "Administrator",
    OFFICE_BEARER: "Office Bearer",
    MEMBER: "Member",
  };
  return labels[role] ?? role;
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    ACTIVE: "bg-green-100 text-green-800",
    INACTIVE: "bg-red-100 text-red-800",
    PENDING: "bg-yellow-100 text-yellow-800",
  };
  return colors[status] ?? "bg-gray-100 text-gray-800";
}
