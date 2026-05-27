const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

class LoginUser {
  constructor(userRepository) {
    this.userRepository = userRepository;
  }

  async execute({ username, password }) {
    const user = await this.userRepository.getByUsername(username);
    
    if (!user) {
      throw new Error('Invalid credentials');
    }

    if (!user.password) {
      throw new Error('User has no password set. Please contact administrator.');
    }

    console.log(`[DEBUG] Login attempt for user: ${username}`);
    const isPasswordValid = await bcrypt.compare(password, user.password);
    console.log(`[DEBUG] Password valid: ${isPasswordValid}`);
    
    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    if (user.status !== 'Active') {
      throw new Error('Account is inactive');
    }

    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        role: user.role,
        permissions: user.permissions
      },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '24h' }
    );

    // Update last login
    // In a real scenario, we might want to update the last_login column in the database
    // this.userRepository.updateLastLogin(user.id);

    const { password: _, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, token };
  }
}

module.exports = LoginUser;
