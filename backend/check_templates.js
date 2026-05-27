const db = require('./src/infrastructure/database/db');

async function checkTemplates() {
  try {
    const { rows } = await db.query('SELECT id, name, first_name, last_name, has_fingerprint, LENGTH(biometric_template) as template_len, biometric_template FROM registrations WHERE has_fingerprint = true');
    console.log(`Found ${rows.length} registrations with fingerprints.`);
    rows.forEach(r => {
      let isValidBase64 = false;
      if (r.biometric_template) {
        try {
          Buffer.from(r.biometric_template, 'base64');
          isValidBase64 = true;
        } catch (e) {}
      }
      console.log(`- ID: ${r.id}, Name: ${r.first_name} ${r.last_name}, HasFingerprint: ${r.has_fingerprint}, ValidBase64: ${isValidBase64}, Length: ${r.template_len}`);
    });
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

checkTemplates();
