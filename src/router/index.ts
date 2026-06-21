import { createRouter, createWebHistory } from "vue-router";
import { applyRouteSeo } from "../lib/seo";

const loadHomeView = () => import("../views/HomeView.vue");
const loadRoutesView = () => import("../views/RoutesView.vue");
const loadPostDetailView = () => import("../views/PostDetailView.vue");
const loadAboutView = () => import("../views/AboutView.vue");
const loadArchiveView = () => import("../views/ArchiveView.vue");
const loadTagsView = () => import("../views/TagsView.vue");
const loadPortfolioView = () => import("../views/PortfolioView.vue");
const loadExperienceView = () => import("../views/ExperienceView.vue");
const loadLifeView = () => import("../views/LifeView.vue");
const loadContactView = () => import("../views/ContactView.vue");
const loadFriendsView = () => import("../views/FriendsView.vue");

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      alias: "/routes",
      name: "routes",
      component: loadRoutesView,
      meta: {
        title: "大路由",
        description: "以 3D 环形导航进入归档、标签、关于与首页模块。",
      },
    },
    {
      path: "/home",
      name: "home",
      component: loadHomeView,
      meta: {
        title: "首页",
        description:
          "一个关于书写、设计与安静生活的个人角落，收集代码、文字与长期主义实践。",
      },
    },
    {
      path: "/post/:slug",
      name: "post-detail",
      component: loadPostDetailView,
      meta: { title: "文章" },
    },
    {
      path: "/portfolio",
      name: "portfolio",
      component: loadPortfolioView,
      meta: {
        title: "作品",
        description: "浏览个人项目、界面实验和长期维护的小工具。",
      },
    },
    {
      path: "/experience",
      name: "experience",
      component: loadExperienceView,
      meta: {
        title: "经验",
        description: "整理工作方式、项目经验和阶段性复盘。",
      },
    },
    {
      path: "/life",
      name: "life",
      component: loadLifeView,
      meta: {
        title: "生活",
        description: "记录阅读、生活、情绪和日常节奏。",
      },
    },
    {
      path: "/contact",
      name: "contact",
      component: loadContactView,
      meta: {
        title: "联系",
        description: "找到交流写作、界面、自动化和长期主义实践的入口。",
      },
    },
    {
      path: "/friends",
      name: "friends",
      component: loadFriendsView,
      meta: {
        title: "友链",
        description: "收集值得长期阅读和交换灵感的站点。",
      },
    },
    {
      path: "/about",
      name: "about",
      component: loadAboutView,
      meta: {
        title: "关于",
        description:
          "了解博客作者、写作方式，以及这个静态博客背后的内容组织思路。",
      },
    },
    {
      path: "/archive",
      name: "archive",
      component: loadArchiveView,
      meta: {
        title: "归档",
        description: "按时间浏览所有文章归档，回看每一次写作和主题整理。",
      },
    },
    {
      path: "/tags/:tag?",
      name: "tags",
      component: loadTagsView,
      meta: {
        title: "标签",
        description:
          "按标签查看文章主题，在写作、设计、工作流与生活节奏之间切换。",
      },
    },
  ],
  scrollBehavior() {
    return { top: 0, left: 0 };
  },
});

router.afterEach((to) => {
  applyRouteSeo(to);
});

export default router;
