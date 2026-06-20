<script setup lang="ts">
defineProps<{
  code: string
  title: string
  description?: string
}>()
</script>

<template>
  <section class="page-section-header section-heading reveal">
    <p class="eyebrow"><span class="path-sep">></span> {{ code }}</p>
    <h1 class="single-title">{{ title }}</h1>
    <p v-if="description" class="section-description">{{ description }}</p>
  </section>
</template>

<style scoped>
.page-section-header {
  display: grid;
  gap: 8px;
}

.eyebrow {
  font-family: var(--font-mono);
  text-transform: uppercase;
  letter-spacing: 0.18em;
  font-size: 0.7rem;
}

.single-title {
  margin: 10px 0 0;
  font-family: var(--font-mono);
  font-size: clamp(2.2rem, 3vw, 3.8rem);
  line-height: 1.08;
  font-weight: 500;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.section-description {
  margin: 0;
  max-width: 72ch;
  color: var(--text-muted);
  font-size: 0.98rem;
  line-height: 1.85;
}

@media (max-width: 820px) {
  .single-title {
    font-size: clamp(1.8rem, 3vw, 2.8rem);
  }
}
</style>