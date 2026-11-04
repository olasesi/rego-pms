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
import {
  OneOnOneSeries,
  OneOnOneMeeting,
  OneOnOneAgendaItem,
  Survey,
  SurveyQuestion,
  SurveyResponse,
  SurveyAnswer,
} from './engagement';
import {
  LeaveType,
  LeaveBalance,
  LeaveRequest,
  Holiday,
  CompensationBand,
  CompensationRecord,
  PayReviewCycle,
  PayReviewDecision,
  OnboardingTemplate,
  OnboardingTemplateTask,
  OnboardingAssignment,
  OnboardingTaskProgress,
  CalibrationSession,
  CalibrationParticipant,
  DocumentTemplate,
  EmployeeDocument,
} from './peopleOps';
import { ApiKey, Webhook, WebhookDelivery } from './platform';

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

// Phase 2 modules
Organization.hasMany(OneOnOneSeries, { as: 'oneOnOneSeries', foreignKey: 'orgId' });
Organization.hasMany(Survey, { as: 'surveys', foreignKey: 'orgId' });
Organization.hasMany(LeaveType, { as: 'leaveTypes', foreignKey: 'orgId' });
Organization.hasMany(LeaveBalance, { as: 'leaveBalances', foreignKey: 'orgId' });
Organization.hasMany(LeaveRequest, { as: 'leaveRequests', foreignKey: 'orgId' });
Organization.hasMany(Holiday, { as: 'holidays', foreignKey: 'orgId' });
Organization.hasMany(CompensationBand, { as: 'compensationBands', foreignKey: 'orgId' });
Organization.hasMany(CompensationRecord, { as: 'compensationRecords', foreignKey: 'orgId' });
Organization.hasMany(PayReviewCycle, { as: 'payReviewCycles', foreignKey: 'orgId' });
Organization.hasMany(OnboardingTemplate, { as: 'onboardingTemplates', foreignKey: 'orgId' });
Organization.hasMany(OnboardingAssignment, { as: 'onboardingAssignments', foreignKey: 'orgId' });
Organization.hasMany(CalibrationSession, { as: 'calibrationSessions', foreignKey: 'orgId' });
Organization.hasMany(DocumentTemplate, { as: 'documentTemplates', foreignKey: 'orgId' });
Organization.hasMany(EmployeeDocument, { as: 'employeeDocuments', foreignKey: 'orgId' });
Organization.hasMany(ApiKey, { as: 'apiKeys', foreignKey: 'orgId' });
Organization.hasMany(Webhook, { as: 'webhooks', foreignKey: 'orgId' });

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

// ---------------------------------------------------------------------------
// One-on-one meetings
// ---------------------------------------------------------------------------
OneOnOneSeries.belongsTo(Organization, { as: 'organization', foreignKey: 'orgId' });
OneOnOneSeries.belongsTo(User, { as: 'manager', foreignKey: 'managerId' });
OneOnOneSeries.belongsTo(User, { as: 'employee', foreignKey: 'employeeId' });
OneOnOneSeries.hasMany(OneOnOneMeeting, { as: 'meetings', foreignKey: 'seriesId' });

OneOnOneMeeting.belongsTo(OneOnOneSeries, { as: 'series', foreignKey: 'seriesId' });
OneOnOneMeeting.hasMany(OneOnOneAgendaItem, { as: 'agendaItems', foreignKey: 'meetingId' });

OneOnOneAgendaItem.belongsTo(OneOnOneMeeting, { as: 'meeting', foreignKey: 'meetingId' });
OneOnOneAgendaItem.belongsTo(User, { as: 'author', foreignKey: 'createdById' });

// ---------------------------------------------------------------------------
// Surveys & engagement
// ---------------------------------------------------------------------------
Survey.belongsTo(Organization, { as: 'organization', foreignKey: 'orgId' });
Survey.belongsTo(User, { as: 'createdBy', foreignKey: 'createdById' });
Survey.hasMany(SurveyQuestion, { as: 'questions', foreignKey: 'surveyId' });
Survey.hasMany(SurveyResponse, { as: 'responses', foreignKey: 'surveyId' });

