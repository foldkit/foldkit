import { modifyFields } from 'foldkit/struct'
import { Lazy } from 'foldkit/test'
import { test } from 'vitest'

import { initialModel } from './main'
import { view } from './view'

const cases = [
  {
    name: 'Overview',
    model: modifyFields(initialModel, { activeTab: () => 'Overview' }),
  },
  {
    name: 'Details',
    model: modifyFields(initialModel, { activeTab: () => 'Details' }),
  },
]

test.each(cases)('reuses lazy views on the $name tab', ({ model }) => {
  Lazy.expectAllReused({ view, model })
})
