import { reactive } from 'vue'

const state = reactive({
  leadTabs: [],
  dealTabs: [],
  dealHeaderActions: [],
  sidebarItems: [],
  views: [],
  featureFlags: {},
  // Async hooks invoked when a list quick-filter changes, BEFORE the list
  // reloads. Each receives { doctype, fieldname, value, filters, setFilter }
  // and may add/remove paired filters (e.g. Distributor<->Territory cascade).
  filterHooks: [],
})

export const registry = {
  registerLeadTab(tab) {
    state.leadTabs.push(tab)
  },
  // fn: async ({ doctype, fieldname, value, filters, setFilter }) => void
  registerFilterHook(fn) {
    state.filterHooks.push(fn)
  },
  registerDealTab(tab) {
    state.dealTabs.push(tab)
  },
  // action shape: { key, component } where component receives the deal
  // document as a `deal` prop and owns all of its own display/permission logic.
  registerDealHeaderAction(action) {
    state.dealHeaderActions.push(action)
  },
  // item shape: { label, icon, to, insertAfter?, condition? }
  registerSidebarItem(item) {
    state.sidebarItems.push(item)
  },
  // view shape: { name, path, component } where component is () => import(...)
  registerView(view) {
    state.views.push(view)
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

// Run all registered filter hooks in sequence (awaits each). Called by
// ViewControls before a list reload so hooks can adjust the filters object.
export async function runFilterHooks(ctx) {
  for (const fn of state.filterHooks) {
    try {
      await fn(ctx)
    } catch (e) {
      console.error('filter hook failed', e)
    }
  }
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

// Merge built-in sidebar links with extension sidebar items, honouring an
// optional `insertAfter` anchor matched on `label`. Unknown/absent anchor ->
// appended. Items with a `condition` function are included only when it
// returns truthy.
export function applyExtensionSidebar(builtin, extItems) {
  const result = [...builtin]
  for (const item of extItems) {
    if (item.condition && !item.condition()) continue
    if (item.insertAfter) {
      const idx = result.findIndex((l) => l.label === item.insertAfter)
      if (idx >= 0) {
        result.splice(idx + 1, 0, item)
        continue
      }
    }
    result.push(item)
  }
  return result
}
