import type { Prisma } from "@/generated/prisma/client";
import { notifyEmergencyCustomer } from "@/lib/emergency";
import { prisma } from "@/lib/prisma";

type TxClient = Prisma.TransactionClient;

/**
 * Assigns an unassigned (or stealable) emergency to a technician and optionally
 * texts the customer once — only after a human has claimed the job.
 */
export async function claimEmergencyDispatch(
  tx: TxClient,
  params: {
    dispatchId: string;
    jobId: string;
    technicianId: string;
    notifyCustomerIfRequested?: boolean;
  },
): Promise<{ customerSmsSent: boolean }> {
  const now = new Date();
  const dispatch = await tx.emergencyDispatch.update({
    where: { id: params.dispatchId },
    data: {
      assignedTechnicianId: params.technicianId,
      acknowledgedAt: now,
      acknowledgedById: params.technicianId,
    },
    select: {
      id: true,
      notifyCustomerRequested: true,
      customerSmsSentAt: true,
      job: {
        select: {
          title: true,
          client: { select: { phone: true, firstName: true } },
        },
      },
      assignedTechnician: {
        select: { firstName: true, lastName: true },
      },
    },
  });

  await tx.job.update({
    where: { id: params.jobId },
    data: { technicianId: params.technicianId },
  });

  let customerSmsSent = false;
  if (
    params.notifyCustomerIfRequested !== false &&
    dispatch.notifyCustomerRequested &&
    !dispatch.customerSmsSentAt
  ) {
    const tech = dispatch.assignedTechnician;
    const techName = tech ? `${tech.firstName} ${tech.lastName}`.trim() : undefined;
    const sms = await notifyEmergencyCustomer({
      phone: dispatch.job.client.phone,
      clientFirstName: dispatch.job.client.firstName,
      jobTitle: dispatch.job.title,
      techName,
    });
    if (sms.ok) {
      customerSmsSent = true;
      await tx.emergencyDispatch.update({
        where: { id: dispatch.id },
        data: { customerSmsSentAt: now },
      });
    }
  }

  return { customerSmsSent };
}

/** Claim emergency when a tech checks in on a job that still needs an assignee. */
export async function claimEmergencyOnCheckIn(params: {
  jobId: string;
  organizationId: string;
  technicianId: string;
}): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const dispatch = await tx.emergencyDispatch.findFirst({
      where: {
        jobId: params.jobId,
        job: { client: { organizationId: params.organizationId } },
      },
      select: {
        id: true,
        assignedTechnicianId: true,
      },
    });
    if (!dispatch) return;
    if (
      dispatch.assignedTechnicianId &&
      dispatch.assignedTechnicianId !== params.technicianId
    ) {
      return;
    }
    if (dispatch.assignedTechnicianId === params.technicianId) {
      await tx.emergencyDispatch.update({
        where: { id: dispatch.id },
        data: {
          acknowledgedAt: new Date(),
          acknowledgedById: params.technicianId,
        },
      });
      return;
    }
    await claimEmergencyDispatch(tx, {
      dispatchId: dispatch.id,
      jobId: params.jobId,
      technicianId: params.technicianId,
    });
  });
}
