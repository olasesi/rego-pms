import { Router } from 'express';
import { authenticate } from '../../common/middleware/authenticate';
import { authorize } from '../../common/middleware/authorize';
import { asyncHandler, sendOk } from '../../common/utils/responses';
import { reportService } from './reports.service';
import { ApiError } from '../../common/utils/ApiError';

const router = Router();

router.get('/summary', authenticate, authorize('reports:read'), asyncHandler(async (req, res) => {
  const summary = await reportService.summary(req);
  return sendOk(res, summary);
}));

router.get('/performance-distribution', authenticate, authorize('reports:read'), asyncHandler(async (req, res) => {
  const distribution = await reportService.performanceDistribution(req);
  return sendOk(res, distribution);
}));

router.get('/department-scores', authenticate, authorize('reports:read'), asyncHandler(async (req, res) => {
  const scores = await reportService.departmentScores(req);
  return sendOk(res, scores);
}));

router.get('/goal-progress', authenticate, authorize('reports:read'), asyncHandler(async (req, res) => {
  const progress = await reportService.goalProgressByDepartment(req);
  return sendOk(res, progress);
}));

router.get('/export', authenticate, authorize('reports:export'), asyncHandler(async (req, res) => {
  const type = String(req.query.type ?? 'users');
  const format = String(req.query.format ?? 'csv');
  if (format === 'csv') {
    const csv = await reportService.exportCsv(req, type);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${type}-${Date.now()}.csv"`);
    res.send(csv);
    return;
  }
  if (format === 'pdf') {
    const pdf = await reportService.exportPdf(req, type);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${type}-${Date.now()}.pdf"`);
    res.send(pdf);
    return;
  }
  throw new ApiError(400, 'report.notFound', { format: 'Supported formats: csv, pdf' });
}));

export default router;