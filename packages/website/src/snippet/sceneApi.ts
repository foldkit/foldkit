import { pipe } from 'effect'
import {
  Command,
  all,
  altText,
  blur,
  change,
  click,
  contextMenu,
  displayValue,
  doubleClick,
  expect,
  expectAll,
  filter,
  first,
  focus,
  given,
  hover,
  inside,
  keydown,
  label,
  last,
  nth,
  placeholder,
  pointerDown,
  pointerUp,
  role,
  scene,
  selector,
  submit,
  testId,
  text,
  title,
  type,
  within,
} from 'foldkit/scene'

// Accessible locators — find elements like a user would.
role('button', { name: 'Submit' })
role('heading', { level: 2 })
role('checkbox', { checked: true })
role('button', { pressed: true, disabled: false })
label('Email')
text('Welcome back')
placeholder('Search...')
altText('Company logo')
title('Close dialog')
testId('cart-summary')
displayValue('alice@example.com')
selector('.fallback-class')

// Scoped locators — find elements within a parent.
within(role('region', { name: 'Sidebar' }), role('link'))

// Scoped steps — run a whole block within a parent's subtree.
inside(
  role('dialog', { name: 'Confirm' }),
  expect(role('heading')).toHaveText('Delete item?'),
  click(role('button', { name: 'Cancel' })),
)

// Multi-match locators — for lists and repeated elements.
all.role('row')
first(all.role('row'))
last(all.role('button', { name: 'Delete' }))
nth(all.role('row'), 2)
filter(all.role('row'), { hasText: 'Alice' })
pipe(
  all.role('row'),
  filter({ has: role('button', { name: 'Delete' }) }),
  first,
)

// Interactions — exercise the view.
click(role('button', { name: 'Log out' }))
doubleClick(role('button', { name: 'Expand' }))
contextMenu(role('row', { name: 'Quarterly report' }))
pointerDown(role('button', { name: 'Toggle' }))
pointerUp(role('button', { name: 'Toggle' }))
hover(role('menuitem', { name: 'File' }))
focus(label('Email'))
blur(label('Email'))
type(label('Email'), 'alice@example.com')
change(label('Country'), 'US')
submit(role('form'))
keydown(label('Search'), 'Enter')

// Inline assertions — assert on the rendered HTML.
expect(role('heading')).toExist()
expect(role('heading')).toHaveText('Welcome')
expect(role('heading')).toHaveText(/^Welcome/)
expect(role('heading')).toContainText('Welcome')
expect(role('dialog')).toBeAbsent()
expect(role('status')).toBeVisible()
expect(role('status')).toBeEmpty()
expect(role('region')).toHaveAccessibleName('User session')
expect(label('Email')).toHaveValue('alice@example.com')
expect(label('Email')).toHaveId('email')
expect(role('button', { name: 'Submit' })).toBeDisabled()
expect(role('button', { name: 'Submit' })).toBeEnabled()
expect(role('checkbox')).toBeChecked()
expect(label('Email')).toHaveAttr('type', 'email')
expect(role('button')).toHaveClass('primary')
expect(role('alert')).toHaveStyle('color', 'red')
expect(role('button')).not.toBeDisabled()

// Multi-match assertions — count-based.
expectAll(all.role('row')).toHaveCount(3)
expectAll(all.role('alert')).toBeEmpty()

// Run the scene. Throws on unresolved Commands.
scene(
  { update, view },
  given(model),
  type(label('Email'), 'alice@example.com'),
  submit(role('form')),
  Command.resolve(Authenticate, SucceededAuthenticate({ session })),
  expect(role('heading')).toHaveText('Welcome, alice!'),
)
