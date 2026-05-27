const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
require('dns').setDefaultResultOrder('ipv4first');
require('dotenv').config();

// Redirect console logs to a file for background service traceability
const logFilePath = path.join(process.cwd(), 'server.log');
const logStream = fs.createWriteStream(logFilePath, { flags: 'a' });

const formatLog = (level, args) => {
  const timestamp = new Date().toISOString();
  const message = args.map(arg => 
    typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg
  ).join(' ');
  return `[${timestamp}] ${level}: ${message}\n`;
};

const originalLog = console.log;
const originalError = console.error;

console.log = (...args) => {
  logStream.write(formatLog('INFO', args));
  originalLog.apply(console, args);
};

console.error = (...args) => {
  logStream.write(formatLog('ERROR', args));
  originalError.apply(console, args);
};

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

// Infrastructure
const db = require('./src/infrastructure/database/db');
const GetRegistrations = require('./src/application/use-cases/GetRegistrations');
const CreateRegistration = require('./src/application/use-cases/CreateRegistration');
const UpdateRegistrationStatus = require('./src/application/use-cases/UpdateRegistrationStatus');
const UpdateRegistration = require('./src/application/use-cases/UpdateRegistration');
const DeleteRegistration = require('./src/application/use-cases/DeleteRegistration');
const GetUsers = require('./src/application/use-cases/GetUsers');
const CreateUser = require('./src/application/use-cases/CreateUser');
const UpdateUser = require('./src/application/use-cases/UpdateUser');
const DeleteUser = require('./src/application/use-cases/DeleteUser');
const LoginUser = require('./src/application/use-cases/LoginUser');
const GenerateMealTicket = require('./src/application/use-cases/GenerateMealTicket');
const GetMealTicketsByRegistration = require('./src/application/use-cases/GetMealTicketsByRegistration');
const ToggleMealTicketAllowance = require('./src/application/use-cases/ToggleMealTicketAllowance');
const GetAccessLogs = require('./src/application/use-cases/GetAccessLogs');
const CreateAccessLog = require('./src/application/use-cases/CreateAccessLog');
const GetAuditLogs = require('./src/application/use-cases/GetAuditLogs');
const CreateAuditLog = require('./src/application/use-cases/CreateAuditLog');
const WhatsAppService = require('./src/infrastructure/services/WhatsAppService');

const SetMealTicketExpiration = require('./src/application/use-cases/SetMealTicketExpiration');
const GetExpiredMealTickets = require('./src/application/use-cases/GetExpiredMealTickets');

// Structure
const PostgresRegistrationRepository = require('./src/infrastructure/repositories/PostgresRegistrationRepository');
const PostgresUserRepository = require('./src/infrastructure/repositories/PostgresUserRepository');
const PostgresMealTicketRepository = require('./src/infrastructure/repositories/PostgresMealTicketRepository');
const PostgresAccessLogRepository = require('./src/infrastructure/repositories/PostgresAccessLogRepository');
const PostgresAuditLogRepository = require('./src/infrastructure/repositories/PostgresAuditLogRepository');
const PostgresSystemSettingsRepository = require('./src/infrastructure/repositories/PostgresSystemSettingsRepository');
// Interface Controllers & Routes
const RegistrationController = require('./src/interfaces/controllers/RegistrationController');
const UserController = require('./src/interfaces/controllers/UserController');
const MealTicketController = require('./src/interfaces/controllers/MealTicketController');
const AccessLogController = require('./src/interfaces/controllers/AccessLogController');
const AuditLogController = require('./src/interfaces/controllers/AuditLogController');
const createRegistrationRoutes = require('./src/interfaces/routes/registrationRoutes');
const createUserRoutes = require('./src/interfaces/routes/userRoutes');
const createMealTicketRoutes = require('./src/interfaces/routes/mealTicketRoutes');
const createAccessLogRoutes = require('./src/interfaces/routes/accessLogRoutes');
const createAuditLogRoutes = require('./src/interfaces/routes/auditLogRoutes');
const GetReportSummary = require('./src/application/use-cases/GetReportSummary');
const ReportController = require('./src/interfaces/controllers/ReportController');
const createReportRoutes = require('./src/interfaces/routes/reportRoutes');

