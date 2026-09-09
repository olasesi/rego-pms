import {
  DataTypes,
  Model,
  type CreationOptional,
  type ForeignKey,
  type InferAttributes,
  type InferCreationAttributes,
} from 'sequelize';
import { sequelize } from '../config/database';

export type GoalAlignmentType = 'company' | 'department' | 'team' | 'personal';
export type GoalStatus = 'draft' | 'active' | 'paused' | 'completed' | 'archived';
export type GoalPriority = 'low' | 'medium' | 'high' | 'critical';

export class Goal extends Model<InferAttributes<Goal>, InferCreationAttributes<Goal>> {
  declare id: CreationOptional<number>;
  declare orgId: number;
  declare parentId: CreationOptional<number | null>;
  declare ownerId: CreationOptional<number | null>;
  declare title: string;
  declare description: CreationOptional<string | null>;
  declare alignmentType: CreationOptional<GoalAlignmentType>;
  declare status: CreationOptional<GoalStatus>;
  declare priority: CreationOptional<GoalPriority>;
  declare startDate: CreationOptional<Date | null>;
  declare endDate: CreationOptional<Date | null>;
  declare progress: CreationOptional<number>;
  declare createdById: CreationOptional<number | null>;
  declare deletedAt: CreationOptional<Date | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  declare keyResults?: KeyResult[];
  declare checkIns?: GoalCheckIn[];
  declare children?: Goal[];
}

Goal.init(
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    orgId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    parentId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    ownerId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    title: { type: DataTypes.STRING(255), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    alignmentType: { type: DataTypes.ENUM('company', 'department', 'team', 'personal'), allowNull: false, defaultValue: 'personal' },
    status: { type: DataTypes.ENUM('draft', 'active', 'paused', 'completed', 'archived'), allowNull: false, defaultValue: 'draft' },
    priority: { type: DataTypes.ENUM('low', 'medium', 'high', 'critical'), allowNull: false, defaultValue: 'medium' },
    startDate: { type: DataTypes.DATEONLY, allowNull: true },
    endDate: { type: DataTypes.DATEONLY, allowNull: true },
    progress: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
    createdById: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    deletedAt: { type: DataTypes.DATE, allowNull: true },
    createdAt: { type: DataTypes.DATE, allowNull: false },
    updatedAt: { type: DataTypes.DATE, allowNull: false },
  },
  {
    sequelize,
    tableName: 'goals',
    underscored: true,
    timestamps: true,
    paranoid: true,
    indexes: [{ fields: ['org_id'] }, { fields: ['owner_id'] }, { fields: ['parent_id'] }, { fields: ['status'] }],
  },
);

export type KeyResultStatus = 'not_started' | 'on_track' | 'at_risk' | 'achieved' | 'archived';

export class KeyResult extends Model<InferAttributes<KeyResult>, InferCreationAttributes<KeyResult>> {
  declare id: CreationOptional<number>;
  declare goalId: ForeignKey<Goal['id']>;
  declare title: string;
  declare description: CreationOptional<string | null>;
  declare initialValue: CreationOptional<number>;
  declare currentValue: CreationOptional<number>;
  declare targetValue: number;
  declare unit: CreationOptional<string | null>;
  declare weight: CreationOptional<number>;
  declare status: CreationOptional<KeyResultStatus>;
  declare sortOrder: CreationOptional<number>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

KeyResult.init(
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    goalId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    title: { type: DataTypes.STRING(255), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    initialValue: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
    currentValue: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
    targetValue: { type: DataTypes.FLOAT, allowNull: false },
    unit: { type: DataTypes.STRING(40), allowNull: true },
    weight: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 1 },
    status: {
      type: DataTypes.ENUM('not_started', 'on_track', 'at_risk', 'achieved', 'archived'),
      allowNull: false,
      defaultValue: 'not_started',
    },
    sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    createdAt: { type: DataTypes.DATE, allowNull: false },
    updatedAt: { type: DataTypes.DATE, allowNull: false },
  },
  {
    sequelize,
    tableName: 'key_results',
    underscored: true,
    timestamps: true,
    indexes: [{ fields: ['goal_id'] }],
  },
);

