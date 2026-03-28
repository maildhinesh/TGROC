import { DefaultSession } from "next-auth";

export type UserRole = "ADMIN" | "OFFICE_BEARER" | "MEMBER";
export type UserStatus = "ACTIVE" | "INACTIVE" | "PENDING";
export type MembershipType =
  | "INDIVIDUAL"
  | "FAMILY"
  | "STUDENT_INDIVIDUAL"
  | "STUDENT_FAMILY"
  | null;

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      status: UserStatus;
      membershipType: MembershipType;
    } & DefaultSession["user"];
  }

  interface User {
    role: UserRole;
    status: UserStatus;
    membershipType: MembershipType;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
    status: UserStatus;
    membershipType: MembershipType;
  }
}
