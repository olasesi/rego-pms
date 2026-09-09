import type { Request } from 'express';
import { Team, User, TeamMember } from '../../models';
import { CrudService } from '../../common/services/crud';

const teamIncludes = [
  { model: User, as: 'lead', attributes: ['id', 'firstName', 'lastName', 'email'] },
  { model: User, as: 'members', through: { attributes: ['role'] }, attributes: ['id', 'firstName', 'lastName', 'email'] },
];

export class TeamService extends CrudService {
  constructor() {
    super({
      model: Team,
      moduleKey: 'team',
      tenantScoped: true,
      searchFields: ['name'],
      defaultSortBy: 'createdAt',
      include: teamIncludes,
      detailInclude: teamIncludes,
      notFoundKey: 'team.notFound',
    });
  }

  async addMember(teamId: number, userId: number, role: 'member' | 'lead', req: Request): Promise<void> {
    await this.findById(teamId, req);
    await TeamMember.destroy({ where: { teamId, userId } });
    await TeamMember.create({ teamId, userId, role });
  }

  async removeMember(teamId: number, userId: number, req: Request): Promise<void> {
    await this.findById(teamId, req);
    await TeamMember.destroy({ where: { teamId, userId } });
  }
}

export const teamService = new TeamService();
export default teamService;