export class GoalCheckIn extends Model<InferAttributes<GoalCheckIn>, InferCreationAttributes<GoalCheckIn>> {
  declare id: CreationOptional<number>;
  declare goalId: ForeignKey<Goal['id']>;
  declare userId: number;
  declare progress: CreationOptional<number | null>;
  declare confidence: CreationOptional<number | null>;
  declare note: CreationOptional<string | null>;
  declare blockers: CreationOptional<string | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

GoalCheckIn.init(
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    goalId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    userId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    progress: { type: DataTypes.FLOAT, allowNull: true },
    confidence: { type: DataTypes.INTEGER, allowNull: true },
    note: { type: DataTypes.TEXT, allowNull: true },
    blockers: { type: DataTypes.TEXT, allowNull: true },
    createdAt: { type: DataTypes.DATE, allowNull: false },
    updatedAt: { type: DataTypes.DATE, allowNull: false },
  },
  {
    sequelize,
    tableName: 'goal_check_ins',
    underscored: true,
    timestamps: true,
    indexes: [{ fields: ['goal_id'] }, { fields: ['user_id'] }],
  },
);

export type KpiOwnerType = 'user' | 'department' | 'team' | 'organization';
export type KpiPeriodUnit = 'day' | 'week' | 'month' | 'quarter' | 'year';

export class Kpi extends Model<InferAttributes<Kpi>, InferCreationAttributes<Kpi>> {
  declare id: CreationOptional<number>;
  declare orgId: number;
  declare name: string;
  declare description: CreationOptional<string | null>;
  declare unit: CreationOptional<string | null>;
  declare ownerType: KpiOwnerType;
  declare ownerId: number;
  declare targetValue: number;
  declare baseValue: CreationOptional<number>;
  declare weight: CreationOptional<number>;
  declare periodUnit: CreationOptional<KpiPeriodUnit>;
  declare startDate: CreationOptional<Date | null>;
  declare endDate: CreationOptional<Date | null>;
  declare status: CreationOptional<'active' | 'archived'>;
  declare createdById: CreationOptional<number | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare entries?: KpiEntry[];
}

Kpi.init(
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    orgId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    name: { type: DataTypes.STRING(180), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    unit: { type: DataTypes.STRING(40), allowNull: true },
    ownerType: { type: DataTypes.ENUM('user', 'department', 'team', 'organization'), allowNull: false },
    ownerId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    targetValue: { type: DataTypes.FLOAT, allowNull: false },
    baseValue: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
    weight: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 1 },
    periodUnit: { type: DataTypes.ENUM('day', 'week', 'month', 'quarter', 'year'), allowNull: false, defaultValue: 'month' },
    startDate: { type: DataTypes.DATEONLY, allowNull: true },
    endDate: { type: DataTypes.DATEONLY, allowNull: true },
    status: { type: DataTypes.ENUM('active', 'archived'), allowNull: false, defaultValue: 'active' },
    createdById: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    createdAt: { type: DataTypes.DATE, allowNull: false },
    updatedAt: { type: DataTypes.DATE, allowNull: false },
  },
  {
    sequelize,
    tableName: 'kpis',
    underscored: true,
    timestamps: true,
    indexes: [{ fields: ['org_id'] }, { fields: ['owner_type', 'owner_id'] }],
  },
);

