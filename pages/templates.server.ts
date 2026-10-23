import { defineHandler, type InferProps } from 'void';
import { actor, services, perform, withCsrf, pageNumber } from '../server/http';
import { templateSchema, templateValueSchema, templatePreviewSchema, idSchema } from '../shared/validation';
import { evaluateTemplate } from '../server/template-renderer';
import { BusinessError } from '../shared/domain';

export const loader = defineHandler(async c => {
  const preview = c.get('templatePreview') ?? null;
  const search = preview?.search ?? c.req.query('search') ?? '';
  return { list: await perform(() => services().management.templates(actor(c), preview?.page ?? pageNumber(c), search)), csrf: c.get('shared').csrf, search, preview };
});
export type Props = InferProps<typeof loader>;
export const actions = {
  preview: defineHandler.withValidator({ body: withCsrf(templatePreviewSchema) })(async (c, { body }) => {
    actor(c);
    const preview = await perform(async () => {
      let template;
      try { template = templateValueSchema.parse(JSON.parse(body.value)); }
      catch { throw new BusinessError('模板变量或正文格式错误'); }
      try { return evaluateTemplate(template, body.sample); }
      catch { throw new BusinessError('Handlebars 模板语法错误，请检查模板正文'); }
    });
    c.set('templatePreview', { ...preview, page: body.page, search: body.search });
  }),
  save: defineHandler.withValidator({ body: withCsrf(templateSchema) })(async (c, { body }) => { await perform(() => services().management.saveTemplate(actor(c), body)); }),
  delete: defineHandler.withValidator({ body: withCsrf(idSchema) })(async (c, { body }) => { await perform(() => services().management.remove(actor(c), 'templates', body.id)); }),
};

