import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Create test admin user (required for testing)
  const testHashedPassword = await bcrypt.hash("johndoe123", 10);
  await prisma.adminUser.upsert({
    where: { email: "john@doe.com" },
    update: {
      password: testHashedPassword
    },
    create: {
      email: "john@doe.com",
      password: testHashedPassword,
      name: "Test Admin"
    }
  });
  
  // Create Dan's admin account - Retreat VR
  const danHashedPassword = await bcrypt.hash("Admin1990!", 10);
  await prisma.adminUser.upsert({
    where: { email: "dan@retreatvr.ca" },
    update: {
      password: danHashedPassword,
      name: "Daniel"
    },
    create: {
      email: "dan@retreatvr.ca",
      password: danHashedPassword,
      name: "Daniel"
    }
  });

  console.log("Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
