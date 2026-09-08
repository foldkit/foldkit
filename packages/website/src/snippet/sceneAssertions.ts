import { all, expect, expectAll, label, role } from 'foldkit/scene'

// Single-element assertions
expect(role('heading')).toExist()
expect(role('heading')).toHaveText('Welcome')
expect(role('heading')).toHaveText(/^Welcome/)
expect(role('heading')).toContainText('Welcome')
expect(role('dialog')).toBeAbsent()
expect(role('status')).toBeVisible()
expect(role('status')).toBeEmpty()
expect(role('region')).toHaveAccessibleName('User session')
expect(label('Email')).toHaveValue('alice@example.com')
expect(role('button', { name: 'Submit' })).toBeDisabled()
expect(role('button')).not.toBeDisabled()

// Multi-match assertions — count-based
expectAll(all.role('row')).toHaveCount(3)
expectAll(all.role('alert')).toBeEmpty()
