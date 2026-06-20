<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import MarkdownRenderer from '../components/MarkdownRenderer.vue'
import PostList from '../components/PostList.vue'
import PostMeta from '../components/PostMeta.vue'
import { getPostBySlug, getRelatedPosts } from '../lib/posts'
import { useScrollReveal } from '../lib/scrollReveal'

const route = useRoute()

const post = computed(() => getPostBySlug(String(route.params.slug ?? '')))
const relatedPosts = computed(() => (post.value ? getRelatedPosts(post.value.slug) : []))

const { observe } = useScrollReveal()
</script>

<template>
  <article v-if="post" class="post-detail page-stack" :ref="observe">
    <header class="article-header reveal">
      <p class="eyebrow"><span class="path-sep">></span> ESSAY <span class="path-sep">://</span> {{ post.slug }}</p>
      <h1>{{ post.frontmatter.title }}</h1>
      <p class="article-summary">{{ post.frontmatter.summary }}</p>
      <PostMeta :post="post" />
      <div v-if="post.frontmatter.tags.length" class="tag-row">
        <RouterLink v-for="tag in post.frontmatter.tags" :key="tag" class="tag-link" :to="`/tags/${encodeURIComponent(tag)}`">
          # {{ tag }}
        </RouterLink>
      </div>
    </header>

    <div class="reveal reveal-stagger-1">
      <MarkdownRenderer :source="post.content" />
    </div>

    <PostList
      v-if="relatedPosts.length"
      :posts="relatedPosts"
      title="RELATED"
      description="如果你喜欢这篇文章，也许会想继续读这几篇。"
    />
  </article>

  <el-result
    v-else
    icon="warning"
    title="文章不存在"
    sub-title="这个链接可能已经失效，或者这篇文章还没有被发布。"
  >
    <template #extra>
      <RouterLink class="ghost-link" to="/">返回首页</RouterLink>
    </template>
  </el-result>
</template>
