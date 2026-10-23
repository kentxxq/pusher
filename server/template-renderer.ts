import Handlebars from 'handlebars';
import { query } from 'jsonpath-rfc9535';
import type { TemplateObject } from '../shared/domain';

export function contentText(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'boolean') return value ? 'True' : 'False';
  return typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);
}

// 投递与预览共用解析、首项匹配、文本转换及 Handlebars 转义。
export function evaluateTemplate(template: TemplateObject, content: unknown, extra: Record<string, string> = {}) {
  let data: Parameters<typeof query>[0];
  let inputMode: 'json' | 'text' = 'json';
  try { data = JSON.parse(contentText(content)); }
  catch { data = { content: contentText(content) }; inputMode = 'text'; }
  if (data === null) data = {};
  if (typeof data === 'object' && !Array.isArray(data)) data = { ...extra, ...data };
  const values: Record<string, string> = {};
  const variables = template.Variables.map(variable => {
    let value = '';
    let status: 'matched' | 'missing' | 'invalid' = 'missing';
    try {
      const matches = query(data, variable.JsonPath);
      value = contentText(matches[0]);
      status = matches.length ? 'matched' : 'missing';
    } catch { status = 'invalid'; }
    values[variable.VariableName] = value;
    return { name: variable.VariableName, path: variable.JsonPath, value, status };
  });
  return { inputMode, variables, rendered: Handlebars.compile(template.TemplateText)(values) };
}

export type TemplatePreview = ReturnType<typeof evaluateTemplate>;
export function renderTemplate(template: TemplateObject, content: unknown, extra: Record<string, string>) {
  return evaluateTemplate(template, content, extra).rendered;
}
