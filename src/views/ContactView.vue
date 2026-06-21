<script setup lang="ts">
import PageSectionHeader from '../components/PageSectionHeader.vue'
import MarkdownRenderer from '../components/MarkdownRenderer.vue'
import { getPageContent } from '../lib/posts'
import { useScrollReveal } from '../lib/scrollReveal'

const { observe } = useScrollReveal()
</script>

<template>
  <div class="contact-view page-stack" :ref="observe">
    <div class="reveal">
      <PageSectionHeader
        code="CONTACT"
        title="联系节点"
        description="如果你想交流实习机会、开源协作、桌面工具、前后端工程或自动化系统，可以从这里开始。"
      />
    </div>

    <div class="reveal reveal-stagger-1">
      <MarkdownRenderer :source="getPageContent('contact')" />
    </div>
  </div>
</template>
