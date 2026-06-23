# CRM Layering Foundation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a build-time extension mechanism to the Svasamm CRM fork so a sibling Frappe app (`videojet_crm_override`) can contribute Vue tabs and feature flags into the CRM SPA, then move the existing Products tab and Getting-Started hide off interleaved core files into that override.

**Architecture:** A Vite plugin emits a virtual module that statically imports every sibling app's `frontend/src/crm_overrides/index.js`; each calls `register(registry)` against a reactive singleton. Base components (Lead/Deal tabs, Activities content, AppSidebar onboarding) read the registry. The override app is present in the Videojet image and absent from a standalone build, so its code is excluded with zero runtime config.

**Tech Stack:** Vue 3, Vite, frappe-ui, Frappe v16 (Python app scaffold), frappe_docker layered build.

## Global Constraints

- Default feature-flag semantics: **unset = upstream behaviour** (e.g. Getting Started shown). Only an explicit `false` hides it.
- A build with `videojet_crm_override` **absent** must produce a clean bundle with no override code and no error (standalone CRM).
- Override Vue components compile inside the CRM frontend build, so they import base components via the `@` alias (`@` = `apps/crm/frontend/src`).
- No `Co-Authored-By` / WOZCODE footer in commits. No emojis.
- No hanging test data; realistic names only (no `_Test_*`).
- Do **not** push or open PRs without explicit approval. Work on branch `feat/crm-layering-foundation` (crm fork) already created.
- **Task 2 is a hard gate** (the de-risk spike). If cross-app bundling fails, do NOT proceed to Task 3; apply the fallback ladder in §"Task 2 fallback" and report.

---

## File Structure

**crm fork (`apps/crm`):**
- Create `frontend/build/crm-overrides-plugin.js` — Vite plugin: scans sibling apps, emits `virtual:crm-overrides`.
- Create `frontend/src/extensions/registry.js` — reactive registry singleton + `applyExtensionTabs` helper.
- Modify `frontend/vite.config.js` — register the plugin; widen `server.fs.allow` to the bench apps dir.
- Modify `frontend/src/main.js` — `import 'virtual:crm-overrides'`.
- Modify `frontend/src/pages/Lead.vue`, `frontend/src/pages/Deal.vue` — drop hardcoded Products tab; append registry lead/deal tabs.
- Modify `frontend/src/components/Activities/Activities.vue` — render registered tab component generically; drop ProductsArea import + branch.
- Modify `frontend/src/components/Activities/ActivityHeader.vue` — hide header for registered tabs that ask; drop hardcoded `'Products'`.
- Modify `frontend/src/components/Layouts/AppSidebar.vue` — gate Getting Started on the `gettingStarted` flag.
- Delete `frontend/src/components/Activities/ProductsArea.vue` (moved to the override).

**new app (`apps/videojet_crm_override`):**
- Create the Frappe app (`bench new-app`).
- Create `frontend/src/crm_overrides/index.js` — `register(registry)`.
- Create `frontend/src/crm_overrides/ProductsTab.vue` — moved from `ProductsArea.vue`.

**frappe_docker (separate repo, `svasamm/base`):**
- Modify `apps/dms-uat.json` — add `videojet_crm_override`.

---

### Task 1: Scaffold `videojet_crm_override` with a smoke override

**Files:**
- Create: `apps/videojet_crm_override/` (via `bench new-app`)
- Create: `apps/videojet_crm_override/frontend/src/crm_overrides/index.js`

**Interfaces:**
- Produces: `apps/videojet_crm_override/frontend/src/crm_overrides/index.js` exporting `register(registry)` that calls `registry.registerLeadTab`, `registry.registerDealTab`, `registry.setFeatureFlag` (signatures defined in Task 2).

- [ ] **Step 1: Create the app and install it on the local bench**

Run (from bench root `/Users/mithunksingh/Projects/local-videojet-bench`):
```bash
bench new-app videojet_crm_override
bench --site videojet.localhost install-app videojet_crm_override
```
`bench new-app` is interactive — answer: App Title `Videojet CRM Override`, Publisher `Svasamm Research`, Email `mithun@svasamm.com`, License `MIT` (or as standard for the org). It git-inits the app by default.
Expected: app created under `apps/videojet_crm_override`, installed without error.

