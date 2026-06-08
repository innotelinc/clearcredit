import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash("admin123", 12);

  const business = await prisma.business.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      name: "ClearCredit Default Business",
      plan: "PROFESSIONAL",
    },
  });

  const user = await prisma.user.upsert({
    where: { email: "admin@clearcredit.com" },
    update: {},
    create: {
      email: "admin@clearcredit.com",
      password: hashedPassword,
      name: "Admin User",
      role: "ADMIN",
      businessId: business.id,
    },
  });

  console.log(`Seeded admin user: ${user.email} / admin123`);
  console.log(`Seeded business: ${business.name}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
