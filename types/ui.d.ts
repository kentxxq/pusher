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
    USelect: typeof import('@nuxt/ui/components/Select.vue')['default'];
    UTextarea: typeof import('@nuxt/ui/components/Textarea.vue')['default'];
  }
}
export {};

