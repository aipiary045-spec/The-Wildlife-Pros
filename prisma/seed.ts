import { hash } from "bcryptjs";
import { addDays, addHours, setHours, startOfDay } from "date-fns";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL is required to seed");
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

async function main() {
  await prisma.routeStop.deleteMany();
  await prisma.routeDay.deleteMany();
  await prisma.photo.deleteMany();
  await prisma.formSubmission.deleteMany();
  await prisma.chemicalApplication.deleteMany();
  await prisma.exclusionWork.deleteMany();
  await prisma.captureEvent.deleteMany();
  await prisma.trapCheck.deleteMany();
  await prisma.equipmentDeployment.deleteMany();
  await prisma.entryPoint.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.invoiceLineItem.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.quoteLineItem.deleteMany();
  await prisma.quote.deleteMany();
  await prisma.jobLineItem.deleteMany();
  await prisma.visit.deleteMany();
  await prisma.timeEntry.deleteMany();
  await prisma.note.deleteMany();
  await prisma.job.deleteMany();
  await prisma.recurringSchedule.deleteMany();
  await prisma.serviceRequest.deleteMany();
  await prisma.property.deleteMany();
  await prisma.client.deleteMany();
  await prisma.equipment.deleteMany();
  await prisma.service.deleteMany();
  await prisma.taxRate.deleteMany();
  await prisma.chemicalProduct.deleteMany();
  await prisma.species.deleteMany();
  await prisma.formTemplate.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();

  const org = await prisma.organization.create({
    data: {
      name: "The Wildlife Pros",
      tradeName: "CritterOps",
      phone: "704-555-0148",
      email: "hello@thewildlifepros.com",
      website: "https://thewildlifepros.com",
      licenseNumber: "NWCO-NC-4418",
      pesticideLicense: "NC-PC-22901",
      address1: "418 Ridge Line Dr",
      city: "Charlotte",
      state: "NC",
      postalCode: "28209",
      invoiceFooter: "Thank you for trusting The Wildlife Pros. Licensed · Insured · Humane.",
    },
  });

  const passwordHash = await hash("demo", 10);
  const [owner, dispatch, jordan, alex] = await Promise.all([
    prisma.user.create({
      data: {
        organizationId: org.id,
        email: "owner@thewildlifepros.com",
        passwordHash,
        firstName: "Riley",
        lastName: "Hart",
        role: "OWNER",
        color: "#E85D04",
        homeLat: 35.198,
        homeLng: -80.844,
        homeAddress: "Shop · 418 Ridge Line Dr",
      },
    }),
    prisma.user.create({
      data: {
        organizationId: org.id,
        email: "dispatch@thewildlifepros.com",
        passwordHash,
        firstName: "Sam",
        lastName: "Ortega",
        role: "DISPATCHER",
        color: "#F48C06",
        homeLat: 35.21,
        homeLng: -80.83,
      },
    }),
    prisma.user.create({
      data: {
        organizationId: org.id,
        email: "tech@thewildlifepros.com",
        passwordHash,
        firstName: "Jordan",
        lastName: "Blake",
        role: "TECHNICIAN",
        color: "#2A9D8F",
        homeLat: 35.205,
        homeLng: -80.86,
      },
    }),
    prisma.user.create({
      data: {
        organizationId: org.id,
        email: "alex@thewildlifepros.com",
        passwordHash,
        firstName: "Alex",
        lastName: "Nguyen",
        role: "TECHNICIAN",
        color: "#264653",
        homeLat: 35.175,
        homeLng: -80.8,
      },
    }),
  ]);

  const catalog: Array<{ name: string; jobType: "INSPECTION" | "TRAPPING" | "EXCLUSION" | "CLEANUP" | "RECURRING" | "EMERGENCY"; price: number }> = [
    { name: "Wildlife inspection", jobType: "INSPECTION", price: 149 },
    { name: "Raccoon trapping program", jobType: "TRAPPING", price: 325 },
    { name: "Squirrel exclusion", jobType: "EXCLUSION", price: 890 },
    { name: "One-way door install", jobType: "EXCLUSION", price: 275 },
    { name: "Attic sanitation", jobType: "CLEANUP", price: 450 },
    { name: "Rodent baiting visit", jobType: "RECURRING", price: 89 },
    { name: "Emergency same-day", jobType: "EMERGENCY", price: 199 },
  ];
  const services = await Promise.all(
    catalog.map((item) =>
      prisma.service.create({
        data: {
          organizationId: org.id,
          name: item.name,
          jobType: item.jobType,
          unitPrice: item.price,
        },
      }),
    ),
  );

  await prisma.taxRate.create({
    data: { organizationId: org.id, name: "Mecklenburg County", rate: 0.0725, default: true },
  });

  const raccoon = await prisma.species.create({
    data: { organizationId: org.id, commonName: "Raccoon", scientificName: "Procyon lotor", regulated: true },
  });
  const squirrel = await prisma.species.create({
    data: { organizationId: org.id, commonName: "Gray squirrel", scientificName: "Sciurus carolinensis" },
  });
  await prisma.species.create({
    data: { organizationId: org.id, commonName: "Norway rat", scientificName: "Rattus norvegicus" },
  });
  await prisma.species.create({
    data: { organizationId: org.id, commonName: "Big brown bat", scientificName: "Eptesicus fuscus", regulated: true },
  });

  const contrac = await prisma.chemicalProduct.create({
    data: {
      organizationId: org.id,
      name: "Contrac Blox",
      epaNumber: "12455-79",
      type: "RODENTICIDE",
      activeIngredient: "Bromadiolone 0.005%",
      signalWord: "Caution",
    },
  });
  await prisma.chemicalProduct.create({
    data: {
      organizationId: org.id,
      name: "Essentria IC3",
      epaNumber: "25(b) exempt",
      type: "PESTICIDE",
      activeIngredient: "Rosemary / geraniol / peppermint",
      signalWord: "Caution",
    },
  });

  const form = await prisma.formTemplate.create({
    data: {
      organizationId: org.id,
      name: "NC Wildlife capture & disposition log",
      jurisdiction: "North Carolina",
      schema: {
        fields: ["species", "quantity", "disposition", "relocationSite", "permitNumber"],
      },
    },
  });

  const maya = await prisma.client.create({
    data: {
      organizationId: org.id,
      firstName: "Maya",
      lastName: "Chen",
      email: "maya.chen@example.com",
      phone: "7045550192",
      portalToken: "demo-client-hub",
      notes: "Prefers text updates. Dog in backyard after 5pm.",
      properties: {
        create: {
          label: "Home",
          address1: "812 Willow Crest Ln",
          city: "Charlotte",
          state: "NC",
          postalCode: "28210",
          lat: 35.168,
          lng: -80.852,
          accessNotes: "Side gate latch sticks. Attic hatch in hallway.",
          petsOnSite: true,
        },
      },
    },
    include: { properties: true },
  });

  const hoa = await prisma.client.create({
    data: {
      organizationId: org.id,
      firstName: "Priya",
      lastName: "Shah",
      companyName: "Oakridge HOA",
      email: "board@oakridgehoa.example",
      phone: "7045550177",
      status: "ACTIVE",
      properties: {
        create: {
          label: "Clubhouse",
          type: "COMMERCIAL",
          address1: "200 Oakridge Club Dr",
          city: "Charlotte",
          state: "NC",
          postalCode: "28211",
          lat: 35.189,
          lng: -80.821,
          accessNotes: "Lockbox 4410. Manager on Tuesdays.",
        },
      },
    },
    include: { properties: true },
  });

  const barn = await prisma.client.create({
    data: {
      organizationId: org.id,
      firstName: "Eli",
      lastName: "Harper",
      companyName: "Riverbend Stables",
      email: "eli@riverbend.example",
      phone: "7045550133",
      properties: {
        create: {
          label: "Barn",
          type: "AGRICULTURAL",
          address1: "640 Riverbend Rd",
          city: "Matthews",
          state: "NC",
          postalCode: "28105",
          lat: 35.122,
          lng: -80.723,
          accessNotes: "Park by the tack room. Horses in west paddock.",
        },
      },
    },
    include: { properties: true },
  });

  const church = await prisma.client.create({
    data: {
      organizationId: org.id,
      firstName: "Deacon",
      lastName: "Wells",
      companyName: "First Baptist on Park",
      email: "facilities@fbp.example",
      phone: "7045550110",
      properties: {
        create: {
          label: "Sanctuary",
          type: "COMMERCIAL",
          address1: "101 Park Ave",
          city: "Charlotte",
          state: "NC",
          postalCode: "28203",
          lat: 35.215,
          lng: -80.845,
        },
      },
    },
    include: { properties: true },
  });

  const langford = await prisma.client.create({
    data: {
      organizationId: org.id,
      firstName: "Chris",
      lastName: "Langford",
      email: "clangford@example.com",
      phone: "9805550164",
      status: "LEAD",
      properties: {
        create: {
          label: "Primary",
          address1: "55 Pine Hollow Ct",
          city: "Pineville",
          state: "NC",
          postalCode: "28134",
          lat: 35.086,
          lng: -80.888,
        },
      },
    },
    include: { properties: true },
  });

  const today = startOfDay(new Date());
  const morning = setHours(today, 9);
  const midday = setHours(today, 11);
  const afternoon = setHours(today, 14);

  const quote = await prisma.quote.create({
    data: {
      number: "Q-0001",
      clientId: maya.id,
      propertyId: maya.properties[0].id,
      createdById: dispatch.id,
      status: "SENT",
      title: "Raccoon attic trapping + exclusion",
      message: "Full trapping program, one-way on the soffit, and seal remaining gaps after the last capture.",
      sentAt: addDays(today, -2),
      validUntil: addDays(today, 12),
      subtotal: 1490,
      taxAmount: 108.03,
      total: 1598.03,
      lineItems: {
        create: [
          { name: "Wildlife inspection", quantity: 1, unitPrice: 149, serviceId: services[0].id },
          { name: "Raccoon trapping program", quantity: 1, unitPrice: 325, serviceId: services[1].id },
          { name: "Squirrel / raccoon exclusion", quantity: 1, unitPrice: 890, serviceId: services[2].id },
          { name: "Attic sanitation", quantity: 1, unitPrice: 126, serviceId: services[4].id },
        ],
      },
    },
  });

  const job1 = await prisma.job.create({
    data: {
      number: "JOB-0001",
      clientId: maya.id,
      propertyId: maya.properties[0].id,
      quoteId: quote.id,
      technicianId: jordan.id,
      createdById: dispatch.id,
      type: "TRAPPING",
      status: "SCHEDULED",
      title: "Raccoon trap check — attic",
      instructions: "Check cage on chimney chase. If capture, relocate per NC guidelines and reset.",
      scheduledStart: morning,
      scheduledEnd: addHours(morning, 1),
      durationMin: 45,
      subtotal: 325,
      taxAmount: 23.56,
      total: 348.56,
      lineItems: { create: [{ name: "Raccoon trapping program", quantity: 1, unitPrice: 325 }] },
    },
  });

  const job2 = await prisma.job.create({
    data: {
      number: "JOB-0002",
      clientId: hoa.id,
      propertyId: hoa.properties[0].id,
      technicianId: alex.id,
      createdById: dispatch.id,
      type: "EXCLUSION",
      status: "SCHEDULED",
      title: "Clubhouse soffit exclusion",
      scheduledStart: midday,
      scheduledEnd: addHours(midday, 2),
      durationMin: 120,
      subtotal: 890,
      taxAmount: 64.53,
      total: 954.53,
      lineItems: { create: [{ name: "Squirrel exclusion", quantity: 1, unitPrice: 890 }] },
    },
  });

  await prisma.job.create({
    data: {
      number: "JOB-0003",
      clientId: barn.id,
      propertyId: barn.properties[0].id,
      technicianId: jordan.id,
      createdById: owner.id,
      type: "INSPECTION",
      status: "SCHEDULED",
      title: "Barn wildlife inspection",
      scheduledStart: afternoon,
      scheduledEnd: addHours(afternoon, 1),
      durationMin: 75,
      subtotal: 149,
      taxAmount: 10.8,
      total: 159.8,
      lineItems: { create: [{ name: "Wildlife inspection", quantity: 1, unitPrice: 149 }] },
    },
  });

  const job4 = await prisma.job.create({
    data: {
      number: "JOB-0004",
      clientId: church.id,
      propertyId: church.properties[0].id,
      technicianId: alex.id,
      createdById: dispatch.id,
      type: "FOLLOW_UP",
      status: "COMPLETED",
      title: "Sanctuary bird netting follow-up",
      scheduledStart: addDays(morning, -1),
      completedAt: addDays(morning, -1),
      durationMin: 60,
      subtotal: 275,
      taxAmount: 19.94,
      total: 294.94,
      lineItems: { create: [{ name: "One-way door install", quantity: 1, unitPrice: 275 }] },
    },
  });

  await prisma.job.create({
    data: {
      number: "JOB-0005",
      clientId: langford.id,
      propertyId: langford.properties[0].id,
      technicianId: alex.id,
      createdById: dispatch.id,
      type: "RECURRING",
      status: "SCHEDULED",
      title: "Rodent station service",
      scheduledStart: addDays(setHours(today, 10), 1),
      durationMin: 40,
      subtotal: 89,
      taxAmount: 6.45,
      total: 95.45,
      lineItems: { create: [{ name: "Rodent baiting visit", quantity: 1, unitPrice: 89 }] },
    },
  });

  const trap14 = await prisma.equipment.create({
    data: { serialNumber: "T-014", name: "Tomahawk live cage #14", type: "LIVE_CAGE", status: "DEPLOYED" },
  });
  const trap21 = await prisma.equipment.create({
    data: { serialNumber: "T-021", name: "Tomahawk live cage #21", type: "LIVE_CAGE", status: "IN_INVENTORY" },
  });
  const owd = await prisma.equipment.create({
    data: { serialNumber: "OWD-07", name: "One-way door 7", type: "ONE_WAY_DOOR", status: "DEPLOYED" },
  });
  await prisma.equipment.create({
    data: { serialNumber: "CAM-03", name: "Trail camera 3", type: "CAMERA", status: "IN_INVENTORY" },
  });

  const deploy14 = await prisma.equipmentDeployment.create({
    data: {
      equipmentId: trap14.id,
      jobId: job1.id,
      propertyId: maya.properties[0].id,
      locationNote: "Attic — chimney chase, baited with marshmallow",
      targetSpecies: "Raccoon",
      status: "ACTIVE_CAPTURE",
    },
  });
  await prisma.equipmentDeployment.create({
    data: {
      equipmentId: owd.id,
      jobId: job2.id,
      propertyId: hoa.properties[0].id,
      locationNote: "Clubhouse rear soffit, west gable",
      targetSpecies: "Gray squirrel",
      status: "DEPLOYED",
    },
  });
  await prisma.equipment.update({ where: { id: trap21.id }, data: { status: "IN_INVENTORY" } });

  await prisma.trapCheck.create({
    data: { deploymentId: deploy14.id, result: "CAPTURE", notes: "Adult raccoon, healthy, no kits visible." },
  });

  const entry = await prisma.entryPoint.create({
    data: {
      propertyId: maya.properties[0].id,
      jobId: job1.id,
      label: "Soffit gap at chimney",
      area: "Roof / attic",
      description: "4-inch gap where fascia pulled away from chase.",
    },
  });

  await prisma.captureEvent.create({
    data: {
      jobId: job1.id,
      speciesId: raccoon.id,
      technicianId: jordan.id,
      deploymentId: deploy14.id,
      quantity: 1,
      sex: "F",
      ageClass: "adult",
      disposition: "RELOCATED",
      dispositionNote: "Relocated 12 miles to approved woodland site.",
      locationNote: "Attic chimney chase",
    },
  });
  await prisma.captureEvent.create({
    data: {
      jobId: job2.id,
      speciesId: squirrel.id,
      technicianId: alex.id,
      quantity: 2,
      disposition: "RELEASED_ON_SITE",
      locationNote: "Rear soffit after one-way installed",
    },
  });

  await prisma.exclusionWork.create({
    data: {
      jobId: job2.id,
      material: "1/4-in galvanized hardware cloth + exterior sealant",
      quantity: "18 linear ft",
      notes: "Sealed after confirming animals were out.",
    },
  });

  await prisma.chemicalApplication.create({
    data: {
      jobId: job4.id,
      productId: contrac.id,
      technicianId: alex.id,
      targetPests: "Norway rat",
      method: "Tamper-resistant bait station",
      rate: "4–16 oz per station",
      quantity: "6 stations",
      areaTreated: "Sanctuary crawlspace perimeter",
      weather: "Clear, 74F",
    },
  });

  await prisma.photo.createMany({
    data: [
      {
        jobId: job1.id,
        propertyId: maya.properties[0].id,
        entryPointId: entry.id,
        uploadedById: jordan.id,
        kind: "BEFORE",
        url: "/photos/before-soffit.svg",
        caption: "Open soffit before exclusion",
      },
      {
        jobId: job1.id,
        propertyId: maya.properties[0].id,
        entryPointId: entry.id,
        uploadedById: jordan.id,
        kind: "AFTER",
        url: "/photos/after-soffit.svg",
        caption: "Hardware cloth installed",
      },
      {
        jobId: job1.id,
        propertyId: maya.properties[0].id,
        uploadedById: jordan.id,
        kind: "CAPTURE",
        url: "/photos/trap.svg",
        caption: "Trap #14 — active raccoon",
      },
    ],
  });

  await prisma.formSubmission.create({
    data: {
      templateId: form.id,
      jobId: job1.id,
      technicianId: jordan.id,
      data: {
        species: "Raccoon",
        quantity: 1,
        disposition: "Relocated",
        permitNumber: "NWCO-NC-4418",
      },
    },
  });

  await prisma.invoice.create({
    data: {
      number: "INV-0001",
      clientId: church.id,
      propertyId: church.properties[0].id,
      jobId: job4.id,
      createdById: dispatch.id,
      status: "SENT",
      dueOn: addDays(today, 10),
      sentAt: addDays(today, -1),
      subtotal: 275,
      taxAmount: 19.94,
      total: 294.94,
      balance: 294.94,
      lineItems: { create: [{ name: "One-way door / bird follow-up", quantity: 1, unitPrice: 275 }] },
    },
  });

  await prisma.invoice.create({
    data: {
      number: "INV-0002",
      clientId: maya.id,
      propertyId: maya.properties[0].id,
      createdById: dispatch.id,
      status: "PARTIAL",
      dueOn: addDays(today, 5),
      subtotal: 149,
      taxAmount: 10.8,
      total: 159.8,
      balance: 59.8,
      lineItems: { create: [{ name: "Wildlife inspection", quantity: 1, unitPrice: 149 }] },
      payments: { create: [{ amount: 100, method: "CARD", reference: "visa-4242" }] },
    },
  });

  await prisma.note.create({
    data: {
      clientId: maya.id,
      jobId: job1.id,
      authorId: jordan.id,
      body: "Homeowner heard activity 2am. Reset T-014 closer to the chase.",
    },
  });

  await prisma.serviceRequest.create({
    data: {
      clientId: langford.id,
      propertyId: langford.properties[0].id,
      title: "Rats in crawlspace",
      details: "Saw droppings near HVAC. Wants quote for exclusion + stations.",
      source: "web",
    },
  });

  console.log("Seeded The Wildlife Pros demo data.");
  console.log("Logins: owner@ / dispatch@ / tech@thewildlifepros.com  password: demo");
  console.log("Client hub: /portal/demo-client-hub");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
