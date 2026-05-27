const RegistrationRepository = require('../../domain/repositories/RegistrationRepository');
const Registration = require('../../domain/entities/Registration');

class PostgresRegistrationRepository extends RegistrationRepository {
  constructor(db) {
    super();
    this.db = db;
  }

  async getAll() {
    const { rows } = await this.db.query('SELECT * FROM registrations ORDER BY created_at DESC');
    return rows.map(row => this._mapToEntity(row));
  }

  async getById(id) {
    const { rows } = await this.db.query('SELECT * FROM registrations WHERE id = $1', [id]);
    if (rows.length === 0) return null;
    return this._mapToEntity(rows[0]);
  }

  async save(registration) {
    const { rows } = await this.db.query(
      `INSERT INTO registrations (
        name, first_name, last_name, email, student_phone, parent_phone, 
        room_no, floor_no, unit, imd, has_fingerprint, biometric_template,
        status, initials, date, can_generate_meal_ticket, meal_type, registration_number
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18) 
      RETURNING *`,
      [
        registration.name,
        registration.firstName,
        registration.lastName,
        registration.email,
        registration.studentPhone,
        registration.parentPhone,
        registration.roomNo,
        registration.floorNo,
        registration.unit,
        registration.imd,
        registration.hasFingerprint,
        registration.biometricTemplate,
        registration.status,
        registration.initials,
        registration.date,
        registration.canGenerateMealTicket,
        registration.mealType,
        registration.registrationNumber
      ]
    );
    return this._mapToEntity(rows[0]);
  }

  async updateStatus(id, status, canGenerateMealTicket) {
    let query = 'UPDATE registrations SET status = $1';
    let params = [status, id];
    
    if (canGenerateMealTicket !== undefined) {
      query += ', can_generate_meal_ticket = $3';
      params.push(canGenerateMealTicket);
    }
    
    query += ' WHERE id = $2 RETURNING *';
    
    const { rows } = await this.db.query(query, params);
    if (rows.length === 0) return null;
    return this._mapToEntity(rows[0]);
  }

  async updateMealTicketAllowance(id, allowed) {
    const { rows } = await this.db.query(
      'UPDATE registrations SET can_generate_meal_ticket = $1 WHERE id = $2 RETURNING *',
      [allowed, id]
    );
    if (rows.length === 0) return null;
    return this._mapToEntity(rows[0]);
  }

  async updateMealTicketExpiration(id, expirationDate) {
    const { rows } = await this.db.query(
      'UPDATE registrations SET meal_ticket_expiration_date = $1 WHERE id = $2 RETURNING *',
      [expirationDate, id]
    );
    if (rows.length === 0) return null;
    return this._mapToEntity(rows[0]);
  }

  async delete(id) {
    const { rows } = await this.db.query(
      'DELETE FROM registrations WHERE id = $1 RETURNING *',
      [id]
    );
    if (rows.length === 0) return null;
    return this._mapToEntity(rows[0]);
  }

  async getExpiredMealTickets() {
    const { rows } = await this.db.query(
      'SELECT * FROM registrations WHERE meal_ticket_expiration_date < NOW() ORDER BY meal_ticket_expiration_date DESC'
    );
    return rows.map(row => this._mapToEntity(row));
  }

  async update(id, data) {
    const { rows } = await this.db.query(
      `UPDATE registrations SET 
        name = $1, first_name = $2, last_name = $3, email = $4, 
        student_phone = $5, parent_phone = $6, room_no = $7, 
        floor_no = $8, unit = $9, imd = $10, initials = $11,
        has_fingerprint = $12, biometric_template = $13, meal_type = $14, registration_number = $15
      WHERE id = $16 RETURNING *`,
      [
        data.name, data.firstName, data.lastName, data.email,
        data.studentPhone, data.parentPhone, data.roomNo,
        data.floorNo, data.unit, data.imd, data.initials,
        data.hasFingerprint, data.biometricTemplate,
        data.mealType,
        data.registrationNumber,
        id
      ]
    );
    if (rows.length === 0) return null;
    return this._mapToEntity(rows[0]);
  }

  _mapToEntity(row) {
    return new Registration({
      id: row.id,
      name: row.name,
      firstName: row.first_name,
      lastName: row.last_name,
      email: row.email,
      studentPhone: row.student_phone,
      parentPhone: row.parent_phone,
      roomNo: row.room_no,
      floorNo: row.floor_no,
      unit: row.unit,
      imd: row.imd,
      hasFingerprint: row.has_fingerprint,
      biometricTemplate: row.biometric_template,
      status: row.status,
      initials: row.initials,
      date: row.date,
      canGenerateMealTicket: row.can_generate_meal_ticket,
      mealTicketExpirationDate: row.meal_ticket_expiration_date,
      mealType: row.meal_type,
      registrationNumber: row.registration_number,
      createdAt: row.created_at
    });
  }
  async getByRegistrationNumber(registrationNumber) {
    const { rows } = await this.db.query('SELECT * FROM registrations WHERE registration_number = $1', [registrationNumber]);
    if (rows.length === 0) return null;
    return this._mapToEntity(rows[0]);
  }

  async countTransactionsByRegistrationId(id) {
    const { rows } = await this.db.query(
      'SELECT COUNT(*) as count FROM meal_tickets WHERE registration_id = $1',
      [id]
    );
    return parseInt(rows[0].count);
  }

  async getByName(name) {
    const { rows } = await this.db.query('SELECT * FROM registrations WHERE name = $1', [name]);
    if (rows.length === 0) return null;
    return this._mapToEntity(rows[0]);
  }
}

module.exports = PostgresRegistrationRepository;
