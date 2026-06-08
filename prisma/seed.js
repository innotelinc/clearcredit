/* eslint-disable @typescript-eslint/no-require-imports */
const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL || "admin@clearcredit.local";
  const password = process.env.ADMIN_PASSWORD || "ClearCreditAdmin!2026";
  const name = process.env.ADMIN_NAME || "ClearCredit Admin";
  const businessName = process.env.ADMIN_BUSINESS_NAME || "ClearCredit";
  const businessId = process.env.ADMIN_BUSINESS_ID || "default";

  const hashedPassword = await bcrypt.hash(password, 10);

  const business = await prisma.business.upsert({
    where: { id: businessId },
    update: {
      name: businessName,
    },
    create: {
      id: businessId,
      name: businessName,
      plan: "PRO",
    },
  });

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      name,
      password: hashedPassword,
      role: "ADMIN",
      businessId: business.id,
    },
    create: {
      email,
      name,
      password: hashedPassword,
      role: "ADMIN",
      businessId: business.id,
    },
  });

  console.log(
    JSON.stringify(
      {
        seeded: true,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          businessId: user.businessId,
        },
        business: {
          id: business.id,
          name: business.name,
          plan: business.plan,
        },
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
