<script setup lang="ts">
import { computed } from 'vue'
import TimelinePostList from '../components/TimelinePostList.vue'
import { getAllPosts } from '../lib/posts'
import { useScrollReveal } from '../lib/scrollReveal'

const posts = computed(() => getAllPosts())
const { observe } = useScrollReveal()
</script>

<template>
  <div class="home-view page-stack" :ref="observe">
    <TimelinePostList
      :posts="posts"
      title="ALL POSTS"
      description="按时间顺序浏览全部文章，直接进入正文。"
    />
  </div>
</template>
