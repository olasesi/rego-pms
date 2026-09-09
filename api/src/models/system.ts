import {
  DataTypes,
  Model,
  type CreationOptional,
  type ForeignKey,
  type InferAttributes,
  type InferCreationAttributes,
} from 'sequelize';
import { sequelize } from '../config/database';
import type { User } from './identity';

export class Notification extends Model<InferAttributes<Notification>, InferCreationAttributes<Notification>> {
  declare id: CreationOptional<number>;
  declare orgId: CreationOptional<number | null>;
  declare userId: ForeignKey<User['id']>;
  declare type: string;
  declare title: string;
  declare body: CreationOptional<string | null>;
  declare link: CreationOptional<string | null>;
  declare metadata: CreationOptional<Record<string, unknown> | null>;
  declare readAt: CreationOptional<Date | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

Notification.init(
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    orgId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    userId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    type: { type: DataTypes.STRING(60), allowNull: false },
    title: { type: DataTypes.STRING(255), allowNull: false },
    body: { type: DataTypes.TEXT, allowNull: true },
    link: { type: DataTypes.STRING(500), allowNull: true },
    metadata: { type: DataTypes.JSON, allowNull: true },
    readAt: { type: DataTypes.DATE, allowNull: true },
    createdAt: { type: DataTypes.DATE, allowNull: false },
    updatedAt: { type: DataTypes.DATE, allowNull: false },
  },
  {
    sequelize,
    tableName: 'notifications',
    underscored: true,
    timestamps: true,
    indexes: [{ fields: ['user_id', 'read_at'] }, { fields: ['org_id'] }],
  },
);

export class AuditLog extends Model<InferAttributes<AuditLog>, InferCreationAttributes<AuditLog>> {
  declare id: CreationOptional<number>;
  declare orgId: CreationOptional<number | null>;
  declare userId: CreationOptional<number | null>;
  declare action: string;
  declare entity: string;
  declare entityId: CreationOptional<number | null>;
  declare method: string;
  declare path: string;
  declare statusCode: number;
  declare ip: CreationOptional<string | null>;
  declare userAgent: CreationOptional<string | null>;
  declare requestId: CreationOptional<string | null>;
  declare body: CreationOptional<Record<string, unknown> | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

AuditLog.init(
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    orgId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    userId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    action: { type: DataTypes.STRING(255), allowNull: false },
    entity: { type: DataTypes.STRING(80), allowNull: false },
    entityId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    method: { type: DataTypes.STRING(10), allowNull: false },
    path: { type: DataTypes.STRING(500), allowNull: false },
    statusCode: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    ip: { type: DataTypes.STRING(45), allowNull: true },
    userAgent: { type: DataTypes.TEXT, allowNull: true },
    requestId: { type: DataTypes.STRING(64), allowNull: true },
    body: { type: DataTypes.JSON, allowNull: true },
    createdAt: { type: DataTypes.DATE, allowNull: false },
    updatedAt: { type: DataTypes.DATE, allowNull: false },
  },
  {
    sequelize,
    tableName: 'audit_logs',
    underscored: true,
    timestamps: true,
    indexes: [{ fields: ['org_id', 'created_at'] }, { fields: ['entity', 'entity_id'] }, { fields: ['user_id'] }],
  },
);

export class AppSetting extends Model<InferAttributes<AppSetting>, InferCreationAttributes<AppSetting>> {
  declare id: CreationOptional<number>;
  declare orgId: CreationOptional<number | null>;
  declare key: string;
  declare value: unknown;
  declare category: CreationOptional<string>;
  declare isPublic: CreationOptional<boolean>;
  declare updatedById: CreationOptional<number | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

AppSetting.init(
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    orgId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    key: { type: DataTypes.STRING(120), allowNull: false },
    value: { type: DataTypes.JSON, allowNull: false },
    category: { type: DataTypes.STRING(80), allowNull: false, defaultValue: 'general' },
    isPublic: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    updatedById: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    createdAt: { type: DataTypes.DATE, allowNull: false },
    updatedAt: { type: DataTypes.DATE, allowNull: false },
  },
  {
    sequelize,
    tableName: 'app_settings',
    underscored: true,
    timestamps: true,
    indexes: [{ unique: true, fields: ['org_id', 'key'] }],
  },
);