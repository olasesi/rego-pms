import type { Request } from 'express';
import { parse as csvParse } from 'csv-parse/sync';
import { Op } from 'sequelize';
import { User, Department, Role, UserRole, Team, TeamMember } from '../../models';
import { CrudService } from '../../common/services/crud';
import { ApiError } from '../../common/utils/ApiError';
import { hashPassword } from '../../common/security/password';
import { randomCode } from '../../common/utils/helpers';
import { notifyUser } from '../../common/services/notification';

const userIncludes = [
  { model: Department, as: 'department', attributes: ['id', 'name', 'code'] },
  { model: User, as: 'manager', attributes: ['id', 'firstName', 'lastName', 'email'] },
  { model: Role, as: 'roles', through: { attributes: [] }, attributes: ['id', 'key', 'name'] },
];

const userDetailIncludes = [
  ...userIncludes,
  { model: Team, as: 'teams', through: { attributes: ['role'] }, attributes: ['id', 'name'] },
];

export class UserService extends CrudService {
  constructor() {
    super({
      model: User,
      moduleKey: 'user',
      tenantScoped: true,
      searchFields: ['firstName', 'lastName', 'email', 'title'],
      filters: [
        { field: 'departmentId', column: 'departmentId', type: 'eq' },
        { field: 'status', type: 'eq' },
        { field: 'managerId', type: 'eq' },
      ],
      defaultSortBy: 'createdAt',
      include: userIncludes,
      detailInclude: userDetailIncludes,
      notFoundKey: 'user.notFound',
      beforeUpdate: (data) => {
        const clean: Record<string, unknown> = { ...data };
        delete clean.orgId;
        delete clean.passwordHash;
        delete clean.emailVerifiedAt;
        return clean;
      },
      validateCreate: async (data) => {
        const email = String(data.email ?? '').toLowerCase();
        const existing = await User.findOne({ where: { email }, attributes: ['id'] });
        if (existing) throw new ApiError(409, 'user.emailExists');
      },
    });
  }

  async updateRoles(userId: number, roleIds: number[], requester: Request): Promise<User> {
    await this.findById(userId, requester);
    const allowedRoles = await Role.findAll({
      where: { [Op.or]: [{ orgId: null }, { orgId: requester.tenantId ?? null }] },
      attributes: ['id'],
    });
    const allowedIds = new Set(allowedRoles.map((r) => r.id));
    const invalid = roleIds.filter((id) => !allowedIds.has(id));
    if (invalid.length > 0) throw new ApiError(400, 'role.notFound', { invalidRoleIds: invalid });

    await UserRole.destroy({ where: { userId } });
    if (roleIds.length > 0) {
      await UserRole.bulkCreate(roleIds.map((roleId) => ({ userId, roleId })));
    }
    return this.findById(userId, requester);
  }

  async importCsv(csv: string, requester: Request): Promise<{ created: number; updated: number; failed: number; errors: string[] }> {
    let rows: Array<Record<string, string>>;
    try {
      rows = csvParse(csv, { columns: true, skip_empty_lines: true, trim: true });
    } catch (err) {
      throw new ApiError(400, 'validation.invalidBody', { csv: (err as Error).message });
    }

    const orgId = requester.tenantId;
    const departments = await Department.findAll({ where: { orgId: orgId as number }, attributes: ['id', 'name'] });
    const deptByName = new Map(departments.map((d) => [d.name.toLowerCase(), d.id]));
    const employeeRole = await Role.findOne({ where: { key: 'employee', orgId: null }, attributes: ['id'] });

    const result = { created: 0, updated: 0, failed: 0, errors: [] as string[] };
    const defaultPassword = randomCode(10);

    for (const [index, row] of rows.entries()) {
      const email = (row.email ?? '').trim().toLowerCase();
      const firstName = (row.firstName ?? row.first_name ?? '').trim();
      const lastName = (row.lastName ?? row.last_name ?? '').trim();
      const lineRef = `row ${index + 2}`;
      try {
        if (!email || !firstName || !lastName) {
          throw new Error(`${lineRef}: firstName, lastName and email are required`);
        }
        const deptId = row.department ? deptByName.get(row.department.trim().toLowerCase()) ?? null : null;
        const [user, created] = await User.findOrCreate({
          where: { email },
          defaults: {
            orgId,
            firstName,
            lastName,
            email,
            title: (row.title ?? row.jobTitle ?? null),
            departmentId: deptId,
            status: 'active',
            passwordHash: await hashPassword(defaultPassword),
          },
        });
        if (!created) {
          await user.update({ firstName, lastName, orgId });
          result.updated += 1;
        } else {
          if (employeeRole) await UserRole.create({ userId: user.id, roleId: employeeRole.id });
          result.created += 1;
          await notifyUser({
            userId: user.id,
            orgId,
            type: 'user.invited',
            title: 'Your PMS account is ready',
            body: 'Sign in with your email and the password provided by your administrator.',
            email: { to: email, subject: 'Welcome to the Performance Management System' },
          });
        }
      } catch (err) {
        result.failed += 1;
        result.errors.push(`${lineRef}: ${(err as Error).message}`);
      }
    }
    return result;
  }

  async addToTeams(userId: number, teamIds: number[], requester: Request): Promise<User> {
    await this.findById(userId, requester);
    await TeamMember.destroy({ where: { userId } });
    if (teamIds.length > 0) {
      await TeamMember.bulkCreate(teamIds.map((teamId) => ({ teamId, userId })));
    }
    return this.findById(userId, requester);
  }

  async getDirectReports(userId: number): Promise<User[]> {
    return User.findAll({ where: { managerId: userId, status: 'active' }, include: userIncludes });
  }
}

export const userService = new UserService();
export default userService;