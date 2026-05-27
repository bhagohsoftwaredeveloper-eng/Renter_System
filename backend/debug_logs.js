const db = require('./src/infrastructure/database/db');

async function debugAuditLogs() {
  try {
    const { rows: users } = await db.query('SELECT id, username, name, role FROM users');
    console.log('--- Users ---');
    users.forEach(u => console.log(`${u.id}: ${u.username} (${u.name}) - ${u.role}`));

    const { rows: logs } = await db.query('SELECT admin_id, type, COUNT(*) as count FROM audit_logs GROUP BY admin_id, type');
    console.log('\n--- Audit Logs Summary ---');
    logs.forEach(l => console.log(`Admin ID: ${l.admin_id}, Type: ${l.type}, Count: ${l.count}`));

    const { rows: allLogs } = await db.query('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 20');
    console.log('\n--- Recent Audit Logs (Detail) ---');
    allLogs.forEach(l => console.log(`[${l.created_at}] ID: ${l.admin_id}, Type: ${l.type}, Detail: ${l.details}`));

  } catch (err) {
    console.error('Error debugging logs:', err);
  } finally {
    process.exit();
  }
}

debugAuditLogs();
