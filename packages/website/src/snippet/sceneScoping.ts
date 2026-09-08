import { click, expect, inside, role, within } from 'foldkit/scene'

// Scope a single locator to a parent element.
within(role('region', { name: 'Sidebar' }), role('link'))

// Scope a block of steps — every assertion and interaction
// resolves within the parent's subtree.
inside(
  role('dialog', { name: 'Confirm' }),
  expect(role('heading')).toHaveText('Delete item?'),
  click(role('button', { name: 'Cancel' })),
)
