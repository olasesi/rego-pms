import {
  DataTypes,
  Model,
  type CreationOptional,
  type ForeignKey,
  type InferAttributes,
  type InferCreationAttributes,
} from 'sequelize';
import { sequelize } from '../config/database';
import { config } from '../config/env';

export type UserStatus = 'active' | 'invited' | 'inactive' | 'terminated';
export type EmploymentType = 'full_time' | 'part_time' | 'contract' | 'intern' | 'other';

export class User extends Model<InferAttributes<User>, InferCreationAttributes<User>> {
  declare id: CreationOptional<number>;
  declare orgId: CreationOptional<number | null>;
  declare firstName: string;
  declare lastName: string;
  declare email: string;
  declare passwordHash: string;
  declare title: CreationOptional<string | null>;
  declare avatarUrl: CreationOptional<string | null>;
  declare locale: CreationOptional<string>;
  declare timezone: CreationOptional<string>;
  declare departmentId: CreationOptional<number | null>;
  declare managerId: CreationOptional<number | null>;
  declare employeeCode: CreationOptional<string | null>;
  declare startDate: CreationOptional<Date | null>;
  declare employmentType: CreationOptional<EmploymentType>;
  declare status: CreationOptional<UserStatus>;
  declare emailVerifiedAt: CreationOptional<Date | null>;
  declare lastLoginAt: CreationOptional<Date | null>;
  declare createdBy: CreationOptional<number | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  declare roles?: Role[];

  declare department?: import('./tenant').Department | null;
  declare manager?: User | null;
}

User.init(
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    orgId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    firstName: { type: DataTypes.STRING(80), allowNull: false },
    lastName: { type: DataTypes.STRING(80), allowNull: false },
    email: { type: DataTypes.STRING(255), allowNull: false, unique: true },
    passwordHash: { type: DataTypes.STRING(120), allowNull: false },
    title: { type: DataTypes.STRING(140), allowNull: true },
    avatarUrl: { type: DataTypes.STRING(500), allowNull: true },
    locale: { type: DataTypes.STRING(10), allowNull: false, defaultValue: config.DEFAULT_LOCALE },
    timezone: { type: DataTypes.STRING(60), allowNull: false, defaultValue: 'UTC' },
    departmentId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    managerId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    employeeCode: { type: DataTypes.STRING(60), allowNull: true },
    startDate: { type: DataTypes.DATEONLY, allowNull: true },
    employmentType: {
      type: DataTypes.ENUM('full_time', 'part_time', 'contract', 'intern', 'other'),
      allowNull: false,
      defaultValue: 'full_time',
    },
    status: { type: DataTypes.ENUM('active', 'invited', 'inactive', 'terminated'), allowNull: false, defaultValue: 'active' },
    emailVerifiedAt: { type: DataTypes.DATE, allowNull: true },
    lastLoginAt: { type: DataTypes.DATE, allowNull: true },
    createdBy: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    createdAt: { type: DataTypes.DATE, allowNull: false },
    updatedAt: { type: DataTypes.DATE, allowNull: false },
  },
  {
    sequelize,
    tableName: 'users',
    underscored: true,
    timestamps: true,
    defaultScope: {
      attributes: { exclude: ['passwordHash'] },
    },
    indexes: [{ fields: ['org_id'] }, { fields: ['department_id'] }, { fields: ['manager_id'] }],
  },
);

export class Role extends Model<InferAttributes<Role>, InferCreationAttributes<Role>> {
  declare id: CreationOptional<number>;
  declare orgId: CreationOptional<number | null>;
  declare name: string;
  declare key: string;
  declare description: CreationOptional<string | null>;
  declare isSystem: CreationOptional<boolean>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare permissions?: Permission[];
}

Role.init(
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    orgId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    name: { type: DataTypes.STRING(120), allowNull: false },
    key: { type: DataTypes.STRING(80), allowNull: false },
    description: { type: DataTypes.STRING(255), allowNull: true },
    isSystem: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    createdAt: { type: DataTypes.DATE, allowNull: false },
    updatedAt: { type: DataTypes.DATE, allowNull: false },
  },
  {
    sequelize,
    tableName: 'roles',
    underscored: true,
    timestamps: true,
    indexes: [{ unique: true, fields: ['org_id', 'key'] }],
  },
);

