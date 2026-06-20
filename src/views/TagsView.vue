<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import PageSectionHeader from '../components/PageSectionHeader.vue'
import TimelinePostList from '../components/TimelinePostList.vue'
import { getPostsByTag, getTagMap } from '../lib/posts'
import { useScrollReveal } from '../lib/scrollReveal'

const route = useRoute()

const tagMap = computed(() => getTagMap())
const tags = computed(() => Object.entries(tagMap.value).sort(([left], [right]) => left.localeCompare(right, 'zh-CN')))
const selectedTag = computed(() => {
  const tag = route.params.tag
  return typeof tag === 'string' ? decodeURIComponent(tag) : ''
})
const selectedPosts = computed(() => (selectedTag.value ? getPostsByTag(selectedTag.value) : []))

const { observe } = useScrollReveal()
</script>

<template>
  <div class="tags-view page-stack" :ref="observe">
    <PageSectionHeader
      code="TAGS"
      title="按标签整理主题"
      description="把文章按主题折叠起来，方便在不同兴趣之间来回切换。"
    />

    <section class="tag-cloud-panel reveal">
      <RouterLink
        v-for="[tag, posts] in tags"
        :key="tag"
        :to="`/tags/${encodeURIComponent(tag)}`"
        class="tag-cloud-item reveal"
        :class="{ active: selectedTag === tag }"
      >
        <span># {{ tag }}</span>
        <em>{{ posts.length }}</em>
      </RouterLink>
    </section>

    <TimelinePostList
      v-if="selectedTag"
      :posts="selectedPosts"
      :title="`# ${selectedTag}`"
      :description="`按时间线查看与 ${selectedTag} 相关的文章。`"
    />

    <el-empty v-else description="选择一个标签，浏览对应的文章集合。" />
  </div>
</template>

<style scoped>
.tag-cloud-panel {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag-cloud-item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  font-family: var(--font-mono);
  font-size: 0.78rem;
  letter-spacing: 0.04em;
  border: 1px solid var(--line);
  border-radius: 999px;
  color: var(--text-muted);
  transition: border-color 0.2s ease, color 0.2s ease, background 0.2s ease, transform 0.25s ease;
}

.tag-cloud-item:hover {
  border-color: var(--accent);
  color: var(--text-main);
  transform: scale(1.04);
}

.tag-cloud-item.active {
  border-color: var(--accent);
  background: var(--accent-soft);
  color: var(--accent);
}
</style>
