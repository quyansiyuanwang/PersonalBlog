<script setup lang="ts">
import { computed, ref } from 'vue'
import { useScrollReveal } from '../lib/scrollReveal'

const { observe } = useScrollReveal()
const ringRotationAngle = ref(0)

const routeCards = [
  {
    index: '01',
    title: 'BLOG',
    subtitle: '进入文章归档',
    description: '按时间线阅读全部笔记、文章和长期写作记录。',
    to: '/archive',
  },
  {
    index: '02',
    title: 'TAGS',
    subtitle: '按主题检索',
    description: '从写作、设计、工作流和生活节奏里切换主题。',
    to: '/tags',
  },
  {
    index: '03',
    title: 'ABOUT',
    subtitle: '查看身份信息',
    description: '了解作者、写作方式，以及这个静态博客的组织方式。',
    to: '/about',
  },
  {
    index: '04',
    title: 'SYSTEM',
    subtitle: '返回首页状态',
    description: '回到站点首页，重新校准阅读和导航状态。',
    to: '/home',
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
      class="home-nav-cards"
      aria-label="大路由导航"
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
