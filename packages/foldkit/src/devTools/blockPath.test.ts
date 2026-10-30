import { Option } from 'effect'
import { describe, expect, it } from 'vitest'

import { blockMessage } from '../blocks/engine.js'
import { extractBlockInfo } from './blockPath.js'

describe('extractBlockInfo', () => {
  it('returns an empty path and None for root Messages', () => {
    const { blockPath, maybeLeafTag } = extractBlockInfo('ClickedSubmit', {
      _tag: 'ClickedSubmit',
    })
    expect(blockPath).toEqual([])
    expect(maybeLeafTag).toEqual(Option.none())
  })

  it('returns the instance path and child Message tag of a BlockMessage', () => {
    const { blockPath, maybeLeafTag } = extractBlockInfo(
      'BlockMessage',
      blockMessage(['panel', 'editor'], { _tag: 'PressedKey', key: 'Enter' }),
    )
    expect(blockPath).toEqual(['panel', 'editor'])
    expect(maybeLeafTag).toEqual(Option.some('PressedKey'))
  })

  it('returns a keyed collection path as collection name then key', () => {
    const { blockPath, maybeLeafTag } = extractBlockInfo(
      'BlockMessage',
      blockMessage(['rows', 'row-3'], { _tag: 'ClickedIncrement' }),
    )
    expect(blockPath).toEqual(['rows', 'row-3'])
    expect(maybeLeafTag).toEqual(Option.some('ClickedIncrement'))
  })

  it('returns None for the leaf tag when the child Message is untagged', () => {
    const { blockPath, maybeLeafTag } = extractBlockInfo(
      'BlockMessage',
      blockMessage(['home'], 42),
    )
    expect(blockPath).toEqual(['home'])
    expect(maybeLeafTag).toEqual(Option.none())
  })
})
