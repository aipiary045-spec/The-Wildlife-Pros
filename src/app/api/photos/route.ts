import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api";

export const GET = withAuth(async (_session, request) => {
  const url = new URL(request.url);
  const jobId = url.searchParams.get("jobId");
  const photos = await prisma.photo.findMany({
    where: { jobId: jobId || undefined },
    include: { entryPoint: true, property: true },
    orderBy: { takenAt: "desc" },
  });
  return NextResponse.json({ photos });
});

export const POST = withAuth(async (session, request) => {
  const body = await request.json();
  const photo = await prisma.photo.create({
    data: {
      jobId: body.jobId,
      propertyId: body.propertyId,
      entryPointId: body.entryPointId,
      uploadedById: session.id,
      kind: body.kind ?? "OTHER",
      url: body.url,
      caption: body.caption,
    },
  });
  return NextResponse.json({ photo }, { status: 201 });
});
