import { config } from './config/env';

const createSchema = (required: string[], properties: Record<string, unknown>): Record<string, unknown> => ({
  type: 'object',
  required,
  properties,
});

export const swaggerSpec = {
  openapi: '3.0.3',
  info: {
    title: 'PMS API',
    version: '1.0.0',
    description: `Commercial Performance Management System REST API.\n\n- Internationalised messages via \`Accept-Language\` (${config.supportedLocales().join(', ')})\n- Multi-tenant scoping via \`x-tenant-id\` (super admins)\n- Bearer token authentication`,
    license: { name: 'Proprietary' },
    contact: { name: 'PMS Engineering' },
  },
  servers: [{ url: `${config.APP_URL}${config.API_PREFIX}`, description: config.isProduction ? 'Production' : 'Development' }],
  security: [{ bearerAuth: [] }],
  tags: [
    { name: 'Auth', description: 'Authentication & password flows' },
    { name: 'Users', description: 'Employee management' },
    { name: 'Organizations', description: 'Tenants & organization configuration' },
    { name: 'Roles', description: 'RBAC roles and permissions' },
    { name: 'Departments', description: 'Department tree' },
    { name: 'Teams', description: 'Teams & membership' },
    { name: 'Goals', description: 'Goals, OKRs, key results, check-ins' },
    { name: 'KPIs', description: 'KPI definitions & entries' },
    { name: 'Review Cycles', description: 'Appraisal cycles' },
    { name: 'Review Templates', description: 'Templates & questions' },
    { name: 'Reviews', description: 'Performance reviews, 360° feedback, sign-offs' },
    { name: 'Feedback', description: 'Continuous feedback' },
    { name: 'Development Plans', description: 'Individual development plans' },
    { name: 'Competencies', description: 'Competency frameworks & skill assessments' },
    { name: 'Recognitions', description: 'Peer recognition' },
    { name: 'Notifications', description: 'In-app notifications' },
    { name: 'Reports', description: 'Dashboards & exports' },
    { name: 'Admin', description: 'Settings, audit logs, taxonomy' },
    { name: 'System', description: 'Health & metrics' },
    { name: 'One-on-Ones', description: 'Recurring manager↔employee meetings, agendas and action items' },
    { name: 'Surveys', description: 'Engagement, pulse and eNPS surveys with analytics' },
    { name: 'Time Off', description: 'Leave policies, balances, requests, approvals and holidays' },
    { name: 'Compensation', description: 'Salary bands, compensation records and pay review cycles' },
    { name: 'Onboarding', description: 'Onboarding / offboarding templates and assignments' },
    { name: 'Calibration', description: 'Calibration sessions, 9-box placement and final ratings' },
    { name: 'Documents', description: 'Policy documents, contracts and e-acknowledgements' },
    { name: 'Integrations', description: 'API keys, webhooks and delivery history' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    responses: {
      Envelope: {
        description: 'Standard response envelope',
        content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: {}, meta: {} } } } },
      },
      BadRequest: { description: 'Validation or bad request', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
      Unauthorized: { description: 'Missing or invalid credentials', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
      Forbidden: { description: 'Insufficient permissions', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
      NotFound: { description: 'Resource not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
    },
    schemas: {
      Error: {
        type: 'object',
        required: ['success', 'error'],
        properties: {
          success: { type: 'boolean', enum: [false] },
          error: {
            type: 'object',
            required: ['code', 'key', 'message'],
            properties: {
              code: { type: 'string' },
              key: { type: 'string' },
              message: { type: 'string' },
              details: {},
            },
          },
        },
      },
      Pagination: {
        type: 'object',
        properties: {
          page: { type: 'integer' },
          limit: { type: 'integer' },
          total: { type: 'integer' },
          pages: { type: 'integer' },
        },
      },
      User: createSchema(['id', 'firstName', 'lastName', 'email'], {
        id: { type: 'integer' },
        firstName: { type: 'string' },
        lastName: { type: 'string' },
        email: { type: 'string', format: 'email' },
        title: { type: 'string' },
        locale: { type: 'string' },
        timezone: { type: 'string' },
        status: { type: 'string' },
      }),
      CreateUser: createSchema(['firstName', 'lastName', 'email'], {
        firstName: { type: 'string', minLength: 1 },
        lastName: { type: 'string', minLength: 1 },
        email: { type: 'string', format: 'email' },
        password: { type: 'string', minLength: 8 },
        title: { type: 'string' },
        departmentId: { type: 'integer' },
        managerId: { type: 'integer' },
        timezone: { type: 'string' },
      }),
      Organization: createSchema(['id', 'name', 'slug'], {
        id: { type: 'integer' },
        name: { type: 'string' },
        slug: { type: 'string' },
        country: { type: 'string' },
        timezone: { type: 'string' },
        locale: { type: 'string' },
        currency: { type: 'string' },
        status: { type: 'string' },
      }),
      LoginRequest: createSchema(['email', 'password'], {
        email: { type: 'string', format: 'email' },
        password: { type: 'string' },
      }),
      AuthResponse: createSchema(['accessToken', 'refreshToken', 'user'], {
        accessToken: { type: 'string' },
        refreshToken: { type: 'string' },
        user: { $ref: '#/components/schemas/User' },
      }),
      Goal: createSchema(['id', 'title'], {
        id: { type: 'integer' },
        title: { type: 'string' },
        alignmentType: { type: 'string', enum: ['company', 'department', 'team', 'personal'] },
        status: { type: 'string', enum: ['draft', 'active', 'paused', 'completed', 'archived'] },
        progress: { type: 'number' },
        parentId: { type: 'integer' },
        endDate: { type: 'string', format: 'date' },
      }),
      GoalCreate: createSchema(['title'], {
        title: { type: 'string' },
        description: { type: 'string' },
        alignmentType: { type: 'string' },
        parentId: { type: 'integer' },
        startDate: { type: 'string', format: 'date' },
        endDate: { type: 'string', format: 'date' },
      }),
      Review: createSchema(['id', 'cycleId', 'userId', 'status'], {
        id: { type: 'integer' },
        cycleId: { type: 'integer' },
        userId: { type: 'integer' },
        status: { type: 'string' },
        overallRating: { type: 'number' },
        consolidatedScore: { type: 'number' },
      }),
      ReviewCycle: createSchema(['id', 'name', 'startDate', 'endDate'], {
        id: { type: 'integer' },
        name: { type: 'string' },
        period: { type: 'string' },
        startDate: { type: 'string', format: 'date' },
        endDate: { type: 'string', format: 'date' },
        status: { type: 'string' },
      }),
      Kpi: createSchema(['id', 'name', 'ownerType', 'ownerId', 'targetValue'], {
        id: { type: 'integer' },
        name: { type: 'string' },
        unit: { type: 'string' },
        targetValue: { type: 'number' },
        weight: { type: 'number' },
        periodUnit: { type: 'string' },
      }),
    },
  },
};

export const swaggerUiOptions = {
  customSiteTitle: 'PMS API Documentation',
  swaggerOptions: { persistAuthorization: true, displayRequestDuration: true },
};

export default swaggerSpec;