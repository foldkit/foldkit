import { Option, Schema as S } from 'effect'
import { describe, expect, it } from 'vitest'

import { m } from '../schema/index.js'
import { commandSubmodelPath, extractSubmodelInfo } from './submodelPath.js'

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

describe('commandSubmodelPath', () => {
  const CompletedChildWork = m('CompletedChildWork')
  const ChildMessage = S.Union([CompletedChildWork])
  const GotChildMessage = m('GotChildMessage', { message: ChildMessage })

  const CompletedEditorWork = m('CompletedEditorWork')
  const EditorMessage = S.Union([CompletedEditorWork])
  const GotEditorMessage = m('GotEditorMessage', { message: EditorMessage })
  const PanelMessage = S.Union([GotEditorMessage])
  const GotPanelMessage = m('GotPanelMessage', { message: PanelMessage })

  const WrappedLeaf = m('WrappedLeaf', { payload: ChildMessage })

  // Adapts a validating constructor into the existential
  // `(message: unknown) => unknown` mapper shape that `commandSubmodelPath`
  // folds. The single assertion mirrors the boundary in `Command.mapMessage`,
  // where the recorded chain is typed `(message: unknown) => unknown`.
  const asMapper =
    (construct: (input: never) => unknown) =>
    (message: unknown): unknown =>
      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
      construct(message as never)

  it('returns an empty path for an empty chain', () => {
    expect(commandSubmodelPath([])).toEqual([])
  })

  it('returns an empty path for an undefined chain', () => {
    expect(commandSubmodelPath(undefined)).toEqual([])
  })

  it('recovers a single-level wrapper from one validating constructor', () => {
    expect(
      commandSubmodelPath([asMapper(message => GotChildMessage({ message }))]),
    ).toEqual(['GotChildMessage'])
  })

  it('recovers a nested wrapper path, last mapper applied is outermost', () => {
    expect(
      commandSubmodelPath([
        asMapper(message => GotEditorMessage({ message })),
        asMapper(message => GotPanelMessage({ message })),
      ]),
    ).toEqual(['GotPanelMessage', 'GotEditorMessage'])
  })

  it('returns an empty path when the fold does not produce a Got*Message', () => {
    expect(
      commandSubmodelPath([asMapper(payload => WrappedLeaf({ payload }))]),
    ).toEqual([])
  })
})
