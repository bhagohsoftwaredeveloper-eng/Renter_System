/**
 * Emails renters their Renter Notify QR code — one registration or all of them.
 * The QR phone defaults to the parent's number (the primary alert recipient),
 * falling back to the student's.
 */
class RegistrationQrController {
  constructor(registrationRepository, emailService) {
    this.registrationRepository = registrationRepository;
    this.emailService = emailService;
  }

  _fields(reg) {
    return {
      email: reg.email || null,
      name: reg.name || `${reg.firstName || reg.first_name || ''} ${reg.lastName || reg.last_name || ''}`.trim(),
      registrationNumber: reg.registrationNumber || reg.registration_number || null,
      phone: reg.parentPhone || reg.parent_phone || reg.studentPhone || reg.student_phone || null,
    };
  }

  async sendOne(req, res) {
    try {
      const reg = await this.registrationRepository.getById(req.params.id);
      if (!reg) return res.status(404).json({ error: 'Registration not found' });
      const f = this._fields(reg);
      if (!f.registrationNumber || !f.phone) {
        return res.status(400).json({ error: 'Registration is missing a registration number or phone.' });
      }
      const result = await this.emailService.sendQr(f);
      res.json(result);
    } catch (err) {
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  }

  async sendBulk(req, res) {
    try {
      const all = await this.registrationRepository.getAll();
      let sent = 0;
      let skipped = 0;
      let failed = 0;
      const errors = [];
      for (const reg of all) {
        const f = this._fields(reg);
        if (!f.email || !f.registrationNumber || !f.phone) {
          skipped++;
          continue;
        }
        try {
          await this.emailService.sendQr(f);
          sent++;
        } catch (err) {
          failed++;
          if (errors.length < 10) errors.push({ id: reg.id, email: f.email, error: err.message });
        }
      }
      res.json({ total: all.length, sent, skipped, failed, errors });
    } catch (err) {
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  }
}

module.exports = RegistrationQrController;
