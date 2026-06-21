<script setup lang="ts">
import PageSectionHeader from '../components/PageSectionHeader.vue'
import { useScrollReveal } from '../lib/scrollReveal'

const { observe } = useScrollReveal()

const contactItems = [
  { label: 'Mail', value: 'quyansiyuanwang@qq.com' },
  { label: 'GitHub', value: 'github.com/quyansiyuanwang' },
  { label: 'Target', value: '前端 / 后端 / 全栈实习生，杭州及周边或远程协作。' },
]
</script>

<template>
  <div class="contact-view page-stack" :ref="observe">
    <PageSectionHeader
      code="CONTACT"
      title="联系节点"
      description="如果你想交流实习机会、开源协作、桌面工具、前后端工程或自动化系统，可以从这里开始。"
    />

    <div class="route-feature-list">
      <article v-for="item in contactItems" :key="item.label" class="route-feature-row reveal">
        <span>{{ item.label }}</span>
        <p>{{ item.value }}</p>
      </article>
    </div>
  </div>
</template>
