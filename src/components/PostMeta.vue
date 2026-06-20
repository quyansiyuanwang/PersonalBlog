<script setup lang="ts">
import type { Post } from '../types/post'

defineProps<{
  post: Post
  compact?: boolean
}>()

function formatDate(value: string) {
  const [y, m, d] = value.split('-')
  return `${y} / ${m} / ${d}`
}
</script>

<template>
  <div class="post-meta" :class="{ compact }">
    <span>{{ formatDate(post.frontmatter.date) }}</span>
    <span class="path-sep">//</span>
    <span>{{ post.readingTime }} MIN</span>
    <span v-if="post.frontmatter.tags.length" class="path-sep">//</span>
    <span v-if="post.frontmatter.tags.length" class="tag-list">{{ post.frontmatter.tags.join(' #') }}</span>
  </div>
</template>
