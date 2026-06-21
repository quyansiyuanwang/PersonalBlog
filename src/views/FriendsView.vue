<script setup lang="ts">
import PageSectionHeader from '../components/PageSectionHeader.vue'
import { useScrollReveal } from '../lib/scrollReveal'

const { observe } = useScrollReveal()

const friends = [
  { name: 'Quiet Node', note: '安静写作与长期观察。' },
  { name: 'Design Signal', note: '界面、字体和视觉系统。' },
  { name: 'Archive Relay', note: '内容索引与个人知识库。' },
]
</script>

<template>
  <div class="friends-view page-stack" :ref="observe">
    <PageSectionHeader
      code="FRIENDS"
      title="友链中继"
      description="这里预留给值得长期阅读、互相引用和交换灵感的站点。"
    />

    <div class="route-feature-grid">
      <article v-for="friend in friends" :key="friend.name" class="route-feature-card reveal">
        <span>FRIEND LINK</span>
        <h2>{{ friend.name }}</h2>
        <p>{{ friend.note }}</p>
      </article>
    </div>
  </div>
</template>
