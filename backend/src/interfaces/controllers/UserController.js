class UserController {
  constructor(getUsers, createUser, updateUser, deleteUser, loginUser) {
    this.getUsers = getUsers;
    this.createUser = createUser;
    this.updateUser = updateUser;
    this.deleteUser = deleteUser;
    this.loginUser = loginUser;
  }

  async login(req, res) {
    try {
      const { username, password } = req.body;
      const result = await this.loginUser.execute({ username, password });
      res.json(result);
    } catch (err) {
      console.error(err);
      res.status(401).json({ error: err.message });
    }
  }

  async getAll(req, res) {
    try {
      const users = await this.getUsers.execute();
      const usersWithoutPassword = users.map(user => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });
      res.json(usersWithoutPassword);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Database error' });
    }
  }

  async create(req, res) {
    try {
      const user = await this.createUser.execute(req.body);
      const { password, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
    } catch (err) {
      console.error(err);
      if (err.code === '23505') {
        const detail = err.detail || '';
        if (detail.includes('username')) return res.status(400).json({ error: 'Username already exists' });
        if (detail.includes('email')) return res.status(400).json({ error: 'Email already exists' });
        return res.status(400).json({ error: 'Duplicate record already exists' });
      }
      res.status(500).json({ error: 'Database error: ' + (err.message || 'Unknown error') });
    }
  }

  async update(req, res) {
    try {
      const { id } = req.params;
      const user = await this.updateUser.execute(id, req.body);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (err) {
      console.error(err);
      if (err.code === '23505') {
        const detail = err.detail || '';
        if (detail.includes('username')) return res.status(400).json({ error: 'Username already exists' });
        if (detail.includes('email')) return res.status(400).json({ error: 'Email already exists' });
        return res.status(400).json({ error: 'Duplicate record already exists' });
      }
      res.status(500).json({ error: 'Database error: ' + (err.message || 'Unknown error') });
    }
  }

  async delete(req, res) {
    try {
      const { id } = req.params;
      console.log(`[UserController] Delete request received for ID: ${id}`);
      await this.deleteUser.execute(id);
      console.log(`[UserController] Delete SUCCESS for ID: ${id}`);
      res.status(204).send();
    } catch (err) {
      console.error(err);
      if (err.code === 'HAS_TRANSACTIONS' || err.code === 'IS_ADMIN') {
        return res.status(200).json({ success: false, error: err.message, code: err.code });
      }
      res.status(500).json({ error: 'Database error' });
    }
  }
}

module.exports = UserController;
