// Run with: npx tsx scripts/test-prisma-create.mts
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool as any);
const prisma = new PrismaClient({ adapter });

async function main() {
  const testEmail = `diag-${Date.now()}@demo.jobtracker.dev`;

  // Test 1: Absolute minimum fields
  console.log("\n--- Test 1: Minimal create ---");
  try {
    const u1 = await prisma.user.create({
      data: { email: testEmail + "1", name: "Test1" },
    });
    console.log("✅ Minimal create works, id:", u1.id);
    await prisma.user.delete({ where: { id: u1.id } });
  } catch (e: any) {
    console.log("❌ Minimal create failed:", e.message?.slice(0, 200));
  }

  // Test 2: Add password_hash
  console.log("\n--- Test 2: With password_hash ---");
  try {
    const u2 = await prisma.user.create({
      data: { email: testEmail + "2", name: "Test2", password_hash: "abc123" },
    });
    console.log("✅ With password_hash works, id:", u2.id);
    await prisma.user.delete({ where: { id: u2.id } });
  } catch (e: any) {
    console.log("❌ With password_hash failed:", e.message?.slice(0, 200));
  }

  // Test 3: Add strategyMode + stalledDays
  console.log("\n--- Test 3: With strategyMode + stalledDays ---");
  try {
    const u3 = await prisma.user.create({
      data: {
        email: testEmail + "3",
        name: "Test3",
        password_hash: "abc123",
        strategyMode: "referral_first",
        stalledDays: 5,
      },
    });
    console.log("✅ With strategy works, id:", u3.id);
    await prisma.user.delete({ where: { id: u3.id } });
  } catch (e: any) {
    console.log("❌ With strategy failed:", e.message?.slice(0, 200));
  }

  // Test 4: Add config JSON
  console.log("\n--- Test 4: With config JSON ---");
  try {
    const u4 = await prisma.user.create({
      data: {
        email: testEmail + "4",
        name: "Test4",
        password_hash: "abc123",
        strategyMode: "referral_first",
        stalledDays: 5,
        config: { onboarding_completed: true, is_demo: true },
      },
    });
    console.log("✅ With config JSON works, id:", u4.id);
    await prisma.user.delete({ where: { id: u4.id } });
  } catch (e: any) {
    console.log("❌ With config JSON failed:", e.message?.slice(0, 200));
  }

  // Test 5: Full demo user (same as demo/start)
  console.log("\n--- Test 5: Full demo user ---");
  try {
    const u5 = await prisma.user.create({
      data: {
        email: testEmail + "5",
        name: "Test5",
        password_hash: "abc123",
        strategyMode: "referral_first",
        stalledDays: 5,
        config: {
          onboarding_completed: true,
          is_demo: true,
          schools: [],
          connections: [],
        },
      },
    });
    console.log("✅ Full demo user works, id:", u5.id);
    await prisma.user.delete({ where: { id: u5.id } });
  } catch (e: any) {
    console.log("❌ Full demo user failed:", e.message?.slice(0, 200));
  }

  await prisma.$disconnect();
  await pool.end();
}

main().catch(console.error);
