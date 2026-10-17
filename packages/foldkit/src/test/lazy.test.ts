import { describe, expect, test } from 'vitest'

import {
  type Html,
  type HtmlBuilder,
  createKeyedLazy,
  createLazy,
  inertHtml as ih,
} from '../html/index.js'
import { observeLazyResolutions } from '../html/lazy.js'
import * as Lazy from './lazy.js'

type Row = Readonly<{ id: string; label: string }>
type Model = Readonly<{ title: string; rows: ReadonlyArray<Row> }>
type View = (model: Model, h: HtmlBuilder<never>) => Html

const model: Model = {
  title: 'Rows',
  rows: [
    { id: 'row-1', label: 'One' },
    { id: 'row-2', label: 'Two' },
  ],
}

const EMPTY_SELECTION: ReadonlyArray<string> = []

const titleView = (title: string): Html => ih.h1([], [title])

const rowView = (row: Row, selection: ReadonlyArray<string>): Html =>
  ih.li([], [row.label, selection.join(',')])

const failureMessage = (view: View): string => {
  try {
    Lazy.expectAllReused({ view, model })
  } catch (error) {
    if (error instanceof Error) {
      return error.message
    }
  }
  throw new Error('expected Lazy.expectAllReused to throw')
}

describe('Lazy.expectAllReused', () => {
  test('passes when every slot reuses its cached view', () => {
    const lazyTitle = createLazy()
    const lazyRows = createKeyedLazy()
    const view: View = (model, h) =>
      h.div(
        [],
        [
          lazyTitle(titleView, [model.title]),
          h.ul(
            [],
            model.rows.map(row =>
              lazyRows(row.id, rowView, [row, EMPTY_SELECTION]),
            ),
          ),
        ],
      )

    expect(() => Lazy.expectAllReused({ view, model })).not.toThrow()
  })

  test('reports a slot created during the view as NoCachedEntry', () => {
    const view: View = (model, h) =>
      h.div([], [createLazy()(titleView, [model.title])])

    expect(failureMessage(view)).toBe(
      [
        'Expected every lazy slot to reuse its cached view when the same Model renders twice, but 1 lazy slot rebuilt:',
        '',
        '  slot 1: NoCachedEntry',
        '',
        '  NoCachedEntry: Create the slot at module scope and key keyed slots by a stable Model id.',
      ].join('\n'),
    )
  })

  test('reports an inline view function as FunctionChanged', () => {
    const lazyTitle = createLazy()
    const view: View = (model, h) =>
      h.div(
        [],
        [lazyTitle((title: string) => h.h1([], [title]), [model.title])],
      )

    expect(failureMessage(view)).toContain('  slot 1: FunctionChanged')
  })

  test('numbers slots in render order and reports each keyed miss', () => {
    const lazyTitle = createLazy()
    const lazyRows = createKeyedLazy()
    const view: View = (model, h) =>
      h.div(
        [],
        [
          lazyTitle(titleView, [model.title]),
          h.ul(
            [],
            model.rows.map(row =>
              lazyRows(row.id, rowView, [{ ...row }, [row.id]]),
            ),
          ),
        ],
      )

    expect(failureMessage(view)).toContain(
      [
        'but 2 lazy slots rebuilt:',
        '',
        '  slot 2, key "row-1": ArgumentsChanged at index 0, 1',
        '  slot 2, key "row-2": ArgumentsChanged at index 0, 1',
        '',
        '  ArgumentsChanged: Pass Model values, not objects, arrays, or closures created during the view.',
      ].join('\n'),
    )
  })

  test('reports only the arguments that changed', () => {
    const lazyRows = createKeyedLazy()
    const view: View = (model, h) =>
      h.ul(
        [],
        model.rows.map(row => lazyRows(row.id, rowView, [row, [row.id]])),
      )

    expect(failureMessage(view)).toContain(
      '  slot 1, key "row-1": ArgumentsChanged at index 1',
    )
  })

  test('lists one hint per reason', () => {
    const lazyTitle = createLazy()
    const view: View = (model, h) =>
      h.div(
        [],
        [
          createLazy()(titleView, [model.title]),
          createLazy()(titleView, [model.title]),
          lazyTitle((title: string) => h.h1([], [title]), [model.title]),
        ],
      )

    const message = failureMessage(view)

    expect(message).toContain(
      '  slot 1: NoCachedEntry\n  slot 2: NoCachedEntry\n  slot 3: FunctionChanged',
    )
    expect(message.match(/ {2}NoCachedEntry:/g)).toHaveLength(1)
    expect(message.match(/ {2}FunctionChanged:/g)).toHaveLength(1)
  })

  test('throws when the view renders no lazy slots', () => {
    const view: View = (model, h) => h.h1([], [model.title])

    expect(failureMessage(view)).toBe(
      'Expected the view to render at least one lazy slot, but it rendered ' +
        'none. Check that this Model reaches the createLazy or ' +
        'createKeyedLazy calls under test.',
    )
  })

  test('restores an enclosing observer after the assertion', () => {
    const lazyTitle = createLazy()
    const view: View = (model, h) =>
      h.div([], [lazyTitle(titleView, [model.title])])
    const outerResolutions: Array<unknown> = []

    observeLazyResolutions(
      resolution => {
        outerResolutions.push(resolution)
      },
      () => Lazy.expectAllReused({ view, model }),
    )

    expect(outerResolutions).toHaveLength(1)
  })
})
