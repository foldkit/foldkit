import { modifyFields } from 'foldkit/struct'
import { Lazy } from 'foldkit/test'
import { test } from 'vitest'

import { initialModel } from './main'
import { view } from './view'

test('reuses rows when only the title changes', () => {
  const nextModel = modifyFields(initialModel, { title: () => 'Updated rows' })

  Lazy.expectAllReused({ view, model: initialModel, nextModel })
})
