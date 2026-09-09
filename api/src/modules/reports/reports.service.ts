/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Request } from 'express';
import PDFDocument from 'pdfkit';
import { stringify } from 'csv-stringify/sync';
import { Op, QueryTypes } from 'sequelize';
import { Goal, Kpi, PerformanceReview, User } from '../../models';
import { sequelize } from '../../config/database';
import { round2, percent } from '../../common/utils/helpers';
import { ApiError } from '../../common/utils/ApiError';

export interface OrgStats {
  users: number;
  activeUsers: number;
  goals: number;
  activeGoals: number;
  goalProgress: number;
  kpis: number;
  kpiAttainment: number;
  reviews: number;
  completedReviews: number;
  avgScore: number | null;
}

export class ReportService {
  async summary(req: Request): Promise<OrgStats> {
    const orgId = req.tenantId;
    const scope = orgId != null ? { orgId } : {};

    const [
      users,
      activeUsers,
      goals,
      activeGoals,
      kpis,
      reviews,
      completedReviews,
      avgRow,
    ] = await Promise.all([
      User.count({ where: scope }),
      User.count({ where: { ...scope, status: 'active' } }),
      Goal.count({ where: scope }),
      Goal.count({ where: { ...scope, status: 'active' } }),
      Kpi.count({ where: scope }),
      PerformanceReview.count({ where: scope }),
      PerformanceReview.count({ where: { ...scope, status: { [Op.in]: ['approved', 'signed_off'] } } }),
      PerformanceReview.findOne({
        where: { ...scope, overallRating: { [Op.ne]: null } },
        attributes: [[sequelize.fn('AVG', sequelize.col('overall_rating')), 'avg']],
        raw: true,
      }),
    ]);

    const goalsRes = await Goal.findAll({ where: { ...scope, status: 'active' }, attributes: ['progress'] });
    const goalProgress = goalsRes.length
      ? round2(goalsRes.reduce((sum, g) => sum + (g.progress ?? 0), 0) / goalsRes.length)
      : 0;

    const kpiRows = await Kpi.findAll({ where: { ...scope, status: 'active' }, attributes: ['id', 'targetValue'] });
    let kpiAttainment = 0;
    if (kpiRows.length > 0) {
      const ids = kpiRows.map((k) => k.id);
      const latest = await sequelize.query<{ kpiId: number; value: number }>(
        `SELECT kpi_id AS kpiId, value FROM kpi_entries e
         WHERE e.id IN (SELECT MAX(id) FROM kpi_entries WHERE kpi_id IN (:ids) GROUP BY kpi_id)`,
        { replacements: { ids }, type: QueryTypes.SELECT },
      );
      const byId = new Map(latest.map((r: { kpiId: number; value: number }) => [r.kpiId, r.value]));
      let total = 0;
      for (const k of kpiRows) {
        const current = byId.get(k.id) ?? 0;
        const target = k.targetValue ?? 0;
        total += percent(current, target);
      }
      kpiAttainment = round2(total / kpiRows.length);
    }

    return {
      users,
      activeUsers,
      goals,
      activeGoals,
      goalProgress,
      kpis,
      kpiAttainment,
      reviews,
      completedReviews,
      avgScore: avgRow ? round2(Number((avgRow as { avg?: number }).avg ?? 0)) : null,
    };
  }

  async performanceDistribution(req: Request): Promise<Array<{ status: string; count: number }>> {
    const scope = req.tenantId != null ? { orgId: req.tenantId } : {};
    const rows = await PerformanceReview.findAll({
      where: scope,
      attributes: ['status', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
      group: ['status'],
      raw: true,
    });
    return rows.map((r: any) => ({ status: r.status, count: Number(r.count) }));
  }

  async goalProgressByDepartment(req: Request): Promise<unknown[]> {
    const scope = req.tenantId != null ? { orgId: req.tenantId } : {};
    const rows = await Goal.findAll({
      where: scope,
      attributes: [
        'orgId',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('AVG', sequelize.col('progress')), 'avgProgress'],
      ],
      raw: true,
    });
    return rows;
  }

