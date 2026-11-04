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
// Time off & leave (BambooHR)
// ---------------------------------------------------------------------------

export type LeaveAccrual = 'annual' | 'monthly' | 'none';

export class LeaveType extends Model<InferAttributes<LeaveType>, InferCreationAttributes<LeaveType>> {
  declare id: CreationOptional<number>;
  declare orgId: number;
  declare name: string;
  declare code: string;
  declare description: CreationOptional<string | null>;
  declare isPaid: CreationOptional<boolean>;
  declare accrual: CreationOptional<LeaveAccrual>;
  declare defaultDays: CreationOptional<number>;
  declare requiresApproval: CreationOptional<boolean>;
  declare color: CreationOptional<string | null>;
  declare status: CreationOptional<'active' | 'archived'>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

LeaveType.init(
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    orgId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    name: { type: DataTypes.STRING(120), allowNull: false },
    code: { type: DataTypes.STRING(40), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    isPaid: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    accrual: { type: DataTypes.ENUM('annual', 'monthly', 'none'), allowNull: false, defaultValue: 'annual' },
    defaultDays: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 20 },
    requiresApproval: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    color: { type: DataTypes.STRING(20), allowNull: true },
    status: { type: DataTypes.ENUM('active', 'archived'), allowNull: false, defaultValue: 'active' },
    createdAt: { type: DataTypes.DATE, allowNull: false },
    updatedAt: { type: DataTypes.DATE, allowNull: false },
  },
  {
    sequelize,
    tableName: 'leave_types',
    underscored: true,
    timestamps: true,
    indexes: [{ unique: true, fields: ['org_id', 'code'] }],
  },
);

export class LeaveBalance extends Model<InferAttributes<LeaveBalance>, InferCreationAttributes<LeaveBalance>> {
  declare id: CreationOptional<number>;
  declare orgId: number;
  declare userId: number;
  declare leaveTypeId: ForeignKey<LeaveType['id']>;
  declare year: number;
  declare entitledDays: CreationOptional<number>;
  declare usedDays: CreationOptional<number>;
  declare carriedOverDays: CreationOptional<number>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

LeaveBalance.init(
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    orgId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    userId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    leaveTypeId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    year: { type: DataTypes.INTEGER, allowNull: false },
    entitledDays: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
    usedDays: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
    carriedOverDays: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
    createdAt: { type: DataTypes.DATE, allowNull: false },
    updatedAt: { type: DataTypes.DATE, allowNull: false },
  },
  {
    sequelize,
    tableName: 'leave_balances',
    underscored: true,
    timestamps: true,
    indexes: [{ unique: true, fields: ['user_id', 'leave_type_id', 'year'] }],
  },
);

export type LeaveRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export class LeaveRequest extends Model<InferAttributes<LeaveRequest>, InferCreationAttributes<LeaveRequest>> {
  declare id: CreationOptional<number>;
  declare orgId: number;
  declare userId: number;
  declare leaveTypeId: ForeignKey<LeaveType['id']>;
  declare startDate: string;
  declare endDate: string;
  declare days: number;
  declare reason: CreationOptional<string | null>;
  declare status: CreationOptional<LeaveRequestStatus>;
  declare approverId: CreationOptional<number | null>;
  declare decidedAt: CreationOptional<Date | null>;
  declare decisionNote: CreationOptional<string | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

LeaveRequest.init(
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    orgId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    userId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    leaveTypeId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    startDate: { type: DataTypes.DATEONLY, allowNull: false },
    endDate: { type: DataTypes.DATEONLY, allowNull: false },
    days: { type: DataTypes.FLOAT, allowNull: false },
    reason: { type: DataTypes.TEXT, allowNull: true },
    status: { type: DataTypes.ENUM('pending', 'approved', 'rejected', 'cancelled'), allowNull: false, defaultValue: 'pending' },
    approverId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    decidedAt: { type: DataTypes.DATE, allowNull: true },
    decisionNote: { type: DataTypes.TEXT, allowNull: true },
    createdAt: { type: DataTypes.DATE, allowNull: false },
    updatedAt: { type: DataTypes.DATE, allowNull: false },
  },
  {
    sequelize,
    tableName: 'leave_requests',
    underscored: true,
    timestamps: true,
    indexes: [{ fields: ['org_id', 'status'] }, { fields: ['user_id', 'start_date'] }],
  },
);

