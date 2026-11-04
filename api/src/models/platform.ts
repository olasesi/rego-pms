import {
  DataTypes,
  Model,
  type CreationOptional,
  type ForeignKey,
  type InferAttributes,
  type InferCreationAttributes,
} from 'sequelize';
import { sequelize } from '../config/database';

// ---------------------------------------------------------------------------
// Integrations: API keys, webhooks, deliveries
// ---------------------------------------------------------------------------

export class ApiKey extends Model<InferAttributes<ApiKey>, InferCreationAttributes<ApiKey>> {
  declare id: CreationOptional<number>;
  declare orgId: number;
  declare name: string;
  declare keyPrefix: string;
  declare keyHash: string;
  declare scopes: CreationOptional<string[] | null>;
  declare lastUsedAt: CreationOptional<Date | null>;
  declare expiresAt: CreationOptional<Date | null>;
  declare revokedAt: CreationOptional<Date | null>;
  declare createdById: CreationOptional<number | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

ApiKey.init(
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    orgId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    name: { type: DataTypes.STRING(140), allowNull: false },
    keyPrefix: { type: DataTypes.STRING(16), allowNull: false },
    keyHash: { type: DataTypes.STRING(64), allowNull: false, unique: true },
    scopes: { type: DataTypes.JSON, allowNull: true },
    lastUsedAt: { type: DataTypes.DATE, allowNull: true },
    expiresAt: { type: DataTypes.DATE, allowNull: true },
    revokedAt: { type: DataTypes.DATE, allowNull: true },
    createdById: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    createdAt: { type: DataTypes.DATE, allowNull: false },
    updatedAt: { type: DataTypes.DATE, allowNull: false },
  },
  {
    sequelize,
    tableName: 'api_keys',
    underscored: true,
    timestamps: true,
    indexes: [{ fields: ['org_id'] }],
  },
);

export type WebhookEvent =
  | 'user.created'
  | 'user.updated'
  | 'review.completed'
  | 'goal.completed'
  | 'survey.submitted'
  | 'leave.approved'
  | 'document.sent'
  | 'document.acknowledged';

export class Webhook extends Model<InferAttributes<Webhook>, InferCreationAttributes<Webhook>> {
  declare id: CreationOptional<number>;
  declare orgId: number;
  declare name: string;
  declare url: string;
  declare events: string[];
  declare secret: string;
  declare isActive: CreationOptional<boolean>;
  declare description: CreationOptional<string | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

Webhook.init(
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    orgId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    name: { type: DataTypes.STRING(140), allowNull: false },
    url: { type: DataTypes.STRING(500), allowNull: false },
    events: { type: DataTypes.JSON, allowNull: false },
    secret: { type: DataTypes.STRING(128), allowNull: false },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    description: { type: DataTypes.STRING(255), allowNull: true },
    createdAt: { type: DataTypes.DATE, allowNull: false },
    updatedAt: { type: DataTypes.DATE, allowNull: false },
  },
  {
    sequelize,
    tableName: 'webhooks',
    underscored: true,
    timestamps: true,
    indexes: [{ fields: ['org_id', 'is_active'] }],
  },
);

export class WebhookDelivery extends Model<InferAttributes<WebhookDelivery>, InferCreationAttributes<WebhookDelivery>> {
  declare id: CreationOptional<number>;
  declare webhookId: ForeignKey<Webhook['id']>;
  declare event: string;
  declare payload: Record<string, unknown>;
  declare status: CreationOptional<'pending' | 'success' | 'failed'>;
  declare statusCode: CreationOptional<number | null>;
  declare attempts: CreationOptional<number>;
  declare error: CreationOptional<string | null>;
  declare deliveredAt: CreationOptional<Date | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

WebhookDelivery.init(
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    webhookId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    event: { type: DataTypes.STRING(80), allowNull: false },
    payload: { type: DataTypes.JSON, allowNull: false },
    status: { type: DataTypes.ENUM('pending', 'success', 'failed'), allowNull: false, defaultValue: 'pending' },
    statusCode: { type: DataTypes.INTEGER, allowNull: true },
    attempts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    error: { type: DataTypes.TEXT, allowNull: true },
    deliveredAt: { type: DataTypes.DATE, allowNull: true },
    createdAt: { type: DataTypes.DATE, allowNull: false },
    updatedAt: { type: DataTypes.DATE, allowNull: false },
  },
  {
    sequelize,
    tableName: 'webhook_deliveries',
    underscored: true,
    timestamps: true,
    indexes: [{ fields: ['webhook_id', 'status'] }, { fields: ['created_at'] }],
  },
);
