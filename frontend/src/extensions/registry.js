import { reactive } from 'vue'

const state = reactive({
  leadTabs: [],
  dealTabs: [],
  featureFlags: {},
})

export const registry = {
  registerLeadTab(tab) {
    state.leadTabs.push(tab)
  },
  registerDealTab(tab) {
    state.dealTabs.push(tab)
  },
  setFeatureFlag(key, value) {
    state.featureFlags[key] = value
  },
  getFeatureFlag(key) {
    return state.featureFlags[key]
  },
}

export function useExtensions() {
  return state
}

// Merge built-in tabs with extension tabs, honouring an optional
// `insertAfter` anchor (tab name). Unknown/absent anchor -> appended.
export function applyExtensionTabs(builtin, extTabs) {
  const result = [...builtin]
  for (const tab of extTabs) {
    if (tab.insertAfter) {
      const idx = result.findIndex((t) => t.name === tab.insertAfter)
      if (idx >= 0) {
        result.splice(idx + 1, 0, tab)
        continue
      }
    }
    result.push(tab)
  }
  return result
}