export class Holiday extends Model<InferAttributes<Holiday>, InferCreationAttributes<Holiday>> {
  declare id: CreationOptional<number>;
  declare orgId: number;
  declare name: string;
  declare date: string;
  declare isRecurring: CreationOptional<boolean>;
  declare region: CreationOptional<string | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

Holiday.init(
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    orgId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    name: { type: DataTypes.STRING(140), allowNull: false },
    date: { type: DataTypes.DATEONLY, allowNull: false },
    isRecurring: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    region: { type: DataTypes.STRING(80), allowNull: true },
    createdAt: { type: DataTypes.DATE, allowNull: false },
    updatedAt: { type: DataTypes.DATE, allowNull: false },
  },
  {
    sequelize,
    tableName: 'holidays',
    underscored: true,
    timestamps: true,
    indexes: [{ fields: ['org_id', 'date'] }],
  },
);

// ---------------------------------------------------------------------------
// Compensation (BambooHR / Lattice)
// ---------------------------------------------------------------------------

export class CompensationBand extends Model<InferAttributes<CompensationBand>, InferCreationAttributes<CompensationBand>> {
  declare id: CreationOptional<number>;
  declare orgId: number;
  declare name: string;
  declare level: CreationOptional<string | null>;
  declare minSalary: number;
  declare midSalary: number;
  declare maxSalary: number;
  declare currency: CreationOptional<string>;
  declare country: CreationOptional<string | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

CompensationBand.init(
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    orgId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    name: { type: DataTypes.STRING(140), allowNull: false },
    level: { type: DataTypes.STRING(60), allowNull: true },
    minSalary: { type: DataTypes.FLOAT, allowNull: false },
    midSalary: { type: DataTypes.FLOAT, allowNull: false },
    maxSalary: { type: DataTypes.FLOAT, allowNull: false },
    currency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'USD' },
    country: { type: DataTypes.STRING(2), allowNull: true },
    createdAt: { type: DataTypes.DATE, allowNull: false },
    updatedAt: { type: DataTypes.DATE, allowNull: false },
  },
  {
    sequelize,
    tableName: 'compensation_bands',
    underscored: true,
    timestamps: true,
    indexes: [{ fields: ['org_id'] }],
  },
);

export type CompensationType = 'salary' | 'bonus' | 'equity' | 'allowance' | 'commission';
export type CompensationFrequency = 'annual' | 'monthly' | 'one_time';

export class CompensationRecord extends Model<InferAttributes<CompensationRecord>, InferCreationAttributes<CompensationRecord>> {
  declare id: CreationOptional<number>;
  declare orgId: number;
  declare userId: number;
  declare type: CreationOptional<CompensationType>;
  declare amount: number;
  declare currency: CreationOptional<string>;
  declare frequency: CreationOptional<CompensationFrequency>;
  declare effectiveDate: string;
  declare endDate: CreationOptional<string | null>;
  declare note: CreationOptional<string | null>;
  declare approvedById: CreationOptional<number | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

CompensationRecord.init(
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    orgId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    userId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    type: {
      type: DataTypes.ENUM('salary', 'bonus', 'equity', 'allowance', 'commission'),
      allowNull: false,
      defaultValue: 'salary',
    },
    amount: { type: DataTypes.FLOAT, allowNull: false },
    currency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'USD' },
    frequency: { type: DataTypes.ENUM('annual', 'monthly', 'one_time'), allowNull: false, defaultValue: 'annual' },
    effectiveDate: { type: DataTypes.DATEONLY, allowNull: false },
    endDate: { type: DataTypes.DATEONLY, allowNull: true },
    note: { type: DataTypes.TEXT, allowNull: true },
    approvedById: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    createdAt: { type: DataTypes.DATE, allowNull: false },
    updatedAt: { type: DataTypes.DATE, allowNull: false },
  },
  {
    sequelize,
    tableName: 'compensation_records',
    underscored: true,
    timestamps: true,
    indexes: [{ fields: ['org_id', 'user_id'] }, { fields: ['effective_date'] }],
  },
);