const PostgresSystemRepository = require('./src/infrastructure/repositories/PostgresSystemRepository');
const ResetData = require('./src/application/use-cases/ResetData');
const ExportDataExcel = require('./src/application/use-cases/ExportDataExcel');
const ExportDataSQL = require('./src/application/use-cases/ExportDataSQL');
const SystemController = require('./src/interfaces/controllers/SystemController');
const createSystemRoutes = require('./src/interfaces/routes/systemRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const BulkCreateRegistrations = require('./src/application/use-cases/BulkCreateRegistrations');
const CheckBiometricDuplicate = require('./src/application/use-cases/CheckBiometricDuplicate');

// Dependency Injection
const registrationRepository = new PostgresRegistrationRepository(db);
const userRepository = new PostgresUserRepository(db);
const mealTicketRepository = new PostgresMealTicketRepository(db);
const accessLogRepository = new PostgresAccessLogRepository(db);
const auditLogRepository = new PostgresAuditLogRepository(db);
const systemRepository = new PostgresSystemRepository(db);
const systemSettingsRepository = new PostgresSystemSettingsRepository(db);
const whatsAppService = new WhatsAppService();

const getRegistrations = new GetRegistrations(registrationRepository);
const createRegistration = new CreateRegistration(registrationRepository);
const bulkCreateRegistrations = new BulkCreateRegistrations(registrationRepository);
const updateRegistrationStatus = new UpdateRegistrationStatus(registrationRepository);
const updateRegistration = new UpdateRegistration(registrationRepository);
const deleteRegistration = new DeleteRegistration(registrationRepository);
const setMealTicketExpiration = new SetMealTicketExpiration(registrationRepository);
const getExpiredMealTickets = new GetExpiredMealTickets(registrationRepository);
const checkBiometricDuplicate = new CheckBiometricDuplicate(registrationRepository);

const getUsers = new GetUsers(userRepository);
const createUser = new CreateUser(userRepository);
const updateUser = new UpdateUser(userRepository);
const deleteUser = new DeleteUser(userRepository);
const loginUser = new LoginUser(userRepository);

const generateMealTicket = new GenerateMealTicket(mealTicketRepository, registrationRepository, systemSettingsRepository);
const getMealTicketsByRegistration = new GetMealTicketsByRegistration(mealTicketRepository);
const toggleMealTicketAllowance = new ToggleMealTicketAllowance(registrationRepository);
const getAccessLogs = new GetAccessLogs(accessLogRepository);
const createAccessLog = new CreateAccessLog(accessLogRepository, registrationRepository, whatsAppService, systemSettingsRepository);
const getAuditLogs = new GetAuditLogs(auditLogRepository);
const createAuditLog = new CreateAuditLog(auditLogRepository);
const getReportSummary = new GetReportSummary(registrationRepository, accessLogRepository, mealTicketRepository, systemSettingsRepository);

const resetData = new ResetData(systemRepository);
const exportDataExcel = new ExportDataExcel(systemRepository);
const exportDataSQL = new ExportDataSQL(systemRepository);

const registrationController = new RegistrationController(
  getRegistrations,
  createRegistration,
  updateRegistrationStatus,
  updateRegistration,
  toggleMealTicketAllowance,
  deleteRegistration,
  setMealTicketExpiration,
  getExpiredMealTickets,
  bulkCreateRegistrations,
  checkBiometricDuplicate
);

const userController = new UserController(getUsers, createUser, updateUser, deleteUser, loginUser);
const mealTicketController = new MealTicketController(generateMealTicket, getMealTicketsByRegistration);
const accessLogController = new AccessLogController(getAccessLogs, createAccessLog);
const auditLogController = new AuditLogController(getAuditLogs, createAuditLog);
const reportController = new ReportController(getReportSummary);
const systemController = new SystemController(resetData, exportDataExcel, exportDataSQL, systemSettingsRepository);

// Routes
app.use('/api/registrations', createRegistrationRoutes(registrationController));
app.use('/api/users', createUserRoutes(userController));
app.use('/api/meal-tickets', createMealTicketRoutes(mealTicketController));
app.use('/api/access-logs', createAccessLogRoutes(accessLogController));
app.use('/api/audit-logs', createAuditLogRoutes(auditLogController));
app.use('/api/reports', createReportRoutes(reportController));
app.use('/api/system', createSystemRoutes(systemController));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Database connection check on startup
async function startServer() {
  try {
    const { rows } = await db.query('SELECT NOW()');
    console.log(`[${new Date().toISOString()}] DB Connection SUCCESS: Database is reachable.`);
    
    app.listen(PORT, () => {
      console.log(`[${new Date().toISOString()}] Server running on port ${PORT} with Clean Architecture`);
    });
  } catch (err) {
    console.error(`[${new Date().toISOString()}] DB Connection FAILURE: Could not connect to database.`);
    console.error(err.message);
    
    // Log to file for diagnostics in production
    const fs = require('fs');
    fs.appendFileSync('server_fatal_errors.log', `[${new Date().toISOString()}] DB Connection Failure: ${err.message}\n${err.stack}\n`);
    
    // We still start the app so /health can respond, but it's in a degraded state
    app.listen(PORT, () => {
      console.log(`[${new Date().toISOString()}] Server running on port ${PORT} (DEGRADED - No DB Connection)`);
    });
  }
}

startServer();
