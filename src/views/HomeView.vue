<script setup lang="ts">
import { useScrollReveal } from "../lib/scrollReveal";

const { observe } = useScrollReveal();
</script>

<template>
  <section class="home-view home-landing" :ref="observe">
    <div class="home-landing-kicker">
      <span>PERSONAL BLOG</span>
      <span class="path-sep">://</span>
      <span>ONLINE</span>
    </div>

    <div class="home-landing-copy">
      <p>一个关于书写、设计与安静生活的个人角落。</p>
      <h1>记录代码、文字与长期主义实践。</h1>
      <p>从这里进入导航控制台，或通过左侧面板继续阅读归档、标签与关于页面。</p>
    </div>
  </section>
</template>