export class PayReviewCycle extends Model<InferAttributes<PayReviewCycle>, InferCreationAttributes<PayReviewCycle>> {
  declare id: CreationOptional<number>;
  declare orgId: number;
  declare name: string;
  declare startDate: string;
  declare endDate: string;
  declare status: CreationOptional<'draft' | 'active' | 'closed'>;
  declare totalBudget: CreationOptional<number | null>;
  declare currency: CreationOptional<string>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare decisions?: PayReviewDecision[];
}

PayReviewCycle.init(
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    orgId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    name: { type: DataTypes.STRING(180), allowNull: false },
    startDate: { type: DataTypes.DATEONLY, allowNull: false },
    endDate: { type: DataTypes.DATEONLY, allowNull: false },
    status: { type: DataTypes.ENUM('draft', 'active', 'closed'), allowNull: false, defaultValue: 'draft' },
    totalBudget: { type: DataTypes.FLOAT, allowNull: true },
    currency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'USD' },
    createdAt: { type: DataTypes.DATE, allowNull: false },
    updatedAt: { type: DataTypes.DATE, allowNull: false },
  },
  {
    sequelize,
    tableName: 'pay_review_cycles',
    underscored: true,
    timestamps: true,
    indexes: [{ fields: ['org_id', 'status'] }],
  },
);

export class PayReviewDecision extends Model<InferAttributes<PayReviewDecision>, InferCreationAttributes<PayReviewDecision>> {
  declare id: CreationOptional<number>;
  declare cycleId: ForeignKey<PayReviewCycle['id']>;
  declare userId: number;
  declare currentAmount: number;
  declare proposedAmount: number;
  declare currency: CreationOptional<string>;
  declare status: CreationOptional<'pending' | 'approved' | 'rejected'>;
  declare reviewerId: CreationOptional<number | null>;
  declare note: CreationOptional<string | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

PayReviewDecision.init(
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    cycleId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    userId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    currentAmount: { type: DataTypes.FLOAT, allowNull: false },
    proposedAmount: { type: DataTypes.FLOAT, allowNull: false },
    currency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'USD' },
    status: { type: DataTypes.ENUM('pending', 'approved', 'rejected'), allowNull: false, defaultValue: 'pending' },
    reviewerId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    note: { type: DataTypes.TEXT, allowNull: true },
    createdAt: { type: DataTypes.DATE, allowNull: false },
    updatedAt: { type: DataTypes.DATE, allowNull: false },
  },
  {
    sequelize,
    tableName: 'pay_review_decisions',
    underscored: true,
    timestamps: true,
    indexes: [{ unique: true, fields: ['cycle_id', 'user_id'] }],
  },
);

// ---------------------------------------------------------------------------
// Onboarding / offboarding (BambooHR)
// ---------------------------------------------------------------------------

export type OnboardingKind = 'onboarding' | 'offboarding';
export type OnboardingTaskAssignee = 'employee' | 'manager' | 'hr' | 'it';

export class OnboardingTemplate extends Model<InferAttributes<OnboardingTemplate>, InferCreationAttributes<OnboardingTemplate>> {
  declare id: CreationOptional<number>;
  declare orgId: number;
  declare name: string;
  declare description: CreationOptional<string | null>;
  declare type: CreationOptional<OnboardingKind>;
  declare status: CreationOptional<'active' | 'archived'>;
  declare createdById: CreationOptional<number | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare tasks?: OnboardingTemplateTask[];
}

