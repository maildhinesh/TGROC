import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { forbidden, getSchoolAccessState, getSchoolSession, isSchoolAdmin, unauthorized } from "@/lib/school-auth";

function toCsv(rows: string[][]) {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          const value = cell ?? "";
          if (value.includes(",") || value.includes("\"") || value.includes("\n")) {
            return `"${value.replace(/\"/g, "\"\"")}"`;
          }
          return value;
        })
        .join(",")
    )
    .join("\n");
}

export async function GET(req: Request) {
  const session = await getSchoolSession();
  if (!session) {
    return unauthorized();
  }

  const accessState = await getSchoolAccessState(session.user.id);
  if (!accessState) {
    return unauthorized();
  }

  if (!isSchoolAdmin(accessState)) {
    return forbidden();
  }

  const { searchParams } = new URL(req.url);
  const format = searchParams.get("format") ?? "json";
  const schoolYearId = searchParams.get("schoolYearId") ?? undefined;
  const schoolClassId = searchParams.get("schoolClassId") ?? undefined;

  const entries = await prisma.studentAttendance.findMany({
    where: {
      classSession: {
        schoolYearId,
        schoolClassId,
      },
    },
    include: {
      studentProfile: { select: { firstName: true, lastName: true } },
      classSession: {
        select: {
          calendarDate: true,
          status: true,
          schoolClass: { select: { className: true, classCode: true } },
        },
      },
      markedBy: { select: { name: true, email: true } },
    },
    orderBy: [{ classSession: { calendarDate: "asc" } }, { studentProfile: { firstName: "asc" } }],
  });

  if (format === "csv") {
    const rows = [
      [
        "calendarDate",
        "classCode",
        "className",
        "studentName",
        "status",
        "note",
        "markedBy",
        "markedAt",
      ],
      ...entries.map((entry) => [
        entry.classSession.calendarDate.toISOString().slice(0, 10),
        entry.classSession.schoolClass.classCode,
        entry.classSession.schoolClass.className,
        `${entry.studentProfile.firstName} ${entry.studentProfile.lastName}`,
        entry.status,
        entry.note ?? "",
        entry.markedBy.name ?? entry.markedBy.email ?? "",
        entry.markedAt.toISOString(),
      ]),
    ];

    return new NextResponse(toCsv(rows), {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename=attendance-report-${Date.now()}.csv`,
      },
    });
  }

  const summary = {
    totalEntries: entries.length,
    present: entries.filter((entry) => entry.status === "PRESENT").length,
    absent: entries.filter((entry) => entry.status === "ABSENT").length,
    excused: entries.filter((entry) => entry.status === "EXCUSED").length,
    late: entries.filter((entry) => entry.status === "LATE").length,
  };

  return NextResponse.json({ summary, entries });
}
