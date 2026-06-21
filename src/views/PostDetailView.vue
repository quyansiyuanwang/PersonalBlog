<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import ChunkedMarkdownRenderer from '../components/ChunkedMarkdownRenderer.vue'
import PostList from '../components/PostList.vue'
import PostMeta from '../components/PostMeta.vue'
import type { PostDetail } from '../types/post'
import { getNextPost, getPostBySlug, getRelatedPosts, loadPostBySlug, prefetchPostBySlug } from '../lib/posts'
import { useScrollReveal } from '../lib/scrollReveal'
import { useScrollSpy } from '../lib/scrollSpy'
import { clearTocData, setTocData } from '../lib/tocKey'

const route = useRoute()

const postMeta = computed(() => getPostBySlug(String(route.params.slug ?? '')))
const post = ref<PostDetail | null>(null)
const postLoading = ref(false)
const relatedPosts = computed(() => (postMeta.value ? getRelatedPosts(postMeta.value.slug) : []))
const nextPost = computed(() => (postMeta.value ? getNextPost(postMeta.value.slug) : null))

const { observe } = useScrollReveal()

const rendererRef = ref<InstanceType<typeof ChunkedMarkdownRenderer> | null>(null)

// Directly read the exposed headings ref from the renderer, reactive all the way down
const headings = computed(() => {
  return rendererRef.value?.headings ?? []
})

const { activeId } = useScrollSpy(headings)

async function hydratePost() {
  const slug = String(route.params.slug ?? '')
  post.value = null

  if (!slug) {
    return
  }

  postLoading.value = true

  try {
    post.value = await loadPostBySlug(slug)

    if (post.value && nextPost.value && typeof window !== 'undefined') {
      const idleWindow = window as Window & {
        requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number
      }

      const prefetch = () => {
        prefetchPostBySlug(nextPost.value!.slug)
      }

      if (typeof idleWindow.requestIdleCallback === 'function') {
        idleWindow.requestIdleCallback(prefetch, { timeout: 1200 })
      } else {
        window.setTimeout(prefetch, 280)
      }
    }
  } finally {
    postLoading.value = false
  }
}

watch([headings, activeId], ([nextHeadings, nextActiveId]) => {
  setTocData(nextHeadings, nextActiveId)
}, { immediate: true })

watch(() => route.params.slug, () => {
  hydratePost()
}, { immediate: true })

onUnmounted(() => {
  clearTocData()
})
</script>

<template>
  <article v-if="postMeta" class="post-detail page-stack" :ref="observe">
    <header class="article-header reveal">
      <div class="article-headline-row">
        <p class="eyebrow"><span class="path-sep">></span> ESSAY <span class="path-sep">://</span> {{ postMeta.slug }}</p>
        <PostMeta :post="postMeta" class="article-meta-top" />
      </div>
      <h1>{{ postMeta.frontmatter.title }}</h1>
      <p class="article-summary">{{ postMeta.frontmatter.summary }}</p>
      <div v-if="postMeta.frontmatter.tags.length" class="tag-row">
        <RouterLink v-for="tag in postMeta.frontmatter.tags" :key="tag" class="tag-link" :to="`/tags/${encodeURIComponent(tag)}`">
          # {{ tag }}
        </RouterLink>
      </div>
    </header>

    <div v-if="postLoading" class="post-loading reveal reveal-stagger-1">Loading article...</div>
    <div v-else-if="post" class="reveal reveal-stagger-1">
      <ChunkedMarkdownRenderer ref="rendererRef" :source="post.content" />
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

<style scoped>
.article-headline-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.article-meta-top {
  flex-shrink: 0;
}

@media (max-width: 720px) {
  .article-headline-row {
    flex-direction: column;
  }
}
</style>
