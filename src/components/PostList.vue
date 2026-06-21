<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import type { Post } from '../types/post'
import PostMeta from './PostMeta.vue'
import { useScrollReveal } from '../lib/scrollReveal'

const props = defineProps<{
  posts: Post[]
  title?: string
  description?: string
}>()

const hasPosts = computed(() => props.posts.length > 0)
const { observe } = useScrollReveal()
</script>

<template>
  <section class="post-list-block" :ref="observe">
    <div v-if="hasPosts" class="post-list">
      <article
        v-for="(post, index) in posts"
        :key="post.slug"
        class="post-card reveal"
        :class="[`reveal-stagger-${Math.min(index + 1, 6)}`]"
      >
        <RouterLink class="post-link" :to="`/post/${post.slug}`">
          <div class="post-card-topline">
            <span class="post-chip">[TASK-{{ String(index + 1).padStart(4, '0') }}]</span>
            <span class="post-slug">[STATUS <span class="path-sep">://</span> READ]</span>
            <PostMeta :post="post" class="post-card-meta" />
          </div>
          <h2>{{ post.frontmatter.title }}</h2>
          <p class="post-summary">{{ post.frontmatter.summary }}</p>
          <div v-if="post.frontmatter.tags.length" class="tag-row post-card-tags">
            <span
              v-for="tag in post.frontmatter.tags"
              :key="tag"
              class="tag-link static-tag"
            >
              # {{ tag }}
            </span>
          </div>
        </RouterLink>
      </article>
    </div>

    <el-empty v-else description="[SYS] 还没有文章，先写下第一篇吧。" />
  </section>
</template>
