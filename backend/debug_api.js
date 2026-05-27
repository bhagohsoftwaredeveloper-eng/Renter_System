const axios = require('axios');
require('dotenv').config();

const PORT = process.env.PORT || 5005;
const API_URL = `http://localhost:${PORT}/api/registrations`;

async function check() {
  try {
    const response = await axios.get(API_URL, {
      headers: {
        'x-user-role': 'Administrator'
      }
    });
    if (response.data.length > 0) {
      const first = response.data[0];
      console.log('--- DEBUG INFO ---');
      console.log('Registration ID (numeric):', first.id);
      console.log('Keys in object:', Object.keys(first).join(', '));
      console.log('registrationNumber property value:', first.registrationNumber);
      console.log('registration_number property value:', first.registration_number);
      console.log('First 5 records summary:');
      response.data.slice(0, 5).forEach(r => {
        console.log(`ID: ${r.id}, Name: ${r.name}, RegNum: ${r.registrationNumber}`);
      });
    } else {
      console.log('No registrations found.');
    }
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    process.exit();
  }
}

check();
