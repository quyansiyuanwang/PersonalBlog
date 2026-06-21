<script setup lang="ts">
import { computed, ref } from 'vue'
import { useScrollReveal } from '../lib/scrollReveal'

const { observe } = useScrollReveal()
const ringRotationAngle = ref(0)

const routeCards = [
  {
    index: '01',
    title: 'PORTFOLIO',
    subtitle: '作品与实验',
    description: '进入项目、界面实验和长期维护工具的展示区。',
    to: '/portfolio',
  },
  {
    index: '02',
    title: 'EXPERIENCE',
    subtitle: '经验轨迹',
    description: '整理工作方式、项目经验和阶段性复盘。',
    to: '/experience',
  },
  {
    index: '03',
    title: 'BLOG',
    subtitle: '文章索引',
    description: '按时间线阅读全部笔记、文章和长期写作记录。',
    to: '/archive',
  },
  {
    index: '04',
    title: 'LIFE',
    subtitle: '生活片段',
    description: '留下阅读、生活、情绪和节奏感的慢速记录。',
    to: '/life',
  },
  {
    index: '05',
    title: 'CONTACT',
    subtitle: '联系节点',
    description: '从这里开始一次关于写作、界面或自动化的交流。',
    to: '/contact',
  },
  {
    index: '06',
    title: 'ABOUT',
    subtitle: '查看身份信息',
    description: '了解作者、写作方式，以及这个静态博客的组织方式。',
    to: '/about',
  },
  {
    index: '07',
    title: 'FRIENDS',
    subtitle: '友链中继',
    description: '收集值得长期阅读、互相引用和交换灵感的站点。',
    to: '/friends',
  },
]

const cardStep = 360 / routeCards.length
const ringRotation = computed(() => `${ringRotationAngle.value}deg`)
const activeCardIndex = computed(() => {
  let closestIndex = 0
  let closestDistance = Infinity

  routeCards.forEach((_, index) => {
    const distance = Math.abs(normalizeAngle(ringRotationAngle.value + index * cardStep))

    if (distance < closestDistance) {
      closestDistance = distance
      closestIndex = index
    }
  })

  return closestIndex
})

function normalizeAngle(angle: number) {
  return ((angle + 180) % 360 + 360) % 360 - 180
}

function handleRouteRingWheel(event: WheelEvent) {
  ringRotationAngle.value -= event.deltaY * 0.18
}

function getRouteCardStyle(index: number) {
  const angle = normalizeAngle(ringRotationAngle.value + index * cardStep)
  const depth = Math.abs(angle) / cardStep

  return {
    '--card-angle': `${index * cardStep}deg`,
    '--card-depth': depth,
    '--card-brightness': Math.max(0.48, 1 - Math.min(depth, 2) * 0.16),
    zIndex: String(100 - Math.round(depth * 10)),
  }
}
</script>

<template>
  <div class="home-view home-nav-deck" :ref="observe">
    <nav
      class="home-nav-cards reveal"
      aria-label="导航"
      :style="{ '--ring-rotation': ringRotation }"
      @wheel.prevent="handleRouteRingWheel"
    >
      <RouterLink
        v-for="(card, index) in routeCards"
        :key="card.to"
        class="home-nav-card"
        :class="{ active: activeCardIndex === index }"
        :to="card.to"
        :style="getRouteCardStyle(index)"
      >
        <span class="home-nav-index">{{ card.index }}</span>
        <span class="home-nav-copy">
          <strong>{{ card.title }}</strong>
          <small>{{ card.subtitle }}</small>
          <em>{{ card.description }}</em>
        </span>
        <span class="home-nav-arrow">↗</span>
      </RouterLink>
    </nav>
  </div>
</template>
