import { role } from 'foldkit/scene'

// Match by role alone
role('button')

// Narrow by accessible name (exact match)
role('button', { name: 'Save' })

// Narrow by accessible name (regex match)
role('option', { name: /PM/ })

// Narrow by heading level
role('heading', { level: 2 })

// Narrow by ARIA state
role('checkbox', { checked: true })
role('button', { pressed: true, disabled: false })
