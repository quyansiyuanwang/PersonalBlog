<script setup lang="ts">
import PageSectionHeader from '../components/PageSectionHeader.vue'
import MarkdownRenderer from '../components/MarkdownRenderer.vue'
import { getPortfolioContent } from '../lib/posts'
import { useScrollReveal } from '../lib/scrollReveal'

const { observe } = useScrollReveal()
</script>

<template>
  <div class="portfolio-view page-stack" :ref="observe">
    <PageSectionHeader
      code="PORTFOLIO"
      title="作品与实验"
      description="把已经成型的桌面应用、全栈系统和开源协作项目集中在这里，保留能被继续迭代的真实作品。"
    />

    <MarkdownRenderer :source="getPortfolioContent()" />
  </div>
</template>