OnboardingTemplate.init(
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    orgId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    name: { type: DataTypes.STRING(180), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    type: { type: DataTypes.ENUM('onboarding', 'offboarding'), allowNull: false, defaultValue: 'onboarding' },
    status: { type: DataTypes.ENUM('active', 'archived'), allowNull: false, defaultValue: 'active' },
    createdById: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    createdAt: { type: DataTypes.DATE, allowNull: false },
    updatedAt: { type: DataTypes.DATE, allowNull: false },
  },
  {
    sequelize,
    tableName: 'onboarding_templates',
    underscored: true,
    timestamps: true,
    indexes: [{ fields: ['org_id', 'type'] }],
  },
);

export class OnboardingTemplateTask extends Model<
  InferAttributes<OnboardingTemplateTask>,
  InferCreationAttributes<OnboardingTemplateTask>
> {
  declare id: CreationOptional<number>;
  declare templateId: ForeignKey<OnboardingTemplate['id']>;
  declare title: string;
  declare description: CreationOptional<string | null>;
  declare category: CreationOptional<string>;
  declare assigneeRole: CreationOptional<OnboardingTaskAssignee>;
  declare dueOffsetDays: CreationOptional<number>;
  declare sortOrder: CreationOptional<number>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

OnboardingTemplateTask.init(
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    templateId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    title: { type: DataTypes.STRING(255), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    category: {
      type: DataTypes.ENUM('paperwork', 'it', 'training', 'introduction', 'compliance', 'other'),
      allowNull: false,
      defaultValue: 'other',
    },
    assigneeRole: { type: DataTypes.ENUM('employee', 'manager', 'hr', 'it'), allowNull: false, defaultValue: 'hr' },
    dueOffsetDays: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    createdAt: { type: DataTypes.DATE, allowNull: false },
    updatedAt: { type: DataTypes.DATE, allowNull: false },
  },
  {
    sequelize,
    tableName: 'onboarding_template_tasks',
    underscored: true,
    timestamps: true,
    indexes: [{ fields: ['template_id', 'sort_order'] }],
  },
);

export class OnboardingAssignment extends Model<
  InferAttributes<OnboardingAssignment>,
  InferCreationAttributes<OnboardingAssignment>
> {
  declare id: CreationOptional<number>;
  declare orgId: number;
  declare userId: number;
  declare templateId: ForeignKey<OnboardingTemplate['id']>;
  declare type: CreationOptional<OnboardingKind>;
  declare startDate: CreationOptional<string | null>;
  declare dueDate: CreationOptional<string | null>;
  declare status: CreationOptional<'pending' | 'in_progress' | 'completed' | 'cancelled'>;
  declare completedAt: CreationOptional<Date | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare tasks?: OnboardingTaskProgress[];
}

OnboardingAssignment.init(
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    orgId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    userId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    templateId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    type: { type: DataTypes.ENUM('onboarding', 'offboarding'), allowNull: false, defaultValue: 'onboarding' },
    startDate: { type: DataTypes.DATEONLY, allowNull: true },
    dueDate: { type: DataTypes.DATEONLY, allowNull: true },
    status: {
      type: DataTypes.ENUM('pending', 'in_progress', 'completed', 'cancelled'),
      allowNull: false,
      defaultValue: 'pending',
    },
    completedAt: { type: DataTypes.DATE, allowNull: true },
    createdAt: { type: DataTypes.DATE, allowNull: false },
    updatedAt: { type: DataTypes.DATE, allowNull: false },
  },
  {
    sequelize,
    tableName: 'onboarding_assignments',
    underscored: true,
    timestamps: true,
    indexes: [{ fields: ['org_id', 'user_id'] }, { fields: ['status'] }],
  },
);

export class OnboardingTaskProgress extends Model<
  InferAttributes<OnboardingTaskProgress>,
  InferCreationAttributes<OnboardingTaskProgress>
