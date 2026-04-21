<template>
  <div class="flex h-screen w-screen">
    <MobileSidebar />
    <div class="flex h-full flex-1 flex-col overflow-auto bg-surface-white">
      <MobileAppHeader />
      <slot />
    </div>
    <GlobalModals />
    <!-- AppFooter removed from the persistent layout. AGPL source-offer
         now lives only inside the About modal (AboutModal.vue). -->
  </div>
</template>
<script setup>
import MobileSidebar from '@/components/Mobile/MobileSidebar.vue'
import MobileAppHeader from '@/components/Mobile/MobileAppHeader.vue'
import GlobalModals from '@/components/Modals/GlobalModals.vue'
</script>
