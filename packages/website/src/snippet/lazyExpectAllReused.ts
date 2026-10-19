import { Lazy } from 'foldkit/test'
import { test } from 'vitest'

import { initialModel } from './main'
import { view } from './view'

test('reuses lazy views for an unchanged Model', () => {
  Lazy.expectAllReused({ view, model: initialModel })
})
