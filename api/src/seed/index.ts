import { AppSetting, Organization, Permission, Role, RolePermission, User, UserRole } from '../models';
import { ALL_PERMISSION_KEYS, PERMISSION_LIST, ROLE_SEED } from '../common/constants/permissions';
import { hashPassword } from '../common/security/password';
import { config } from '../config/env';
import { log } from '../config/logger';
import { Organization as OrgModel } from '../models';

export const DEFAULT_RATING_SCALE = {
  levels: [
    { value: 1, label: 'Needs Improvement', color: '#f43f5e' },
    { value: 2, label: 'Partially Meets Expectations', color: '#f59e0b' },
    { value: 3, label: 'Meets Expectations', color: '#3b82f6' },
    { value: 4, label: 'Exceeds Expectations', color: '#10b981' },
    { value: 5, label: 'Outstanding', color: '#8b5cf6' },
  ],
};

export async function seedPermissions(): Promise<void> {
  const existing = await Permission.findAll({ attributes: ['key'] });
  const existingKeys = new Set(existing.map((p) => p.key));
  const toCreate = PERMISSION_LIST.filter((p) => !existingKeys.has(p.key));
  if (toCreate.length === 0) return;
  await Permission.bulkCreate(toCreate.map((p) => ({ key: p.key, name: p.description, module: p.module, description: p.description })));
  log.info(`[seed] created ${toCreate.length} permissions`);
}

export async function seedSystemRoles(): Promise<void> {
  const permissions = await Permission.findAll({ attributes: ['id', 'key'] });
  const permissionByKey = new Map(permissions.map((p) => [p.key, p.id]));
  for (const [key, def] of Object.entries(ROLE_SEED)) {
    const [role, created] = await Role.findOrCreate({
      where: { key, orgId: null },
      defaults: { key, name: def.name, description: def.description, isSystem: true, orgId: null },
    });
    if (created) {
      const keys = def.permissions === '*' ? ALL_PERMISSION_KEYS : def.permissions;
      const permissionIds = keys.map((k) => permissionByKey.get(k)).filter((id): id is number => id != null);
      await RolePermission.bulkCreate(
        permissionIds.map((permissionId) => ({ roleId: role.id, permissionId })),
        { ignoreDuplicates: true },
      );
      log.info(`[seed] created role '${key}' with ${permissionIds.length} permissions`);
    }
  }
}

export async function seedDefaultOrganization(): Promise<OrgModel> {
  const [org] = await Organization.findOrCreate({
    where: { slug: 'acme' },
    defaults: { name: config.DEFAULT_TENANT_NAME, slug: 'acme', status: 'active' },
  });
  return org;
}

export async function seedDefaultSettings(): Promise<void> {
  const org = await seedDefaultOrganization();
  await AppSetting.findOrCreate({
    where: { orgId: org.id, key: 'rating_scale' },
    defaults: { orgId: org.id, key: 'rating_scale', value: DEFAULT_RATING_SCALE, category: 'taxonomy' },
  });
  await AppSetting.findOrCreate({
    where: { orgId: org.id, key: 'recognition_points' },
    defaults: {
      orgId: org.id,
      key: 'recognition_points',
      value: { budgetPerQuarter: 100, defaultPerRecognition: 5 },
      category: 'recognition',
    },
  });
  await AppSetting.findOrCreate({
    where: { orgId: null, key: 'platform.locale' },
    defaults: { orgId: null, key: 'platform.locale', value: { default: config.DEFAULT_LOCALE, supported: config.supportedLocales() }, category: 'platform' },
  });
}

export async function seedAdminUser(): Promise<void> {
  const org = await seedDefaultOrganization();
  const [user, created] = await User.findOrCreate({
    where: { email: config.SEED_ADMIN_EMAIL },
    defaults: {
      orgId: org.id,
      firstName: config.SEED_ADMIN_FIRST_NAME,
      lastName: config.SEED_ADMIN_LAST_NAME,
      email: config.SEED_ADMIN_EMAIL,
      passwordHash: await hashPassword(config.SEED_ADMIN_PASSWORD),
      locale: config.SEED_ADMIN_LOCALE,
      timezone: config.SEED_ADMIN_TIMEZONE,
      status: 'active',
      emailVerifiedAt: new Date(),
    },
  });
  if (created) {
    const role = await Role.findOne({ where: { key: 'super_admin', orgId: null } });
    if (role) await UserRole.create({ userId: user.id, roleId: role.id });
    log.info(`[seed] created admin user '${config.SEED_ADMIN_EMAIL}'`);
  }
}

export async function seedDatabase(): Promise<void> {
  log.info('[seed] starting database seed...');
  await seedPermissions();
  await seedSystemRoles();
  await seedDefaultSettings();
  await seedAdminUser();
  log.info('[seed] finished database seed');
}

export default { seedDatabase, seedDefaultOrganization, DEFAULT_RATING_SCALE };