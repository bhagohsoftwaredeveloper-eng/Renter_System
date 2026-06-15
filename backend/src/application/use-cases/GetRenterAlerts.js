/**
 * Returns a renter's recent meal-ticket alerts for the web alerts page.
 *
 * Mirrors RegisterPushToken's identity check: the caller supplies a registration
 * number and a phone; we resolve the registration and only return data if the
 * phone matches the parent or student on it, so strangers can't read someone
 * else's meal activity. Access logs are matched by the registration name (that is
 * what CreateAccessLog stores on each log row).
 */
class GetRenterAlerts {
  constructor(accessLogRepository, registrationRepository, systemSettingsRepository) {
    this.accessLogRepository = accessLogRepository;
    this.registrationRepository = registrationRepository;
    this.systemSettingsRepository = systemSettingsRepository;
  }

  // Same lenient phone comparison as RegisterPushToken (compare trailing 10 digits).
  _phoneMatches(a, b) {
    const digits = (p) => (p || '').replace(/\D/g, '');
    const da = digits(a);
    const db = digits(b);
    if (!da || !db) return false;
    if (da === db) return true;
    const tail = (d) => d.slice(-10);
    return tail(da).length === 10 && tail(da) === tail(db);
  }

  async execute({ registrationNumber, phone, limit = 30 }) {
    if (!registrationNumber || !phone) {
      const err = new Error('registrationNumber and phone are required');
      err.statusCode = 400;
      throw err;
    }

    const registration = await this.registrationRepository.getByRegistrationNumber(registrationNumber);
    if (!registration) {
      const err = new Error('Registration not found');
      err.statusCode = 404;
      throw err;
    }

    let recipientType = null;
    if (this._phoneMatches(phone, registration.parentPhone)) {
      recipientType = 'parent';
    } else if (this._phoneMatches(phone, registration.studentPhone)) {
      recipientType = 'student';
    }
    if (!recipientType) {
      const err = new Error('Phone number does not match this registration');
      err.statusCode = 403;
      throw err;
    }

    const logs = await this.accessLogRepository.getByRenterName(registration.name, limit);

    // Same configurable notification templates ServeQueue uses for push (see
    // CreateAccessLog) so the web alerts read identically to the Android app.
    let titleTemplate = 'Meal Ticket Used';
    let bodyTemplate = 'Hi! {name} used their {mealType} meal ticket at {time}.';
    if (this.systemSettingsRepository) {
      try {
        titleTemplate = (await this.systemSettingsRepository.get('push_notification_title')) || titleTemplate;
        bodyTemplate = (await this.systemSettingsRepository.get('push_notification_body')) || bodyTemplate;
      } catch {
        // fall back to defaults if settings are unavailable
      }
    }

    return {
      recipientType,
      registration: {
        id: registration.id,
        name: registration.name,
        registrationNumber: registration.registrationNumber,
        mealType: registration.mealType || 'Non-Veggie',
      },
      notification: { titleTemplate, bodyTemplate },
      alerts: logs.map((l) => ({
        id: l.id,
        type: l.type,
        status: l.status,
        date: l.date,
        time: l.time,
        createdAt: l.created_at,
      })),
    };
  }
}

module.exports = GetRenterAlerts;
