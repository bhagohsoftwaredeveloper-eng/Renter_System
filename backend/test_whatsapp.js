require('dotenv').config();
const WhatsAppService = require('./src/infrastructure/services/WhatsAppService');

async function testWhatsApp() {
  const service = new WhatsAppService();
  
  // PAG-ALAM: Usaba kining number sa imong kaugalingong number para matest nimo
  const testNumber = '639357117604'; // I-replace kini sa imong phone number (no +)
  
  const message = "Test Message: Hello! This is a test notification from your Renter System via Wassenger.";

  console.log('--- Testing WhatsApp Service (Wassenger) ---');
  console.log('Recipient:', testNumber);
  console.log('Message:', message);
  console.log('-------------------------------------------');

  const result = await service.sendMessage(testNumber, message);

  if (result && result.error) {
    console.error('FAILED:', result.details);
  } else {
    console.log('SUCCESS! Check your WhatsApp.');
    console.log('Response:', result);
  }
}

testWhatsApp();