SurveyQuestion.belongsTo(Survey, { as: 'survey', foreignKey: 'surveyId' });

SurveyResponse.belongsTo(Survey, { as: 'survey', foreignKey: 'surveyId' });
SurveyResponse.belongsTo(User, { as: 'user', foreignKey: 'userId' });
SurveyResponse.belongsTo(Department, { as: 'department', foreignKey: 'departmentId' });
SurveyResponse.hasMany(SurveyAnswer, { as: 'answers', foreignKey: 'responseId' });

SurveyAnswer.belongsTo(SurveyResponse, { as: 'response', foreignKey: 'responseId' });
SurveyAnswer.belongsTo(SurveyQuestion, { as: 'question', foreignKey: 'questionId' });

// ---------------------------------------------------------------------------
// Time off & leave
// ---------------------------------------------------------------------------
LeaveType.belongsTo(Organization, { as: 'organization', foreignKey: 'orgId' });
LeaveType.hasMany(LeaveBalance, { as: 'balances', foreignKey: 'leaveTypeId' });
LeaveType.hasMany(LeaveRequest, { as: 'requests', foreignKey: 'leaveTypeId' });

LeaveBalance.belongsTo(Organization, { as: 'organization', foreignKey: 'orgId' });
LeaveBalance.belongsTo(LeaveType, { as: 'leaveType', foreignKey: 'leaveTypeId' });
LeaveBalance.belongsTo(User, { as: 'user', foreignKey: 'userId' });

LeaveRequest.belongsTo(Organization, { as: 'organization', foreignKey: 'orgId' });
LeaveRequest.belongsTo(LeaveType, { as: 'leaveType', foreignKey: 'leaveTypeId' });
LeaveRequest.belongsTo(User, { as: 'user', foreignKey: 'userId' });
LeaveRequest.belongsTo(User, { as: 'approver', foreignKey: 'approverId' });

Holiday.belongsTo(Organization, { as: 'organization', foreignKey: 'orgId' });

// ---------------------------------------------------------------------------
// Compensation
// ---------------------------------------------------------------------------
CompensationBand.belongsTo(Organization, { as: 'organization', foreignKey: 'orgId' });

CompensationRecord.belongsTo(Organization, { as: 'organization', foreignKey: 'orgId' });
CompensationRecord.belongsTo(User, { as: 'user', foreignKey: 'userId' });
CompensationRecord.belongsTo(User, { as: 'approvedBy', foreignKey: 'approvedById' });

PayReviewCycle.belongsTo(Organization, { as: 'organization', foreignKey: 'orgId' });
PayReviewCycle.hasMany(PayReviewDecision, { as: 'decisions', foreignKey: 'cycleId' });

PayReviewDecision.belongsTo(PayReviewCycle, { as: 'cycle', foreignKey: 'cycleId' });
PayReviewDecision.belongsTo(User, { as: 'user', foreignKey: 'userId' });
PayReviewDecision.belongsTo(User, { as: 'reviewer', foreignKey: 'reviewerId' });

// ---------------------------------------------------------------------------
// Onboarding / offboarding
// ---------------------------------------------------------------------------
OnboardingTemplate.belongsTo(Organization, { as: 'organization', foreignKey: 'orgId' });
OnboardingTemplate.hasMany(OnboardingTemplateTask, { as: 'tasks', foreignKey: 'templateId' });
OnboardingTemplate.hasMany(OnboardingAssignment, { as: 'assignments', foreignKey: 'templateId' });

OnboardingTemplateTask.belongsTo(OnboardingTemplate, { as: 'template', foreignKey: 'templateId' });

OnboardingAssignment.belongsTo(Organization, { as: 'organization', foreignKey: 'orgId' });
OnboardingAssignment.belongsTo(OnboardingTemplate, { as: 'template', foreignKey: 'templateId' });
OnboardingAssignment.belongsTo(User, { as: 'user', foreignKey: 'userId' });
OnboardingAssignment.hasMany(OnboardingTaskProgress, { as: 'tasks', foreignKey: 'assignmentId' });

