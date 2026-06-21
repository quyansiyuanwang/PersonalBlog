<script setup lang="ts">
import PageSectionHeader from '../components/PageSectionHeader.vue'
import MarkdownRenderer from '../components/MarkdownRenderer.vue'
import { getPageContent } from '../lib/posts'
import { useScrollReveal } from '../lib/scrollReveal'

const { observe } = useScrollReveal()
</script>

<template>
  <div class="friends-view page-stack" :ref="observe">
    <PageSectionHeader
      code="FRIENDS"
      title="友链中继"
      description="这里预留给值得长期阅读、互相引用和交换灵感的站点。"
    />

    <MarkdownRenderer :source="getPageContent('friends')" />
  </div>
</template>
