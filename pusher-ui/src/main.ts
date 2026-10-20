import { createApp } from 'vue'
import pinia from './stores'
import App from './App.vue'
import router from './router'
import VueECharts from 'vue-echarts' // 导入VueECharts组件
// 解决告警 Added non-passive event listener.......
import 'default-passive-events'

const app = createApp(App)

app.use(pinia)
app.use(router)
// 查看环境变量
// console.debug(import.meta.env)

// svg图标插件要用
import 'virtual:svg-icons-register'

import SvgIcon from '@/components/SvgIcon/index.vue'
app.component('SvgIcon', SvgIcon)
app.component('v-chart', VueECharts)
app.mount('#app')