export class KpiEntry extends Model<InferAttributes<KpiEntry>, InferCreationAttributes<KpiEntry>> {
  declare id: CreationOptional<number>;
  declare kpiId: ForeignKey<Kpi['id']>;
  declare value: number;
  declare periodStart: CreationOptional<string | null>;
  declare periodEnd: CreationOptional<string | null>;
  declare note: CreationOptional<string | null>;
  declare recordedById: CreationOptional<number | null>;
  declare recordedAt: CreationOptional<Date>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

KpiEntry.init(
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    kpiId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    value: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
    periodStart: { type: DataTypes.DATEONLY, allowNull: true },
    periodEnd: { type: DataTypes.DATEONLY, allowNull: true },
    note: { type: DataTypes.TEXT, allowNull: true },
    recordedById: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    recordedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    createdAt: { type: DataTypes.DATE, allowNull: false },
    updatedAt: { type: DataTypes.DATE, allowNull: false },
  },
  {
    sequelize,
    tableName: 'kpi_entries',
    underscored: true,
    timestamps: true,
    indexes: [{ fields: ['kpi_id'] }, { fields: ['period_start'] }],
  },
);

export type ReviewCyclePeriod = 'quarter' | 'half_year' | 'annual' | 'custom';
export type ReviewCycleStatus = 'draft' | 'active' | 'closed' | 'archived';

export class ReviewCycle extends Model<InferAttributes<ReviewCycle>, InferCreationAttributes<ReviewCycle>> {
  declare id: CreationOptional<number>;
  declare orgId: number;
  declare name: string;
  declare description: CreationOptional<string | null>;
  declare period: CreationOptional<ReviewCyclePeriod>;
  declare startDate: Date;
  declare endDate: Date;
  declare status: CreationOptional<ReviewCycleStatus>;
  declare settings: CreationOptional<Record<string, unknown> | null>;
  declare createdById: CreationOptional<number | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare reviews?: PerformanceReview[];
}

ReviewCycle.init(
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    orgId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    name: { type: DataTypes.STRING(180), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    period: { type: DataTypes.ENUM('quarter', 'half_year', 'annual', 'custom'), allowNull: false, defaultValue: 'quarter' },
    startDate: { type: DataTypes.DATEONLY, allowNull: false },
    endDate: { type: DataTypes.DATEONLY, allowNull: false },
    status: { type: DataTypes.ENUM('draft', 'active', 'closed', 'archived'), allowNull: false, defaultValue: 'draft' },
    settings: { type: DataTypes.JSON, allowNull: true },
    createdById: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    createdAt: { type: DataTypes.DATE, allowNull: false },
    updatedAt: { type: DataTypes.DATE, allowNull: false },
  },
  {
    sequelize,
    tableName: 'review_cycles',
    underscored: true,
    timestamps: true,
    indexes: [{ fields: ['org_id', 'status'] }],
  },
);

export type ReviewTemplateStatus = 'active' | 'archived';

export class ReviewTemplate extends Model<InferAttributes<ReviewTemplate>, InferCreationAttributes<ReviewTemplate>> {
  declare id: CreationOptional<number>;
  declare orgId: number;
  declare name: string;
  declare description: CreationOptional<string | null>;
  declare isDefault: CreationOptional<boolean>;
  declare status: CreationOptional<ReviewTemplateStatus>;
  declare settings: CreationOptional<Record<string, unknown> | null>;
  declare createdById: CreationOptional<number | null>;
  declare deletedAt: CreationOptional<Date | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare questions?: ReviewQuestion[];
}

ReviewTemplate.init(
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    orgId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    name: { type: DataTypes.STRING(180), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    isDefault: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    status: { type: DataTypes.ENUM('active', 'archived'), allowNull: false, defaultValue: 'active' },
    settings: { type: DataTypes.JSON, allowNull: true },
    createdById: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    deletedAt: { type: DataTypes.DATE, allowNull: true },
    createdAt: { type: DataTypes.DATE, allowNull: false },
    updatedAt: { type: DataTypes.DATE, allowNull: false },
  },
  {
    sequelize,
    tableName: 'review_templates',
    underscored: true,
    timestamps: true,
    paranoid: true,
    indexes: [{ fields: ['org_id'] }],
  },
);

export type ReviewQuestionType = 'rating' | 'text' | 'choice' | 'multi_choice';

