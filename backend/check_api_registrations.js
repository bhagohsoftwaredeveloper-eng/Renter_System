const axios = require('axios');
require('dotenv').config();

const PORT = process.env.PORT || 5000;
const API_URL = `http://localhost:${PORT}/api/registrations`;

async function check() {
  try {
    console.log(`Fetching registrations from ${API_URL}...`);
    const response = await axios.get(API_URL, {
      headers: {
        'x-user-role': 'Administrator'
      }
    });
    if (response.data.length > 0) {
      console.log('Sample registration from backend:');
      console.log(JSON.stringify(response.data[0], null, 2));
      
      const hasRegNum = response.data.every(r => r.registrationNumber !== undefined && r.registrationNumber !== null);
      console.log(`All records have registrationNumber: ${hasRegNum}`);
    } else {
      console.log('No registrations found.');
    }
  } catch (err) {
    console.error('Error fetching registrations:', err.message);
  } finally {
    process.exit();
  }
}

check();
