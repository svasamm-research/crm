# CRM Layering Foundation — Design

**Goal:** Give the Svasamm CRM fork a build-time extension mechanism so tenant-specific Frappe apps (starting with `videojet_crm_override`) can contribute Vue components, tabs, routes, and feature flags into the CRM SPA — present in a tenant image, absent from a standalone Svasamm CRM build — and migrate the existing Videojet customizations (Products tab, Hide Getting Started) onto it.

**Architecture:** Three layers mirroring the DMS model (`ERPNext → DMS → videojet_override`). The base `crm` fork is the shippable Svasamm CRM product and owns the extension mechanism; `svasamm_crm_defaults` carries shared server/data; a new `videojet_crm_override` Frappe app carries Videojet-only code. Server/data overrides use Frappe's native app layering; the Vue SPA uses a new build-time plugin because Frappe app-overrides are server-only.

**Tech Stack:** Frappe v16 / Frappe CRM (Vue 3 + Vite + frappe-ui), Python (Frappe app hooks/fixtures), frappe_docker layered image build.

---

## 1. Background & Problem

The Videojet CRM customizations are currently **interleaved into upstream core files** of the `crm` fork:

- Products tab is added directly inside `frontend/src/pages/Lead.vue` (`tabs` computed, ~L408–463), `frontend/src/pages/Deal.vue` (~L40–45), `frontend/src/components/Activities/Activities.vue`, `frontend/src/components/Activities/ActivityHeader.vue`, with `frontend/src/components/Activities/ProductsArea.vue`.
- The Getting-Started hide is a fork-edited `frontend/src/svasamm/HelpModal.vue` plus `AppSidebar.vue`.

This means the fork **cannot be shipped standalone** without dragging Videojet-specific behaviour, and every upstream merge risks conflicts in core files. We are committing to a layered model so:

- **General** CRM improvements live in the base (`crm` fork + `svasamm_crm_defaults`) and benefit future standalone-CRM clients.
- **Videojet-only** code lives in `videojet_crm_override` and is **physically excluded** from a standalone build.

### Why a new mechanism (not settings/branches)

- Frappe's app-override (hooks, `permission_query_conditions`, fixtures, doctype customizations) is **server-side only** — it cannot inject Vue into the SPA bundle.
- A pure runtime feature-flag ("just settings") still ships Videojet code in the standalone bundle, which we explicitly want to avoid.
- Branch-per-tenant incurs an ongoing merge tax and divergence risk.

The CRM SPA is **built from source in the image** (`crm/public/frontend/` is gitignored; root `package.json` `"build": "cd frontend && yarn build"`). Because the build runs with every cloned app present, a build-time scan of sibling apps can include overrides in the Videojet image and exclude them from a standalone build with **zero runtime config**.

## 2. The Three Layers

| Layer | Repo/app | Responsibility |
|---|---|---|
| Base CRM product | `crm` fork (`svasamm/*`) | Clean Svasamm CRM (Vue + Python). Owns the **extension mechanism** and the extension points (registries). General frontend improvements. |
| Shared base server/data | `svasamm_crm_defaults` | Server hooks, `permission_query_conditions`, View Settings fixtures shared across all Svasamm CRM deployments. |
| Tenant override | `videojet_crm_override` (NEW) | Videojet/DMS-specific Vue overrides (Products tab, Hide Getting Started) + any tenant policy. Mirrors `videojet_override`. |

**Standalone behaviour:** a standalone Svasamm CRM image clones `crm` + `svasamm_crm_defaults` only. The build finds no `crm_overrides/` from `videojet_crm_override`, so the registries stay empty and none of the Videojet Vue ships.

## 3. The Extension Mechanism (Option C)

Two cooperating pieces in the base fork: a **build-time Vite plugin** that discovers override apps, and a **runtime registry API** the overrides call.

### 3.1 Build-time discovery — virtual module via a Vite plugin

