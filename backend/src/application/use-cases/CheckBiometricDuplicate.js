const axios = require('axios');

/**
 * Enforces "one renter = one biometric": given a freshly-captured fingerprint
 * template, checks whether it already belongs to an enrolled renter. Enrollment
 * must not proceed if the fingerprint matches someone already in the system.
 *
 * Reuses the same Biometric Bridge /identify matching used for meal-ticket
 * identification, so "duplicate" here means the same thing as "recognised" there.
 */
class CheckBiometricDuplicate {
  constructor(registrationRepository) {
    this.registrationRepository = registrationRepository;
  }

  /**
   * @param {string} biometricTemplate - the just-captured FMD template
   * @param {number|string|null} excludeId - registration id to ignore (when
   *        re-enrolling the SAME renter, so their own print isn't flagged)
   * @returns {Promise<{exists: boolean, registration?: {id:number, name:string}}>}
   */
  async execute(biometricTemplate, excludeId = null) {
    if (!biometricTemplate || biometricTemplate.length < 50) {
      throw new Error('A valid biometric template is required');
    }

    const all = await this.registrationRepository.getAll();
    const exclude = excludeId != null ? String(excludeId) : null;
    const candidates = all.filter(r =>
      r.hasFingerprint &&
      r.biometricTemplate &&
      r.biometricTemplate.length > 50 &&
      String(r.id) !== exclude
    );

    if (candidates.length === 0) {
      return { exists: false };
    }

    const bridgeUrl = process.env.BIOMETRIC_BRIDGE_URL || 'http://127.0.0.1:5003';
    const response = await axios.post(`${bridgeUrl}/identify`, {
      probe: biometricTemplate,
      candidates: candidates.map(c => c.biometricTemplate)
    });

    const { matchedIndex, status } = response.data;
    if (status === 'SUCCESS' && matchedIndex !== undefined && matchedIndex !== -1) {
      const matched = candidates[matchedIndex];
      const name = `${matched.firstName || ''} ${matched.lastName || ''}`.trim()
        || matched.name
        || `Renter #${matched.id}`;
      return { exists: true, registration: { id: matched.id, name } };
    }

    return { exists: false };
  }
}

module.exports = CheckBiometricDuplicate;
