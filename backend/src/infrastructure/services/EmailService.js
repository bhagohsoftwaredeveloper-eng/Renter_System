const nodemailer = require('nodemailer');
const QRCode = require('qrcode');

/**
 * Sends emails via SMTP (nodemailer). Used to deliver each renter their personal
 * Renter Notify QR code so they can set up the app without typing anything.
 *
 * Configure via env: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM.
 * When SMTP_* are unset the service is disabled and calls throw a 503 — keeping
 * local dev runnable without email credentials.
 */
class EmailService {
  constructor() {
    this.from = process.env.SMTP_FROM || process.env.SMTP_USER || null;
    this.enabled = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
    console.log(`[EmailService] ${this.enabled ? 'enabled' : 'DISABLED (SMTP_* not fully set)'}`);
    if (this.enabled) {
      const port = Number(process.env.SMTP_PORT) || 587;
      this.transport = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port,
        secure: String(process.env.SMTP_SECURE) === 'true' || port === 465,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      });
    }
  }

  _require() {
    if (!this.enabled) {
      const err = new Error('Email is not configured. Set SMTP_HOST, SMTP_USER and SMTP_PASS.');
      err.statusCode = 503;
      throw err;
    }
  }

  // Emails a renter their QR code (encodes { registrationNumber, phone }).
  async sendQr({ to, name, registrationNumber, phone, parentPhone, studentPhone }) {
    this._require();
    if (!to) {
      const err = new Error('Registration has no email address.');
      err.statusCode = 400;
      throw err;
    }
    const payload = JSON.stringify({ registrationNumber, phone });
    const qrBuffer = await QRCode.toBuffer(payload, {
      width: 320,
      margin: 2,
      color: { dark: '#0F766E', light: '#ffffff' },
    });

    // Rows for whichever numbers are on file (parent / student).
    const phoneRows = [
      parentPhone ? `<tr><td style="padding:4px 12px 4px 0;color:#64748b;">Parent's number</td><td style="font-weight:700;">${parentPhone}</td></tr>` : '',
      studentPhone ? `<tr><td style="padding:4px 12px 4px 0;color:#64748b;">Student's number</td><td style="font-weight:700;">${studentPhone}</td></tr>` : '',
    ].join('');

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;color:#0F172A;">
        <h2 style="color:#0F766E;margin-bottom:4px;">Renter Notify</h2>
        <p>Hi ${name || 'there'},</p>
        <p>Set up meal-ticket alerts on your phone in two steps:</p>
        <ol>
          <li>Install / open the <b>Renter Notify</b> app.</li>
          <li>Tap <b>"Scan QR Code"</b> and point it at the code below.</li>
        </ol>
        <div style="text-align:center;margin:20px 0;">
          <img src="cid:qr" alt="Your QR code" style="width:240px;height:240px;"/>
        </div>
        <div style="background:#F8FAFC;border-radius:10px;padding:14px 16px;margin:16px 0;">
          <table style="font-size:14px;border-collapse:collapse;">
            <tr><td style="padding:4px 12px 4px 0;color:#64748b;">Registration #</td><td style="font-weight:700;color:#0F766E;">${registrationNumber}</td></tr>
            ${phoneRows}
          </table>
        </div>
        <p style="color:#475569;font-size:13px;">
          If scanning doesn't work, open the app and enter your registration number and phone number manually.
        </p>
      </div>`;

    await this.transport.sendMail({
      from: this.from,
      to,
      subject: 'Your Renter Notify QR Code',
      html,
      attachments: [{ filename: 'renternotify-qr.png', content: qrBuffer, cid: 'qr' }],
    });

    return { sent: true, to };
  }
}

module.exports = EmailService;
