<script setup lang="ts">
import PageSectionHeader from '../components/PageSectionHeader.vue'
import MarkdownRenderer from '../components/MarkdownRenderer.vue'
import { getAboutContent } from '../lib/posts'
import { useScrollReveal } from '../lib/scrollReveal'

const { observe } = useScrollReveal()
</script>

<template>
  <div class="about-view page-stack" :ref="observe">
    <PageSectionHeader
      code="ABOUT"
      title="关于这个站点"
      description="一个由 Markdown 驱动的小型个人博客，也是一份关于长期写作的实验。"
    />

    <MarkdownRenderer :source="getAboutContent()" />
  </div>
</template>