OnboardingTaskProgress.belongsTo(OnboardingAssignment, { as: 'assignment', foreignKey: 'assignmentId' });
OnboardingTaskProgress.belongsTo(OnboardingTemplateTask, { as: 'templateTask', foreignKey: 'templateTaskId' });
OnboardingTaskProgress.belongsTo(User, { as: 'completedBy', foreignKey: 'completedById' });

// ---------------------------------------------------------------------------
// Calibration & 9-box
// ---------------------------------------------------------------------------
CalibrationSession.belongsTo(Organization, { as: 'organization', foreignKey: 'orgId' });
CalibrationSession.belongsTo(ReviewCycle, { as: 'cycle', foreignKey: 'cycleId' });
CalibrationSession.belongsTo(User, { as: 'facilitator', foreignKey: 'facilitatorId' });
CalibrationSession.hasMany(CalibrationParticipant, { as: 'participants', foreignKey: 'sessionId' });

CalibrationParticipant.belongsTo(CalibrationSession, { as: 'session', foreignKey: 'sessionId' });
CalibrationParticipant.belongsTo(User, { as: 'user', foreignKey: 'userId' });
CalibrationParticipant.belongsTo(User, { as: 'manager', foreignKey: 'managerId' });

// ---------------------------------------------------------------------------
// Documents & acknowledgements
// ---------------------------------------------------------------------------
DocumentTemplate.belongsTo(Organization, { as: 'organization', foreignKey: 'orgId' });
DocumentTemplate.hasMany(EmployeeDocument, { as: 'documents', foreignKey: 'templateId' });

EmployeeDocument.belongsTo(Organization, { as: 'organization', foreignKey: 'orgId' });
EmployeeDocument.belongsTo(DocumentTemplate, { as: 'template', foreignKey: 'templateId' });
EmployeeDocument.belongsTo(User, { as: 'user', foreignKey: 'userId' });

// ---------------------------------------------------------------------------
// Integrations: API keys & webhooks
// ---------------------------------------------------------------------------
ApiKey.belongsTo(Organization, { as: 'organization', foreignKey: 'orgId' });
ApiKey.belongsTo(User, { as: 'createdBy', foreignKey: 'createdById' });

Webhook.belongsTo(Organization, { as: 'organization', foreignKey: 'orgId' });
Webhook.hasMany(WebhookDelivery, { as: 'deliveries', foreignKey: 'webhookId' });

WebhookDelivery.belongsTo(Webhook, { as: 'webhook', foreignKey: 'webhookId' });

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
  OneOnOneSeries,
  OneOnOneMeeting,
  OneOnOneAgendaItem,
  Survey,
  SurveyQuestion,
  SurveyResponse,
  SurveyAnswer,
  LeaveType,
  LeaveBalance,
  LeaveRequest,
  Holiday,
  CompensationBand,
  CompensationRecord,
  PayReviewCycle,
  PayReviewDecision,
  OnboardingTemplate,
  OnboardingTemplateTask,
  OnboardingAssignment,
  OnboardingTaskProgress,
  CalibrationSession,
  CalibrationParticipant,
  DocumentTemplate,
  EmployeeDocument,
  ApiKey,
  Webhook,
  WebhookDelivery,
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
  OneOnOneSeries,
  OneOnOneMeeting,
  OneOnOneAgendaItem,
  Survey,
  SurveyQuestion,
  SurveyResponse,
  SurveyAnswer,
  LeaveType,
  LeaveBalance,
  LeaveRequest,
  Holiday,
  CompensationBand,
  CompensationRecord,
  PayReviewCycle,
  PayReviewDecision,
  OnboardingTemplate,
  OnboardingTemplateTask,
  OnboardingAssignment,
  OnboardingTaskProgress,
  CalibrationSession,
  CalibrationParticipant,
  DocumentTemplate,
  EmployeeDocument,
  ApiKey,
  Webhook,
  WebhookDelivery,
};
