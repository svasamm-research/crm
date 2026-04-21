<template>
  <div class="relative flex h-full w-full justify-center">
    <div
      class="absolute left-1/2 flex -translate-x-1/2 flex-col items-center gap-3"
      :class="widthClass"
      :style="{ top: top }"
    >
      <!-- size-7.5 removed: our 400x300 illustrations need proportional rendering,
           not icon-sized (30px). h-40 gives a reasonable ~160px height;
           w-auto preserves aspect ratio; max-w-full respects parent widthClass. -->
      <img
        :src="illustration"
        :alt="`No ${props.name || 'records'} yet`"
        class="empty-state-illustration h-40 w-auto max-w-full"
      />
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
const illustration = computed(() => illustrationByName[props.name] || noLeads)

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