> {
  declare id: CreationOptional<number>;
  declare assignmentId: ForeignKey<OnboardingAssignment['id']>;
  declare templateTaskId: ForeignKey<OnboardingTemplateTask['id']>;
  declare status: CreationOptional<'pending' | 'completed' | 'skipped'>;
  declare completedAt: CreationOptional<Date | null>;
  declare completedById: CreationOptional<number | null>;
  declare note: CreationOptional<string | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

OnboardingTaskProgress.init(
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    assignmentId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    templateTaskId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    status: { type: DataTypes.ENUM('pending', 'completed', 'skipped'), allowNull: false, defaultValue: 'pending' },
    completedAt: { type: DataTypes.DATE, allowNull: true },
    completedById: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    note: { type: DataTypes.TEXT, allowNull: true },
    createdAt: { type: DataTypes.DATE, allowNull: false },
    updatedAt: { type: DataTypes.DATE, allowNull: false },
  },
  {
    sequelize,
    tableName: 'onboarding_task_progress',
    underscored: true,
    timestamps: true,
    indexes: [{ unique: true, fields: ['assignment_id', 'template_task_id'] }],
  },
);

// ---------------------------------------------------------------------------
// Calibration sessions & 9-box (Lattice / Betterworks)
// ---------------------------------------------------------------------------

export class CalibrationSession extends Model<InferAttributes<CalibrationSession>, InferCreationAttributes<CalibrationSession>> {
  declare id: CreationOptional<number>;
  declare orgId: number;
  declare cycleId: CreationOptional<number | null>;
  declare name: string;
  declare status: CreationOptional<'draft' | 'in_progress' | 'completed'>;
  declare facilitatorId: CreationOptional<number | null>;
  declare scheduledAt: CreationOptional<Date | null>;
  declare settings: CreationOptional<Record<string, unknown> | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare participants?: CalibrationParticipant[];
}

CalibrationSession.init(
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    orgId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    cycleId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    name: { type: DataTypes.STRING(180), allowNull: false },
    status: { type: DataTypes.ENUM('draft', 'in_progress', 'completed'), allowNull: false, defaultValue: 'draft' },
    facilitatorId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    scheduledAt: { type: DataTypes.DATE, allowNull: true },
    settings: { type: DataTypes.JSON, allowNull: true },
    createdAt: { type: DataTypes.DATE, allowNull: false },
    updatedAt: { type: DataTypes.DATE, allowNull: false },
  },
  {
    sequelize,
    tableName: 'calibration_sessions',
    underscored: true,
    timestamps: true,
    indexes: [{ fields: ['org_id', 'status'] }],
  },
);

export type NineBox =
  | 'low_impact'
  | 'moderate_impact'
  | 'high_impact'
  | 'inconsistent'
  | 'core'
  | 'high_performer'
  | 'risk'
  | 'high_potential'
  | 'star';

export class CalibrationParticipant extends Model<
  InferAttributes<CalibrationParticipant>,
  InferCreationAttributes<CalibrationParticipant>
> {
  declare id: CreationOptional<number>;
  declare sessionId: ForeignKey<CalibrationSession['id']>;
  declare userId: number;
  declare managerId: CreationOptional<number | null>;
  declare performanceRating: CreationOptional<number | null>;
  declare potentialRating: CreationOptional<number | null>;
  declare box: CreationOptional<NineBox | null>;
  declare proposedRating: CreationOptional<number | null>;
  declare finalRating: CreationOptional<number | null>;
  declare notes: CreationOptional<string | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

CalibrationParticipant.init(
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    sessionId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    userId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    managerId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    performanceRating: { type: DataTypes.FLOAT, allowNull: true },
    potentialRating: { type: DataTypes.FLOAT, allowNull: true },
    box: {
      type: DataTypes.ENUM(
        'low_impact',
        'moderate_impact',
        'high_impact',
        'inconsistent',
        'core',
        'high_performer',
        'risk',
        'high_potential',
        'star',
      ),
      allowNull: true,
    },
    proposedRating: { type: DataTypes.FLOAT, allowNull: true },
    finalRating: { type: DataTypes.FLOAT, allowNull: true },
    notes: { type: DataTypes.TEXT, allowNull: true },
    createdAt: { type: DataTypes.DATE, allowNull: false },
    updatedAt: { type: DataTypes.DATE, allowNull: false },
  },
  {
    sequelize,
    tableName: 'calibration_participants',
    underscored: true,
    timestamps: true,
    indexes: [{ unique: true, fields: ['session_id', 'user_id'] }],
  },
);

