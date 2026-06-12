const { loadWindows, getNearestMealPeriod } = require('../../shared/mealPeriods');

// Philippine (Asia/Manila) calendar date for a Date. The server runs in UTC
// (Railway), so report buckets/times must use PH wall-clock, not server-local.
const PH_TZ = 'Asia/Manila';
const localDateOf = (d) => d.toLocaleDateString('en-CA', { timeZone: PH_TZ });

class GetReportSummary {
  constructor(registrationRepository, accessLogRepository, mealTicketRepository, systemSettingsRepository) {
    this.registrationRepository = registrationRepository;
    this.accessLogRepository = accessLogRepository;
    this.mealTicketRepository = mealTicketRepository;
    this.systemSettingsRepository = systemSettingsRepository;
  }

  async execute(dateStr) {
    const registrations = await this.registrationRepository.getAll();
    const accessLogs = await this.accessLogRepository.getAll();

    const activeRentersList = registrations.filter(r => r.canGenerateMealTicket);
    const biometricUsersList = registrations.filter(r => r.hasFingerprint || r.has_fingerprint);

    const totalRenters = registrations.length;
    const activeRenters = activeRentersList.length;
    const blockedRenters = totalRenters - activeRenters;

    // Resolve the target day. Accepts 'YYYY-MM-DD'; falls back to today if missing/invalid.
    const isValidDate = typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr) && !isNaN(new Date(`${dateStr}T00:00:00`).getTime());
    const reportDate = isValidDate ? dateStr : new Date().toLocaleDateString('en-CA', { timeZone: PH_TZ });

    const dayLogs = accessLogs.filter(log => log.date === reportDate);
    const successfulAccessToday = dayLogs.filter(log => log.status === 'Success').length;
    const deniedAccessToday = dayLogs.filter(log => log.status === 'Denied' || log.status === 'Failed').length;

    // Per-meal data for the report date: counts + the list of students who claimed each meal.
    const mealsToday = { breakfast: 0, lunch: 0, dinner: 0 };
    const mealAttendance = { breakfast: [], lunch: [], dinner: [] };
    if (this.mealTicketRepository) {
      try {
        const windows = await loadWindows(this.systemSettingsRepository);
        const dayStart = new Date(`${reportDate}T00:00:00`);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(dayStart);
        dayEnd.setDate(dayEnd.getDate() + 1);

        // Over-fetch a ±1 day window so timezone offsets between the DB and Node
        // can't drop tickets at the day boundary; we filter precisely in JS below.
        const queryStart = new Date(dayStart);
        queryStart.setDate(queryStart.getDate() - 1);
        const queryEnd = new Date(dayEnd);
        queryEnd.setDate(queryEnd.getDate() + 1);

        const candidateTickets = await this.mealTicketRepository.getInRange(
          queryStart.toISOString(),
          queryEnd.toISOString()
        );
        // Keep only tickets whose local calendar date matches the report date.
        const todaysTickets = candidateTickets.filter(
          t => t.generatedAt && localDateOf(new Date(t.generatedAt)) === reportDate
        );

        // Lookup table for room/floor/meal-type by registration id
        const regById = new Map();
        for (const r of registrations) regById.set(r.id, r);

        const fmtTime = (d) => d.toLocaleTimeString('en-US', { timeZone: PH_TZ, hour: '2-digit', minute: '2-digit', hour12: true });

        // Dedupe per student per period, keeping the earliest ticket of the day.
        const byPeriod = { Breakfast: new Map(), Lunch: new Map(), Dinner: new Map() };
        for (const ticket of todaysTickets) {
          if (!ticket.generatedAt) continue;
          const when = new Date(ticket.generatedAt);
          const period = getNearestMealPeriod(when, windows);
          if (!period) continue;
          const existing = byPeriod[period].get(ticket.registrationId);
          if (!existing || when < existing._when) {
            const reg = regById.get(ticket.registrationId);
            byPeriod[period].set(ticket.registrationId, {
              _when: when,
              registrationId: ticket.registrationId,
              name: ticket.renterName || (reg ? reg.name : 'Unknown'),
              roomNo: reg ? (reg.roomNo || reg.room_no || 'N/A') : 'N/A',
              floorNo: reg ? (reg.floorNo || reg.floor_no || '') : '',
              mealType: ticket.mealType || (reg ? reg.mealType : '') || '',
              time: fmtTime(when)
            });
          }
        }

        const toList = (map) => Array.from(map.values())
          .sort((a, b) => a._when - b._when)
          .map(({ _when, ...rest }) => rest);

        mealAttendance.breakfast = toList(byPeriod.Breakfast);
        mealAttendance.lunch = toList(byPeriod.Lunch);
        mealAttendance.dinner = toList(byPeriod.Dinner);

        mealsToday.breakfast = mealAttendance.breakfast.length;
        mealsToday.lunch = mealAttendance.lunch.length;
        mealsToday.dinner = mealAttendance.dinner.length;
      } catch (err) {
        console.error('[GetReportSummary] Failed to compute meal data:', err.message);
      }
    }

    return {
      summary: {
        totalRenters,
        activeRenters,
        blockedRenters,
        successfulAccessToday,
        deniedAccessToday,
        mealsToday,
        reportDate,
        lastUpdated: new Date().toISOString()
      },
      mealAttendance,
      recentActivity: accessLogs.slice(0, 10),
      activeRentersList,
      biometricUsersList
    };
  }
}

module.exports = GetReportSummary;
