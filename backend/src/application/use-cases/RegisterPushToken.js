/**
 * Links an Expo push token to a registration.
 *
 * Doubles as the app's "login + link" step: the device supplies the registration
 * number and a phone number; we resolve the registration and decide whether this
 * device belongs to the parent or the student by matching the phone. If the phone
 * matches neither, registration is rejected so strangers can't subscribe.
 */
class RegisterPushToken {
  constructor(pushTokenRepository, registrationRepository) {
    this.pushTokenRepository = pushTokenRepository;
    this.registrationRepository = registrationRepository;
  }

  // Compare phone numbers tolerant of formatting and country-code/leading-zero
  // differences. PH numbers arrive as 09171234567, +639171234567 or 639171234567;
  // all share the same trailing 10 digits, so we compare those.
  _phoneMatches(a, b) {
    const digits = (p) => (p || '').replace(/\D/g, '');
    const da = digits(a);
    const db = digits(b);
    if (!da || !db) return false;
    if (da === db) return true;
    const tail = (d) => d.slice(-10);
    return tail(da).length === 10 && tail(da) === tail(db);
  }

  async execute({ registrationNumber, phone, expoToken, platform }) {
    if (!registrationNumber || !phone || !expoToken) {
      const err = new Error('registrationNumber, phone and expoToken are required');
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

    const saved = await this.pushTokenRepository.save({
      registrationId: registration.id,
      recipientType,
      expoToken,
      platform: platform || null,
    });

    return {
      recipientType,
      registration: {
        id: registration.id,
        name: registration.name,
        registrationNumber: registration.registrationNumber,
      },
      token: saved,
    };
  }
}

module.exports = RegisterPushToken;
