import { Scene } from 'foldkit'

// Single-element assertions
Scene.expect(Scene.role('heading')).toExist()
Scene.expect(Scene.role('heading')).toHaveText('Welcome')
Scene.expect(Scene.role('heading')).toHaveText(/^Welcome/)
Scene.expect(Scene.role('heading')).toContainText('Welcome')
Scene.expect(Scene.role('dialog')).toBeAbsent()
Scene.expect(Scene.role('status')).toBeVisible()
Scene.expect(Scene.role('status')).toBeEmpty()
Scene.expect(Scene.role('region')).toHaveAccessibleName('User session')
Scene.expect(Scene.label('Email')).toHaveValue('alice@example.com')
Scene.expect(Scene.role('button', { name: 'Submit' })).toBeDisabled()
Scene.expect(Scene.role('button')).not.toBeDisabled()

// Multi-match assertions — count-based
Scene.expectAll(Scene.all.role('row')).toHaveCount(3)
Scene.expectAll(Scene.all.role('alert')).toBeEmpty()
