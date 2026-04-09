import { Scene } from 'foldkit'

// Match by role alone
Scene.role('button')

// Narrow by accessible name (exact match)
Scene.role('button', { name: 'Save' })

// Narrow by accessible name (regex match)
Scene.role('option', { name: /PM/ })

// Narrow by heading level
Scene.role('heading', { level: 2 })

// Narrow by ARIA state
Scene.role('checkbox', { checked: true })
Scene.role('button', { pressed: true, disabled: false })