export class ReviewQuestion extends Model<InferAttributes<ReviewQuestion>, InferCreationAttributes<ReviewQuestion>> {
  declare id: CreationOptional<number>;
  declare templateId: ForeignKey<ReviewTemplate['id']>;
  declare section: CreationOptional<string | null>;
  declare title: string;
  declare type: CreationOptional<ReviewQuestionType>;
  declare options: CreationOptional<string[] | null>;
  declare weight: CreationOptional<number>;
  declare required: CreationOptional<boolean>;
  declare maxRating: CreationOptional<number>;
  declare sortOrder: CreationOptional<number>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

ReviewQuestion.init(
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    templateId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    section: { type: DataTypes.STRING(180), allowNull: true },
    title: { type: DataTypes.STRING(255), allowNull: false },
    type: { type: DataTypes.ENUM('rating', 'text', 'choice', 'multi_choice'), allowNull: false, defaultValue: 'rating' },
    options: { type: DataTypes.JSON, allowNull: true },
    weight: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 1 },
    required: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    maxRating: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 5 },
    sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    createdAt: { type: DataTypes.DATE, allowNull: false },
    updatedAt: { type: DataTypes.DATE, allowNull: false },
  },
  {
    sequelize,
    tableName: 'review_questions',
    underscored: true,
    timestamps: true,
    indexes: [{ fields: ['template_id'] }],
  },
);

export type ReviewStatus =
  | 'draft'
  | 'in_progress'
  | 'self_completed'
  | 'peer_reviewed'
  | 'manager_reviewed'
  | 'approved'
  | 'signed_off'
  | 'needs_improvement';

export class PerformanceReview extends Model<InferAttributes<PerformanceReview>, InferCreationAttributes<PerformanceReview>> {
  declare id: CreationOptional<number>;
  declare orgId: number;
  declare cycleId: ForeignKey<ReviewCycle['id']>;
  declare userId: number;
  declare templateId: ForeignKey<ReviewTemplate['id']>;
  declare status: CreationOptional<ReviewStatus>;
  declare ratingScale: CreationOptional<Record<string, unknown> | null>;
  declare overallRating: CreationOptional<number | null>;
  declare consolidatedScore: CreationOptional<number | null>;
  declare selfComments: CreationOptional<string | null>;
  declare managerComments: CreationOptional<string | null>;
  declare completedAt: CreationOptional<Date | null>;
  declare approvedById: CreationOptional<number | null>;
  declare approvedAt: CreationOptional<Date | null>;
  declare signedOffById: CreationOptional<number | null>;
  declare signedOffAt: CreationOptional<Date | null>;
  declare deletedAt: CreationOptional<Date | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare responses?: ReviewResponse[];
  declare participants?: ReviewParticipant[];
}

PerformanceReview.init(
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    orgId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    cycleId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    userId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    templateId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    status: {
      type: DataTypes.ENUM(
        'draft',
        'in_progress',
        'self_completed',
        'peer_reviewed',
        'manager_reviewed',
        'approved',
        'signed_off',
        'needs_improvement',
      ),
      allowNull: false,
      defaultValue: 'draft',
    },
    ratingScale: { type: DataTypes.JSON, allowNull: true },
    overallRating: { type: DataTypes.FLOAT, allowNull: true },
    consolidatedScore: { type: DataTypes.FLOAT, allowNull: true },
    selfComments: { type: DataTypes.TEXT, allowNull: true },
    managerComments: { type: DataTypes.TEXT, allowNull: true },
    completedAt: { type: DataTypes.DATE, allowNull: true },
    approvedById: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    approvedAt: { type: DataTypes.DATE, allowNull: true },
    signedOffById: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    signedOffAt: { type: DataTypes.DATE, allowNull: true },
    deletedAt: { type: DataTypes.DATE, allowNull: true },
    createdAt: { type: DataTypes.DATE, allowNull: false },
    updatedAt: { type: DataTypes.DATE, allowNull: false },
  },
  {
    sequelize,
    tableName: 'performance_reviews',
    underscored: true,
    timestamps: true,
    paranoid: true,
    indexes: [{ fields: ['org_id', 'cycle_id', 'user_id'], unique: true }, { fields: ['user_id'] }],
  },
);

