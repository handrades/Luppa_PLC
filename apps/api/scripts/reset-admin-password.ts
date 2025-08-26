import 'dotenv/config';
import bcrypt from 'bcrypt';
import { Client } from 'pg';
import { program } from 'commander';

// Production environment check
if (process.env.NODE_ENV === 'production') {
  console.error('❌ This script cannot be run in production environment');
  process.exit(1);
}

// CLI setup
program
  .option('-p, --password <password>', 'New admin password')
  .option('-e, --email <email>', 'Admin email', 'admin@luppa.local')
  .parse();

const options = program.opts();

async function resetAdminPassword() {
  // Get password from environment variable or CLI flag
  const password = options.password || process.env.ADMIN_PASSWORD;
  const email = options.email;
  const saltRounds = 12;

  if (!password) {
    console.error(
      '❌ Password required. Use --password flag or set ADMIN_PASSWORD environment variable'
    );
    process.exit(1);
  }

  if (password.length < 8) {
    console.error('❌ Password must be at least 8 characters long');
    process.exit(1);
  }

  // Database connection setup
  const client = new Client({
    connectionString: process.env.DATABASE_URL || {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'luppa_dev',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'dev_password',
    },
  });

  try {
    // Generate password hash
    const hash = await bcrypt.hash(password, saltRounds);
    console.log('✅ Password hash generated successfully');

    // Connect to database
    await client.connect();
    console.log('✅ Connected to database');

    // Update password using parameterized query
    const result = await client.query(
      'UPDATE core.users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE email = $2 RETURNING id, email',
      [hash, email]
    );

    if (result.rowCount === 0) {
      console.error(`❌ No user found with email: ${email}`);
      process.exit(1);
    }

    console.log(`✅ Password updated successfully for user: ${email}`);
    console.log(`   User ID: ${result.rows[0].id}`);
  } catch (error) {
    console.error(
      '❌ Error updating password:',
      error instanceof Error ? error.message : 'Unknown error'
    );
    process.exit(1);
  } finally {
    await client.end();
    console.log('✅ Database connection closed');
  }
}

resetAdminPassword().catch(error => {
  console.error('❌ Unhandled error:', error instanceof Error ? error.message : 'Unknown error');
  process.exit(1);
});
