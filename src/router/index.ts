import { createRouter, createWebHistory } from 'vue-router'
import { applyRouteSeo } from '../lib/seo'

const loadHomeView = () => import('../views/HomeView.vue')
const loadPostDetailView = () => import('../views/PostDetailView.vue')
const loadAboutView = () => import('../views/AboutView.vue')
const loadArchiveView = () => import('../views/ArchiveView.vue')
const loadTagsView = () => import('../views/TagsView.vue')

const routePrefetchers = [loadHomeView, loadPostDetailView, loadAboutView, loadArchiveView, loadTagsView]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: loadHomeView,
      meta: {
        title: '首页',
        description: '一个关于书写、设计与安静生活的个人角落，收集代码、文字与长期主义实践。',
      },
    },
    {
      path: '/post/:slug',
      name: 'post-detail',
      component: loadPostDetailView,
      meta: { title: '文章' },
    },
    {
      path: '/about',
      name: 'about',
      component: loadAboutView,
      meta: {
        title: '关于',
        description: '了解博客作者、写作方式，以及这个静态博客背后的内容组织思路。',
      },
    },
    {
      path: '/archive',
      name: 'archive',
      component: loadArchiveView,
      meta: {
        title: '归档',
        description: '按时间浏览所有文章归档，回看每一次写作和主题整理。',
      },
    },
    {
      path: '/tags/:tag?',
      name: 'tags',
      component: loadTagsView,
      meta: {
        title: '标签',
        description: '按标签查看文章主题，在写作、设计、工作流与生活节奏之间切换。',
      },
    },
  ],
  scrollBehavior() {
    return { top: 0, left: 0 }
  },
})

router.afterEach((to) => {
  applyRouteSeo(to)
})

export function prefetchRouteComponents() {
  const runPrefetch = () => {
    return Promise.allSettled(routePrefetchers.map((loadView) => loadView())).then(() => undefined)
  }

  if (typeof window === 'undefined') {
    return runPrefetch()
  }

  const idleWindow = window as Window & {
    requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number
  }

  if (typeof idleWindow.requestIdleCallback === 'function') {
    return new Promise<void>((resolve) => {
      idleWindow.requestIdleCallback?.(() => {
        void runPrefetch().then(resolve)
      }, { timeout: 1200 })
    })
  }

  return new Promise<void>((resolve) => {
    window.setTimeout(() => {
      void runPrefetch().then(resolve)
    }, 600)
  })
}

export default router
