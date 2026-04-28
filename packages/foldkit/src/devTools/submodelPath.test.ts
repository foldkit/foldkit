import { Option } from 'effect'
import { describe, expect, it } from 'vitest'

import { extractSubmodelInfo } from './submodelPath.js'

describe('extractSubmodelInfo', () => {
  it('returns an empty path and None for top-level Messages', () => {
    const { submodelPath, maybeLeafTag } = extractSubmodelInfo(
      'ClickedSubmit',
      { _tag: 'ClickedSubmit' },
    )
    expect(submodelPath).toEqual([])
    expect(maybeLeafTag).toEqual(Option.none())
  })

  it('walks a single-level Got*Message wrapper', () => {
    const inner = { _tag: 'ClickedRow', index: 3 }
    const { submodelPath, maybeLeafTag } = extractSubmodelInfo(
      'GotProductsMessage',
      { _tag: 'GotProductsMessage', message: inner },
    )
    expect(submodelPath).toEqual(['GotProductsMessage'])
    expect(maybeLeafTag).toEqual(Option.some('ClickedRow'))
  })

  it('walks multi-level nested submodel chains', () => {
    const leaf = { _tag: 'PressedKey', key: 'Enter' }
    const middle = { _tag: 'GotEditorMessage', message: leaf }
    const outer = { _tag: 'GotPanelMessage', message: middle }
    const { submodelPath, maybeLeafTag } = extractSubmodelInfo(
      'GotPanelMessage',
      outer,
    )
    expect(submodelPath).toEqual(['GotPanelMessage', 'GotEditorMessage'])
    expect(maybeLeafTag).toEqual(Option.some('PressedKey'))
  })

  it('returns the path with a None leaf when the inner message is malformed', () => {
    const { submodelPath, maybeLeafTag } = extractSubmodelInfo(
      'GotChildMessage',
      { _tag: 'GotChildMessage', message: undefined },
    )
    expect(submodelPath).toEqual(['GotChildMessage'])
    expect(maybeLeafTag).toEqual(Option.none())
  })

  it('returns the path with a None leaf when the inner value is not tagged', () => {
    const { submodelPath, maybeLeafTag } = extractSubmodelInfo(
      'GotChildMessage',
      { _tag: 'GotChildMessage', message: { plain: 'object' } },
    )
    expect(submodelPath).toEqual(['GotChildMessage'])
    expect(maybeLeafTag).toEqual(Option.none())
  })

  it('does not classify Messages whose tag does not match the Got*Message pattern', () => {
    const { submodelPath, maybeLeafTag } = extractSubmodelInfo('GotItDone', {
      _tag: 'GotItDone',
      message: { _tag: 'IgnoredInner' },
    })
    expect(submodelPath).toEqual([])
    expect(maybeLeafTag).toEqual(Option.none())
  })
})