Add a plugin to `frontend/vite.config.js` (before the frappe-ui plugin). At build start it scans the bench apps directory for override entrypoints and generates a **virtual module** `virtual:crm-overrides` that statically imports each one.

Rationale for a custom plugin over bare `import.meta.glob`: the override apps live **outside** the frontend root (`apps/<app>/frontend/src/crm_overrides/`), which is awkward for `import.meta.glob` (literal-path + `fs.allow` constraints). A plugin using Node `fs` to scan and emit explicit imports is robust and statically analyzable by Rollup.

```js
// frontend/build/crm-overrides-plugin.js  (sketch — exact code in the plan)
import fs from 'node:fs'
import path from 'node:path'

const VIRTUAL_ID = 'virtual:crm-overrides'

export function crmOverrides({ appsDir }) {
  // appsDir = resolve(__dirname, '../../../')  -> the bench `apps/` directory
  return {
    name: 'crm-overrides',
    resolveId: (id) => (id === VIRTUAL_ID ? '\0' + VIRTUAL_ID : null),
    load(id) {
      if (id !== '\0' + VIRTUAL_ID) return null
      const entries = []
      for (const app of fs.readdirSync(appsDir)) {
        if (app === 'crm') continue
        const entry = path.join(appsDir, app, 'frontend/src/crm_overrides/index.js')
        if (fs.existsSync(entry)) entries.push(entry)
      }
      // Emit static imports so Rollup bundles each override; every module
      // self-registers against the shared registry. Absent app -> empty list
      // -> clean bundle (standalone build).
      const lines = ["import { registry } from '@/extensions/registry'"]
      entries.forEach((e, i) => {
        lines.push(`import * as o${i} from ${JSON.stringify(e)}`)
        lines.push(`o${i}.register?.(registry)`)
      })
      return lines.join('\n')
    },
  }
}
```

`vite.config.js` must also allow reading the sibling app dirs in dev (`server.fs.allow` includes the bench `apps/` dir). Vite alias `@` already resolves to `frontend/src`.

`frontend/src/main.js` imports the virtual module once, after the Pinia + router setup, so registrations are applied before the app mounts:

```js
import 'virtual:crm-overrides'  // self-registers tabs/modals/routes/flags
```

### 3.2 Runtime registry API (base fork)

A single registry object (`frontend/src/extensions/registry.js`) backed by Pinia stores, exposing typed registration calls. Override modules receive it via their `register(registry)` export.

```js
// frontend/src/extensions/registry.js  (API surface)
export const registry = {
  registerLeadTab(tab),        // tab: { name, label, icon, component, condition? }
  registerDealTab(tab),
  registerModal(name, component),
  registerRoute(route),        // vue-router RouteRecordRaw
  setFeatureFlag(key, value),  // e.g. 'gettingStarted' -> false
  getFeatureFlag(key),
}
```

Base consumption points (small, surgical edits to the fork):
- **Tabs:** `Lead.vue` / `Deal.vue` `tabs` computed appends `registry` lead/deal tabs (filtered by `condition`). Tab content render in `Activities.vue` resolves the registered `component` for unknown tab names.
- **Modals:** `components/Activities/AllModals.vue` renders registered modals via `<component v-for>`.
- **Routes:** `router.js` concatenates registered routes before `createRouter`.
- **Feature flags:** a `useFeatureFlags()` composable reads the registry; base components gate optional UI on it (default = upstream behaviour when unset).

### 3.3 Override app convention (`videojet_crm_override`)

A normal Frappe app (created with `bench new-app`) that ALSO ships a frontend overrides tree:

```
videojet_crm_override/
├── videojet_crm_override/        # Python: hooks.py, fixtures, etc. (server/data layer)
└── frontend/
    └── src/
        └── crm_overrides/
            ├── index.js          # export function register(registry) { ... }
            ├── ProductsTab.vue    # moved from crm fork
            └── ...
```

`crm_overrides/index.js`:

