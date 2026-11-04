import { buildSchema } from 'graphql';
import { createHandler } from 'graphql-http/lib/use/express';
import { Op } from 'sequelize';
import {
  User,
  Goal,
  PerformanceReview,
  Feedback,
  Recognition,
  Survey,
  SurveyQuestion,
  OneOnOneSeries,
  OneOnOneMeeting,
  LeaveRequest,
  EmployeeDocument,
  DocumentTemplate,
} from '../models';

const typeDefs = /* GraphQL */ `
  type User {
    id: Int!
    firstName: String!
    lastName: String!
    email: String!
    title: String
    locale: String
    timezone: String
    departmentId: Int
    managerId: Int
  }

  type Goal {
    id: Int!
    title: String!
    description: String
    status: String!
    priority: String!
    alignmentType: String!
    progress: Float!
    startDate: String
    endDate: String
    owner: User
  }

  type Review {
    id: Int!
    status: String!
    overallRating: Float
    completedAt: String
    cycleId: Int!
    userId: Int!
    reviewee: User
  }

  type Feedback {
    id: Int!
    type: String!
    title: String
    message: String!
    visibility: String!
    createdAt: String!
    sender: User
  }

  type Recognition {
    id: Int!
    message: String!
    points: Int!
    badge: String
    createdAt: String!
    sender: User
  }

  type SurveyQuestion {
    id: Int!
    title: String!
    type: String!
    required: Boolean!
    maxRating: Int!
  }

  type Survey {
    id: Int!
    title: String!
    description: String
    type: String!
    status: String!
    isAnonymous: Boolean!
    startDate: String
    endDate: String
    questions: [SurveyQuestion!]!
  }

  type Meeting {
    id: Int!
    scheduledAt: String!
    status: String!
  }

  type OneOnOneSeries {
    id: Int!
    title: String
    cadence: String!
    status: String!
    nextMeetingAt: String
    manager: User
    employee: User
    meetings: [Meeting!]!
  }

  type LeaveRequest {
    id: Int!
    startDate: String!
    endDate: String!
    days: Float!
    status: String!
    reason: String
  }

  type EmployeeDocument {
    id: Int!
    title: String!
    category: String!
    status: String!
    acknowledgedAt: String
    expiresAt: String
    template: DocumentTemplate
  }

  type DocumentTemplate {
    id: Int!
    name: String!
    category: String!
  }

  type Query {
    me: User
    users(limit: Int, search: String): [User!]!
    goals(status: String, limit: Int): [Goal!]!
    reviews(limit: Int): [Review!]!
    feedbackReceived(limit: Int): [Feedback!]!
    recognitionsReceived(limit: Int): [Recognition!]!
    surveys: [Survey!]!
    oneOnOneSeries: [OneOnOneSeries!]!
    leaveRequests(status: String): [LeaveRequest!]!
    documents: [EmployeeDocument!]!
  }
`;

interface GraphqlContext {
  req: {
    user?: { id: number; permissions: string[]; roles: string[] };
    tenantId?: number | null;
  };
}

const plain = <T>(value: T): T => (value == null ? value : (JSON.parse(JSON.stringify(value)) as T));

const orgWhere = (ctx: GraphqlContext): Record<string, unknown> =>
  ctx.req.tenantId != null ? { orgId: ctx.req.tenantId } : {};

const can = (ctx: GraphqlContext, key: string): boolean =>
  Boolean(ctx.req.user?.permissions?.includes(key));

const isAdminCtx = (ctx: GraphqlContext): boolean => {
  const roles = ctx.req.user?.roles ?? [];
  return roles.includes('super_admin') || roles.includes('org_admin');
};

const clampLimit = (value: unknown, fallback = 25): number =>
  Math.max(1, Math.min(100, Number(value) || fallback));

const userSummary = ['id', 'firstName', 'lastName', 'email', 'title', 'locale', 'timezone', 'departmentId', 'managerId'];