- [ ] **Step 2: Add the smoke override entrypoint**

Create `apps/videojet_crm_override/frontend/src/crm_overrides/index.js`:
```js
// Smoke override — proves the cross-app mechanism end to end.
// Replaced by the real Products tab (Task 5) and Getting-Started flag (Task 6).
export function register(registry) {
  registry.registerLeadTab({
    name: '__Smoke',
    label: 'Smoke',
    component: { template: '<div class="p-10">crm_overrides smoke tab</div>' },
  })
  registry.registerDealTab({
    name: '__Smoke',
    label: 'Smoke',
    component: { template: '<div class="p-10">crm_overrides smoke tab</div>' },
  })
}
```

- [ ] **Step 3: Commit (in the override's own repo)**

```bash
cd apps/videojet_crm_override
git add -A && git commit -q -m "feat: scaffold videojet_crm_override with smoke crm_overrides entrypoint"
cd -
```
Expected: override app committed in `apps/videojet_crm_override`.

---

### Task 2: Extension registry + Vite plugin (DE-RISK GATE)

**Files:**
- Create: `apps/crm/frontend/src/extensions/registry.js`
- Create: `apps/crm/frontend/build/crm-overrides-plugin.js`
- Modify: `apps/crm/frontend/vite.config.js`
- Modify: `apps/crm/frontend/src/main.js`

**Interfaces:**
- Produces:
  - `registry.registerLeadTab(tab)`, `registry.registerDealTab(tab)` where `tab = { name: string, label: string, icon?, component, insertAfter?: string, hideActivityHeader?: boolean }`
  - `registry.setFeatureFlag(key: string, value)`, `registry.getFeatureFlag(key)`
  - `useExtensions()` → reactive `{ leadTabs: tab[], dealTabs: tab[], featureFlags: Record<string,any> }`
  - `applyExtensionTabs(builtinTabs, extTabs)` → merged array honouring `insertAfter`
  - virtual module `virtual:crm-overrides` (side-effect import; registers all sibling overrides)

- [ ] **Step 1: Write the registry**

Create `apps/crm/frontend/src/extensions/registry.js`:
```js
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
```

- [ ] **Step 2: Write the Vite plugin**

Create `apps/crm/frontend/build/crm-overrides-plugin.js`:
```js
import fs from 'node:fs'
import path from 'node:path'

const VIRTUAL_ID = 'virtual:crm-overrides'
const RESOLVED_ID = '\0' + VIRTUAL_ID

// Scans `appsDir` for sibling apps exposing
// `<app>/frontend/src/crm_overrides/index.js` and emits a virtual module that
// statically imports each and calls its `register(registry)`. Absent apps ->
// empty list -> clean bundle.
export function crmOverrides({ appsDir, registryPath }) {
  return {
    name: 'crm-overrides',
    resolveId(id) {
      return id === VIRTUAL_ID ? RESOLVED_ID : null
    },
    load(id) {
      if (id !== RESOLVED_ID) return null
      let apps = []
      try {
        apps = fs.readdirSync(appsDir)
      } catch {
        apps = []
      }
      const entries = []
      for (const app of apps) {
        if (app === 'crm') continue
        const entry = path.join(
          appsDir,
          app,
          'frontend/src/crm_overrides/index.js',
        )
        if (fs.existsSync(entry)) entries.push(entry)
      }
      const lines = [`import { registry } from ${JSON.stringify(registryPath)}`]
      entries.forEach((e, i) => {
        lines.push(`import * as o${i} from ${JSON.stringify(e)}`)
        lines.push(`o${i}.register?.(registry)`)
      })
      lines.push('export default {}')
      return lines.join('\n')
    },
  }
}
```

- [ ] **Step 3: Register the plugin + widen fs.allow in `vite.config.js`**

In `apps/crm/frontend/vite.config.js`, add the import after line 5:
```js
import { crmOverrides } from './build/crm-overrides-plugin.js'
```
Add `crmOverrides(...)` to the `plugins` array (after the `VitePWA({...})` entry, before the array closes at line 56):
```js
      crmOverrides({
        appsDir: path.resolve(__dirname, '../..'),
        registryPath: path.resolve(__dirname, 'src/extensions/registry.js'),
      }),
```
Change `server.fs.allow` (line 72-76) to include the bench apps dir:
```js
    server: {
      fs: {
        allow: [
          path.resolve(__dirname, '..'),
          path.resolve(__dirname, '../..'),
        ],
      },
    },
```

- [ ] **Step 4: Import the virtual module in `main.js`**

In `apps/crm/frontend/src/main.js`, after line 9 (`import App from './App.vue'`):
```js
import 'virtual:crm-overrides'
```

- [ ] **Step 5: GATE — build with the override present**

Run:
```bash
cd apps/crm/frontend && yarn build 2>&1 | tail -20
```
Expected: build succeeds; no resolution error for `virtual:crm-overrides` or the sibling `crm_overrides/index.js`.

- [ ] **Step 6: GATE — build with the override absent (standalone)**

Run:
```bash
mv apps/videojet_crm_override /tmp/vco_hidden
cd apps/crm/frontend && yarn build 2>&1 | tail -5
mv /tmp/vco_hidden apps/videojet_crm_override
```
Expected: build succeeds, **no** reference to the smoke override in the output (clean standalone bundle).

**Task 2 fallback** (only if Step 5/6 fail): (1) confirm `server.fs.allow` includes the apps dir and the generated imports use absolute paths; (2) if Rollup rejects out-of-root imports, symlink discovered `crm_overrides` dirs under `frontend/src/.crm_overrides/` at plugin `buildStart` and import from there; (3) escalate to a documented module-federation approach. Do NOT start Task 3 until a build-with and build-without both pass.

- [ ] **Step 7: Commit**

```bash
git -C apps/crm add frontend/src/extensions/registry.js frontend/build/crm-overrides-plugin.js frontend/vite.config.js frontend/src/main.js
git -C apps/crm commit -m "feat(crm): build-time extension mechanism (registry + crm_overrides Vite plugin)"
```

---

### Task 3: Render registered tabs on Lead/Deal

**Files:**
- Modify: `apps/crm/frontend/src/pages/Lead.vue:408-463`
- Modify: `apps/crm/frontend/src/pages/Deal.vue:556-611`
- Modify: `apps/crm/frontend/src/components/Activities/Activities.vue:391-392, 454`
- Modify: `apps/crm/frontend/src/components/Activities/ActivityHeader.vue:3`

**Interfaces:**
- Consumes: `useExtensions`, `applyExtensionTabs` from `@/extensions/registry` (Task 2).

- [ ] **Step 1: Append registry tabs in `Lead.vue`**

Add import near the other `@/` imports:
```js
import { useExtensions, applyExtensionTabs } from '@/extensions/registry'
```
Add after the `usePageMeta(...)` block (before `const tabs = computed`):
```js
const ext = useExtensions()
```
Change the `tabs` computed (line 408-463) `return` line from:
```js
  return tabOptions.filter((tab) => (tab.condition ? tab.condition() : true))
```
to:
```js
  return applyExtensionTabs(tabOptions, ext.leadTabs).filter((tab) =>
    tab.condition ? tab.condition() : true,
  )
```
(Leave the built-in `Products` entry in place for now — it is removed in Task 5. The smoke tab from Task 1 will appear at the end.)

- [ ] **Step 2: Same in `Deal.vue`**

Add the same import + `const ext = useExtensions()`, and change the `tabs` computed `return` (Deal.vue ~line 611) identically, using `ext.dealTabs`:
```js
  return applyExtensionTabs(tabOptions, ext.dealTabs).filter((tab) =>
    tab.condition ? tab.condition() : true,
  )
```

- [ ] **Step 3: Render the registered component generically in `Activities.vue`**

Add import near the top script imports:
```js
import { useExtensions } from '@/extensions/registry'
```
Add in `<script setup>`:
```js
const ext = useExtensions()
const extensionTab = computed(() =>
  [...ext.leadTabs, ...ext.dealTabs].find((t) => t.name === title.value),
)
```
(`title` is the existing computed for the active tab name.) Replace the hardcoded Products branch at lines 391-392:
```html
    <div v-else-if="title == 'Products'" class="h-full flex flex-col">
      <ProductsArea :doctype="doctype" :docname="docname" />
    </div>
```
with a generic registered-tab branch:
```html
    <div v-else-if="extensionTab" class="h-full flex flex-col">
      <component
        :is="extensionTab.component"
        :doctype="doctype"
        :docname="docname"
      />
    </div>
```
Remove the now-unused import at line 454 (`import ProductsArea ...`). Keep `ProductsArea.vue` on disk for now (deleted in Task 5).

- [ ] **Step 4: Generalise header hiding in `ActivityHeader.vue`**

Add to `<script setup>`:
```js
import { useExtensions } from '@/extensions/registry'
const ext = useExtensions()
const extHidesHeader = computed(() =>
  [...ext.leadTabs, ...ext.dealTabs].some(
    (t) => t.name === title && t.hideActivityHeader,
  ),
)
```
(If `title` is a prop, reference it directly; if a computed, use `.value`.) Change line 3 from:
```html
    v-if="!['Data', 'Products'].includes(title)"
```
to:
```html
    v-if="!['Data'].includes(title) && !extHidesHeader"
```

- [ ] **Step 5: Verify the smoke tab renders**

Run dev server and open a Deal/Lead detail:
```bash
cd apps/crm/frontend && yarn dev
```
Expected: a **Smoke** tab appears at the end of the tab row on both Lead and Deal detail; clicking it shows "crm_overrides smoke tab". The built-in **Products** tab still works (unchanged).

- [ ] **Step 6: Commit**

```bash
git -C apps/crm add frontend/src/pages/Lead.vue frontend/src/pages/Deal.vue frontend/src/components/Activities/Activities.vue frontend/src/components/Activities/ActivityHeader.vue
git -C apps/crm commit -m "feat(crm): render registry-contributed tabs on Lead/Deal detail"
```

---

### Task 4: Gate Getting Started on a feature flag

**Files:**
- Modify: `apps/crm/frontend/src/components/Layouts/AppSidebar.vue:84-135`

**Interfaces:**
- Consumes: `useExtensions` from `@/extensions/registry`.

- [ ] **Step 1: Add a temporary smoke flag to the override**

In `apps/videojet_crm_override/frontend/src/crm_overrides/index.js`, add inside `register`:
```js
  registry.setFeatureFlag('gettingStarted', false)
```

- [ ] **Step 2: Read the flag in `AppSidebar.vue`**

Add to `<script setup>` (near other imports/refs):
```js
import { useExtensions } from '@/extensions/registry'
import { computed } from 'vue'
const ext = useExtensions()
const gettingStartedEnabled = computed(
  () => ext.featureFlags.gettingStarted !== false,
)
```
(If `computed` is already imported, do not duplicate.)

- [ ] **Step 3: Gate the three Getting-Started mounts**

- Line 85: `v-if="!isOnboardingStepsCompleted"` → `v-if="!isOnboardingStepsCompleted && gettingStartedEnabled"`
- Line 101: `v-if="isOnboardingStepsCompleted"` → `v-if="isOnboardingStepsCompleted && gettingStartedEnabled"`
- Line 134: `v-if="showHelpModal"` → `v-if="showHelpModal && gettingStartedEnabled"`

- [ ] **Step 4: Verify hidden (override present) and shown (override absent)**

```bash
cd apps/crm/frontend && yarn dev   # override present -> no Getting Started widget / drawer / help button
```
Then temporarily hide the override and confirm it returns:
```bash
mv apps/videojet_crm_override /tmp/vco_hidden && (cd apps/crm/frontend && yarn build 2>&1 | tail -3) && mv /tmp/vco_hidden apps/videojet_crm_override
```
Expected: with the override absent, Getting Started shows (flag unset → `!== false` → true).

- [ ] **Step 5: Commit**

```bash
git -C apps/crm add frontend/src/components/Layouts/AppSidebar.vue
git -C apps/crm commit -m "feat(crm): gate Getting Started on the gettingStarted feature flag"
cd apps/videojet_crm_override && git add -A && git commit -q -m "feat: set gettingStarted=false (smoke)" && cd -
```

---

### Task 5: Move the Products tab into `videojet_crm_override`

**Files:**
- Create: `apps/videojet_crm_override/frontend/src/crm_overrides/ProductsTab.vue` (from `ProductsArea.vue`)
- Modify: `apps/videojet_crm_override/frontend/src/crm_overrides/index.js`
- Modify: `apps/crm/frontend/src/pages/Lead.vue` (remove Products entry + icon import)
- Modify: `apps/crm/frontend/src/pages/Deal.vue` (remove Products entry + icon import)
- Delete: `apps/crm/frontend/src/components/Activities/ProductsArea.vue`

**Interfaces:**
- Consumes: registry tab shape `{ name, label, icon, component, insertAfter, hideActivityHeader }` (Task 2).

- [ ] **Step 1: Copy `ProductsArea.vue` into the override as `ProductsTab.vue`**

Copy the full current contents of `apps/crm/frontend/src/components/Activities/ProductsArea.vue` verbatim to `apps/videojet_crm_override/frontend/src/crm_overrides/ProductsTab.vue`. Its `@/` imports (`@/components/Controls/Grid.vue`, `@/data/document`, `@/components/Icons/LoadingIndicator.vue`) resolve against the CRM frontend at build time — leave them unchanged.

- [ ] **Step 2: Register the real Products tab (replace the smoke tab)**

Replace `apps/videojet_crm_override/frontend/src/crm_overrides/index.js` with:
```js
import ProductsTab from './ProductsTab.vue'
import ProductsIcon from '@/components/Icons/ProductsIcon.vue'

const productsTab = {
  name: 'Products',
  label: 'Products',
  icon: ProductsIcon,
  component: ProductsTab,
  insertAfter: 'Notes',
  hideActivityHeader: true,
}

export function register(registry) {
  registry.registerLeadTab(productsTab)
  registry.registerDealTab(productsTab)
  registry.setFeatureFlag('gettingStarted', false)
}
```

- [ ] **Step 3: Remove the built-in Products tab from `Lead.vue` and `Deal.vue`**

In `Lead.vue` delete the tab entry (lines 445-449):
```js
    {
      name: 'Products',
      label: __('Products'),
      icon: ProductsIcon,
    },
```
In `Deal.vue` delete the equivalent entry (lines 593-597). In both files remove the now-unused `import ProductsIcon from '@/components/Icons/ProductsIcon.vue'` (Lead.vue and Deal.vue:351) — confirm it is not referenced elsewhere in the file first (`grep -n ProductsIcon`).

- [ ] **Step 4: Delete the base `ProductsArea.vue`**

```bash
rm apps/crm/frontend/src/components/Activities/ProductsArea.vue
```
(Its import + render branch were already removed in Task 3.)

- [ ] **Step 5: Verify Products now comes from the override**

```bash
cd apps/crm/frontend && yarn dev
```
Expected: on a Deal detail, **Products** tab appears between Notes and Attachments (the `insertAfter: 'Notes'` anchor), the grid loads and saves, and the activity header is hidden on that tab — identical to before. The Smoke tab is gone (replaced). Then confirm clean standalone:
```bash
mv apps/videojet_crm_override /tmp/vco_hidden && (cd apps/crm/frontend && yarn build 2>&1 | tail -3) && mv /tmp/vco_hidden apps/videojet_crm_override
```
Expected: standalone build has no Products tab and no error.

- [ ] **Step 6: Commit**

```bash
git -C apps/crm add frontend/src/pages/Lead.vue frontend/src/pages/Deal.vue
git -C apps/crm rm frontend/src/components/Activities/ProductsArea.vue
git -C apps/crm commit -m "refactor(crm): move Products tab out of core into videojet_crm_override via the extension registry"
cd apps/videojet_crm_override && git add -A && git commit -q -m "feat: contribute Products tab via crm_overrides" && cd -
```

---

### Task 6: Finalise Hide Getting Started in the override

**Files:**
- Modify: `apps/videojet_crm_override/frontend/src/crm_overrides/index.js` (already sets the flag from Task 5 Step 2 — verify) 

- [ ] **Step 1: Confirm the flag is set for real (not smoke)**

Confirm `index.js` (from Task 5) contains `registry.setFeatureFlag('gettingStarted', false)`. There is no separate smoke flag to remove — Task 5 Step 2 already replaced the whole file.

- [ ] **Step 2: Verify end-to-end behaviour**

```bash
cd apps/crm/frontend && yarn dev
```
Expected: Videojet build (override present) hides the Getting-Started banner, drawer, and help button; the Products tab is present. Standalone build (override absent) shows Getting Started and no Products tab. No console errors.

- [ ] **Step 3: Commit** (only if any change was needed)

```bash
cd apps/videojet_crm_override && git add -A && git commit -q -m "chore: confirm gettingStarted flag in crm_overrides" --allow-empty && cd -
```

---

### Task 7: Wire deployment + build-twice verification

**Files:**
- Modify: `frappe_docker apps/dms-uat.json` (separate repo, branch `svasamm/base`)
- Create: `apps/crm/frontend/build/verify-overrides.sh` — build-twice smoke

**Interfaces:**
- Consumes: the mechanism from Tasks 2-6.

- [ ] **Step 1: Add the override to the image manifest**

In `frappe_docker` (clone via SSH; `gh api` cannot edit if it trips workflow scope — non-workflow JSON is fine via SSH clone), add to `apps/dms-uat.json`:
```json
{ "url": "https://github.com/svasamm-research/videojet_crm_override", "branch": "uat" }
```
Place it **before** the `crm` entry as a safeguard against per-app frontend build ordering (the spike in Task 2 confirms whether ordering matters; listing it first is harmless either way).

- [ ] **Step 2: Add a build-twice verification script**

Create `apps/crm/frontend/build/verify-overrides.sh`. It asserts both builds **succeed** (a broken override or a standalone-build regression fails CI). Tab presence/absence is a UI concern verified by the dev/Playwright checks in Tasks 5–6, not by grepping minified assets.
```bash
#!/usr/bin/env bash
# Asserts the SPA builds cleanly both with and without the override app.
set -euo pipefail
APPS_DIR="$(cd "$(dirname "$0")/../../.." && pwd)"
OVERRIDE="$APPS_DIR/videojet_crm_override"
cd "$(dirname "$0")/.."   # apps/crm/frontend

echo "[verify] build WITH override present"
yarn build >/dev/null 2>&1
echo "[verify] -> OK"

echo "[verify] build WITHOUT override (standalone)"
mv "$OVERRIDE" "${OVERRIDE}.hidden"
trap 'mv "${OVERRIDE}.hidden" "$OVERRIDE" 2>/dev/null || true' EXIT
yarn build >/dev/null 2>&1
trap - EXIT
mv "${OVERRIDE}.hidden" "$OVERRIDE"
echo "[verify] -> OK (no override resolution error)"
echo "[verify] PASS"
```
Make it executable: `chmod +x apps/crm/frontend/build/verify-overrides.sh`.

- [ ] **Step 3: Run the verification**

```bash
apps/crm/frontend/build/verify-overrides.sh
```
Expected: `[verify] PASS`.

- [ ] **Step 4: Commit**

```bash
git -C apps/crm add frontend/build/verify-overrides.sh
git -C apps/crm commit -m "test(crm): build-twice verification for crm_overrides inclusion/exclusion"
# frappe_docker manifest committed/pushed in its own repo per the deployment runbook (after approval).
```

---

## Self-Review

- **Spec coverage:** §3.1 plugin → Task 2; §3.2 registry/registries → Task 2 (tabs + flags; modal/route registries deferred per YAGNI until a feature needs them — note added below); §3.3 override convention → Tasks 1, 5; §3.4 multi-tenant → inherent (plugin scans any app); §4 migrations → Tasks 5, 6; §5 spike → Task 2 (hard gate); §6 testing → Tasks 2/5 verifications + Task 7 script; §8 deployment → Task 7. Covered.
- **YAGNI note:** the spec's `registerModal`/`registerRoute` are intentionally **not** built here — no foundation deliverable needs them. They follow the identical pattern (a `state.modals`/`state.routes` array + a consumption point in `AllModals.vue`/`router.js`) and will be added by the first feature that requires them.
- **Type consistency:** the tab shape `{ name, label, icon, component, insertAfter, hideActivityHeader }` is defined in Task 2 and used verbatim in Tasks 3 and 5. `useExtensions()` returns `{ leadTabs, dealTabs, featureFlags }` consistently across Tasks 3, 4. Flag key `gettingStarted` consistent across Tasks 4–6.
- **Placeholder scan:** no TBD/TODO; every code step shows the code.
