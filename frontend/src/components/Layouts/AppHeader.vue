<template>
  <div class="flex border-b pr-5">
    <div class="flex items-center pl-4 pr-3 shrink-0">
      <img
        :src="logoUrl"
        alt="Svasamm CRM"
        class="h-7 w-auto select-none"
        draggable="false"
      />
    </div>
    <div id="app-header" class="flex-1"></div>
    <div class="flex items-center justify-center">
      <CallUI />
    </div>
  </div>
</template>

<script setup>
import CallUI from '@/components/Telephony/CallUI.vue'
import logoUrl from '@/svasamm/logo.svg'
</script>
