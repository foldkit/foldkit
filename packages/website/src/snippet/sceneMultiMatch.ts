import { pipe } from 'effect'
import { all, filter, first, last, nth, role } from 'foldkit/scene'

// Multi-match locators return every match.
all.role('row')
all.text('Delete')
all.label('Email')

// Pick one element from the set.
first(all.role('row'))
last(all.role('button', { name: 'Delete' }))
nth(all.role('row'), 2)

// Narrow with filter, then pick.
pipe(all.role('row'), filter({ hasText: 'Alice' }), first)

pipe(
  all.role('row'),
  filter({ has: role('button', { name: 'Delete' }) }),
  first,
)
