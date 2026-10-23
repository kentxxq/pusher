<script setup lang="ts">
import { computed, reactive, ref, shallowRef } from 'vue';
import { Form, useForm } from '@void/vue';
import SearchForm from '../components/SearchForm.vue';
import Pagination from '../components/Pagination.vue';
import { actionErrorMessage } from '../shared/action-error';
import { templateValueSchema } from '../shared/validation';
import type { TemplateObject } from '../shared/domain';
import type { TableColumn } from '@nuxt/ui';
import type { Props } from './templates.server';

const props = defineProps<Props>();
const open = ref(false);
const draft = reactive<TemplateObject>({ Variables: [], TemplateText: '' });
const errors = ref<Record<string, string>>({});
const sample = ref('{"content":"fake_info"}');
const lastPreview = shallowRef<Props['preview']>(null);
const lastSignature = ref('');

const form = useForm('/templates?save', { id: 0, name: '', code: '', value: '', csrf: props.csrf });
const preview = useForm('/templates?preview', { value: '', sample: '', page: props.list.page, search: props.search, csrf: props.csrf });
const deletion = useForm('/templates?delete', { id: 0, csrf: props.csrf });
const signature = computed(() => JSON.stringify({ name: form.data.name, code: form.data.code, ...draft, sample: sample.value }));
const stale = computed(() => lastPreview.value !== null && lastSignature.value !== signature.value);
const busy = computed(() => form.pending || preview.pending);

function edit(row?: Props['list']['items'][number]) {
  form.clearError(); form.clearErrors(); preview.clearError(); preview.clearErrors();
  errors.value = {}; lastPreview.value = null; lastSignature.value = '';
  Object.assign(form.data, { id: row?.id ?? 0, name: row?.name ?? '', code: row?.code ?? '', value: '' });
  draft.Variables = row ? row.value.Variables.map(variable => ({ ...variable })) : [{ VariableName: 'content', JsonPath: '$.content' }];
  draft.TemplateText = row?.value.TemplateText ?? '{{ content }}';
  sample.value = '{"content":"fake_info"}';
  open.value = true;
}

function validate() {
  const result = templateValueSchema.safeParse(draft);
  errors.value = {};
  if (!result.success) for (const issue of result.error.issues) errors.value[issue.path.join('.')] = issue.message;
  return result.success;
}

async function save() {
  if (busy.value || !validate()) return;
  form.data.value = JSON.stringify(draft); form.data.csrf = props.csrf;
  await form.post();
  if (form.wasSuccessful) open.value = false;
}

async function testPreview() {
  if (busy.value || !validate()) return;
  const requestedSignature = signature.value;
  Object.assign(preview.data, { value: JSON.stringify(draft), sample: sample.value, page: props.list.page, search: props.search, csrf: props.csrf });
  await preview.post({ preserveState: true, preserveScroll: true });
  if (preview.wasSuccessful && props.preview) { lastPreview.value = props.preview; lastSignature.value = requestedSignature; }
}

async function remove(id: number) { if (confirm('删除这个模板？')) { deletion.data.id = id; await deletion.post(); } }
type Row = Props['list']['items'][number];
const columns: TableColumn<Row>[] = [{ accessorKey: 'name', header: '名称' }, { accessorKey: 'code', header: '模板代码' }, { id: 'actions', header: '操作' }];
const statusNames = { matched: '已匹配', missing: '未命中', invalid: '路径非法' };
</script>

