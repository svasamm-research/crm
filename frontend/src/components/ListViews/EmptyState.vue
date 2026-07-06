<template>
  <div class="relative flex h-full w-full justify-center">
    <div
      class="absolute left-1/2 flex -translate-x-1/2 flex-col items-center gap-3"
      :class="widthClass"
      :style="{ top: top }"
    >
      <!-- When a recognized illustration exists, render it as an image.
           Otherwise render the passed icon (a VNode or component) inside a
           subtle circle so Visits, Calls, etc. show a relevant icon instead
           of the generic sales-funnel fallback. -->
      <img
        v-if="illustration"
        :src="illustration"
        :alt="`No ${props.name || 'records'} yet`"
        class="empty-state-illustration h-40 w-auto max-w-full"
      />
      <div
        v-else
        class="flex h-24 w-24 items-center justify-center rounded-full bg-surface-gray-2"
      >
        <component :is="props.icon" class="h-10 w-10 text-ink-gray-4" />
      </div>
      <div class="flex flex-col items-center gap-1">
        <span class="text-lg font-medium text-ink-gray-8">
          {{ computedTitle }}
        </span>
        <span class="text-center text-p-base text-ink-gray-6">
          {{ computedDescription }}
        </span>
      </div>
    </div>
  </div>
</template>
<script setup>
import Icon from '@/components/Icon.vue'
import { computed } from 'vue'
import noLeads from '@/svasamm/illustrations/no_leads.svg'
import noDeals from '@/svasamm/illustrations/no_deals.svg'
import noTasks from '@/svasamm/illustrations/no_tasks.svg'
import noContacts from '@/svasamm/illustrations/no_contacts.svg'
import noOrganizations from '@/svasamm/illustrations/no_organizations.svg'
import noNotes from '@/svasamm/illustrations/no_notes.svg'
import noCallLogs from '@/svasamm/illustrations/no_call_logs.svg'

const props = defineProps({
  name: { type: String, required: true },
  title: { type: String, default: '' },
  description: { type: String, default: '' },
  icon: {
    type: [String, Object],
    default: 'file-text',
  },
  top: { type: String, default: '35%' },
  width: { type: String, default: 'md' },
})

const computedTitle = computed(() => {
  return props.title ? props.title : __('No {0} Found', [__(props.name)])
})

const computedDescription = computed(() => {
  if (props.description) return props.description
  return __('Nothing here yet. Create your first {0} to get started.', [
    __(props.name),
  ])
})

// Map list-view name (passed by each page as the `name` prop) to its
// Svasamm illustration. Fallback to noLeads only if a caller passes an
// unrecognised name — every current upstream list view is covered below.
const illustrationByName = {
  Leads: noLeads,
  Deals: noDeals,
  Tasks: noTasks,
  Contacts: noContacts,
  Organizations: noOrganizations,
  Notes: noNotes,
  'Call Logs': noCallLogs,
}
// Returns null for unrecognised names so the template falls back to the icon path.
const illustration = computed(() => illustrationByName[props.name] ?? null)

const widthClass = computed(() => {
  switch (props.width) {
    case 'sm':
      return 'w-2/12'
    case 'lg':
      return 'w-8/12'
    default:
      return 'w-4/12'
  }
})
</script>
