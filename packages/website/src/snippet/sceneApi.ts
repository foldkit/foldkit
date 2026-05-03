import { pipe } from 'effect'
import { Scene } from 'foldkit'

// Accessible locators — find elements like a user would.
Scene.role('button', { name: 'Submit' })
Scene.role('heading', { level: 2 })
Scene.role('checkbox', { checked: true })
Scene.role('button', { pressed: true, disabled: false })
Scene.label('Email')
Scene.text('Welcome back')
Scene.placeholder('Search...')
Scene.altText('Company logo')
Scene.title('Close dialog')
Scene.testId('cart-summary')
Scene.displayValue('alice@example.com')
Scene.selector('.fallback-class')

// Scoped locators — find elements within a parent.
Scene.within(Scene.role('region', { name: 'Sidebar' }), Scene.role('link'))

// Scoped steps — run a whole block within a parent's subtree.
Scene.inside(
  Scene.role('dialog', { name: 'Confirm' }),
  Scene.expect(Scene.role('heading')).toHaveText('Delete item?'),
  Scene.click(Scene.role('button', { name: 'Cancel' })),
)

// Multi-match locators — for lists and repeated elements.
Scene.all.role('row')
Scene.first(Scene.all.role('row'))
Scene.last(Scene.all.role('button', { name: 'Delete' }))
Scene.nth(Scene.all.role('row'), 2)
Scene.filter(Scene.all.role('row'), { hasText: 'Alice' })
pipe(
  Scene.all.role('row'),
  Scene.filter({ has: Scene.role('button', { name: 'Delete' }) }),
  Scene.first,
)

// Interactions — exercise the view.
Scene.click(Scene.role('button', { name: 'Log out' }))
Scene.doubleClick(Scene.role('button', { name: 'Expand' }))
Scene.pointerDown(Scene.role('button', { name: 'Toggle' }))
Scene.pointerUp(Scene.role('button', { name: 'Toggle' }))
Scene.hover(Scene.role('menuitem', { name: 'File' }))
Scene.focus(Scene.label('Email'))
Scene.blur(Scene.label('Email'))
Scene.type(Scene.label('Email'), 'alice@example.com')
Scene.change(Scene.label('Country'), 'US')
Scene.submit(Scene.role('form'))
Scene.keydown(Scene.label('Search'), 'Enter')

// Inline assertions — assert on the rendered HTML.
Scene.expect(Scene.role('heading')).toExist()
Scene.expect(Scene.role('heading')).toHaveText('Welcome')
Scene.expect(Scene.role('heading')).toHaveText(/^Welcome/)
Scene.expect(Scene.role('heading')).toContainText('Welcome')
Scene.expect(Scene.role('dialog')).toBeAbsent()
Scene.expect(Scene.role('status')).toBeVisible()
Scene.expect(Scene.role('status')).toBeEmpty()
Scene.expect(Scene.role('region')).toHaveAccessibleName('User session')
Scene.expect(Scene.label('Email')).toHaveValue('alice@example.com')
Scene.expect(Scene.label('Email')).toHaveId('email')
Scene.expect(Scene.role('button', { name: 'Submit' })).toBeDisabled()
Scene.expect(Scene.role('button', { name: 'Submit' })).toBeEnabled()
Scene.expect(Scene.role('checkbox')).toBeChecked()
Scene.expect(Scene.label('Email')).toHaveAttr('type', 'email')
Scene.expect(Scene.role('button')).toHaveClass('primary')
Scene.expect(Scene.role('alert')).toHaveStyle('color', 'red')
Scene.expect(Scene.role('button')).not.toBeDisabled()

// Multi-match assertions — count-based.
Scene.expectAll(Scene.all.role('row')).toHaveCount(3)
Scene.expectAll(Scene.all.role('alert')).toBeEmpty()

// Run the scene. Throws on unresolved Commands.
Scene.scene(
  { update, view },
  Scene.with(model),
  Scene.type(Scene.label('Email'), 'alice@example.com'),
  Scene.submit(Scene.role('form')),
  Scene.Command.resolve(Authenticate, SucceededAuthenticate({ session })),
  Scene.expect(Scene.role('heading')).toHaveText('Welcome, alice!'),
)
