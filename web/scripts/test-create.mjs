import pg from "pg";
import dotenv from "dotenv";
dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

async function main() {
  const client = await pool.connect();
  try {
    // Try creating a user directly via SQL to verify it works
    const testEmail = `diag-${Date.now()}@demo.jobtracker.dev`;

    console.log("Testing direct SQL insert...");
    const res = await client.query(`
      INSERT INTO "User" (id, email, name, password_hash, "strategyMode", "stalledDays", config, "createdAt", "billingStatus", "emailDigest", "emailDigestDay")
      VALUES (gen_random_uuid(), $1, 'Test User', 'hash123', 'referral_first', 5, '{"is_demo": true}', NOW(), 'free', true, 1)
      RETURNING id, email
    `, [testEmail]);

    console.log("✅ Direct SQL insert works:", res.rows[0]);

    // Clean up
    await client.query(`DELETE FROM "User" WHERE email = $1`, [testEmail]);
    console.log("✅ Cleaned up test user");

    // Now check enum values
    console.log("\n=== Checking enums ===");
    const strategyEnums = await client.query(`SELECT unnest(enum_range(NULL::"StrategyMode")) as val`);
    console.log("StrategyMode values:", strategyEnums.rows.map(r => r.val));

    const billingEnums = await client.query(`SELECT unnest(enum_range(NULL::"BillingStatus")) as val`);
    console.log("BillingStatus values:", billingEnums.rows.map(r => r.val));

    // Check if targetRoles and preferredLocations have defaults
    console.log("\n=== Checking column defaults ===");
    const defaults = await client.query(`
      SELECT column_name, column_default
      FROM information_schema.columns
      WHERE table_name = 'User' AND column_name IN ('targetRoles', 'preferredLocations', 'config', 'emailDigest', 'emailDigestDay')
    `);
    for (const row of defaults.rows) {
      console.log(`  ${row.column_name}: default = ${row.column_default}`);
    }

  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