<template>
  <div class="flex flex-wrap items-center justify-between gap-4">
    <div><h1 class="text-2xl font-semibold text-highlighted">字符串模板</h1><p class="text-muted">定义 JSONPath 变量，通过 Handlebars 渲染正文。</p></div>
    <UButton @click="edit()">新建模板</UButton>
  </div>

  <UCard>
    <SearchForm path="/templates" :search="search" placeholder="搜索模板" />
    <UAlert v-if="deletion.error" color="error" :description="actionErrorMessage(deletion.error)" />
    <UTable :data="list.items" :columns="columns" empty="暂无模板" :sorting-options="{ enableSorting: false }" :ui="{ td: 'max-w-sm whitespace-normal wrap-anywhere' }">
      <template #code-cell="{ row }"><span class="font-mono text-xs wrap-anywhere">{{ row.original.code }}</span></template>
      <template #actions-cell="{ row }"><div class="flex flex-wrap items-center gap-2"><UButton variant="ghost" @click="edit(row.original)">编辑</UButton><UButton color="error" variant="ghost" @click="remove(row.original.id)">删除</UButton></div></template>
    </UTable>
    <Pagination v-bind="list" path="/templates" :search="search" />
  </UCard>

  <UModal
    v-model:open="open"
    :title="form.data.id ? '编辑模板' : '新建模板'"
    description="编辑变量与正文，使用样例数据调试提取和渲染结果。"
    :dismissible="!busy"
    :close="!busy"
    :ui="{
      content: 'w-[calc(100vw-2rem)] sm:max-w-6xl',
      body: 'overflow-y-auto max-h-[85vh] p-6'
    }"
  >
    <template #body>
      <Form :form="{ ...form, post: save }" :render-error="actionErrorMessage" class="space-y-6">
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <!-- 左侧：模板配置区 -->
          <div class="lg:col-span-7 space-y-4">
            <!-- 统一色块：模板基本信息 + 变量映射 -->
            <div class="bg-elevated/40 border border-default rounded-xl p-4 space-y-4">
              <!-- 基础信息 -->
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <UFormField label="模板名称" :error="form.errors.name">
                  <UInput v-model="form.data.name" name="templateName" placeholder="例如：告警通知" class="w-full" />
                </UFormField>
                <UFormField label="模板代码（留空自动生成）" :error="form.errors.code">
                  <UInput v-model="form.data.code" name="templateCode" placeholder="例如：alert-notice" class="w-full font-mono text-xs" />
                </UFormField>
              </div>

              <!-- 变量映射 -->
              <div class="pt-3 border-t border-default/70 space-y-3">
                <div class="flex items-center justify-between">
                  <div>
                    <h3 class="font-semibold text-xs text-highlighted uppercase tracking-wide">变量映射 (JSONPath 提取)</h3>
                    <p class="text-xs text-muted">从上游数据中提取字段，供下方模板正文引用</p>
                  </div>
                  <UButton type="button" size="xs" variant="outline" icon="i-lucide-plus" @click="draft.Variables.push({ VariableName: '', JsonPath: '' })">
                    添加变量
                  </UButton>
                </div>

                <div v-if="draft.Variables.length" class="space-y-2">
                  <div
                    v-for="(variable, index) in draft.Variables"
                    :key="index"
                    class="flex items-start gap-2 p-2 rounded-lg bg-elevated/60 border border-default"
                  >
                    <div class="flex-1">
                      <UInput
                        v-model="variable.VariableName"
                        :name="'variable-' + index"
                        placeholder="变量名 (如 content)"
                        size="sm"
                        class="w-full"
                      />
                      <p v-if="errors['Variables.' + index + '.VariableName']" role="alert" class="text-xs text-error mt-1">{{ errors['Variables.' + index + '.VariableName'] }}</p>
                    </div>
                    <span class="text-muted text-xs pt-2 font-mono">=</span>
                    <div class="flex-1">
                      <UInput
                        v-model="variable.JsonPath"
                        :name="'jsonpath-' + index"
                        placeholder="JSONPath (如 $.content)"
                        size="sm"
                        class="w-full font-mono"
                      />
                      <p v-if="errors['Variables.' + index + '.JsonPath']" role="alert" class="text-xs text-error mt-1">{{ errors['Variables.' + index + '.JsonPath'] }}</p>
                    </div>
                    <UButton
                      type="button"
                      icon="i-lucide-trash-2"
                      color="error"
                      variant="ghost"
                      size="xs"
                      :aria-label="'删除变量 ' + (index + 1)"
                      @click="draft.Variables.splice(index, 1)"
                    />
                  </div>
                </div>
                <p v-else class="text-xs text-muted py-2 border border-dashed border-default rounded text-center">暂未添加变量，正文将直接作为固定文本渲染。</p>
              </div>
            </div>

            <!-- 模板正文输入区（与右侧最终渲染正文对应） -->
            <div class="bg-elevated/20 border border-default rounded-xl p-4 space-y-2">
              <div class="flex items-center justify-between pb-1 border-b border-default/50">
                <div class="flex items-center gap-2">
                  <span class="i-lucide-file-code text-primary text-sm" />
                  <span class="font-semibold text-xs text-highlighted">Handlebars 模板正文</span>
                  <UBadge size="xs" color="primary" variant="subtle">模板定义</UBadge>
                </div>
                <span v-pre class="text-xs text-muted">支持引用变量：{{ 变量名 }}</span>
              </div>

              <UFormField :error="errors.TemplateText || form.errors.value">
                <UTextarea
                  v-model="draft.TemplateText"
                  name="templateText"
                  :rows="9"
                  placeholder="在此输入模板正文，使用 {{ 变量名 }} 引用上方定义的变量..."
                  class="w-full font-mono text-sm"
                />
              </UFormField>
            </div>
          </div>

          <!-- 右侧：调试预览看板 -->
          <div class="lg:col-span-5 bg-elevated/30 border border-default rounded-xl p-4 space-y-4">
            <!-- 调试样例输入与测试按钮 -->
            <div class="space-y-3">
              <div class="flex items-center justify-between pb-2 border-b border-default">
                <span class="font-semibold text-xs text-highlighted flex items-center gap-1.5 uppercase tracking-wide">
                  <span class="i-lucide-terminal text-primary" /> 调试控制台
                </span>
                <UButton
                  type="button"
                  size="xs"
                  color="primary"
                  variant="solid"
                  icon="i-lucide-play"
                  aria-label="预览模板草稿"
                  :loading="preview.pending"
                  :disabled="form.pending"
                  @click="testPreview"
                >
                  运行测试
                </UButton>
              </div>

              <div>
                <label class="block text-xs font-medium text-muted mb-1">测试样例（JSON 或纯文本）</label>
                <UTextarea v-model="sample" name="sampleContent" :rows="4" class="w-full font-mono text-xs" />
              </div>

              <UAlert v-if="preview.error" color="error" :description="actionErrorMessage(preview.error)" />
              <UAlert v-if="stale" color="warning" title="预览已过期，请重新运行测试" />
              <p v-if="lastPreview?.inputMode === 'text'" role="status" class="text-xs text-muted">样例按普通文本处理，通过 $.content 提取；如果预期使用 JSON，请检查样例格式。</p>
            </div>

            <!-- 变量提取状态 -->
            <div v-if="lastPreview?.variables?.length" class="space-y-1.5">
              <span class="text-xs font-medium text-muted block">变量提取状态</span>
              <div class="grid grid-cols-1 gap-1.5 max-h-36 overflow-y-auto">
                <div
                  v-for="(variable, index) in lastPreview.variables"
                  :key="index"
                  class="flex items-center justify-between text-xs p-2 rounded-lg bg-elevated border border-default"
                >
                  <span class="font-mono font-medium">{{ variable.name }}</span>
                  <div class="flex items-center gap-2">
                    <span class="text-muted font-mono truncate max-w-[120px]">{{ variable.value || '空' }}</span>
                    <UBadge size="xs" :color="variable.status === 'matched' ? 'success' : 'warning'" variant="subtle">
                      {{ statusNames[variable.status] }}
                    </UBadge>
                  </div>
                </div>
              </div>
            </div>

            <!-- 最终渲染正文（与左侧模板正文遥相呼应） -->
            <div class="space-y-2 pt-2 border-t border-default/70">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <span class="i-lucide-sparkles text-success text-sm" />
                  <span class="font-semibold text-xs text-highlighted">最终渲染正文</span>
                  <UBadge size="xs" color="success" variant="subtle">预览效果</UBadge>
                </div>
                <span class="text-xs text-muted">由左侧模板替换生成</span>
              </div>

              <div v-if="lastPreview">
                <pre aria-label="渲染正文" class="min-h-24 max-h-52 overflow-y-auto whitespace-pre-wrap rounded-lg bg-elevated/80 p-3 font-mono text-xs border border-default wrap-anywhere">{{ lastPreview.rendered || '（空字符串）' }}</pre>
              </div>
              <div v-else class="text-center py-7 text-xs text-muted border border-dashed border-default rounded-lg">
                在左侧编写模板，点击上方「运行测试」在此预览渲染结果
              </div>
            </div>
          </div>
        </div>

        <!-- 底部通用保存/取消栏 -->
        <div class="flex justify-end items-center gap-3 pt-4 border-t border-default">
          <UButton type="button" color="neutral" variant="ghost" :disabled="busy" @click="open = false">
            取消
          </UButton>
          <UButton type="submit" color="primary" :loading="form.pending" :disabled="preview.pending">
            保存模板
          </UButton>
        </div>
      </Form>
    </template>
  </UModal>
</template>
