const axios = require('axios');

async function testGenerate() {
  try {
    const res = await axios.post('http://localhost:5005/api/meal-tickets/generate', {
      registrationId: null,
      mealType: null,
      biometricTemplate: "invalid_base64_string_for_testing"
    });
    console.log("Success:", res.data);
  } catch (err) {
    if (err.response) {
      console.error("HTTP Error:", err.response.status, err.response.data);
    } else {
      console.error("Network Error:", err.message);
    }
  }
}

testGenerate();