```js
import ProductsTab from './ProductsTab.vue'
export function register(registry) {
  registry.registerLeadTab({ name: 'Products', label: 'Products', icon: ProductsIcon, component: ProductsTab })
  registry.registerDealTab({ name: 'Products', label: 'Products', icon: ProductsIcon, component: ProductsTab })
  registry.setFeatureFlag('gettingStarted', false)   // hides Getting Started
}
```

### 3.4 Multiple tenants / onboarding a new client (e.g. Britannia)

The mechanism is **tenant-agnostic by construction** — nothing in the base fork names "videojet". The plugin discovers *any* sibling app that ships `frontend/src/crm_overrides/index.js`, and the runtime registry composes whatever those apps register.

**Isolation is at the image/deployment layer, not runtime** — the same model as DMS (each tenant runs its own image on its own server, per-server DB). Each tenant has its own image manifest:

- `apps/dms-uat.json` → `crm` + `svasamm_crm_defaults` + **`videojet_crm_override`**
- `apps/britannia-uat.json` → `crm` + `svasamm_crm_defaults` + **`britannia_crm_override`**

So a given build contains **exactly one** tenant override; the Videojet build never sees Britannia's code and vice-versa. No runtime tenant-detection, no cross-tenant leakage.

**Onboarding Britannia is purely additive:**

1. `bench new-app britannia_crm_override` with the same convention (Python/fixtures for server/data + `frontend/src/crm_overrides/index.js` for Vue).
2. Implement Britannia's deltas against the same `registry` API (its own tabs, flags, modals) and its own server hooks/fixtures.
3. Add it to `apps/britannia-uat.json` and wire a Britannia image build.

**Zero changes** to the `crm` fork, `svasamm_crm_defaults`, `videojet_crm_override`, or the mechanism. This is exactly how `videojet_override` → a future `britannia_override` works on the DMS server side; we are extending the same per-tenant-app model to the SPA.

**If two override apps are ever present in one build** (rare — e.g. a shared optional bundle like `svasamm_crm_premium` reused across tenants): discovery order is deterministic (apps scanned in sorted order); the registry dedupes by `name` with last-registered-wins, and a future `priority` field can make precedence explicit. Single-tenant images avoid this entirely, so it is not a v1 concern — but the registry is designed so composition is well-defined, not accidental.

## 4. Migrations onto the mechanism (this spec's deliverables)

