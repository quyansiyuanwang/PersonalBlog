<script setup lang="ts">
import PageSectionHeader from '../components/PageSectionHeader.vue'
import { useScrollReveal } from '../lib/scrollReveal'

const { observe } = useScrollReveal()

const lifeNotes = ['慢读、散步、整理房间。', '观察日常里的节奏和微小秩序。', '把生活经验写成可以回看的短笔记。']
</script>

<template>
  <div class="life-view page-stack" :ref="observe">
    <PageSectionHeader
      code="LIFE"
      title="生活片段"
      description="不只记录效率和技术，也留下阅读、生活、情绪和节奏感。"
    />

    <div class="route-feature-grid">
      <article v-for="note in lifeNotes" :key="note" class="route-feature-card reveal">
        <span>LIFE SIGNAL</span>
        <p>{{ note }}</p>
      </article>
    </div>
  </div>
</template>
