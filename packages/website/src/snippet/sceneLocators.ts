import { Scene } from 'foldkit'

Scene.role('button', { name: 'Submit' })
Scene.label('Email')
Scene.text('Welcome back')
Scene.text('Welcome', { exact: false })
Scene.text(/^save \d+ items$/i)
Scene.placeholder('Search...')
Scene.altText('Company logo')
Scene.title('Close dialog')
Scene.testId('cart-summary')
Scene.displayValue('alice@example.com')
Scene.selector('.fallback-class')
