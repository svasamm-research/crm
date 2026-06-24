import fs from 'node:fs'
import path from 'node:path'

const VIRTUAL_ID = 'virtual:crm-overrides'
const RESOLVED_ID = '\0' + VIRTUAL_ID
const STAGE_DIR_NAME = '.crm_overrides'

// Build-time extension mechanism for the Svasamm CRM SPA.
//
// Discovers sibling Frappe apps that ship `<app>/frontend/src/crm_overrides/`
// and emits a virtual module (`virtual:crm-overrides`) that imports each app's
// `index.js` and calls its `register(registry)`.
//
// Why "stage" (copy) into crm/frontend/src/.crm_overrides instead of importing
// the sibling files in place: a sibling file's bare-package imports
// (`frappe-ui`, `vue`, ...) resolve against the SIBLING's node_modules, which
// doesn't have them. Copying the override dirs under crm's own `src` makes them
// first-class crm modules — both the `@` alias and bare-package resolution
// behave exactly as for crm's own files. Absent app -> nothing staged ->
// clean standalone bundle.
export function crmOverrides({ appsDir, frontendSrc, registryPath }) {
  const stageDir = path.join(frontendSrc, STAGE_DIR_NAME)
  let stagedEntries = []

  function discover() {
    let apps = []
    try {
      apps = fs.readdirSync(appsDir)
    } catch {
      apps = []
    }
    const found = []
    for (const app of apps) {
      if (app === 'crm') continue
      const src = path.join(appsDir, app, 'frontend/src/crm_overrides')
      if (fs.existsSync(path.join(src, 'index.js'))) found.push({ app, src })
    }
    return found
  }

  function stage() {
    fs.rmSync(stageDir, { recursive: true, force: true })
    const staged = []
    for (const { app, src } of discover()) {
      const dest = path.join(stageDir, app)
      fs.mkdirSync(path.dirname(dest), { recursive: true })
      fs.cpSync(src, dest, { recursive: true })
      staged.push({ app, entry: path.join(dest, 'index.js') })
    }
    return staged
  }

  return {
    name: 'crm-overrides',
    buildStart() {
      stagedEntries = stage()
    },
    resolveId(id) {
      return id === VIRTUAL_ID ? RESOLVED_ID : null
    },
    load(id) {
      if (id !== RESOLVED_ID) return null
      const lines = [`import { registry } from ${JSON.stringify(registryPath)}`]
      stagedEntries.forEach((e, i) => {
        lines.push(`import * as o${i} from ${JSON.stringify(e.entry)}`)
        lines.push(`o${i}.register?.(registry)`)
      })
      lines.push('export default {}')
      return lines.join('\n')
    },
  }
}
