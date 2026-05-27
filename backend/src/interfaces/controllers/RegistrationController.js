class RegistrationController {
  constructor(getRegistrations, createRegistration, updateRegistrationStatus, updateRegistration, toggleMealTicketAllowanceUseCase, deleteRegistration, setMealTicketExpirationUseCase, getExpiredMealTickets, bulkCreateRegistrations, checkBiometricDuplicate) {
    this.getRegistrations = getRegistrations;
    this.createRegistration = createRegistration;
    this.updateRegistrationStatus = updateRegistrationStatus;
    this.updateRegistration = updateRegistration;
    this.toggleMealTicketAllowanceUseCase = toggleMealTicketAllowanceUseCase;
    this.deleteRegistration = deleteRegistration;
    this.setMealTicketExpirationUseCase = setMealTicketExpirationUseCase;
    this.getExpiredMealTicketsUseCase = getExpiredMealTickets;
    this.bulkCreateRegistrations = bulkCreateRegistrations;
    this.checkBiometricDuplicate = checkBiometricDuplicate;
  }

  // One renter = one biometric: tells the enrollment UI whether a just-captured
  // fingerprint already belongs to an existing renter so it can refuse to proceed.
  async checkBiometric(req, res) {
    const { biometricTemplate, excludeId } = req.body;
    try {
      const result = await this.checkBiometricDuplicate.execute(biometricTemplate, excludeId);
      res.json(result);
    } catch (err) {
      console.error('[RegistrationController] checkBiometric error:', err.message);
      const msg = err.message || 'Biometric check failed';
      const isBridge = msg.includes('ECONNREFUSED') || msg.includes('unreachable') || err.code === 'ECONNREFUSED';
      res.status(isBridge ? 503 : 400).json({
        error: isBridge ? 'Biometric Bridge is unreachable. Please ensure the service is running.' : msg
      });
    }
  }

  async getAll(req, res) {
    try {
      const registrations = await this.getRegistrations.execute();
      res.json(registrations);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Database error' });
    }
  }

  async getExpired(req, res) {
    try {
      const registrations = await this.getExpiredMealTicketsUseCase.execute();
      res.json(registrations);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Database error' });
    }
  }

  async setMealTicketExpiration(req, res) {
    const { id } = req.params;
    const { expirationDate } = req.body;
    try {
      const registration = await this.setMealTicketExpirationUseCase.execute(id, expirationDate);
      if (!registration) {
        return res.status(404).json({ error: 'Registration not found' });
      }
      res.json(registration);
    } catch (err) {
      console.error(`Error safely setting meal ticket expiration for ${id}:`, err);
      res.status(500).json({ error: 'Database error' });
    }
  }

  async create(req, res) {
    try {
      const registration = await this.createRegistration.execute(req.body);
      res.status(201).json(registration);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Database error' });
    }
  }

  async bulkUpload(req, res) {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
      const xlsx = require('xlsx');
      const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rawData = xlsx.utils.sheet_to_json(worksheet);

      // Map raw data to entity-friendly format
      const mappedData = rawData.map(row => ({
        firstName: row.firstName || row.first_name || row['First Name'] || row.Firstname || row.FirstName || '',
        lastName: row.lastName || row.last_name || row['Last Name'] || row.Lastname || row.LastName || '',
        email: row.email || row.Email || '',
        studentPhone: row.studentPhone || row.student_phone || row['Student Phone'] || row.StudentPhone || row.Studentphone || '',
        parentPhone: row.parentPhone || row.parent_phone || row['Parent Phone'] || row.ParentPhone || row.Parentphone || '',
        roomNo: row.roomNo || row.room_no || row['Room No'] || row.RoomNo || row.Roomno || row.Room || '',
        floorNo: row.floorNo || row.floor_no || row['Floor No'] || row.FloorNo || row.Floorno || row.Floor || '',
        imd: row.imd || row.IMD || row.Imd || '',
        mealType: row.mealType || row.meal_type || row['Meal Type'] || row.MealType || row.Mealtype || 'Non-Veggie',
        status: 'Approved' // Imported data usually approved
      }));

      const results = await this.bulkCreateRegistrations.execute(mappedData);
      res.json(results);
    } catch (err) {
      console.error('Error in bulk upload:', err);
      res.status(500).json({ error: 'Failed to process bulk upload' });
    }
  }

  async updateStatus(req, res) {
    const { id } = req.params;
    const { status } = req.body;
    try {
      const registration = await this.updateRegistrationStatus.execute(id, status);
      if (!registration) {
        return res.status(404).json({ error: 'Registration not found' });
      }
      res.json(registration);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Database error' });
    }
  }

  async update(req, res) {
    const { id } = req.params;
    console.log(`Updating registration ${id} with data:`, req.body);
    try {
      const registration = await this.updateRegistration.execute(id, req.body);
      if (!registration) {
        console.log(`Registration ${id} not found for update`);
        return res.status(404).json({ error: 'Registration not found' });
      }
      console.log(`Registration ${id} updated successfully:`, JSON.stringify(registration, null, 2));
      res.json(registration);
    } catch (err) {
      console.error(`Error updating registration ${id}:`, err);
      res.status(500).json({ error: 'Database error' });
    }
  }

  async toggleMealTicketAllowance(req, res) {
    const { id } = req.params;
    const { allowed } = req.body;
    try {
      const registration = await this.toggleMealTicketAllowanceUseCase.execute(id, allowed);
      if (!registration) {
        return res.status(404).json({ error: 'Registration not found' });
      }
      res.json(registration);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Database error' });
    }
  }

  async delete(req, res) {
    const { id } = req.params;
    try {
      const registration = await this.deleteRegistration.execute(id);
      if (!registration) {
        return res.status(404).json({ error: 'Registration not found' });
      }
      res.json({ success: true, message: 'Registration deleted successfully', registration });
    } catch (err) {
      console.error(`Error deleting registration ${id}:`, err);
      if (err.code === 'HAS_TRANSACTIONS') {
        // Return 200 to prevent red console errors on the frontend, but include success: false
        return res.status(200).json({ success: false, error: err.message, code: 'HAS_TRANSACTIONS' });
      }
      res.status(500).json({ error: 'Database error' });
    }
  }
}

module.exports = RegistrationController;
