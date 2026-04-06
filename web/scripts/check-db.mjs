import pg from "pg";
import dotenv from "dotenv";
dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

async function main() {
  const client = await pool.connect();
  try {
    // Get all columns in the User table
    const res = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'User'
      ORDER BY ordinal_position;
    `);

    console.log("\n=== Columns in User table ===");
    for (const row of res.rows) {
      console.log(`  ${row.column_name} (${row.data_type}, nullable: ${row.is_nullable})`);
    }

    // Check which schema columns might be missing
    const expectedColumns = [
      "id", "email", "name", "password_hash", "emailVerified", "image",
      "createdAt", "billingStatus", "stripeCustomerId", "strategyMode",
      "stalledDays", "config", "targetRoles", "preferredLocations",
      "remotePreference", "emailDigest", "emailDigestDay", "toneProfile",
      "writingSamples", "apolloApiKey", "hunterApiKey"
    ];

    const actualColumns = res.rows.map(r => r.column_name);
    const missing = expectedColumns.filter(c => !actualColumns.includes(c));

    if (missing.length > 0) {
      console.log("\n=== MISSING COLUMNS ===");
      for (const col of missing) {
        console.log(`  ❌ ${col}`);
      }
    } else {
      console.log("\n✅ All expected columns exist");
    }

    // Also check all tables
    const tables = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    console.log("\n=== Tables in database ===");
    for (const row of tables.rows) {
      console.log(`  ${row.table_name}`);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
