import { createPinia } from 'pinia'
import { createPersistedState } from 'pinia-plugin-persistedstate'

const pinia = createPinia()
pinia.use(
  createPersistedState({
    auto: true
  })
)

export * from './modules/user'
export * from './modules/permission'

export default pinia
