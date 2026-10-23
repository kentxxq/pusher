import type { ComposeOption } from 'echarts/core';
import type { LineSeriesOption, PieSeriesOption } from 'echarts/charts';
import type { GridComponentOption, TooltipComponentOption } from 'echarts/components';

export type ChartKind = 'line' | 'pie';
export type ChartDatum = { name: string; count: number };
export type StatisticsOption = ComposeOption<LineSeriesOption | PieSeriesOption | GridComponentOption | TooltipComponentOption>;

export function statisticsOption(kind: ChartKind, title: string, data: ChartDatum[]): StatisticsOption {
  if (kind === 'pie') return {
    tooltip: { trigger: 'item' },
    series: [{ type: 'pie', name: title, radius: '60%', data: data.map(row => ({ name: row.name, value: row.count })) }],
  };
  return {
    tooltip: { trigger: 'axis' },
    grid: { left: 48, right: 24, top: 24, bottom: 40, containLabel: true },
    xAxis: { type: 'time' }, yAxis: { type: 'value', minInterval: 1 },
    series: [{ type: 'line', name: title, smooth: true, data: data.map(row => [row.name, row.count]) }],
  };
}