  async departmentScores(req: Request): Promise<unknown[]> {
    const orgId = req.tenantId;
    if (orgId == null) return [];
    const rows = await sequelize.query(
      `SELECT d.id, d.name,
              COUNT(DISTINCT r.id) AS review_count,
              AVG(r.overall_rating) AS avg_score
       FROM departments d
       LEFT JOIN users u ON u.department_id = d.id
       LEFT JOIN performance_reviews r ON r.user_id = u.id AND r.overall_rating IS NOT NULL
       WHERE d.org_id = :orgId
       GROUP BY d.id, d.name
       HAVING COUNT(DISTINCT r.id) > 0`,
      { replacements: { orgId }, type: QueryTypes.SELECT },
    );
    return rows.map((r: any) => ({ id: r.id, name: r.name, reviewCount: Number(r.review_count), avgScore: r.avg_score ? round2(Number(r.avg_score)) : null }));
  }

  async exportCsv(req: Request, type: string): Promise<string> {
    const scope = req.tenantId != null ? { orgId: req.tenantId } : {};
    let rows: Array<Record<string, unknown>> = [];
    let columns: Array<{ key: string; header: string }> = [];

    if (type === 'users') {
      const users = await User.findAll({ where: scope, raw: true });
      rows = users.map((u) => ({ id: u.id, firstName: u.firstName, lastName: u.lastName, email: u.email, title: u.title ?? '', status: u.status }));
      columns = [
        { key: 'id', header: 'ID' },
        { key: 'firstName', header: 'First Name' },
        { key: 'lastName', header: 'Last Name' },
        { key: 'email', header: 'Email' },
        { key: 'title', header: 'Title' },
        { key: 'status', header: 'Status' },
      ];
    } else if (type === 'goals') {
      const goals = await Goal.findAll({ where: scope, raw: true });
      rows = goals.map((g) => ({ id: g.id, title: g.title, alignmentType: g.alignmentType, status: g.status, progress: g.progress, endDate: g.endDate ?? '' }));
      columns = [
        { key: 'id', header: 'ID' },
        { key: 'title', header: 'Title' },
        { key: 'alignmentType', header: 'Type' },
        { key: 'status', header: 'Status' },
        { key: 'progress', header: 'Progress' },
        { key: 'endDate', header: 'End Date' },
      ];
    } else if (type === 'reviews') {
      const reviews = await PerformanceReview.findAll({
        where: scope,
        include: [{ model: User, as: 'reviewee', attributes: ['firstName', 'lastName', 'email'] }],
        raw: true,
      });
      rows = reviews.map((r: any) => ({
        id: r.id,
        employee: `${r['reviewee.firstName'] ?? ''} ${r['reviewee.lastName'] ?? ''}`.trim(),
        email: r['reviewee.email'] ?? '',
        status: r.status,
        overallRating: r.overallRating ?? '',
      }));
      columns = [
        { key: 'id', header: 'ID' },
        { key: 'employee', header: 'Employee' },
        { key: 'email', header: 'Email' },
        { key: 'status', header: 'Status' },
        { key: 'overallRating', header: 'Rating' },
      ];
    } else {
      throw new ApiError(400, 'report.notFound');
    }

    return stringify(rows, { header: true, columns });
  }

  async exportPdf(req: Request, type: string): Promise<Buffer> {
    const csv = await this.exportCsv(req, type);
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 40, info: { Title: `PMS Report - ${type}` } });
      const chunks: Buffer[] = [];
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      doc.fontSize(18).text(`Performance Report: ${type}`, { align: 'center' });
      doc.moveDown();
      doc.fontSize(9).fillColor('#666').text(`Generated ${new Date().toISOString()}`);
      doc.moveDown();
      doc.fontSize(7).text(csv, { lineBreak: false });
      doc.end();
    });
  }
}

export const reportService = new ReportService();

export default reportService;