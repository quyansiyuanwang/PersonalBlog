import { createRouter, createWebHistory } from 'vue-router'
import { applyRouteSeo } from '../lib/seo'

const router = createRouter({
  history: createWebHistory('/PersonalBlog/'),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('../views/HomeView.vue'),
      meta: {
        title: '首页',
        description: '一个关于书写、设计与安静生活的个人角落，收集代码、文字与长期主义实践。',
      },
    },
    {
      path: '/post/:slug',
      name: 'post-detail',
      component: () => import('../views/PostDetailView.vue'),
      meta: { title: '文章' },
    },
    {
      path: '/about',
      name: 'about',
      component: () => import('../views/AboutView.vue'),
      meta: {
        title: '关于',
        description: '了解博客作者、写作方式，以及这个静态博客背后的内容组织思路。',
      },
    },
    {
      path: '/archive',
      name: 'archive',
      component: () => import('../views/ArchiveView.vue'),
      meta: {
        title: '归档',
        description: '按时间浏览所有文章归档，回看每一次写作和主题整理。',
      },
    },
    {
      path: '/tags/:tag?',
      name: 'tags',
      component: () => import('../views/TagsView.vue'),
      meta: {
        title: '标签',
        description: '按标签查看文章主题，在写作、设计、工作流与生活节奏之间切换。',
      },
    },
  ],
  scrollBehavior() {
    return { top: 0, behavior: 'smooth' }
  },
})

router.afterEach((to) => {
  applyRouteSeo(to)
})

export default router
