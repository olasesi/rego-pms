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
// One-on-one meetings (Lattice / 15Five)
// ---------------------------------------------------------------------------

export type OneOnOneCadence = 'weekly' | 'biweekly' | 'monthly' | 'custom';
export type OneOnOneSeriesStatus = 'active' | 'paused' | 'ended';

export class OneOnOneSeries extends Model<InferAttributes<OneOnOneSeries>, InferCreationAttributes<OneOnOneSeries>> {
  declare id: CreationOptional<number>;
  declare orgId: number;
  declare managerId: number;
  declare employeeId: number;
  declare title: CreationOptional<string | null>;
  declare cadence: CreationOptional<OneOnOneCadence>;
  declare nextMeetingAt: CreationOptional<Date | null>;
  declare status: CreationOptional<OneOnOneSeriesStatus>;
  declare createdById: CreationOptional<number | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare meetings?: OneOnOneMeeting[];
}

OneOnOneSeries.init(
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    orgId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    managerId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    employeeId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    title: { type: DataTypes.STRING(180), allowNull: true },
    cadence: { type: DataTypes.ENUM('weekly', 'biweekly', 'monthly', 'custom'), allowNull: false, defaultValue: 'biweekly' },
    nextMeetingAt: { type: DataTypes.DATE, allowNull: true },
    status: { type: DataTypes.ENUM('active', 'paused', 'ended'), allowNull: false, defaultValue: 'active' },
    createdById: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    createdAt: { type: DataTypes.DATE, allowNull: false },
    updatedAt: { type: DataTypes.DATE, allowNull: false },
  },
  {
    sequelize,
    tableName: 'one_on_one_series',
    underscored: true,
    timestamps: true,
    indexes: [
      { unique: true, fields: ['org_id', 'manager_id', 'employee_id'] },
      { fields: ['employee_id'] },
      { fields: ['manager_id'] },
    ],
  },
);

export type OneOnOneMeetingStatus = 'scheduled' | 'completed' | 'cancelled';

export class OneOnOneMeeting extends Model<InferAttributes<OneOnOneMeeting>, InferCreationAttributes<OneOnOneMeeting>> {
  declare id: CreationOptional<number>;
  declare seriesId: ForeignKey<OneOnOneSeries['id']>;
  declare scheduledAt: Date;
  declare status: CreationOptional<OneOnOneMeetingStatus>;
  declare managerNotes: CreationOptional<string | null>;
  declare employeeNotes: CreationOptional<string | null>;
  declare sharedNotes: CreationOptional<string | null>;
  declare completedAt: CreationOptional<Date | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare agendaItems?: OneOnOneAgendaItem[];
}

OneOnOneMeeting.init(
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    seriesId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    scheduledAt: { type: DataTypes.DATE, allowNull: false },
    status: { type: DataTypes.ENUM('scheduled', 'completed', 'cancelled'), allowNull: false, defaultValue: 'scheduled' },
    managerNotes: { type: DataTypes.TEXT, allowNull: true },
    employeeNotes: { type: DataTypes.TEXT, allowNull: true },
    sharedNotes: { type: DataTypes.TEXT, allowNull: true },
    completedAt: { type: DataTypes.DATE, allowNull: true },
    createdAt: { type: DataTypes.DATE, allowNull: false },
    updatedAt: { type: DataTypes.DATE, allowNull: false },
  },
  {
    sequelize,
    tableName: 'one_on_one_meetings',
    underscored: true,
    timestamps: true,
    indexes: [{ fields: ['series_id', 'scheduled_at'] }],
  },
);

export type AgendaItemCategory = 'talking_point' | 'win' | 'blocker' | 'action_item' | 'feedback';
export type AgendaItemStatus = 'open' | 'discussed' | 'done';

export class OneOnOneAgendaItem extends Model<
  InferAttributes<OneOnOneAgendaItem>,
  InferCreationAttributes<OneOnOneAgendaItem>