export type ResponseSource = 'self' | 'manager' | 'peer' | 'subordinate' | 'customer';

export class ReviewResponse extends Model<InferAttributes<ReviewResponse>, InferCreationAttributes<ReviewResponse>> {
  declare id: CreationOptional<number>;
  declare reviewId: ForeignKey<PerformanceReview['id']>;
  declare questionId: ForeignKey<ReviewQuestion['id']>;
  declare source: ResponseSource;
  declare rating: CreationOptional<number | null>;
  declare answer: CreationOptional<string | null>;
  declare respondentId: CreationOptional<number | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

ReviewResponse.init(
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    reviewId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    questionId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    source: { type: DataTypes.ENUM('self', 'manager', 'peer', 'subordinate', 'customer'), allowNull: false },
    rating: { type: DataTypes.FLOAT, allowNull: true },
    answer: { type: DataTypes.TEXT, allowNull: true },
    respondentId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    createdAt: { type: DataTypes.DATE, allowNull: false },
    updatedAt: { type: DataTypes.DATE, allowNull: false },
  },
  {
    sequelize,
    tableName: 'review_responses',
    underscored: true,
    timestamps: true,
    indexes: [{ fields: ['review_id'] }, { fields: ['question_id'] }],
  },
);

export type ParticipantRole = 'self' | 'manager' | 'peer' | 'subordinate' | 'customer';
export type ParticipantStatus = 'pending' | 'submitted';

export class ReviewParticipant extends Model<InferAttributes<ReviewParticipant>, InferCreationAttributes<ReviewParticipant>> {
  declare id: CreationOptional<number>;
  declare reviewId: ForeignKey<PerformanceReview['id']>;
  declare reviewerId: number;
  declare role: ParticipantRole;
  declare status: CreationOptional<ParticipantStatus>;
  declare isAnonymous: CreationOptional<boolean>;
  declare submittedAt: CreationOptional<Date | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

ReviewParticipant.init(
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    reviewId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    reviewerId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    role: { type: DataTypes.ENUM('self', 'manager', 'peer', 'subordinate', 'customer'), allowNull: false },
    status: { type: DataTypes.ENUM('pending', 'submitted'), allowNull: false, defaultValue: 'pending' },
    isAnonymous: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    submittedAt: { type: DataTypes.DATE, allowNull: true },
    createdAt: { type: DataTypes.DATE, allowNull: false },
    updatedAt: { type: DataTypes.DATE, allowNull: false },
  },
  {
    sequelize,
    tableName: 'review_participants',
    underscored: true,
    timestamps: true,
    indexes: [{ unique: true, fields: ['review_id', 'reviewer_id', 'role'] }, { fields: ['reviewer_id'] }],
  },
);

export type FeedbackType = 'praise' | 'constructive' | 'request' | 'thanks';
export type FeedbackVisibility = 'public' | 'private';

export class Feedback extends Model<InferAttributes<Feedback>, InferCreationAttributes<Feedback>> {
  declare id: CreationOptional<number>;
  declare orgId: number;
  declare senderId: number;
  declare receiverId: number;
  declare type: CreationOptional<FeedbackType>;
  declare title: CreationOptional<string | null>;
  declare message: string;
  declare visibility: CreationOptional<FeedbackVisibility>;
  declare recognizePoints: CreationOptional<number | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

Feedback.init(
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    orgId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    senderId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    receiverId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    type: { type: DataTypes.ENUM('praise', 'constructive', 'request', 'thanks'), allowNull: false, defaultValue: 'praise' },
    title: { type: DataTypes.STRING(180), allowNull: true },
    message: { type: DataTypes.TEXT, allowNull: false },
    visibility: { type: DataTypes.ENUM('public', 'private'), allowNull: false, defaultValue: 'public' },
    recognizePoints: { type: DataTypes.INTEGER, allowNull: true },
    createdAt: { type: DataTypes.DATE, allowNull: false },
    updatedAt: { type: DataTypes.DATE, allowNull: false },
  },
  {
    sequelize,
    tableName: 'feedbacks',
    underscored: true,
    timestamps: true,
    indexes: [{ fields: ['org_id', 'receiver_id'] }, { fields: ['sender_id'] }],
  },
);

