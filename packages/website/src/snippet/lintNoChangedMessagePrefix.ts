import { Schema as S } from 'effect'
import { m } from 'foldkit/message'

// ❌ Bad
// Changed is the vaguest available verb. A more precise one almost always fits.
const ChangedTab = m('ChangedTab', { tab: S.String })

// ✅ Good
// Selected for a discrete choice, Updated for an edited value, Toggled for a flip.
const SelectedTab = m('SelectedTab', { tab: S.String })