// ---------------------------------------------------------------------------
// Documents & e-acknowledgements (BambooHR)
// ---------------------------------------------------------------------------

export class DocumentTemplate extends Model<InferAttributes<DocumentTemplate>, InferCreationAttributes<DocumentTemplate>> {
  declare id: CreationOptional<number>;
  declare orgId: number;
  declare name: string;
  declare category: CreationOptional<string>;
  declare description: CreationOptional<string | null>;
  declare content: string;
  declare version: CreationOptional<number>;
  declare requiresAcknowledgement: CreationOptional<boolean>;
  declare status: CreationOptional<'active' | 'archived'>;
  declare createdById: CreationOptional<number | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

DocumentTemplate.init(
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    orgId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    name: { type: DataTypes.STRING(180), allowNull: false },
    category: { type: DataTypes.STRING(80), allowNull: false, defaultValue: 'policy' },
    description: { type: DataTypes.TEXT, allowNull: true },
    content: { type: DataTypes.TEXT('long'), allowNull: false },
    version: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    requiresAcknowledgement: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    status: { type: DataTypes.ENUM('active', 'archived'), allowNull: false, defaultValue: 'active' },
    createdById: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    createdAt: { type: DataTypes.DATE, allowNull: false },
    updatedAt: { type: DataTypes.DATE, allowNull: false },
  },
  {
    sequelize,
    tableName: 'document_templates',
    underscored: true,
    timestamps: true,
    indexes: [{ fields: ['org_id', 'category'] }],
  },
);

export class EmployeeDocument extends Model<InferAttributes<EmployeeDocument>, InferCreationAttributes<EmployeeDocument>> {
  declare id: CreationOptional<number>;
  declare orgId: number;
  declare userId: number;
  declare templateId: CreationOptional<number | null>;
  declare title: string;
  declare category: CreationOptional<string>;
  declare fileUrl: CreationOptional<string | null>;
  declare content: CreationOptional<string | null>;
  declare version: CreationOptional<number>;
  declare status: CreationOptional<'draft' | 'sent' | 'acknowledged' | 'expired'>;
  declare sentAt: CreationOptional<Date | null>;
  declare acknowledgedAt: CreationOptional<Date | null>;
  declare acknowledgedIp: CreationOptional<string | null>;
  declare expiresAt: CreationOptional<Date | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

EmployeeDocument.init(
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    orgId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    userId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    templateId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    title: { type: DataTypes.STRING(200), allowNull: false },
    category: { type: DataTypes.STRING(80), allowNull: false, defaultValue: 'policy' },
    fileUrl: { type: DataTypes.STRING(500), allowNull: true },
    content: { type: DataTypes.TEXT('long'), allowNull: true },
    version: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    status: { type: DataTypes.ENUM('draft', 'sent', 'acknowledged', 'expired'), allowNull: false, defaultValue: 'sent' },
    sentAt: { type: DataTypes.DATE, allowNull: true },
    acknowledgedAt: { type: DataTypes.DATE, allowNull: true },
    acknowledgedIp: { type: DataTypes.STRING(45), allowNull: true },
    expiresAt: { type: DataTypes.DATE, allowNull: true },
    createdAt: { type: DataTypes.DATE, allowNull: false },
    updatedAt: { type: DataTypes.DATE, allowNull: false },
  },
  {
    sequelize,
    tableName: 'employee_documents',
    underscored: true,
    timestamps: true,
    indexes: [{ fields: ['org_id', 'user_id'] }, { fields: ['status'] }],
  },
);
