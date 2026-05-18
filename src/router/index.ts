import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import { useAuthStore } from '../stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: () => import('@/views/DashboardView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/about',
      name: 'about',
      component: () => import('@/views/AboutView.vue'),
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { requiresGuest: true },
    },
  ],
})

router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()

  if (to.meta.requiresAuth) {
    if (authStore.token) {
      const isValid = await authStore.checkAuth()
      if (isValid) {
        next()
      } else {
        next({ name: 'login' })
      }
    } else {
      next({ name: 'login' })
    }
  } else if (to.meta.requiresGuest && authStore.token) {
    const isValid = await authStore.checkAuth()
    if (isValid) {
      next({ name: 'home' })
    } else {
      next()
    }
  } else {
    next()
  }
})

export default router
