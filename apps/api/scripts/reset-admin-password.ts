import 'dotenv/config';
import bcrypt from 'bcrypt';

async function resetAdminPassword() {
  const password = 'admin123';
  const saltRounds = 12;

  try {
    const hash = await bcrypt.hash(password, saltRounds);
    console.log('Password hash for admin123:');
    console.log(hash);

    // Test the existing hash
    const existingHash = '$2b$12$FR.LOBWl0/ydkidr.rEvPur0hUlUYM7pF3ctNjtQTyusFrnPl55hK';
    const isValid = await bcrypt.compare(password, existingHash);
    console.log('\nDoes existing hash match admin123?', isValid);

    if (!isValid) {
      console.log('\nTo update the password, run:');
      console.log(
        `UPDATE core.users SET password_hash = '${hash}' WHERE email = 'admin@luppa.local';`
      );
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

resetAdminPassword();
