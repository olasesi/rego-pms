import type { Request } from 'express';
import { DocumentTemplate, EmployeeDocument, User } from '../../models';
import { CrudService } from '../../common/services/crud';
import { ApiError } from '../../common/utils/ApiError';
import { actorId, tenantScope } from '../../common/utils/access';
import { queueWebhookEvent } from '../integrations/integrations.service';

const userSummary = ['id', 'firstName', 'lastName', 'email', 'avatarUrl'];

const documentIncludes = [
  { model: User, as: 'user', attributes: userSummary },
  { model: DocumentTemplate, as: 'template', attributes: ['id', 'name', 'category', 'version'] },
];

export class DocumentTemplateService extends CrudService {
  constructor() {
    super({
      model: DocumentTemplate,
      moduleKey: 'documentTemplate',
      tenantScoped: true,
      searchFields: ['name', 'description', 'category'],
      filters: [{ field: 'category' }, { field: 'status' }, { field: 'requiresAcknowledgement', type: 'boolean' }],
      defaultSortBy: 'createdAt',
      notFoundKey: 'documents.templateNotFound',
    });
  }

  async publishVersion(templateId: number, req: Request): Promise<any> {
    const template = await this.findById(templateId, req);
    await template.update({ version: template.version + 1 });
    return template;
  }
}

export class DocumentService {
  async send(
    templateId: number,
    userIds: number[],
    body: Record<string, unknown>,
    templateService: DocumentTemplateService,
    req: Request,
  ): Promise<any[]> {
    const template = await templateService.findById(templateId, req);
    if (template.status !== 'active') throw new ApiError(400, 'documents.templateArchived');
    const orgId = req.tenantId;
    if (orgId == null) throw new ApiError(400, 'common.invalidRequest');
    if (userIds.length === 0) throw new ApiError(400, 'documents.noRecipients');
    const users = await User.findAll({ where: { id: userIds, orgId }, attributes: ['id'] });
    if (users.length === 0) throw new ApiError(404, 'documents.recipientNotFound');

    const documents = await Promise.all(
      users.map((user) =>
        EmployeeDocument.create({
          orgId,
          userId: user.id,
          templateId: template.id,
          title: template.name,
          category: template.category,
          content: template.content,
          version: template.version,
          status: 'sent',
          sentAt: new Date(),
          expiresAt: body.expiresAt != null ? new Date(String(body.expiresAt)) : null,
        }),
      ),
    );
    queueWebhookEvent(orgId, 'document.sent', {
      templateId: template.id,
      userIds: users.map((user) => user.id),
      count: documents.length,
    });
    return documents;
  }

  async list(req: Request): Promise<any[]> {
    const where: Record<string, unknown> = { ...tenantScope(req) };
    if (req.query.status) where.status = req.query.status;
    if (req.query.userId) where.userId = Number(req.query.userId);
    if (req.query.templateId) where.templateId = Number(req.query.templateId);
    return EmployeeDocument.findAll({
      where,
      include: documentIncludes,
      order: [['createdAt', 'DESC']],
    });
  }

  async mine(req: Request): Promise<any[]> {
    return EmployeeDocument.findAll({
      where: { userId: actorId(req), ...tenantScope(req) },
      include: [{ model: DocumentTemplate, as: 'template', attributes: ['id', 'name', 'category'] }],
      order: [['createdAt', 'DESC']],
    });
  }

  async findById(id: number, req: Request): Promise<any> {
    const document = await EmployeeDocument.findOne({
      where: { id, ...tenantScope(req) },
      include: documentIncludes,
    });
    if (!document) throw new ApiError(404, 'documents.documentNotFound');
    return document;
  }

  async acknowledge(id: number, req: Request): Promise<any> {
    const document = await this.findById(id, req);
    if (document.userId !== actorId(req)) throw new ApiError(403, 'auth.forbidden');
    if (document.status === 'acknowledged') throw new ApiError(409, 'documents.alreadyAcknowledged');
    if (document.expiresAt && new Date(document.expiresAt).getTime() < Date.now()) {
      await document.update({ status: 'expired' });
      throw new ApiError(400, 'documents.expired');
    }
    await document.update({
      status: 'acknowledged',
      acknowledgedAt: new Date(),
      acknowledgedIp: req.ip ? String(req.ip).slice(0, 45) : null,
    });
    queueWebhookEvent(document.orgId, 'document.acknowledged', {
      documentId: document.id,
      userId: document.userId,
      templateId: document.templateId,
    });
    return this.findById(id, req);
  }

  async sendAdHoc(body: Record<string, unknown>, req: Request): Promise<any> {
    const orgId = req.tenantId;
    if (orgId == null) throw new ApiError(400, 'common.invalidRequest');
    return EmployeeDocument.create({
      orgId,
      userId: Number(body.userId),
      templateId: body.templateId != null ? Number(body.templateId) : null,
      title: String(body.title),
      category: (body.category as string | undefined) ?? 'policy',
      fileUrl: body.fileUrl != null ? String(body.fileUrl) : null,
      content: body.content != null ? String(body.content) : null,
      version: 1,
      status: 'sent',
      sentAt: new Date(),
      expiresAt: body.expiresAt != null ? new Date(String(body.expiresAt)) : null,
    });
  }
}

export const documentTemplateService = new DocumentTemplateService();
export const documentService = new DocumentService();
