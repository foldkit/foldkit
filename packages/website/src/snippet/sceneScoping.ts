import { Scene } from 'foldkit'

// Scope a single locator to a parent element.
Scene.within(Scene.role('region', { name: 'Sidebar' }), Scene.role('link'))

// Scope a block of steps — every assertion and interaction
// resolves within the parent's subtree.
Scene.inside(
  Scene.role('dialog', { name: 'Confirm' }),
  Scene.expect(Scene.role('heading')).toHaveText('Delete item?'),
  Scene.click(Scene.role('button', { name: 'Cancel' })),
)
