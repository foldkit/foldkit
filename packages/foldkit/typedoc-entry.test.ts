import { Array, Order } from 'effect'
import { describe, expect, test } from 'vitest'

import * as PublicMachine from './src/experimental/machine/public.js'
import * as PublicServer from './src/experimental/server/public.js'
import { Experimental } from './typedoc-entry.js'

const exportNames = (moduleExports: object): ReadonlyArray<string> =>
  Array.sort(Object.keys(moduleExports), Order.String)

describe('TypeDoc entry', () => {
  test('uses the public experimental module boundaries', () => {
    expect(exportNames(Experimental.Machine)).toEqual(
      exportNames(PublicMachine),
    )
    expect(exportNames(Experimental.Server)).toEqual(exportNames(PublicServer))
  })
})
