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
  const schoolClassId = searchParams.get("schoolClassId") ?? undefined;

  const grades = await prisma.studentGrade.findMany({
    where: {
      gradeItem: {
        schoolClassId,
      },
    },
    include: {
      studentProfile: { select: { firstName: true, lastName: true } },
      gradeItem: {
        select: {
          title: true,
          maxScore: true,
          assignedOn: true,
          schoolClass: { select: { className: true, classCode: true } },
        },
      },
      gradedBy: { select: { name: true, email: true } },
    },
    orderBy: [{ gradeItem: { assignedOn: "asc" } }, { studentProfile: { firstName: "asc" } }],
  });

  if (format === "csv") {
    const rows = [
      [
        "assignedOn",
        "classCode",
        "className",
        "gradeItem",
        "studentName",
        "score",
        "maxScore",
        "letterGrade",
        "comment",
        "gradedBy",
        "gradedAt",
      ],
      ...grades.map((grade) => [
        grade.gradeItem.assignedOn.toISOString().slice(0, 10),
        grade.gradeItem.schoolClass.classCode,
        grade.gradeItem.schoolClass.className,
        grade.gradeItem.title,
        `${grade.studentProfile.firstName} ${grade.studentProfile.lastName}`,
        String(grade.score),
        String(grade.gradeItem.maxScore),
        grade.letterGrade ?? "",
        grade.comment ?? "",
        grade.gradedBy.name ?? grade.gradedBy.email ?? "",
        grade.gradedAt.toISOString(),
      ]),
    ];

    return new NextResponse(toCsv(rows), {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename=grades-report-${Date.now()}.csv`,
      },
    });
  }

  const summary = {
    totalGrades: grades.length,
    averageScore:
      grades.length > 0
        ? Number(
            (
              grades.reduce((sum, grade) => sum + Number(grade.score), 0) /
              grades.length
            ).toFixed(2)
          )
        : 0,
  };

  return NextResponse.json({ summary, grades });
}
