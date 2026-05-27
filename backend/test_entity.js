const Registration = require('./src/domain/entities/Registration');
const r = new Registration({ registrationNumber: '123456', id: 1 });
console.log('Object keys:', Object.keys(r));
console.log('registrationNumber value:', r.registrationNumber);
console.log('JSON stringified:', JSON.stringify(r));
