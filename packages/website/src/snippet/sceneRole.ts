import { Scene } from 'foldkit'

// Match by role alone
Scene.role('button')

// Narrow by accessible name
Scene.role('button', { name: 'Save' })

// Narrow by heading level
Scene.role('heading', { level: 2 })

// Narrow by ARIA state
Scene.role('checkbox', { checked: true })
Scene.role('button', { pressed: true, disabled: false })
