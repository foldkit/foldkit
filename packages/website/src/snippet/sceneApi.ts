import { Scene } from 'foldkit'

// Accessible locators — find elements like a user would.
Scene.role('button', { name: 'Submit' })
Scene.label('Email')
Scene.text('Welcome back')
Scene.placeholder('Search...')
Scene.selector('.fallback-class')

// Scoped locators — find elements within a parent.
Scene.within(Scene.role('region', { name: 'Sidebar' }), Scene.role('link'))

// Interactions — exercise the view.
Scene.click(Scene.role('button', { name: 'Log out' }))
Scene.type(Scene.label('Email'), 'alice@example.com')
Scene.submit(Scene.role('form'))
Scene.keydown(Scene.label('Search'), 'Enter')

// Inline assertions — assert on the rendered HTML.
Scene.expect(Scene.role('heading')).toExist()
Scene.expect(Scene.role('heading')).toHaveText('Welcome')
Scene.expect(Scene.role('heading')).toContainText('Welcome')
Scene.expect(Scene.role('dialog')).toBeAbsent()
Scene.expect(Scene.label('Email')).toHaveValue('alice@example.com')
Scene.expect(Scene.role('button', { name: 'Submit' })).toBeDisabled()
Scene.expect(Scene.role('button', { name: 'Submit' })).toBeEnabled()
Scene.expect(Scene.role('checkbox')).toBeChecked()
Scene.expect(Scene.label('Email')).toHaveAttr('type', 'email')
Scene.expect(Scene.role('button')).toHaveClass('primary')
Scene.expect(Scene.role('alert')).toHaveStyle('color', 'red')
Scene.expect(Scene.role('button')).not.toBeDisabled()

// Run the scene. Throws on unresolved Commands.
Scene.scene(
  { update, view },
  Scene.with(model),
  Scene.type(Scene.label('Email'), 'alice@example.com'),
  Scene.submit(Scene.role('form')),
  Scene.resolve(Authenticate, SucceededAuthenticate({ session })),
  Scene.expect(Scene.role('heading')).toHaveText('Welcome, alice!'),
)
