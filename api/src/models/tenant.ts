import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
  type ForeignKey,
} from 'sequelize';
import { sequelize } from '../config/database';
import { config } from '../config/env';

export type OrganizationStatus = 'active' | 'suspended';

export class Organization extends Model<InferAttributes<Organization>, InferCreationAttributes<Organization>> {
  declare id: CreationOptional<number>;
  declare name: string;
  declare slug: string;
  declare legalName: CreationOptional<string | null>;
  declare code: CreationOptional<string | null>;
  declare industry: CreationOptional<string | null>;
  declare country: CreationOptional<string | null>;
  declare region: CreationOptional<string | null>;
  declare timezone: CreationOptional<string>;
  declare locale: CreationOptional<string>;
  declare currency: CreationOptional<string>;
  declare dateFormat: CreationOptional<string>;
  declare website: CreationOptional<string | null>;
  declare logoUrl: CreationOptional<string | null>;
  declare status: CreationOptional<OrganizationStatus>;
  declare maxEmployees: CreationOptional<number | null>;
  declare settings: CreationOptional<Record<string, unknown> | null>;
  declare createdBy: CreationOptional<number | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

Organization.init(
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(140), allowNull: false },
    slug: { type: DataTypes.STRING(140), allowNull: false, unique: true },
    legalName: { type: DataTypes.STRING(255), allowNull: true },
    code: { type: DataTypes.STRING(40), allowNull: true },
    industry: { type: DataTypes.STRING(120), allowNull: true },
    country: { type: DataTypes.STRING(2), allowNull: true, defaultValue: 'US' },
    region: { type: DataTypes.STRING(80), allowNull: true },
    timezone: { type: DataTypes.STRING(60), allowNull: false, defaultValue: 'UTC' },
    locale: { type: DataTypes.STRING(10), allowNull: false, defaultValue: config.DEFAULT_LOCALE },
    currency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'USD' },
    dateFormat: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'YYYY-MM-DD' },
    website: { type: DataTypes.STRING(255), allowNull: true },
    logoUrl: { type: DataTypes.STRING(500), allowNull: true },
    status: { type: DataTypes.ENUM('active', 'suspended'), allowNull: false, defaultValue: 'active' },
    maxEmployees: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    settings: { type: DataTypes.JSON, allowNull: true },
    createdBy: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    createdAt: { type: DataTypes.DATE, allowNull: false },
    updatedAt: { type: DataTypes.DATE, allowNull: false },
  },
  { sequelize, tableName: 'organizations', underscored: true, timestamps: true },
);

export class Department extends Model<InferAttributes<Department>, InferCreationAttributes<Department>> {
  declare id: CreationOptional<number>;
  declare orgId: ForeignKey<Organization['id']>;
  declare parentId: CreationOptional<number | null>;
  declare name: string;
  declare code: CreationOptional<string | null>;
  declare description: CreationOptional<string | null>;
  declare headUserId: CreationOptional<number | null>;
  declare sortOrder: CreationOptional<number>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

Department.init(
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    orgId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    parentId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    name: { type: DataTypes.STRING(140), allowNull: false },
    code: { type: DataTypes.STRING(40), allowNull: true },
    description: { type: DataTypes.TEXT, allowNull: true },
    headUserId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    createdAt: { type: DataTypes.DATE, allowNull: false },
    updatedAt: { type: DataTypes.DATE, allowNull: false },
  },
  {
    sequelize,
    tableName: 'departments',
    underscored: true,
    timestamps: true,
    indexes: [{ unique: true, fields: ['org_id', 'name'] }],
  },
);

export class Team extends Model<InferAttributes<Team>, InferCreationAttributes<Team>> {
  declare id: CreationOptional<number>;
  declare orgId: ForeignKey<Organization['id']>;
  declare name: string;
  declare description: CreationOptional<string | null>;
  declare leadUserId: CreationOptional<number | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

Team.init(
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    orgId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    name: { type: DataTypes.STRING(140), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    leadUserId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    createdAt: { type: DataTypes.DATE, allowNull: false },
    updatedAt: { type: DataTypes.DATE, allowNull: false },
  },
  {
    sequelize,
    tableName: 'teams',
    underscored: true,
    timestamps: true,
    indexes: [{ unique: true, fields: ['org_id', 'name'] }],
  },
);

export type TeamMemberRole = 'member' | 'lead';

export class TeamMember extends Model<InferAttributes<TeamMember>, InferCreationAttributes<TeamMember>> {
  declare id: CreationOptional<number>;
  declare teamId: ForeignKey<Team['id']>;
  declare userId: ForeignKey<Organization['id']>;
  declare role: CreationOptional<TeamMemberRole>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

TeamMember.init(
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    teamId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    userId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    role: { type: DataTypes.ENUM('member', 'lead'), allowNull: false, defaultValue: 'member' },
    createdAt: { type: DataTypes.DATE, allowNull: false },
    updatedAt: { type: DataTypes.DATE, allowNull: false },
  },
  {
    sequelize,
    tableName: 'team_members',
    underscored: true,
    timestamps: true,
    indexes: [{ unique: true, fields: ['team_id', 'user_id'] }],
  },
);