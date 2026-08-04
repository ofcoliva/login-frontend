import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { initTheme } from './composables/useTheme'
import { UNAUTHORIZED_EVENT } from './services/http'
import { useAuthStore } from './stores/auth'

initTheme()

const app = createApp(App)

const pinia = createPinia()
app.use(pinia)
app.use(router)

const auth = useAuthStore(pinia)

window.addEventListener(UNAUTHORIZED_EVENT, () => {
  auth.clearSession()
  if (router.currentRoute.value.meta.requiresAuth) {
    router.push({ name: 'login' })
  }
})

app.mount('#app')

router.isReady().then(() => {
  if (auth.sessionExpired()) {
    auth.clearSession()
  } else {
    auth.validateSession()
  }
})

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && auth.sessionExpired()) {
    auth.clearSession()
  }
})
