import { Option } from 'effect'
import { describe, expect, it } from 'vitest'

import { extractBlockInfo } from './blockPath.js'

describe('extractBlockInfo', () => {
  it('returns an empty path and None for top-level Messages', () => {
    const { blockPath, maybeLeafTag } = extractBlockInfo('ClickedSubmit', {
      _tag: 'ClickedSubmit',
    })
    expect(blockPath).toEqual([])
    expect(maybeLeafTag).toEqual(Option.none())
  })

  it('walks a single-level Got*Message wrapper', () => {
    const inner = { _tag: 'ClickedRow', index: 3 }
    const { blockPath, maybeLeafTag } = extractBlockInfo('GotProductsMessage', {
      _tag: 'GotProductsMessage',
      message: inner,
    })
    expect(blockPath).toEqual(['GotProductsMessage'])
    expect(maybeLeafTag).toEqual(Option.some('ClickedRow'))
  })

  it('walks multi-level nested block chains', () => {
    const leaf = { _tag: 'PressedKey', key: 'Enter' }
    const middle = { _tag: 'GotEditorMessage', message: leaf }
    const outer = { _tag: 'GotPanelMessage', message: middle }
    const { blockPath, maybeLeafTag } = extractBlockInfo(
      'GotPanelMessage',
      outer,
    )
    expect(blockPath).toEqual(['GotPanelMessage', 'GotEditorMessage'])
    expect(maybeLeafTag).toEqual(Option.some('PressedKey'))
  })

  it('returns the path with a None leaf when the inner message is malformed', () => {
    const { blockPath, maybeLeafTag } = extractBlockInfo('GotChildMessage', {
      _tag: 'GotChildMessage',
      message: undefined,
    })
    expect(blockPath).toEqual(['GotChildMessage'])
    expect(maybeLeafTag).toEqual(Option.none())
  })

  it('returns the path with a None leaf when the inner value is not tagged', () => {
    const { blockPath, maybeLeafTag } = extractBlockInfo('GotChildMessage', {
      _tag: 'GotChildMessage',
      message: { plain: 'object' },
    })
    expect(blockPath).toEqual(['GotChildMessage'])
    expect(maybeLeafTag).toEqual(Option.none())
  })

  it('does not classify Messages whose tag does not match the Got*Message pattern', () => {
    const { blockPath, maybeLeafTag } = extractBlockInfo('GotItDone', {
      _tag: 'GotItDone',
      message: { _tag: 'IgnoredInner' },
    })
    expect(blockPath).toEqual([])
    expect(maybeLeafTag).toEqual(Option.none())
  })
})
