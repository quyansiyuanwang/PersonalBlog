<script setup lang="ts">
import { computed } from 'vue'
import PageSectionHeader from '../components/PageSectionHeader.vue'
import PostMeta from '../components/PostMeta.vue'
import { getArchiveGroups } from '../lib/posts'
import { useScrollReveal } from '../lib/scrollReveal'

const groups = computed(() => getArchiveGroups())
const { observe } = useScrollReveal()
</script>

<template>
  <div class="archive-view page-stack" :ref="observe">
    <PageSectionHeader
      code="ARCHIVE"
      title="按年份归档"
      description="在这里回看每一年留下的记录，保持清晰，不堆叠噪音。"
    />

    <div class="archive-groups">
      <section v-for="group in groups" :key="group.year" class="archive-group reveal" :class="[`reveal-stagger-${Math.min(groups.indexOf(group) + 1, 6)}`]">
        <div class="archive-year">{{ group.year }}</div>
        <div class="archive-posts">
          <RouterLink v-for="post in group.posts" :key="post.slug" :to="`/post/${post.slug}`" class="archive-item">
            <div>
              <h2>{{ post.frontmatter.title }}</h2>
              <p>{{ post.frontmatter.summary }}</p>
              <div v-if="post.frontmatter.tags.length" class="tag-row archive-tag-row">
                <span
                  v-for="tag in post.frontmatter.tags"
                  :key="tag"
                  class="tag-link static-tag"
                ># {{ tag }}</span>
              </div>
            </div>
            <PostMeta :post="post" compact />
          </RouterLink>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.archive-groups {
  display: grid;
  gap: 20px;
}

.archive-group {
  display: grid;
  grid-template-columns: 100px minmax(0, 1fr);
  gap: 16px;
}

.archive-year {
  padding-top: 14px;
  font-family: var(--font-mono);
  font-size: 1.2rem;
  letter-spacing: 0.04em;
  color: var(--accent);
}

.archive-posts {
  display: grid;
  gap: 0;
}

.archive-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 20px;
  border: 1px solid var(--line);
  border-bottom: 0;
  border-radius: 6px;
  transition: background 0.2s ease;
}

.archive-item:last-child {
  border-bottom: 1px solid var(--accent-soft);
}

.archive-item:hover {
  background: var(--surface);
}

.archive-item :deep(h2) {
  margin: 0 0 4px;
  font-size: 1.2rem;
  font-weight: 500;
  line-height: 1.22;
}

.archive-item :deep(p) {
  margin: 0;
  font-size: 0.85rem;
}

.archive-tag-row {
  margin-top: 10px;
}

@media (max-width: 820px) {
  .archive-group {
    grid-template-columns: 1fr;
  }

  .archive-item {
    align-items: flex-start;
    flex-direction: column;
  }

  .archive-item :deep(h2) {
    font-size: 1.3rem;
  }
}
</style>
