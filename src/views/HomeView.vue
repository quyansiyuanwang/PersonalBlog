<script setup lang="ts">
import PageSectionHeader from '../components/PageSectionHeader.vue'
import PostList from '../components/PostList.vue'
import { getAllPosts } from '../lib/posts'
import { useScrollReveal } from '../lib/scrollReveal'

const posts = getAllPosts()
const { observe } = useScrollReveal()
</script>

<template>
	<div class="home-view page-stack" :ref="observe">
		<div class="reveal">
			<PageSectionHeader
				code="BLOG"
				title="文章入口"
				description="从这里进入最近的写作、归档和长期整理的文字记录。"
			/>
		</div>

		<PostList :posts="posts" />
	</div>
</template>