const rootValue = {
  me: async (_args: unknown, ctx: GraphqlContext) => {
    const id = ctx.req.user?.id;
    if (!id) return null;
    const user = await User.findByPk(id, { attributes: userSummary });
    return plain(user);
  },

  users: async (args: { limit?: number; search?: string }, ctx: GraphqlContext) => {
    const where: Record<string, unknown> = { ...orgWhere(ctx) };
    if (args.search) {
      where[Op.or as unknown as string] = [
        { firstName: { [Op.like]: `%${args.search}%` } },
        { lastName: { [Op.like]: `%${args.search}%` } },
        { email: { [Op.like]: `%${args.search}%` } },
      ];
    }
    const rows = await User.findAll({ where, attributes: userSummary, limit: clampLimit(args.limit), order: [['firstName', 'ASC']] });
    return plain(rows);
  },

  goals: async (args: { status?: string; limit?: number }, ctx: GraphqlContext) => {
    const where: Record<string, unknown> = { ...orgWhere(ctx) };
    if (args.status) where.status = args.status;
    const rows = await Goal.findAll({
      where,
      include: [{ model: User, as: 'owner', attributes: userSummary }],
      limit: clampLimit(args.limit),
      order: [['createdAt', 'DESC']],
    });
    return plain(rows);
  },

  reviews: async (args: { limit?: number }, ctx: GraphqlContext) => {
    const where: Record<string, unknown> = { ...orgWhere(ctx) };
    if (!isAdminCtx(ctx) && !can(ctx, 'reviews:read')) {
      where.userId = ctx.req.user?.id;
    }
    const rows = await PerformanceReview.findAll({
      where,
      include: [{ model: User, as: 'reviewee', attributes: userSummary }],
      limit: clampLimit(args.limit),
      order: [['createdAt', 'DESC']],
    });
    return plain(rows);
  },

  feedbackReceived: async (args: { limit?: number }, ctx: GraphqlContext) => {
    const rows = await Feedback.findAll({
      where: { ...orgWhere(ctx), receiverId: ctx.req.user?.id },
      include: [{ model: User, as: 'sender', attributes: userSummary }],
      limit: clampLimit(args.limit),
      order: [['createdAt', 'DESC']],
    });
    return plain(rows);
  },

  recognitionsReceived: async (args: { limit?: number }, ctx: GraphqlContext) => {
    const rows = await Recognition.findAll({
      where: { ...orgWhere(ctx), receiverId: ctx.req.user?.id },
      include: [{ model: User, as: 'sender', attributes: userSummary }],
      limit: clampLimit(args.limit),
      order: [['createdAt', 'DESC']],
    });
    return plain(rows);
  },

  surveys: async (_args: unknown, ctx: GraphqlContext) => {
    const rows = await Survey.findAll({
      where: orgWhere(ctx),
      include: [
        {
          model: SurveyQuestion,
          as: 'questions',
          separate: true,
          order: [['sortOrder', 'ASC']],
        },
      ],
      order: [['createdAt', 'DESC']],
    });
    return plain(rows);
  },

  oneOnOneSeries: async (_args: unknown, ctx: GraphqlContext) => {
    const org = orgWhere(ctx);
    const where: Record<string, unknown> = { ...org };
    if (!isAdminCtx(ctx) && !can(ctx, 'one_on_ones:manage')) {
      where[Op.or as unknown as string] = [{ managerId: ctx.req.user?.id }, { employeeId: ctx.req.user?.id }];
    }
    const rows = await OneOnOneSeries.findAll({
      where,
      include: [
        { model: User, as: 'manager', attributes: userSummary },
        { model: User, as: 'employee', attributes: userSummary },
        { model: OneOnOneMeeting, as: 'meetings', separate: true, order: [['scheduledAt', 'DESC']], limit: 25 },
      ],
      order: [['updatedAt', 'DESC']],
    });
    return plain(rows);
  },

  leaveRequests: async (args: { status?: string }, ctx: GraphqlContext) => {
    const where: Record<string, unknown> = { ...orgWhere(ctx) };
    if (args.status) where.status = args.status;
    if (!can(ctx, 'time_off:approve') && !isAdminCtx(ctx)) {
      where.userId = ctx.req.user?.id;
    }
    const rows = await LeaveRequest.findAll({ where, order: [['startDate', 'DESC']], limit: 100 });
    return plain(rows);
  },

  documents: async (_args: unknown, ctx: GraphqlContext) => {
    const where: Record<string, unknown> = { ...orgWhere(ctx) };
    if (!can(ctx, 'documents:manage')) where.userId = ctx.req.user?.id;
    const rows = await EmployeeDocument.findAll({
      where,
      include: [{ model: DocumentTemplate, as: 'template', attributes: ['id', 'name', 'category'] }],
      order: [['createdAt', 'DESC']],
      limit: 100,
    });
    return plain(rows);
  },
};

export const schema = buildSchema(typeDefs);

export const graphqlHandler = createHandler({
  schema,
  rootValue,
  context: (req: unknown) => ({ req: (req as { raw?: GraphqlContext['req'] }).raw ?? (req as GraphqlContext['req']) }),
});

export default graphqlHandler;
