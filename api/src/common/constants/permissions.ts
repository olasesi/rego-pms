export interface PermissionDefinition {
  key: string;
  module: string;
  description: string;
}

const all = <K extends string>(group: string, keys: readonly K[], descriptions: Record<K, string>): PermissionDefinition[] =>
  keys.map((key) => ({ key: `${group}:${key as string}`, module: group, description: descriptions[key] }));

const U = {
  users: {
    read: 'View users',
    create: 'Create users',
    update: 'Update users',
    delete: 'Delete users',
    import: 'Import users via CSV',
    manage: 'Manage all user data',
  },
  roles: { read: 'View roles', manage: 'Create and edit roles' },
  organizations: { read: 'View organizations', update: 'Update organizations' },
  departments: { read: 'View departments', manage: 'Manage departments' },
  teams: { read: 'View teams', manage: 'Manage teams and membership' },
  goals: { read: 'View goals', create: 'Create goals', update: 'Update goals', delete: 'Delete goals', manage: 'Manage any goal' },
  kpis: { read: 'View KPIs', manage: 'Create and edit KPIs' },
  cycles: { read: 'View review cycles', manage: 'Create and manage review cycles' },
  templates: { read: 'View templates', manage: 'Create and manage templates' },
  reviews: {
    read: 'View reviews',
    self: 'Complete own review',
    assess: 'Assess other employees',
    approve: 'Approve reviews',
    finalize: 'Finalize reviews',
    manage: 'Manage all reviews',
  },
  feedback: { read: 'View feedback', create: 'Send feedback', manage: 'Manage all feedback' },
  plans: { read: 'View development plans', create: 'Create plans', update: 'Update plans', delete: 'Delete plans', manage: 'Manage any plan' },
  competencies: { read: 'View competencies', manage: 'Manage competency frameworks' },
  assessments: { manage: 'Manage skill assessments' },
  recognitions: { read: 'View recognitions', create: 'Send recognitions', manage: 'Manage recognitions' },
  notifications: { read: 'View notifications', manage: 'Manage notification preferences' },
  reports: { read: 'View reports', export: 'Export reports' },
  admin: { settings: 'Edit system settings', audit: 'View audit logs' },
  system: { health: 'Check health', metrics: 'View metrics' },
} as const;

export const PERMISSION_LIST: PermissionDefinition[] = [
  ...all('users', ['read', 'create', 'update', 'delete', 'import', 'manage'], U.users),
  ...all('roles', ['read', 'manage'], U.roles),
  ...all('organizations', ['read', 'update'], U.organizations),
  ...all('departments', ['read', 'manage'], U.departments),
  ...all('teams', ['read', 'manage'], U.teams),
  ...all('goals', ['read', 'create', 'update', 'delete', 'manage'], U.goals),
  ...all('kpis', ['read', 'manage'], U.kpis),
  ...all('cycles', ['read', 'manage'], U.cycles),
  ...all('templates', ['read', 'manage'], U.templates),
  ...all('reviews', ['read', 'self', 'assess', 'approve', 'finalize', 'manage'], U.reviews),
  ...all('feedback', ['read', 'create', 'manage'], U.feedback),
  ...all('plans', ['read', 'create', 'update', 'delete', 'manage'], U.plans),
  ...all('competencies', ['read', 'manage'], U.competencies),
  all('competencies', ['assess'], { assess: 'Assess skill levels' })[0],
  ...all('recognitions', ['read', 'create', 'manage'], U.recognitions),
  ...all('notifications', ['read', 'manage'], U.notifications),
  ...all('reports', ['read', 'export'], U.reports),
  ...all('admin', ['settings', 'audit'], U.admin),
  ...all('system', ['health', 'metrics'], U.system),
];

export const ALL_PERMISSION_KEYS = PERMISSION_LIST.map((p) => p.key);

export type RoleKey = 'super_admin' | 'org_admin' | 'hr_manager' | 'manager' | 'employee';

export const ROLE_SEED: Record<RoleKey, { name: string; description: string; permissions: string[] | '*' }> = {
  super_admin: {
    name: 'Super Admin',
    description: 'Full platform access across all organizations',
    permissions: '*',
  },
  org_admin: {
    name: 'Organization Administrator',
    description: 'Full administration of a single organization',
    permissions: ALL_PERMISSION_KEYS,
  },
  hr_manager: {
    name: 'HR Manager',
    description: 'Manages the performance review process for the organization',
    permissions: [
      'users:read', 'users:create', 'users:update', 'users:import', 'users:manage',
      'roles:read',
      'organizations:read',
      'departments:read', 'departments:manage',
      'teams:read', 'teams:manage',
      'goals:read',
      'kpis:read',
      'cycles:read', 'cycles:manage',
      'templates:read', 'templates:manage',
      'reviews:read', 'reviews:self', 'reviews:assess', 'reviews:approve', 'reviews:finalize', 'reviews:manage',
      'feedback:read', 'feedback:create', 'feedback:manage',
      'plans:read', 'plans:update',
      'competencies:read', 'competencies:manage', 'competencies:assess',
      'recognitions:read', 'recognitions:manage',
      'notifications:read',
      'reports:read', 'reports:export',
      'admin:settings', 'admin:audit',
    ],
  },
  manager: {
    name: 'Manager',
    description: 'Manages a team and assesses direct reports',
    permissions: [
      'users:read',
      'teams:read',
      'goals:read', 'goals:create', 'goals:update',
      'kpis:read',
      'cycles:read',
      'reviews:read', 'reviews:self', 'reviews:assess',
      'feedback:read', 'feedback:create',
      'plans:read', 'plans:create', 'plans:update',
      'competencies:read', 'competencies:assess',
      'recognitions:read', 'recognitions:create',
      'notifications:read',
      'reports:read',
    ],
  },
  employee: {
    name: 'Employee',
    description: 'Standard employee with self-service capabilities',
    permissions: [
      'goals:read',
      'reviews:self',
      'feedback:read', 'feedback:create',
      'plans:read', 'plans:create', 'plans:update',
      'competencies:read', 'competencies:assess',
      'recognitions:read', 'recognitions:create',
      'notifications:read',
    ],
  },
};