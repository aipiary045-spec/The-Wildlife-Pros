import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api";

export const GET = withAuth(async () => {
  const [templates, submissions, applications] = await Promise.all([
    prisma.formTemplate.findMany({ where: { active: true } }),
    prisma.formSubmission.findMany({
      include: { template: true, job: { include: { client: true } }, technician: true },
      orderBy: { submittedAt: "desc" },
      take: 50,
    }),
    prisma.chemicalApplication.findMany({
      include: { product: true, job: { include: { property: true, client: true } } },
      orderBy: { appliedAt: "desc" },
      take: 50,
    }),
  ]);
  return NextResponse.json({ templates, submissions, applications });
});

export const POST = withAuth(async (session, request) => {
  const body = await request.json();
  const submission = await prisma.formSubmission.create({
    data: {
      templateId: body.templateId,
      jobId: body.jobId,
      technicianId: session.id,
      data: body.data ?? {},
    },
    include: { template: true },
  });
  return NextResponse.json({ submission }, { status: 201 });
});
