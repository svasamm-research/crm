<template>
  <Dialog v-model="show" :options="{ size: 'sm' }">
    <template #body>
      <div class="p-4 pt-5">
        <div class="flex justify-center">
          <div class="flex flex-col items-center">
            <img :src="logoUrl" alt="Svasamm CRM" class="mb-3 h-10" />
            <h3 class="font-semibold text-xl text-ink-gray-9">Svasamm CRM</h3>
          </div>
        </div>
        <hr class="border-t my-3 mx-2" />
        <div>
          <a
            v-for="link in links"
            :key="link.label"
            class="flex py-2 px-2 hover:bg-surface-gray-1 rounded cursor-pointer"
            target="_blank"
            :href="link.url"
          >
            <component
              :is="link.icon"
              v-if="link.icon"
              class="size-4 mr-2 text-ink-gray-7"
            />
            <span class="text-base text-ink-gray-8">
              {{ link.label }}
            </span>
          </a>
        </div>
        <hr class="border-t my-3 mx-2" />
        <p class="text-sm text-ink-gray-6 px-2 mt-2">
          © Svasamm Research Pvt. Ltd. and contributors.
        </p>
        <p class="text-sm text-ink-gray-6 px-2 mt-1">
          Built on Frappe CRM — © Frappe Technologies Pvt. Ltd. and
          contributors.
        </p>
        <p class="text-sm text-ink-gray-6 px-2 mt-2">
          <a
            href="https://github.com/svasamm-research/crm/releases"
            target="_blank"
            rel="noopener"
            class="underline text-ink-gray-7 hover:text-ink-gray-9"
          >
            {{ __('Source available') }}
          </a>
          — {{ __('AGPL §13 compliance (Svasamm fork)') }}
        </p>
      </div>
    </template>
  </Dialog>
</template>
<script setup>
// TODO: replace with https://docs.svasamm.com/crm once that exists
import logoUrl from '@/svasamm/logo.svg'
import LucideGlobe from '~icons/lucide/globe'
import LucideGitHub from '~icons/lucide/github'
import LucideBookOpen from '~icons/lucide/book-open'
import LucideHeadset from '~icons/lucide/headset'

let show = defineModel({ type: Boolean })

let links = [
  {
    label: __('Website'),
    url: 'https://svasamm.com',
    icon: LucideGlobe,
  },
  {
    label: __('GitHub Repository'),
    url: 'https://github.com/svasamm-research/crm',
    icon: LucideGitHub,
  },
  {
    label: __('Documentation'),
    url: 'https://github.com/svasamm-research/crm#readme',
    icon: LucideBookOpen,
  },
  {
    label: __('Contact Support'),
    url: 'mailto:support@svasamm.com',
    icon: LucideHeadset,
  },
]
</script>
