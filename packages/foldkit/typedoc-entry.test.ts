import { Array, Order } from 'effect'
import { describe, expect, test } from 'vitest'

import * as PublicMapBinding from './src/block/mapBinding.js'
import * as PublicMachine from './src/experimental/machine/public.js'
import * as PublicQuery from './src/experimental/query/public.js'
import * as PublicServer from './src/experimental/server/public.js'
import { Experimental, MapBinding } from './typedoc-entry.js'

const exportNames = (moduleExports: object): ReadonlyArray<string> =>
  Array.sort(Object.keys(moduleExports), Order.String)

describe('TypeDoc entry', () => {
  test('documents the isolated map Binding entrypoint', () => {
    expect(exportNames(MapBinding)).toEqual(exportNames(PublicMapBinding))
  })

  test('uses the public experimental module boundaries', () => {
    expect(exportNames(Experimental.Machine)).toEqual(
      exportNames(PublicMachine),
    )
    expect(exportNames(Experimental.Query)).toEqual(exportNames(PublicQuery))
    expect(exportNames(Experimental.Server)).toEqual(exportNames(PublicServer))
  })
})
