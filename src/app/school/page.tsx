import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { BookOpen, ClipboardList, FileSpreadsheet, TimerReset, Users } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSchoolAccessState, hasAnySchoolRole, isEligibleSchoolParent, isSchoolAdmin, isSchoolTeacher } from "@/lib/school-auth";

export default async function SchoolDashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/auth/login");
  }

  const accessState = await getSchoolAccessState(session.user.id);
  if (!accessState || !hasAnySchoolRole(accessState)) {
    redirect("/dashboard");
  }

  const [activeYears, parentStudents, pendingEnrollments, teacherClasses] = await Promise.all([
    prisma.schoolYear.count({ where: { status: { in: ["PLANNED", "ACTIVE"] } } }),
    isEligibleSchoolParent(accessState)
      ? prisma.studentProfile.count({ where: { parentUserId: session.user.id } })
      : Promise.resolve(0),
    isSchoolAdmin(accessState)
      ? prisma.schoolEnrollment.count({ where: { status: "SUBMITTED" } })
      : Promise.resolve(0),
    isSchoolTeacher(accessState)
      ? prisma.schoolClass.count({
          where: {
            teacherAssignments: {
              some: {
                teacherUserId: session.user.id,
                assignedTo: null,
              },
            },
          },
        })
      : Promise.resolve(0),
  ]);

  const cards = [
    { label: "Active School Years", value: activeYears, detail: "Planned or active terms" },
    { label: "My Students", value: parentStudents, detail: "Profiles linked to your account" },
    { label: "Pending Reviews", value: pendingEnrollments, detail: "Enrollments awaiting school admin action" },
    { label: "My Classes", value: teacherClasses, detail: "Currently assigned classrooms" },
  ].filter((card) => card.value > 0 || card.label === "Active School Years");

  const quickLinks = [
    isSchoolAdmin(accessState)
      ? {
          href: "/school/admin",
          title: "Admin Oversight",
          description: "Review enrollments, inspect years, and monitor classes.",
          icon: <ClipboardList className="h-7 w-7 text-amber-600" />,
          bg: "bg-amber-50",
        }
      : null,
    isSchoolTeacher(accessState)
      ? {
          href: "/school/teacher",
          title: "Teacher Workspace",
          description: "See assigned classes and use attendance/grades/sessions tools.",
          icon: <BookOpen className="h-7 w-7 text-cyan-600" />,
          bg: "bg-cyan-50",
        }
      : null,
    isEligibleSchoolParent(accessState)
      ? {
          href: "/school/parent",
          title: "Parent Workspace",
          description: "Create profiles and manage school enrollment drafts and submissions.",
          icon: <Users className="h-7 w-7 text-emerald-600" />,
          bg: "bg-emerald-50",
        }
      : null,
    isSchoolAdmin(accessState)
      ? {
          href: "/school/admin/sessions",
          title: "Session Operations",
          description: "Manage classrooms and class session scheduling.",
          icon: <TimerReset className="h-7 w-7 text-teal-600" />,
          bg: "bg-teal-50",
        }
      : null,
    isSchoolAdmin(accessState)
      ? {
          href: "/school/admin/reports",
          title: "Reports",
          description: "Download attendance and grade exports.",
          icon: <FileSpreadsheet className="h-7 w-7 text-violet-600" />,
          bg: "bg-violet-50",
        }
      : null,
  ].filter(Boolean);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="rounded-2xl bg-gradient-to-r from-emerald-600 to-cyan-700 p-6 text-white">
          <h1 className="text-2xl font-bold">Tamil School Dashboard</h1>
          <p className="mt-2 text-sm text-emerald-50">
            Roles: {accessState.schoolRoles.join(", ")}. Use the school APIs and upcoming pages from this
            workspace slice to manage enrollments, classes, and assignments.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => (
            <div key={card.label} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-gray-500">{card.label}</p>
              <p className="mt-2 text-3xl font-semibold text-gray-900">{card.value}</p>
              <p className="mt-2 text-sm text-gray-600">{card.detail}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {quickLinks.map((link) => (
            <Link
              key={link.href + link.title}
              href={link.href}
              className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${link.bg}`}>
                {link.icon}
              </div>
              <h2 className="font-semibold text-gray-900">{link.title}</h2>
              <p className="mt-1 text-sm text-gray-500">{link.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
