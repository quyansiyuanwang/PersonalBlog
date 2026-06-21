<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import MarkdownRenderer from '../components/MarkdownRenderer.vue'
import PostList from '../components/PostList.vue'
import PostMeta from '../components/PostMeta.vue'
import { getPostBySlug, getRelatedPosts } from '../lib/posts'
import { useScrollReveal } from '../lib/scrollReveal'
import { useScrollSpy } from '../lib/scrollSpy'
import { clearTocData, setTocData } from '../lib/tocKey'

const route = useRoute()

const post = computed(() => getPostBySlug(String(route.params.slug ?? '')))
const relatedPosts = computed(() => (post.value ? getRelatedPosts(post.value.slug) : []))

const { observe } = useScrollReveal()

const rendererRef = ref<InstanceType<typeof MarkdownRenderer> | null>(null)

// Directly read the exposed headings ref from the renderer, reactive all the way down
const headings = computed(() => {
  return rendererRef.value?.headings ?? []
})

const { activeId } = useScrollSpy(headings)

watch([headings, activeId], ([nextHeadings, nextActiveId]) => {
  setTocData(nextHeadings, nextActiveId)
}, { immediate: true })

onUnmounted(() => {
  clearTocData()
})
</script>

<template>
  <article v-if="post" class="post-detail page-stack" :ref="observe">
    <header class="article-header reveal">
      <div class="article-headline-row">
        <p class="eyebrow"><span class="path-sep">></span> ESSAY <span class="path-sep">://</span> {{ post.slug }}</p>
        <PostMeta :post="post" class="article-meta-top" />
      </div>
      <h1>{{ post.frontmatter.title }}</h1>
      <p class="article-summary">{{ post.frontmatter.summary }}</p>
      <div v-if="post.frontmatter.tags.length" class="tag-row">
        <RouterLink v-for="tag in post.frontmatter.tags" :key="tag" class="tag-link" :to="`/tags/${encodeURIComponent(tag)}`">
          # {{ tag }}
        </RouterLink>
      </div>
    </header>

    <div class="reveal reveal-stagger-1">
      <MarkdownRenderer ref="rendererRef" :source="post.content" />
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
