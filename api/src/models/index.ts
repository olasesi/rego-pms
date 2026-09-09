import {
  Organization,
  Department,
  Team,
  TeamMember,
} from './tenant';
import {
  User,
  Role,
  Permission,
  RolePermission,
  UserRole,
  Token,
} from './identity';
import {
  Goal,
  KeyResult,
  GoalCheckIn,
  Kpi,
  KpiEntry,
  ReviewCycle,
  ReviewTemplate,
  ReviewQuestion,
  PerformanceReview,
  ReviewResponse,
  ReviewParticipant,
  Feedback,
  DevelopmentPlan,
  DevelopmentActivity,
  CompetencyFramework,
  Competency,
  SkillAssessment,
  Recognition,
} from './performance';
import { Notification, AuditLog, AppSetting } from './system';

// ---------------------------------------------------------------------------
// Organization scope
// ---------------------------------------------------------------------------
Organization.hasMany(Department, { as: 'departments', foreignKey: 'orgId' });
Organization.hasMany(Team, { as: 'teams', foreignKey: 'orgId' });
Organization.hasMany(User, { as: 'users', foreignKey: 'orgId' });
Organization.hasMany(Goal, { as: 'goals', foreignKey: 'orgId' });
Organization.hasMany(Kpi, { as: 'kpis', foreignKey: 'orgId' });
Organization.hasMany(ReviewCycle, { as: 'reviewCycles', foreignKey: 'orgId' });
Organization.hasMany(ReviewTemplate, { as: 'reviewTemplates', foreignKey: 'orgId' });
Organization.hasMany(PerformanceReview, { as: 'performanceReviews', foreignKey: 'orgId' });
Organization.hasMany(Feedback, { as: 'feedbacks', foreignKey: 'orgId' });
Organization.hasMany(DevelopmentPlan, { as: 'developmentPlans', foreignKey: 'orgId' });
Organization.hasMany(CompetencyFramework, { as: 'competencyFrameworks', foreignKey: 'orgId' });
Organization.hasMany(SkillAssessment, { as: 'skillAssessments', foreignKey: 'orgId' });
Organization.hasMany(Recognition, { as: 'recognitions', foreignKey: 'orgId' });
Organization.hasMany(Notification, { as: 'notifications', foreignKey: 'orgId' });
Organization.hasMany(AuditLog, { as: 'auditLogs', foreignKey: 'orgId' });
Organization.hasMany(AppSetting, { as: 'appSettings', foreignKey: 'orgId' });

// ---------------------------------------------------------------------------
// Departments, Teams, Membership
// ---------------------------------------------------------------------------
User.belongsTo(Department, { as: 'department', foreignKey: 'departmentId' });
Department.hasMany(User, { as: 'employees', foreignKey: 'departmentId' });
Department.belongsTo(Organization, { as: 'organization', foreignKey: 'orgId' });
Department.belongsTo(Department, { as: 'parent', foreignKey: 'parentId' });
Department.hasMany(Department, { as: 'children', foreignKey: 'parentId' });
Department.belongsTo(User, { as: 'head', foreignKey: 'headUserId' });

Team.belongsTo(Organization, { as: 'organization', foreignKey: 'orgId' });
Team.belongsTo(User, { as: 'lead', foreignKey: 'leadUserId' });
Team.belongsToMany(User, { through: TeamMember, as: 'members', foreignKey: 'teamId', otherKey: 'userId' });
User.belongsToMany(Team, { through: TeamMember, as: 'teams', foreignKey: 'userId', otherKey: 'teamId' });
TeamMember.belongsTo(Team, { as: 'team', foreignKey: 'teamId' });
TeamMember.belongsTo(User, { as: 'user', foreignKey: 'userId' });

// ---------------------------------------------------------------------------
// Identity & RBAC
// ---------------------------------------------------------------------------
User.belongsTo(Organization, { as: 'organization', foreignKey: 'orgId' });
User.belongsTo(User, { as: 'manager', foreignKey: 'managerId' });
User.hasMany(User, { as: 'directReports', foreignKey: 'managerId' });

User.belongsToMany(Role, { through: UserRole, as: 'roles', foreignKey: 'userId', otherKey: 'roleId' });
Role.belongsToMany(User, { through: UserRole, as: 'users', foreignKey: 'roleId', otherKey: 'userId' });
Role.belongsToMany(Permission, { through: RolePermission, as: 'permissions', foreignKey: 'roleId', otherKey: 'permissionId' });

Permission.belongsToMany(Role, { through: RolePermission, as: 'roles', foreignKey: 'permissionId', otherKey: 'roleId' });

User.hasMany(Token, { as: 'tokens', foreignKey: 'userId' });
User.hasMany(Notification, { as: 'notifications', foreignKey: 'userId' });
User.hasMany(AuditLog, { as: 'auditEntries', foreignKey: 'userId' });
AuditLog.belongsTo(User, { as: 'actor', foreignKey: 'userId' });
Notification.belongsTo(User, { as: 'receiver', foreignKey: 'userId' });
AppSetting.belongsTo(Organization, { as: 'organization', foreignKey: 'orgId' });

