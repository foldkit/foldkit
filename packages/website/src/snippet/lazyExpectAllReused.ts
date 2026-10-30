import { Lazy } from 'foldkit/test'
import { test } from 'vitest'

import { view } from './dashboard'
import { initialModel } from './dashboard.fixture'

test('reuses lazy views for an unchanged Model', () => {
  Lazy.expectAllReused({ view, model: initialModel })
})
