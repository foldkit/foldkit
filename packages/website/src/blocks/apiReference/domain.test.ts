import { describe, expect, test } from 'vitest'

import { scopedIdBelongsToModule } from './domain'

describe('scopedIdBelongsToModule', () => {
  test('claims a plain item id of the module', () => {
    expect(scopedIdBelongsToModule('function-Http/get', 'Http')).toBe(true)
  })

  test('claims a namespaced item id of the module', () => {
    expect(scopedIdBelongsToModule('function-Http/Task/attempt', 'Http')).toBe(
      true,
    )
  })

  test('rejects an id of another module', () => {
    expect(scopedIdBelongsToModule('const-Html/div', 'Http')).toBe(false)
  })

  test('rejects a module whose name the id merely prefixes', () => {
    expect(scopedIdBelongsToModule('function-Httpx/get', 'Http')).toBe(false)
  })

  test('rejects an id with no kind separator', () => {
    expect(scopedIdBelongsToModule('Http/get', 'Http')).toBe(false)
  })
})
