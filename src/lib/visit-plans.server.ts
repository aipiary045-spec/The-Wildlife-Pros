import { prisma } from "@/lib/prisma";
import { visitPlanStats } from "@/lib/visit-plans";
import { nextNumber } from "@/lib/utils";
import type { JobType } from "@/generated/prisma/client";

export async function createVisitPlanTrip(planId: string, createdById: string) {
  const plan = await prisma.visitPlan.findUnique({
    where: { id: planId },
    include: {
      jobs: {
        select: { id: true, visitNumber: true, status: true, scheduledStart: true },
        orderBy: { visitNumber: "asc" },
      },
    },
  });
  if (!plan) return { error: "That visit plan is gone." as const };
  if (plan.status !== "ACTIVE") return { error: "This plan is closed." as const };

  const stats = visitPlanStats(plan, plan.jobs);
  if (!stats.canAddTrip || !stats.nextVisitNumber) {
    return { error: "Finish the last trip before adding the next one to the pool." as const };
  }

  const job = await prisma.$transaction(async (tx) => {
    const count = await tx.job.count();
    const created = await tx.job.create({
      data: {
        number: nextNumber("JOB", count),
        clientId: plan.clientId,
        propertyId: plan.propertyId,
        technicianId: plan.preferredTechId,
        createdById,
        type: plan.jobType,
        status: "UNSCHEDULED",
        title: `${plan.title} · trip ${stats.nextVisitNumber}`,
        instructions: plan.instructions,
        durationMin: plan.durationMin,
        visitPlanId: plan.id,
        visitNumber: stats.nextVisitNumber,
      },
      include: { client: true, property: true, technician: true, visitPlan: true },
    });

    const allJobs = [...plan.jobs, { id: created.id, visitNumber: created.visitNumber, status: created.status, scheduledStart: created.scheduledStart }];
    if (allJobs.length >= plan.totalVisits) {
      // Plan fully issued — stays ACTIVE until all trips complete
    }

    return created;
  });

  return { job };
}

export async function refreshVisitPlanStatus(planId: string) {
  const plan = await prisma.visitPlan.findUnique({
    where: { id: planId },
    include: { jobs: { select: { status: true } } },
  });
  if (!plan || plan.status !== "ACTIVE") return;

  const allDone =
    plan.jobs.length >= plan.totalVisits &&
    plan.jobs.every((job) => job.status === "COMPLETED" || job.status === "INVOICED");
  if (allDone) {
    await prisma.visitPlan.update({ where: { id: planId }, data: { status: "COMPLETED" } });
  }
}

export async function createVisitPlanWithOptionalFirstTrip(
  input: {
    clientId: string;
    propertyId: string;
    title: string;
    instructions?: string;
    totalVisits: number;
    durationMin: number;
    jobType: string;
    preferredTechId?: string;
    createFirstTrip: boolean;
  },
  createdById: string,
) {
  return prisma.$transaction(async (tx) => {
    const plan = await tx.visitPlan.create({
      data: {
        clientId: input.clientId,
        propertyId: input.propertyId,
        title: input.title,
        instructions: input.instructions,
        totalVisits: input.totalVisits,
        durationMin: input.durationMin,
        jobType: input.jobType as JobType,
        preferredTechId: input.preferredTechId,
      },
      include: {
        client: true,
        property: true,
        preferredTech: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    let firstJob = null;
    if (input.createFirstTrip) {
      const count = await tx.job.count();
      firstJob = await tx.job.create({
        data: {
          number: nextNumber("JOB", count),
          clientId: plan.clientId,
          propertyId: plan.propertyId,
          technicianId: plan.preferredTechId,
          createdById,
          type: plan.jobType,
          status: "UNSCHEDULED",
          title: `${plan.title} · trip 1`,
          instructions: plan.instructions,
          durationMin: plan.durationMin,
          visitPlanId: plan.id,
          visitNumber: 1,
        },
      });
    }

    return { plan, firstJob };
  });
}
