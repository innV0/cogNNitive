import { createRouter, createWebHistory, type RouteLocationNormalized } from 'vue-router'
import { useWorkspaceStore } from '../stores/workspaceStore'
import HomeView from '../views/HomeView.vue'
import WorkspaceView from '../views/WorkspaceView.vue'

export const routes = [
  { path: '/', name: 'home', component: HomeView },
  {
    path: '/workspace',
    name: 'workspace',
    component: WorkspaceView,
    meta: { requiresHandle: true },
  },
]

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

/**
 * Gates routes on workspaceStore.hasHandle. Navigating between nodes/routes
 * must never trigger a second parse pass (R1) — this guard only checks
 * `hasHandle`; it never calls `open()` or triggers parsing itself.
 */
router.beforeEach((to: RouteLocationNormalized) => {
  if (to.meta?.requiresHandle) {
    const workspaceStore = useWorkspaceStore()
    if (!workspaceStore.hasHandle) {
      return { name: 'home' }
    }
  }
  return true
})