export class Permission extends Model<InferAttributes<Permission>, InferCreationAttributes<Permission>> {
  declare id: CreationOptional<number>;
  declare key: string;
  declare name: string;
  declare module: string;
  declare description: CreationOptional<string | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

Permission.init(
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    key: { type: DataTypes.STRING(100), allowNull: false, unique: true },
    name: { type: DataTypes.STRING(160), allowNull: false },
    module: { type: DataTypes.STRING(80), allowNull: false },
    description: { type: DataTypes.STRING(255), allowNull: true },
    createdAt: { type: DataTypes.DATE, allowNull: false },
    updatedAt: { type: DataTypes.DATE, allowNull: false },
  },
  { sequelize, tableName: 'permissions', underscored: true, timestamps: true },
);

export class RolePermission extends Model<InferAttributes<RolePermission>, InferCreationAttributes<RolePermission>> {
  declare id: CreationOptional<number>;
  declare roleId: ForeignKey<Role['id']>;
  declare permissionId: ForeignKey<Permission['id']>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

RolePermission.init(
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    roleId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    permissionId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    createdAt: { type: DataTypes.DATE, allowNull: false },
    updatedAt: { type: DataTypes.DATE, allowNull: false },
  },
  {
    sequelize,
    tableName: 'role_permissions',
    underscored: true,
    timestamps: true,
    indexes: [{ unique: true, fields: ['role_id', 'permission_id'] }],
  },
);

export class UserRole extends Model<InferAttributes<UserRole>, InferCreationAttributes<UserRole>> {
  declare id: CreationOptional<number>;
  declare userId: ForeignKey<User['id']>;
  declare roleId: ForeignKey<Role['id']>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

UserRole.init(
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    roleId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    createdAt: { type: DataTypes.DATE, allowNull: false },
    updatedAt: { type: DataTypes.DATE, allowNull: false },
  },
  {
    sequelize,
    tableName: 'user_roles',
    underscored: true,
    timestamps: true,
    indexes: [{ unique: true, fields: ['user_id', 'role_id'] }],
  },
);

export type TokenType = 'refresh' | 'email_verification' | 'password_reset' | 'invite';

export class Token extends Model<InferAttributes<Token>, InferCreationAttributes<Token>> {
  declare id: CreationOptional<number>;
  declare userId: ForeignKey<User['id']>;
  declare type: TokenType;
  declare tokenHash: string;
  declare expiresAt: Date;
  declare consumedAt: CreationOptional<Date | null>;
  declare revokedAt: CreationOptional<Date | null>;
  declare replacedByHash: CreationOptional<string | null>;
  declare ip: CreationOptional<string | null>;
  declare userAgent: CreationOptional<string | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

Token.init(
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    type: {
      type: DataTypes.ENUM('refresh', 'email_verification', 'password_reset', 'invite'),
      allowNull: false,
    },
    tokenHash: { type: DataTypes.STRING(64), allowNull: false, unique: true },
    expiresAt: { type: DataTypes.DATE, allowNull: false },
    consumedAt: { type: DataTypes.DATE, allowNull: true },
    revokedAt: { type: DataTypes.DATE, allowNull: true },
    replacedByHash: { type: DataTypes.STRING(64), allowNull: true },
    ip: { type: DataTypes.STRING(45), allowNull: true },
    userAgent: { type: DataTypes.TEXT, allowNull: true },
    createdAt: { type: DataTypes.DATE, allowNull: false },
    updatedAt: { type: DataTypes.DATE, allowNull: false },
  },
  {
    sequelize,
    tableName: 'tokens',
    underscored: true,
    timestamps: true,
    indexes: [{ fields: ['user_id', 'type'] }, { fields: ['expires_at'] }],
  },
);