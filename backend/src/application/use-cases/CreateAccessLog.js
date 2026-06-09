class CreateAccessLog {
  constructor(accessLogRepository, registrationRepository, systemSettingsRepository, pushNotificationService, pushTokenRepository) {
    this.accessLogRepository = accessLogRepository;
    this.registrationRepository = registrationRepository;
    this.systemSettingsRepository = systemSettingsRepository;
    this.pushNotificationService = pushNotificationService;
    this.pushTokenRepository = pushTokenRepository;
  }

  // Replace {name} {mealType} {time} placeholders in a push template string.
  _fillTemplate(template, { name, mealType, time }) {
    return String(template || '')
      .replace(/\{name\}/g, name ?? '')
      .replace(/\{mealType\}/g, mealType ?? '')
      .replace(/\{time\}/g, time ?? '');
  }

  async execute(logData) {
    // Generate current date and time if not provided
    const now = new Date();
    const date = logData.date || now.toISOString().split('T')[0];
    const time = logData.time || now.toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const newLogData = {
      ...logData,
      date,
      time
    };

    let pushStatus = 'Not Sent';

    // Push notification for Biometric Scans or Manual Ticket Generation.
    // Messages can go to the parent and/or the student, each controlled by a toggle.
    if ((logData.type === 'Biometric Scan' || logData.type === 'Manual Ticket') && this.registrationRepository && this.pushNotificationService && this.pushTokenRepository && this.systemSettingsRepository) {
      try {
        const registration = await this.registrationRepository.getByName(logData.name);
        if (registration) {
          // Recipient toggles (default ON so existing deployments keep notifying)
          const notifyParent = (await this.systemSettingsRepository.get('notify_parent_enabled')) !== 'false';
          const notifyStudent = (await this.systemSettingsRepository.get('notify_student_enabled')) !== 'false';

          const displayName = registration.name || `${registration.firstName || ''} ${registration.lastName || ''}`.trim();
          const mealType = registration.mealType || 'Non-Veggie';

          const pushEnabled = (await this.systemSettingsRepository.get('push_enabled')) !== 'false';
          if (pushEnabled) {
            const allTokens = await this.pushTokenRepository.getByRegistrationId(registration.id);
            const targetTokens = allTokens
              .filter((t) => (t.recipient_type === 'parent' && notifyParent) || (t.recipient_type === 'student' && notifyStudent))
              .map((t) => t.expo_token);

            if (targetTokens.length === 0) {
              pushStatus = 'Not Sent';
            } else {
              const titleTpl = (await this.systemSettingsRepository.get('push_notification_title')) || 'Meal Ticket Used';
              const bodyTpl = (await this.systemSettingsRepository.get('push_notification_body')) || 'Hi! {name} used their {mealType} meal ticket at {time}.';
              const fillData = { name: displayName, mealType, time };

              const pushResult = await this.pushNotificationService.send(targetTokens, {
                title: this._fillTemplate(titleTpl, fillData),
                body: this._fillTemplate(bodyTpl, fillData),
                data: { type: logData.type, registrationId: registration.id, time },
              });
              pushStatus = pushResult && !pushResult.error ? 'Sent' : 'Failed';
            }
          }
        }
      } catch (err) {
        console.error('[CreateAccessLog] Failed to trigger notification:', err.message);
        pushStatus = 'Error';
      }
    }

    // Add the status to the log data and save
    newLogData.pushStatus = pushStatus;
    const savedLog = await this.accessLogRepository.create(newLogData);

    return savedLog;
  }
}

module.exports = CreateAccessLog;