> {
  declare id: CreationOptional<number>;
  declare meetingId: ForeignKey<OneOnOneMeeting['id']>;
  declare createdById: number;
  declare title: string;
  declare description: CreationOptional<string | null>;
  declare category: CreationOptional<AgendaItemCategory>;
  declare status: CreationOptional<AgendaItemStatus>;
  declare isPrivate: CreationOptional<boolean>;
  declare dueDate: CreationOptional<Date | null>;
  declare sortOrder: CreationOptional<number>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

OneOnOneAgendaItem.init(
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    meetingId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    createdById: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    title: { type: DataTypes.STRING(255), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    category: {
      type: DataTypes.ENUM('talking_point', 'win', 'blocker', 'action_item', 'feedback'),
      allowNull: false,
      defaultValue: 'talking_point',
    },
    status: { type: DataTypes.ENUM('open', 'discussed', 'done'), allowNull: false, defaultValue: 'open' },
    isPrivate: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    dueDate: { type: DataTypes.DATEONLY, allowNull: true },
    sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    createdAt: { type: DataTypes.DATE, allowNull: false },
    updatedAt: { type: DataTypes.DATE, allowNull: false },
  },
  {
    sequelize,
    tableName: 'one_on_one_agenda_items',
    underscored: true,
    timestamps: true,
    indexes: [{ fields: ['meeting_id', 'status'] }],
  },
);

// ---------------------------------------------------------------------------
// Engagement surveys & eNPS (Lattice / 15Five)
// ---------------------------------------------------------------------------

export type SurveyType = 'engagement' | 'enps' | 'pulse' | 'custom';
export type SurveyStatus = 'draft' | 'active' | 'closed' | 'archived';

export class Survey extends Model<InferAttributes<Survey>, InferCreationAttributes<Survey>> {
  declare id: CreationOptional<number>;
  declare orgId: number;
  declare title: string;
  declare description: CreationOptional<string | null>;
  declare type: CreationOptional<SurveyType>;
  declare status: CreationOptional<SurveyStatus>;
  declare isAnonymous: CreationOptional<boolean>;
  declare startDate: CreationOptional<Date | null>;
  declare endDate: CreationOptional<Date | null>;
  declare audience: CreationOptional<Record<string, unknown> | null>;
  declare settings: CreationOptional<Record<string, unknown> | null>;
  declare createdById: CreationOptional<number | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare questions?: SurveyQuestion[];
}

Survey.init(
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    orgId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    title: { type: DataTypes.STRING(200), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    type: { type: DataTypes.ENUM('engagement', 'enps', 'pulse', 'custom'), allowNull: false, defaultValue: 'engagement' },
    status: { type: DataTypes.ENUM('draft', 'active', 'closed', 'archived'), allowNull: false, defaultValue: 'draft' },
    isAnonymous: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    startDate: { type: DataTypes.DATE, allowNull: true },
    endDate: { type: DataTypes.DATE, allowNull: true },
    audience: { type: DataTypes.JSON, allowNull: true },
    settings: { type: DataTypes.JSON, allowNull: true },
    createdById: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    createdAt: { type: DataTypes.DATE, allowNull: false },
    updatedAt: { type: DataTypes.DATE, allowNull: false },
  },
  {
    sequelize,
    tableName: 'surveys',
    underscored: true,
    timestamps: true,
    indexes: [{ fields: ['org_id', 'status'] }],
  },
);

export type SurveyQuestionType = 'rating' | 'enps' | 'text' | 'single_choice' | 'multi_choice' | 'boolean';

export class SurveyQuestion extends Model<InferAttributes<SurveyQuestion>, InferCreationAttributes<SurveyQuestion>> {
  declare id: CreationOptional<number>;
  declare surveyId: ForeignKey<Survey['id']>;
  declare title: string;
  declare description: CreationOptional<string | null>;
  declare type: CreationOptional<SurveyQuestionType>;
  declare options: CreationOptional<string[] | null>;
  declare required: CreationOptional<boolean>;
  declare maxRating: CreationOptional<number>;
  declare sortOrder: CreationOptional<number>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

SurveyQuestion.init(
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    surveyId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    title: { type: DataTypes.STRING(255), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    type: {
      type: DataTypes.ENUM('rating', 'enps', 'text', 'single_choice', 'multi_choice', 'boolean'),
      allowNull: false,
      defaultValue: 'rating',
    },
    options: { type: DataTypes.JSON, allowNull: true },
    required: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    maxRating: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 5 },
    sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    createdAt: { type: DataTypes.DATE, allowNull: false },
    updatedAt: { type: DataTypes.DATE, allowNull: false },
  },
  {
    sequelize,
    tableName: 'survey_questions',
    underscored: true,
    timestamps: true,
    indexes: [{ fields: ['survey_id', 'sort_order'] }],
  },
);

export class SurveyResponse extends Model<InferAttributes<SurveyResponse>, InferCreationAttributes<SurveyResponse>> {
  declare id: CreationOptional<number>;
  declare surveyId: ForeignKey<Survey['id']>;
  declare userId: CreationOptional<number | null>;
  declare departmentId: CreationOptional<number | null>;
  declare submittedAt: CreationOptional<Date>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare answers?: SurveyAnswer[];
}

SurveyResponse.init(
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    surveyId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    userId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    departmentId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    submittedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    createdAt: { type: DataTypes.DATE, allowNull: false },
    updatedAt: { type: DataTypes.DATE, allowNull: false },
  },
  {
    sequelize,
    tableName: 'survey_responses',
    underscored: true,
    timestamps: true,
    indexes: [{ unique: true, fields: ['survey_id', 'user_id'] }, { fields: ['department_id'] }],
  },
);

export class SurveyAnswer extends Model<InferAttributes<SurveyAnswer>, InferCreationAttributes<SurveyAnswer>> {
  declare id: CreationOptional<number>;
  declare responseId: ForeignKey<SurveyResponse['id']>;
  declare questionId: ForeignKey<SurveyQuestion['id']>;
  declare rating: CreationOptional<number | null>;
  declare answer: CreationOptional<string | null>;
  declare choice: CreationOptional<string[] | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

SurveyAnswer.init(
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    responseId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    questionId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    rating: { type: DataTypes.FLOAT, allowNull: true },
    answer: { type: DataTypes.TEXT, allowNull: true },
    choice: { type: DataTypes.JSON, allowNull: true },
    createdAt: { type: DataTypes.DATE, allowNull: false },
    updatedAt: { type: DataTypes.DATE, allowNull: false },
  },
  {
    sequelize,
    tableName: 'survey_answers',
    underscored: true,
    timestamps: true,
    indexes: [{ unique: true, fields: ['response_id', 'question_id'] }],
  },
);