1. **Extract the Products tab** from the fork's core files into `videojet_crm_override/frontend/src/crm_overrides/ProductsTab.vue` (absorbing `ProductsArea.vue` logic), and remove the interleaved Products references from `Lead.vue`, `Deal.vue`, `Activities.vue`, `ActivityHeader.vue`. Register it via `crm_overrides/index.js`. The base fork goes back to clean upstream-shaped tabs.
2. **Hide Getting Started (#5)** via `setFeatureFlag('gettingStarted', false)` in the override; the base `AppSidebar.vue` + onboarding mount honour the flag (default shown). `frontend/src/svasamm/HelpModal.vue` branding stays in the base (it is Svasamm-general, not Videojet-only).
3. **Pipeline:** add `videojet_crm_override` to `frappe_docker apps/dms-uat.json` so it is cloned at image build. Standalone image omits it.

## 5. Technical Risk & De-risking Spike (FIRST task in the plan)

The novel piece is cross-app bundling. Before migrating real features, the plan's first task is a **proof-of-concept spike**:

- Create a throwaway `crm_overrides/index.js` in a sibling app that registers a trivial tab ("Hello").
- Confirm: (a) `yarn build` bundles it and the tab appears; (b) building with the sibling app **absent** produces a clean bundle with no tab and no error; (c) dev mode (`yarn dev`) works with `server.fs.allow`.

If the plugin approach hits a Rollup/`fs.allow` wall, fall back order: (1) tighten the plugin to emit absolute imports under a configured `fs.allow`; (2) symlink override dirs under `frontend/src/.overrides/` at build start; (3) escalate to module-federation. Do not proceed to feature migration until the spike passes.

## 6. Testing

- **Spike/build:** CI builds the SPA twice — with and without `videojet_crm_override` — asserting the Products tab is present/absent respectively (grep the built bundle or a Playwright smoke).
- **Server/data layers** (later specs) keep using `bench run-tests` as today.
- **Frontend behaviour:** a Playwright check that a Videojet build shows the Products tab on a Deal and hides Getting Started; a standalone build shows neither override but retains base tabs.

## 7. Out of Scope (separate specs)

- Base CRM features #1 (contacts filter), #2 (Kanban default), #3 (task/note selector), #4 (ref-follow), #6 (editable reference) — these go in `crm` fork + `svasamm_crm_defaults` and do **not** depend on this mechanism.
- SES email + S3 backups (later workstreams).

## 8. Deployment & Plans

### Where deployment lives

`videojet_crm_override` is its **own git repo** (`svasamm-research/videojet_crm_override`) with `uat`/`develop` branches, exactly like every other app. **`frappe_docker` holds no app code** — only the per-tenant manifest (`apps/dms-uat.json`) and the build workflows. So deployment is handled by a **one-line manifest addition**:

```
apps/dms-uat.json:  ... + { "url": ".../videojet_crm_override", "branch": "uat" }
```

The pipeline is **unchanged**: release tag → `trigger-image-build` → `build-dms-uat` (the layered `Containerfile` runs `bench init --apps_path=/opt/frappe/apps.json`, which clones **all** manifest apps in one step) → push `dms-tenant:uat-vX.Y.Z` → Dokploy redeploy → `configurator` (`bench build --production` + copy each app's assets into the persistent volume + `bench migrate`).

### Why the override's Vue ends up in the bundle

Because all manifest apps are cloned together (`bench init`) and the SPA is (re)built with every app on disk, the Vite plugin sees `videojet_crm_override/frontend/src/crm_overrides/` at build time and bundles it. A standalone CRM image omits the app → clean bundle.

**The one ordering variable to confirm in the spike:** the CRM SPA must be compiled *after* `videojet_crm_override` is on disk. The deploy-time `configurator` build satisfies this (all apps already present). If image-build-time SPA compilation turns out to run per-app before later apps clone, the fix is trivial — either list `videojet_crm_override` before `crm` in the manifest, or add an explicit "rebuild crm frontend after all apps cloned" step. The spike will confirm which path applies before we rely on it.

### Plans (dms_only / dms_plus_crm / dms_full / crm_only) — unaffected

Plans gate **pillar enablement**, not app presence: `apply_tenant_plan(code)` sets `DMS Settings.active_plan` → `pillars_enabled`, which drives module profiles, desktop-icon visibility, and `requires_pillar()` server gates. `videojet_crm_override` is a CRM-layer app baked into the image; its overrides are active **whenever the CRM SPA is served**, i.e. whenever the plan enables the CRM pillar:

- `dms_full`, `dms_plus_crm` → CRM enabled → overrides apply (Products tab, Getting-Started hidden). Works as expected.
- `dms_only` → CRM pillar off → CRM SPA not reachable → overrides dormant and harmless.
- `crm_only` (future standalone) → would NOT include `videojet_crm_override` in its manifest anyway.

The plan applier needs **no knowledge** of `videojet_crm_override`. Its server-side hooks/fixtures (if any) must be `requires_pillar("crm")`-gated for cleanliness, matching the DMS pattern, so they no-op when CRM is absent.

## 9. Open Questions / Spec-time validations

- Exact `vite.config.js` `server.fs.allow` and the bench `apps/` path resolution in both dev and the frappe_docker build context.
- Whether the frappe-ui Vite plugin reorders/overrides plugin hooks in a way that affects virtual-module resolution (validate in the spike).
- Registry timing: ensure override registration runs before first route resolution (tabs/routes available on initial navigation).
- `videojet_crm_override` app scaffolding: confirm it needs no Python doctypes yet (frontend-only + a hooks.py placeholder), and that adding a frontend tree to a Frappe app does not disturb `bench build` of other apps.
