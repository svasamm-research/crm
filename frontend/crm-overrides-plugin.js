import fs from 'node:fs'
import path from 'node:path'

const VIRTUAL_ID = 'virtual:crm-overrides'
const RESOLVED_ID = '\0' + VIRTUAL_ID

// Scans `appsDir` for sibling apps exposing
// `<app>/frontend/src/crm_overrides/index.js` and emits a virtual module that
// statically imports each and calls its `register(registry)`. Absent apps ->
// empty list -> clean bundle (standalone CRM build).
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
