<!--
  Svasamm shadow of frappe-ui/frappe/Help/HelpModal.vue.

  Purpose: the upstream component renders a "Help centre" footer link that
  we don't want in Svasamm CRM — it would send users to the frappe-ui help
  center which ships with frappe/crm's docs link, not Svasamm's. Our version
  mirrors the upstream layout but strips the footerItems list entirely, so
  the modal shows only the Getting Started steps (and closes cleanly via X).

  When upstream HelpModal.vue evolves, diff this file against it and port
  structural changes. Keep the footerItems removal as our Svasamm delta.
-->
<template>
  <div
    v-show="show"
    class="fixed z-50 right-0 w-80 h-[calc(100%_-_80px)] text-ink-gray-9 m-5 mt-[62px] p-3 flex gap-2 flex-col justify-between rounded-lg bg-surface-modal shadow-2xl"
    :class="{ 'top-[calc(100%_-_120px)] border': minimize }"
    @click.stop
  >
    <div class="flex items-center justify-between px-2 py-1.5">
      <div class="text-base font-medium">
        {{ headingTitle }}
      </div>
      <div class="flex gap-1">
        <Button @click="minimize = !minimize" variant="ghost">
          <!-- FeatherIcon substitutes for frappe-ui's internal Minimize/Maximize
               icons (which aren't in the barrel export). 'chevrons-down' when
               expanded = click to minimize; 'chevrons-up' when minimized = click
               to restore. -->
          <FeatherIcon
            :name="minimize ? 'chevrons-up' : 'chevrons-down'"
            class="h-3.5"
          />
        </Button>
        <Button variant="ghost" @click="show = false">
          <FeatherIcon name="x" class="h-3.5" />
        </Button>
      </div>
    </div>
    <div class="h-full overflow-hidden flex flex-col">
      <OnboardingSteps
        v-if="!isOnboardingStepsCompleted"
        :title="title"
        :logo="logo"
        :afterSkip="afterSkip"
        :afterSkipAll="afterSkipAll"
        :afterReset="afterReset"
        :afterResetAll="afterResetAll"
        :appName="appName"
      />
    </div>
    <!-- Svasamm delta: no footerItems. Upstream had a "Help centre" link here
         that we intentionally omit. -->
  </div>
</template>
<script setup>
// Barrel imports only — subpath imports into frappe-ui break Vite module
// resolution (the package's exports field restricts deep paths).
import { FeatherIcon, Button } from 'frappe-ui'
import { OnboardingSteps, useOnboarding, minimize } from 'frappe-ui/frappe'
import { computed } from 'vue'

const props = defineProps({
  appName: {
    type: String,
    default: 'frappecrm',
  },
  title: {
    type: String,
    default: 'Svasamm CRM',
  },
  logo: {
    type: Object,
    required: true,
  },
  afterSkip: {
    type: Function,
    default: () => {},
  },
  afterSkipAll: {
    type: Function,
    default: () => {},
  },
  afterReset: {
    type: Function,
    default: () => {},
  },
  afterResetAll: {
    type: Function,
    default: () => {},
  },
})

const { isOnboardingStepsCompleted } = useOnboarding(props.appName)

const show = defineModel()

const headingTitle = computed(() => {
  return 'Getting started'
})
</script>
