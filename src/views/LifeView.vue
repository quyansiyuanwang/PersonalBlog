<script setup lang="ts">
import PageSectionHeader from '../components/PageSectionHeader.vue'
import MarkdownRenderer from '../components/MarkdownRenderer.vue'
import { getPageContent } from '../lib/posts'
import { useScrollReveal } from '../lib/scrollReveal'

const { observe } = useScrollReveal()
</script>

<template>
  <div class="life-view page-stack" :ref="observe">
    <div class="reveal">
      <PageSectionHeader
        code="LIFE"
        title="生活片段"
        description="不只记录效率和技术，也留下阅读、生活、情绪和节奏感。"
      />
    </div>

    <div class="reveal reveal-stagger-1">
      <MarkdownRenderer :source="getPageContent('life')" />
    </div>
  </div>
</template>
