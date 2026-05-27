class ReportController {
  constructor(getReportSummary) {
    this.getReportSummary = getReportSummary;
  }

  async getSummary(req, res) {
    try {
      // Optional ?date=YYYY-MM-DD to view meal attendance for a past day
      const summary = await this.getReportSummary.execute(req.query.date);
      res.json(summary);
    } catch (error) {
      console.error('Error in ReportController.getSummary:', error);
      res.status(500).json({ error: 'Failed to fetch report summary' });
    }
  }
}

module.exports = ReportController;