export type PlanStatus = 'draft' | 'active' | 'completed' | 'archived';

export class DevelopmentPlan extends Model<InferAttributes<DevelopmentPlan>, InferCreationAttributes<DevelopmentPlan>> {
  declare id: CreationOptional<number>;
  declare orgId: number;
  declare userId: number;
  declare title: string;
  declare description: CreationOptional<string | null>;
  declare status: CreationOptional<PlanStatus>;
  declare startDate: CreationOptional<Date | null>;
  declare endDate: CreationOptional<Date | null>;
  declare focusAreas: CreationOptional<Record<string, unknown> | null>;
  declare createdById: CreationOptional<number | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare activities?: DevelopmentActivity[];
}

DevelopmentPlan.init(
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    orgId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    userId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    title: { type: DataTypes.STRING(180), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    status: { type: DataTypes.ENUM('draft', 'active', 'completed', 'archived'), allowNull: false, defaultValue: 'draft' },
    startDate: { type: DataTypes.DATEONLY, allowNull: true },
    endDate: { type: DataTypes.DATEONLY, allowNull: true },
    focusAreas: { type: DataTypes.JSON, allowNull: true },
    createdById: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    createdAt: { type: DataTypes.DATE, allowNull: false },
    updatedAt: { type: DataTypes.DATE, allowNull: false },
  },
  {
    sequelize,
    tableName: 'development_plans',
    underscored: true,
    timestamps: true,
    indexes: [{ fields: ['org_id', 'user_id'] }],
  },
);

export type ActivityType = 'training' | 'course' | 'mentoring' | 'project' | 'certification' | 'other';
export type ActivityStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export class DevelopmentActivity extends Model<InferAttributes<DevelopmentActivity>, InferCreationAttributes<DevelopmentActivity>> {
  declare id: CreationOptional<number>;
  declare planId: ForeignKey<DevelopmentPlan['id']>;
  declare type: CreationOptional<ActivityType>;
  declare title: string;
  declare description: CreationOptional<string | null>;
  declare status: CreationOptional<ActivityStatus>;
  declare progress: CreationOptional<number>;
  declare dueDate: CreationOptional<Date | null>;
  declare completedAt: CreationOptional<Date | null>;
  declare link: CreationOptional<string | null>;
  declare sortOrder: CreationOptional<number>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

DevelopmentActivity.init(
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    planId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    type: {
      type: DataTypes.ENUM('training', 'course', 'mentoring', 'project', 'certification', 'other'),
      allowNull: false,
      defaultValue: 'training',
    },
    title: { type: DataTypes.STRING(180), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    status: { type: DataTypes.ENUM('pending', 'in_progress', 'completed', 'cancelled'), allowNull: false, defaultValue: 'pending' },
    progress: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    dueDate: { type: DataTypes.DATEONLY, allowNull: true },
    completedAt: { type: DataTypes.DATE, allowNull: true },
    link: { type: DataTypes.STRING(500), allowNull: true },
    sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    createdAt: { type: DataTypes.DATE, allowNull: false },
    updatedAt: { type: DataTypes.DATE, allowNull: false },
  },
  {
    sequelize,
    tableName: 'development_activities',
    underscored: true,
    timestamps: true,
    indexes: [{ fields: ['plan_id'] }],
  },
);

export class CompetencyFramework extends Model<InferAttributes<CompetencyFramework>, InferCreationAttributes<CompetencyFramework>> {
  declare id: CreationOptional<number>;
  declare orgId: number;
  declare name: string;
  declare description: CreationOptional<string | null>;
  declare status: CreationOptional<'active' | 'archived'>;
  declare createdById: CreationOptional<number | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare competencies?: Competency[];
}

CompetencyFramework.init(
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    orgId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    name: { type: DataTypes.STRING(180), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    status: { type: DataTypes.ENUM('active', 'archived'), allowNull: false, defaultValue: 'active' },
    createdById: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    createdAt: { type: DataTypes.DATE, allowNull: false },
    updatedAt: { type: DataTypes.DATE, allowNull: false },
  },
  {
    sequelize,
    tableName: 'competency_frameworks',
    underscored: true,
    timestamps: true,
    indexes: [{ fields: ['org_id'] }],
  },
);

export class Competency extends Model<InferAttributes<Competency>, InferCreationAttributes<Competency>> {
  declare id: CreationOptional<number>;
  declare frameworkId: ForeignKey<CompetencyFramework['id']>;
  declare name: string;
  declare description: CreationOptional<string | null>;
  declare category: CreationOptional<string | null>;
  declare weight: CreationOptional<number>;
  declare maxLevel: CreationOptional<number>;
  declare sortOrder: CreationOptional<number>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare assessments?: SkillAssessment[];
  declare framework?: CompetencyFramework | null;
}

Competency.init(
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    frameworkId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    name: { type: DataTypes.STRING(180), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    category: { type: DataTypes.STRING(120), allowNull: true },
    weight: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 1 },
    maxLevel: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 5 },
    sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    createdAt: { type: DataTypes.DATE, allowNull: false },
    updatedAt: { type: DataTypes.DATE, allowNull: false },
  },
  {
    sequelize,
    tableName: 'competencies',
    underscored: true,
    timestamps: true,
    indexes: [{ unique: true, fields: ['framework_id', 'name'] }],
  },
);

