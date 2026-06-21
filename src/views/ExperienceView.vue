<script setup lang="ts">
import PageSectionHeader from '../components/PageSectionHeader.vue'
import { useScrollReveal } from '../lib/scrollReveal'

const { observe } = useScrollReveal()

const milestones = [
  '宁波大学科学技术学院软件工程本科在读，获得蓝桥杯三等奖。',
  '曾在 GitHub 20k+ Stars 项目 MaaAssistantArknights 担任 Core Developer，参与工具链重构与设备交互稳定性修复。',
  '具备前端、后端与桌面端完整项目落地经验，能独立完成需求拆解、开发、联调和交付。',
  '熟悉 TypeScript、Vue、React、Node.js、Express、FastAPI、Prisma、MySQL、Electron 与 CI/CD 流程。',
]
</script>

<template>
  <div class="experience-view page-stack" :ref="observe">
    <PageSectionHeader
      code="EXPERIENCE"
      title="经验轨迹"
      description="从开源协作、桌面工具、全栈系统到工程化交付，整理已经验证过的技术路径。"
    />

    <div class="route-feature-list">
      <article v-for="(item, index) in milestones" :key="item" class="route-feature-row reveal">
        <span>{{ String(index + 1).padStart(2, '0') }}</span>
        <p>{{ item }}</p>
      </article>
    </div>
  </div>
</template>
