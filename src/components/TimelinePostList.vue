<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import type { Post } from '../types/post'

const props = defineProps<{
  posts: Post[]
  title?: string
  description?: string
}>()

const hasPosts = computed(() => props.posts.length > 0)

function formatTimelineDate(value: string) {
  const [year, month, day] = value.split('-')
  return {
    year,
    point: `${month}.${day}`,
  }
}
</script>

<template>
  <section v-if="hasPosts" class="tag-timeline">
    <div class="tag-timeline-list">
      <article
        v-for="post in posts"
        :key="post.slug"
        class="tag-timeline-item"
      >
        <div class="tag-timeline-marker" aria-hidden="true">
          <span class="tag-timeline-year">{{ formatTimelineDate(post.frontmatter.date).year }}</span>
          <span class="tag-timeline-dot"></span>
          <span class="tag-timeline-point">{{ formatTimelineDate(post.frontmatter.date).point }}</span>
        </div>

        <RouterLink class="tag-timeline-card" :to="`/post/${post.slug}`">
          <div class="tag-timeline-meta">
            <span>{{ post.frontmatter.date.replace(/-/g, ' / ') }}</span>
            <span v-if="post.frontmatter.tags.length" class="path-sep">//</span>
            <span v-if="post.frontmatter.tags.length">{{ post.frontmatter.tags.join(' #') }}</span>
          </div>
          <h3>{{ post.frontmatter.title }}</h3>
          <p>{{ post.frontmatter.summary }}</p>
        </RouterLink>
      </article>
    </div>
  </section>

  <el-empty v-else description="选择一个标签，浏览对应的文章集合。" />
</template>

<style scoped>
.tag-timeline {
  display: grid;
  gap: 28px;
}

.tag-timeline-list {
  position: relative;
  display: grid;
  gap: 22px;
  padding-left: 0;
}

.tag-timeline-list::before {
  content: '';
  position: absolute;
  left: 96px;
  top: 0;
  bottom: 0;
  width: 1px;
  background: linear-gradient(180deg, var(--accent), color-mix(in srgb, var(--accent) 18%, transparent));
  opacity: 0.4;
}

.tag-timeline-item {
  position: relative;
  display: grid;
  grid-template-columns: 124px minmax(0, 1fr);
  gap: 24px;
  align-items: start;
}

.tag-timeline-marker {
  position: relative;
  display: grid;
  justify-items: start;
  gap: 10px;
  padding-top: 2px;
}

.tag-timeline-year,
.tag-timeline-point {
  font-family: var(--font-mono);
  font-size: 0.76rem;
  letter-spacing: 0.12em;
  color: var(--text-muted);
}

.tag-timeline-year {
  color: var(--accent);
}

.tag-timeline-dot {
  position: absolute;
  left: 97px;
  top: 32px;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 0 6px color-mix(in srgb, var(--accent) 14%, transparent);
  transform: translateX(-50%);
}

.tag-timeline-card {
  display: grid;
  gap: 12px;
  padding: 18px 20px;
  border: 1px solid var(--line);
  border-radius: 22px;
  background: color-mix(in srgb, var(--surface-strong) 76%, transparent);
  transition: border-color 0.22s ease, transform 0.26s ease, box-shadow 0.26s ease, background 0.22s ease;
}

.tag-timeline-card:hover {
  border-color: var(--accent);
  transform: translateX(6px);
  box-shadow: 0 16px 34px rgba(0, 0, 0, 0.08);
  background: color-mix(in srgb, var(--surface-strong) 88%, transparent);
}

.tag-timeline-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  font-family: var(--font-mono);
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  color: var(--text-muted);
}

.tag-timeline-card h3 {
  margin: 0;
  font-size: 1.18rem;
  line-height: 1.35;
}

.tag-timeline-card p {
  margin: 0;
  color: var(--text-muted);
}
</style>