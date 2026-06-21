<script setup lang="ts">
import PageSectionHeader from '../components/PageSectionHeader.vue'
import { useScrollReveal } from '../lib/scrollReveal'

const { observe } = useScrollReveal()

const projects = [
  {
    title: 'LanFlare',
    meta: 'Electron / Vue / WebSocket / TCP / UDP',
    description: '跨平台局域网文件传输与剪贴板同步工具，覆盖设备发现、连接授权、文件传输、浏览器接收端与多平台打包。',
  },
  {
    title: 'NDKY-OJSubmitter',
    meta: 'Electron / TypeScript / esbuild / OpenAI SDK',
    description: '面向在线评测系统的 AI 自动提交桌面工具，支持题目检测、代码生成、提交调度、多账号和多语言提交。',
  },
  {
    title: 'AppServer',
    meta: 'Node.js / Express / Prisma / MySQL / Vue',
    description: '全栈分层架构实践，包含 Backend API、管理前端、文档站、静态站和 ServerSDK 示例，覆盖 JWT、RBAC 与 OpenAPI。',
  },
  {
    title: 'zoot-plus-frontend',
    meta: 'React / TypeScript / Vite / Jotai / SWR',
    description: '参与 React 前端开源协作，在 dev/main 分支模型下进行功能交付，并维护自动部署、资源更新与自动 PR 工作流。',
  },
]
</script>

<template>
  <div class="portfolio-view page-stack" :ref="observe">
    <PageSectionHeader
      code="PORTFOLIO"
      title="作品与实验"
      description="把已经成型的桌面应用、全栈系统和开源协作项目集中在这里，保留能被继续迭代的真实作品。"
    />

    <div class="route-feature-grid">
      <article v-for="project in projects" :key="project.title" class="route-feature-card reveal">
        <span>{{ project.meta }}</span>
        <h2>{{ project.title }}</h2>
        <p>{{ project.description }}</p>
      </article>
    </div>
  </div>
</template>
