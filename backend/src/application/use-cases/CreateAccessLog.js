class CreateAccessLog {
  constructor(accessLogRepository, registrationRepository, whatsAppService, systemSettingsRepository) {
    this.accessLogRepository = accessLogRepository;
    this.registrationRepository = registrationRepository;
    this.whatsAppService = whatsAppService;
    this.systemSettingsRepository = systemSettingsRepository;
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
    
    let whatsappStatus = 'Not Sent';

    // Trigger WhatsApp Notification for Biometric Scans or Manual Ticket Generation.
    // Messages can go to the parent and/or the student, each controlled by a toggle.
    if ((logData.type === 'Biometric Scan' || logData.type === 'Manual Ticket') && this.registrationRepository && this.whatsAppService && this.systemSettingsRepository) {
      try {
        const registration = await this.registrationRepository.getByName(logData.name);
        if (registration) {
          // Recipient toggles (default ON so existing deployments keep notifying)
          const notifyParent = (await this.systemSettingsRepository.get('notify_parent_enabled')) !== 'false';
          const notifyStudent = (await this.systemSettingsRepository.get('notify_student_enabled')) !== 'false';

          // Templates: parent (existing key) + student (new key)
          const parentTemplate = (await this.systemSettingsRepository.get('whatsapp_biometric_message'))
            || 'Hello! Your child {name} has successfully used the biometric terminal for their {mealType} meal at {time}. Thank you!';
          const studentTemplate = (await this.systemSettingsRepository.get('whatsapp_student_message'))
            || 'Hello {name}! Your {mealType} meal ticket was issued at {time}. Enjoy your meal!';

          const fillTemplate = (tpl) => tpl
            .replace(/{name}/g, registration.name || `${registration.firstName || ''} ${registration.lastName || ''}`.trim())
            .replace(/{time}/g, time)
            .replace(/{mealType}/g, registration.mealType || 'Non-Veggie');

          const wassengerApiKey = await this.systemSettingsRepository.get('wassenger_api_key');

          // Build the list of recipients to notify
          const recipients = [];
          if (notifyParent && registration.parentPhone) {
            recipients.push({ label: 'parent', phone: registration.parentPhone, message: fillTemplate(parentTemplate) });
          }
          if (notifyStudent && registration.studentPhone) {
            recipients.push({ label: 'student', phone: registration.studentPhone, message: fillTemplate(studentTemplate) });
          }

          let anySent = false;
          let anyFailed = false;
          for (const r of recipients) {
            console.log(`[CreateAccessLog] Sending WhatsApp to ${r.label} (${r.phone}): ${r.message}`);
            const waResult = await this.whatsAppService.sendMessage(r.phone, r.message, wassengerApiKey);
            if (waResult && !waResult.error) {
              anySent = true;
            } else {
              anyFailed = true;
            }
          }

          if (recipients.length === 0) {
            whatsappStatus = 'Not Sent';
          } else if (anySent && !anyFailed) {
            whatsappStatus = 'Sent';
          } else if (anySent && anyFailed) {
            whatsappStatus = 'Partial';
          } else {
            whatsappStatus = 'Failed';
          }
        }
      } catch (err) {
        console.error('[CreateAccessLog] Failed to trigger notification:', err.message);
        whatsappStatus = 'Error';
      }
    }
    
    // Add the status to the log data and save
    newLogData.whatsappStatus = whatsappStatus;
    const savedLog = await this.accessLogRepository.create(newLogData);
    
    return savedLog;
  }
}

module.exports = CreateAccessLog;
