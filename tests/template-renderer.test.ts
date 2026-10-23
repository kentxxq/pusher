import { describe, expect, it } from 'vitest';
import { evaluateTemplate, renderTemplate } from '../server/template-renderer';
import type { TemplateObject } from '../shared/domain';
import { statisticsOption } from '../shared/chart-options';

describe('投递与模板预览共用渲染规则', () => {
  const template: TemplateObject = { Variables: [{ VariableName: 'content', JsonPath: '$.content' }], TemplateText: '{{ content }}' };
  it.each([
    ['{"content":"fake_info"}', 'fake_info'], ['fake_info', 'fake_info'],
    ['[1, 2]', ''], ['null', ''], ['{"content":true}', 'True'],
  ])('预览与投递均符合独立预期：%s', (sample, expected) => {
    const preview = evaluateTemplate(template, sample);
    expect(preview.rendered).toBe(expected);
    expect(renderTemplate(template, sample, {})).toBe(expected);
  });
  it('首项匹配、未命中、非法路径与 HTML 转义', () => {
    const draft: TemplateObject = {
      Variables: [{ VariableName: 'first', JsonPath: '$.values[*]' }, { VariableName: 'missing', JsonPath: '$.missing' }, { VariableName: 'invalid', JsonPath: '$[' }],
      TemplateText: '{{first}}|{{missing}}|{{invalid}}',
    };
    const result = evaluateTemplate(draft, '{"values":["<b>&", "second"]}');
    expect(result.variables.map(row => [row.value, row.status])).toEqual([['<b>&', 'matched'], ['', 'missing'], ['', 'invalid']]);
    expect(result.rendered).toBe('&lt;b&gt;&amp;||');
  });
  it('支持普通文本、数组与正文覆盖附加数据', () => {
    expect(evaluateTemplate(template, 'fake_info')).toMatchObject({ inputMode: 'text', rendered: 'fake_info' });
    expect(evaluateTemplate({ ...template, Variables: [{ VariableName: 'content', JsonPath: '$[0]' }] }, '["first","second"]').rendered).toBe('first');
    expect(renderTemplate(template, '{"content":"body"}', { content: 'extra' })).toBe('body');
  });
  it('模板语法错误向调用方报告', () => {
    expect(() => evaluateTemplate({ Variables: [], TemplateText: '{{#if}}' }, '{}')).toThrow();
  });
});

describe('统计图表选项', () => {
  it('生成时间折线并随周期数据更新，不修改原始数据', () => {
    const data = [{ name: '2026-10-21', count: 3 }];
    const first = statisticsOption('line', '每日消息', data);
    expect(first).toMatchObject({ xAxis: { type: 'time' }, yAxis: { minInterval: 1 }, series: [{ type: 'line', data: [['2026-10-21', 3]] }] });
    const next = statisticsOption('line', '每日消息', [{ name: '2026-10-20', count: 7 }]);
    expect(next).toMatchObject({ series: [{ data: [['2026-10-20', 7]] }] });
    expect(data).toEqual([{ name: '2026-10-21', count: 3 }]);
  });
  it('饼图保留名称和数量，空数据不注入假值', () => {
    expect(statisticsOption('pie', '用户消息占比', [{ name: 'fake_username', count: 5 }])).toMatchObject({ series: [{ type: 'pie', data: [{ name: 'fake_username', value: 5 }] }] });
    expect(statisticsOption('pie', '房间占比', [])).toMatchObject({ series: [{ data: [] }] });
  });
});
