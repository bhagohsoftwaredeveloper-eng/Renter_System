const UserRepository = require('../../domain/repositories/UserRepository');
const User = require('../../domain/entities/User');

class PostgresUserRepository extends UserRepository {
  constructor(db) {
    super();
    this.db = db;
  }

  async getAll() {
    const { rows } = await this.db.query('SELECT * FROM users ORDER BY created_at DESC');
    return rows.map(row => this._mapToEntity(row));
  }

  async getById(id) {
    const { rows } = await this.db.query('SELECT * FROM users WHERE id = $1', [id]);
    if (rows.length === 0) return null;
    return this._mapToEntity(rows[0]);
  }

  async getByEmail(email) {
    const { rows } = await this.db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (rows.length === 0) return null;
    return this._mapToEntity(rows[0]);
  }

  async getByUsername(username) {
    const { rows } = await this.db.query('SELECT * FROM users WHERE username = $1', [username]);
    if (rows.length === 0) return null;
    return this._mapToEntity(rows[0]);
  }

  async save(user) {
    const { rows } = await this.db.query(
      `INSERT INTO users (name, email, username, role, status, initials, password, custom_permissions) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       RETURNING *`,
      [user.name, user.email, user.username, user.role, user.status, user.initials, user.password, JSON.stringify(user.customPermissions || [])]
    );
    return this._mapToEntity(rows[0]);
  }

  async countAuditLogsByUsername(username, excludeTypes = []) {
    let query = 'SELECT COUNT(*) FROM audit_logs WHERE admin_id = $1';
    const params = [username];

    if (excludeTypes.length > 0) {
      query += ` AND type NOT IN (${excludeTypes.map((_, i) => `$${i + 2}`).join(', ')})`;
      params.push(...excludeTypes);
    }

    const { rows } = await this.db.query(query, params);
    const count = parseInt(rows[0].count);
    console.log(`[PostgresUserRepository] Audit logs for ${username} (excluding types): ${count}`);
    return count;
  }

  async delete(id) {
    await this.db.query('DELETE FROM users WHERE id = $1', [id]);
  }

  async update(id, userData) {
    const { rows: existingRows } = await this.db.query('SELECT * FROM users WHERE id = $1', [id]);
    if (existingRows.length === 0) return null;
    const existingUser = existingRows[0];

    const { rows } = await this.db.query(
      `UPDATE users 
       SET name = $1, email = $2, username = $3, role = $4, status = $5, initials = $6, custom_permissions = $7, password = $8
       WHERE id = $9 
       RETURNING *`,
      [
        userData.name || existingUser.name, 
        userData.email || existingUser.email, 
        userData.username || existingUser.username,
        userData.role || existingUser.role, 
        userData.status || existingUser.status, 
        userData.initials || existingUser.initials, 
        userData.customPermissions ? JSON.stringify(userData.customPermissions) : existingUser.custom_permissions,
        userData.password || existingUser.password,
        id
      ]
    );
    if (rows.length === 0) return null;
    return this._mapToEntity(rows[0]);
  }

  _mapToEntity(row) {
    return new User({
      id: row.id,
      name: row.name,
      email: row.email,
      username: row.username,
      role: row.role,
      password: row.password,
      status: row.status,
      lastLogin: row.last_login,
      initials: row.initials,
      createdAt: row.created_at,
      customPermissions: row.custom_permissions || []
    });
  }
}

module.exports = PostgresUserRepository;