export type AssessmentType = 'self' | 'manager';

export class SkillAssessment extends Model<InferAttributes<SkillAssessment>, InferCreationAttributes<SkillAssessment>> {
  declare id: CreationOptional<number>;
  declare orgId: number;
  declare userId: number;
  declare competencyId: ForeignKey<Competency['id']>;
  declare level: number;
  declare assessedByType: CreationOptional<AssessmentType>;
  declare assessedById: CreationOptional<number | null>;
  declare evidence: CreationOptional<string | null>;
  declare assessedAt: CreationOptional<Date>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

SkillAssessment.init(
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    orgId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    userId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    competencyId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    level: { type: DataTypes.INTEGER, allowNull: false },
    assessedByType: { type: DataTypes.ENUM('self', 'manager'), allowNull: false, defaultValue: 'self' },
    assessedById: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    evidence: { type: DataTypes.TEXT, allowNull: true },
    assessedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    createdAt: { type: DataTypes.DATE, allowNull: false },
    updatedAt: { type: DataTypes.DATE, allowNull: false },
  },
  {
    sequelize,
    tableName: 'skill_assessments',
    underscored: true,
    timestamps: true,
    indexes: [{ fields: ['user_id', 'competency_id'] }],
  },
);

export class Recognition extends Model<InferAttributes<Recognition>, InferCreationAttributes<Recognition>> {
  declare id: CreationOptional<number>;
  declare orgId: number;
  declare senderId: number;
  declare receiverId: number;
  declare message: string;
  declare points: CreationOptional<number>;
  declare badge: CreationOptional<string | null>;
  declare visibility: CreationOptional<FeedbackVisibility>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

Recognition.init(
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    orgId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    senderId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    receiverId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    message: { type: DataTypes.TEXT, allowNull: false },
    points: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    badge: { type: DataTypes.STRING(80), allowNull: true },
    visibility: { type: DataTypes.ENUM('public', 'private'), allowNull: false, defaultValue: 'public' },
    createdAt: { type: DataTypes.DATE, allowNull: false },
    updatedAt: { type: DataTypes.DATE, allowNull: false },
  },
  {
    sequelize,
    tableName: 'recognitions',
    underscored: true,
    timestamps: true,
    indexes: [{ fields: ['org_id', 'receiver_id'] }],
  },
);