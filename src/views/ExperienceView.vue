<script setup lang="ts">
import PageSectionHeader from '../components/PageSectionHeader.vue'
import MarkdownRenderer from '../components/MarkdownRenderer.vue'
import { getPageContent } from '../lib/posts'
import { useScrollReveal } from '../lib/scrollReveal'

const { observe } = useScrollReveal()
</script>

<template>
  <div class="experience-view page-stack" :ref="observe">
    <div class="reveal">
      <PageSectionHeader
        code="EXPERIENCE"
        title="经验轨迹"
        description="从开源协作、桌面工具、全栈系统到工程化交付，整理已经验证过的技术路径。"
      />
    </div>

    <div class="reveal reveal-stagger-1">
      <MarkdownRenderer :source="getPageContent('experience')" />
    </div>
  </div>
</template>
