import { pipe } from 'effect'
import { Scene } from 'foldkit'

// Multi-match locators return every match.
Scene.all.role('row')
Scene.all.text('Delete')
Scene.all.label('Email')

// Pick one element from the set.
Scene.first(Scene.all.role('row'))
Scene.last(Scene.all.role('button', { name: 'Delete' }))
Scene.nth(Scene.all.role('row'), 2)

// Narrow with filter, then pick.
pipe(Scene.all.role('row'), Scene.filter({ hasText: 'Alice' }), Scene.first)

pipe(
  Scene.all.role('row'),
  Scene.filter({ has: Scene.role('button', { name: 'Delete' }) }),
  Scene.first,
)
