import type {} from 'vue';

declare module 'vue' {
  interface GlobalComponents {
    UApp: typeof import('@nuxt/ui/components/App.vue')['default'];
    UBadge: typeof import('@nuxt/ui/components/Badge.vue')['default'];
    UButton: typeof import('@nuxt/ui/components/Button.vue')['default'];
    UCard: typeof import('@nuxt/ui/components/Card.vue')['default'];
    UCheckbox: typeof import('@nuxt/ui/components/Checkbox.vue')['default'];
    UDashboardGroup: typeof import('@nuxt/ui/components/DashboardGroup.vue')['default'];
    UDashboardNavbar: typeof import('@nuxt/ui/components/DashboardNavbar.vue')['default'];
    UDashboardPanel: typeof import('@nuxt/ui/components/DashboardPanel.vue')['default'];
    UDashboardSidebar: typeof import('@nuxt/ui/components/DashboardSidebar.vue')['default'];
    UDashboardSidebarCollapse: typeof import('@nuxt/ui/components/DashboardSidebarCollapse.vue')['default'];
    UFormField: typeof import('@nuxt/ui/components/FormField.vue')['default'];
    UInput: typeof import('@nuxt/ui/components/Input.vue')['default'];
    UListbox: typeof import('@nuxt/ui/components/Listbox.vue')['default'];
    USelect: typeof import('@nuxt/ui/components/Select.vue')['default'];
    UTextarea: typeof import('@nuxt/ui/components/Textarea.vue')['default'];
    UModal: typeof import('@nuxt/ui/components/Modal.vue')['default'];
    USlideover: typeof import('@nuxt/ui/components/Slideover.vue')['default'];
    UTabs: typeof import('@nuxt/ui/components/Tabs.vue')['default'];
    UTable: typeof import('@nuxt/ui/components/Table.vue')['default'];
    UAlert: typeof import('@nuxt/ui/components/Alert.vue')['default'];
    UIcon: typeof import('@nuxt/ui/components/Icon.vue')['default'];
    UAccordion: typeof import('@nuxt/ui/components/Accordion.vue')['default'];
  }
}
export {};