// ---------------------------------------------------------------------------
// Goals & OKRs
// ---------------------------------------------------------------------------
Goal.belongsTo(Organization, { as: 'organization', foreignKey: 'orgId' });
Goal.belongsTo(Goal, { as: 'parent', foreignKey: 'parentId' });
Goal.hasMany(Goal, { as: 'children', foreignKey: 'parentId' });
Goal.belongsTo(User, { as: 'owner', foreignKey: 'ownerId' });
Goal.hasMany(KeyResult, { as: 'keyResults', foreignKey: 'goalId' });
Goal.hasMany(GoalCheckIn, { as: 'checkIns', foreignKey: 'goalId' });
KeyResult.belongsTo(Goal, { as: 'goal', foreignKey: 'goalId' });
GoalCheckIn.belongsTo(Goal, { as: 'goal', foreignKey: 'goalId' });
GoalCheckIn.belongsTo(User, { as: 'user', foreignKey: 'userId' });

// ---------------------------------------------------------------------------
// KPIs
// ---------------------------------------------------------------------------
Kpi.hasMany(KpiEntry, { as: 'entries', foreignKey: 'kpiId' });
KpiEntry.belongsTo(Kpi, { as: 'kpi', foreignKey: 'kpiId' });
Kpi.belongsTo(Organization, { as: 'organization', foreignKey: 'orgId' });

// ---------------------------------------------------------------------------
// Review cycles / templates / performance reviews
// ---------------------------------------------------------------------------
ReviewCycle.belongsTo(Organization, { as: 'organization', foreignKey: 'orgId' });
ReviewCycle.hasMany(PerformanceReview, { as: 'reviews', foreignKey: 'cycleId' });

ReviewTemplate.belongsTo(Organization, { as: 'organization', foreignKey: 'orgId' });
ReviewTemplate.hasMany(ReviewQuestion, { as: 'questions', foreignKey: 'templateId' });
ReviewQuestion.belongsTo(ReviewTemplate, { as: 'template', foreignKey: 'templateId' });

PerformanceReview.belongsTo(Organization, { as: 'organization', foreignKey: 'orgId' });
PerformanceReview.belongsTo(ReviewCycle, { as: 'cycle', foreignKey: 'cycleId' });
PerformanceReview.belongsTo(ReviewTemplate, { as: 'template', foreignKey: 'templateId' });
PerformanceReview.belongsTo(User, { as: 'reviewee', foreignKey: 'userId' });
PerformanceReview.hasMany(ReviewResponse, { as: 'responses', foreignKey: 'reviewId' });
PerformanceReview.hasMany(ReviewParticipant, { as: 'participants', foreignKey: 'reviewId' });

ReviewResponse.belongsTo(PerformanceReview, { as: 'review', foreignKey: 'reviewId' });
ReviewResponse.belongsTo(ReviewQuestion, { as: 'question', foreignKey: 'questionId' });

ReviewParticipant.belongsTo(PerformanceReview, { as: 'review', foreignKey: 'reviewId' });
ReviewParticipant.belongsTo(User, { as: 'reviewer', foreignKey: 'reviewerId' });

// ---------------------------------------------------------------------------
// Feedback & recognitions
// ---------------------------------------------------------------------------
Feedback.belongsTo(User, { as: 'sender', foreignKey: 'senderId' });
Feedback.belongsTo(User, { as: 'receiver', foreignKey: 'receiverId' });
Recognition.belongsTo(User, { as: 'sender', foreignKey: 'senderId' });
Recognition.belongsTo(User, { as: 'receiver', foreignKey: 'receiverId' });

// ---------------------------------------------------------------------------
// Development plans & competencies
// ---------------------------------------------------------------------------
DevelopmentPlan.belongsTo(User, { as: 'owner', foreignKey: 'userId' });
DevelopmentPlan.hasMany(DevelopmentActivity, { as: 'activities', foreignKey: 'planId' });
DevelopmentActivity.belongsTo(DevelopmentPlan, { as: 'plan', foreignKey: 'planId' });

CompetencyFramework.hasMany(Competency, { as: 'competencies', foreignKey: 'frameworkId' });
Competency.belongsTo(CompetencyFramework, { as: 'framework', foreignKey: 'frameworkId' });
Competency.hasMany(SkillAssessment, { as: 'assessments', foreignKey: 'competencyId' });
SkillAssessment.belongsTo(Competency, { as: 'competency', foreignKey: 'competencyId' });
SkillAssessment.belongsTo(User, { as: 'user', foreignKey: 'userId' });
User.hasMany(SkillAssessment, { as: 'skillAssessments', foreignKey: 'userId' });

export {
  Organization,
  Department,
  Team,
  TeamMember,
  User,
  Role,
  Permission,
  RolePermission,
  UserRole,
  Token,
  Goal,
  KeyResult,
  GoalCheckIn,
  Kpi,
  KpiEntry,
  ReviewCycle,
  ReviewTemplate,
  ReviewQuestion,
  PerformanceReview,
  ReviewResponse,
  ReviewParticipant,
  Feedback,
  DevelopmentPlan,
  DevelopmentActivity,
  CompetencyFramework,
  Competency,
  SkillAssessment,
  Recognition,
  Notification,
  AuditLog,
  AppSetting,
};

export default {
  Organization,
  Department,
  Team,
  TeamMember,
  User,
  Role,
  Permission,
  RolePermission,
  UserRole,
  Token,
  Goal,
  KeyResult,
  GoalCheckIn,
  Kpi,
  KpiEntry,
  ReviewCycle,
  ReviewTemplate,
  ReviewQuestion,
  PerformanceReview,
  ReviewResponse,
  ReviewParticipant,
  Feedback,
  DevelopmentPlan,
  DevelopmentActivity,
  CompetencyFramework,
  Competency,
  SkillAssessment,
  Recognition,
  Notification,
  AuditLog,
  AppSetting,
};