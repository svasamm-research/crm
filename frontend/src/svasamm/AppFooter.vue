<template>
  <footer class="svasamm-footer">
    <span>© Svasamm Research · Powered by Svasamm CRM · </span>
    <a :href="sourceUrl" target="_blank" rel="noopener">source available</a>
  </footer>
</template>

<script setup>
// Source URL per the Task 0.4 decision doc (GitHub Releases).
// If counsel later requires an auth-free tarball endpoint, change the
// sourceUrl below and cut a new patch release.
const sourceUrl = 'https://github.com/svasamm-research/crm/releases'
</script>

<style scoped>
.svasamm-footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 0.5rem 1rem;
  font-size: 0.75rem;
  color: var(--text-muted, #6b7280);
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(4px);
  text-align: center;
  z-index: 50;
  border-top: 1px solid var(--border, #e5e7eb);
}
.svasamm-footer a {
  color: var(--p-600);
  text-decoration: underline;
}
</style>
