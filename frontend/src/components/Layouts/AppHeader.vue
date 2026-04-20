<template>
  <div class="flex border-b pr-5">
    <!-- Svasamm brand block intentionally removed from the main-content header.
         Sidebar already carries the CRM product identity (CRMLogo + app-switcher).
         The per-page breadcrumb rendered via #app-header is context enough. -->
    <div id="app-header" class="flex-1"></div>
    <div class="flex items-center justify-center">
      <CallUI />
    </div>
  </div>
</template>

<script setup>
import CallUI from '@/components/Telephony/CallUI.vue'
</script>
