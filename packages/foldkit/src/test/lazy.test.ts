import { Context, Schema } from 'effect'
import { describe, expect, test } from 'vitest'

import {
  type Html,
  type HtmlBuilder,
  createKeyedLazy,
  createLazy,
  defineView,
  inertHtml as ih,
} from '../html/index.js'
import { observeLazyResolutions } from '../html/lazy.js'
import {
  clearRuntime,
  requireDispatch,
  setRuntime,
} from '../html/runtimeSingleton.js'
import { modifyFields } from '../struct/index.js'
import * as Lazy from './lazy.js'

const Row = Schema.Struct({ id: Schema.String, label: Schema.String })
type Row = typeof Row.Type
const Model = Schema.Struct({ title: Schema.String, rows: Schema.Array(Row) })
type Model = typeof Model.Type
type View = (model: Model, h: HtmlBuilder<never>) => Html

const model = Model.make({
  title: 'Rows',
  rows: [
    { id: 'row-1', label: 'One' },
    { id: 'row-2', label: 'Two' },
  ],
})

const EMPTY_SELECTION: ReadonlyArray<string> = []

const titleView = (title: string): Html => ih.h1([], [title])

const rowView = (row: Row, selection: ReadonlyArray<string>): Html =>
  ih.li([], [row.label, selection.join(',')])

const failureMessage = (view: View, nextModel?: Model): string => {
  try {
    Lazy.expectAllReused(
      nextModel === undefined ? { view, model } : { view, model, nextModel },
    )
  } catch (error) {
    if (error instanceof Error) {
      return error.message
    }
  }
  throw new Error('Lazy.expectAllReused did not throw')
}

describe('Lazy.expectAllReused', () => {
  test('passes when the view functions and arguments are unchanged', () => {
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

  test('reuses keyed rows across an unrelated Model change', () => {
    const lazyRows = createKeyedLazy()
    const renderedModels: Array<Model> = []
    const view: View = (model, h) => {
      renderedModels.push(model)

      return h.div(
        [],
        [
          h.h1([], [model.title]),
          h.ul(
            [],
            model.rows.map(row =>
              lazyRows(row.id, rowView, [row, EMPTY_SELECTION]),
            ),
          ),
        ],
      )
    }
    const nextModel = modifyFields(model, { title: () => 'Updated rows' })

    expect(() => Lazy.expectAllReused({ view, model, nextModel })).not.toThrow()
    expect(renderedModels).toEqual([model, nextModel])
  })

  test('reports changed arguments across a Model transition', () => {
    const lazyRows = createKeyedLazy()
    const view: View = (model, h) =>
      h.ul(
        [],
        model.rows.map(row =>
          lazyRows(row.id, rowView, [row, EMPTY_SELECTION]),
        ),
      )
    const nextModel = modifyFields(model, {
      rows: rows =>
        rows.map(row =>
          row.id === 'row-2'
            ? modifyFields(row, { label: () => 'Updated two' })
            : row,
        ),
    })

    expect(failureMessage(view, nextModel)).toBe(
      [
        '1 lazy cache miss on the second render with nextModel:',
        '',
        '  slot 1, key "row-2": ArgumentsChanged at index 0',
        '',
        '  ArgumentsChanged: Reuse the same objects, arrays, and functions when their values have not changed.',
      ].join('\n'),
    )
  })

  test('throws when nextModel renders no lazy content', () => {
    const lazyRows = createKeyedLazy()
    const view: View = (model, h) =>
      h.ul(
        [],
        model.rows.map(row =>
          lazyRows(row.id, rowView, [row, EMPTY_SELECTION]),
        ),
      )
    const nextModel = modifyFields(model, { rows: () => [] })

    expect(failureMessage(view, nextModel)).toBe(
      'The second render made no lazy calls. Choose a Model that renders ' +
        'the memoized content you want to test.',
    )
  })

  test('reports a slot created during the view as NoCachedEntry', () => {
    const view: View = (model, h) =>
      h.div([], [createLazy()(titleView, [model.title])])

    expect(failureMessage(view)).toBe(
      [
        '1 lazy cache miss on the second render with the same Model:',
        '',
        '  slot 1: NoCachedEntry',
        '',
        '  NoCachedEntry: Create the slot at module scope. Use a stable key for each rendered item or position.',
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

  test('numbers slots by their first call and reports misses for each key', () => {
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
        '2 lazy cache misses on the second render with the same Model:',
        '',
        '  slot 2, key "row-1": ArgumentsChanged at indices 0, 1',
        '  slot 2, key "row-2": ArgumentsChanged at indices 0, 1',
        '',
        '  ArgumentsChanged: Reuse the same objects, arrays, and functions when their values have not changed.',
      ].join('\n'),
    )
  })

  test('reports the index of each changed argument', () => {
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

  test('throws when the second render makes no lazy calls', () => {
    const view: View = (model, h) => h.h1([], [model.title])

    expect(failureMessage(view)).toBe(
      'The second render made no lazy calls. Choose a Model that renders ' +
        'the memoized content you want to test.',
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

  test('reuses lazy views inside Submodel boundaries across assertions', () => {
    const lazyTitle = createLazy()
    const childView = defineView<Model>((model, h) =>
      h.div([], [lazyTitle(titleView, [model.title])]),
    )
    const view: View = (model, h) =>
      h.submodel({
        slotId: 'child',
        model,
        view: childView,
        toParentMessage: message => message,
      })

    expect(() => Lazy.expectAllReused({ view, model })).not.toThrow()
    expect(() => Lazy.expectAllReused({ view, model })).not.toThrow()
  })

  test('reports FrameChanged when a slot is shared across Submodel boundaries', () => {
    const lazyTitle = createLazy()
    const childView = defineView<Model>((model, h) =>
      h.div([], [lazyTitle(titleView, [model.title])]),
    )
    const view: View = (model, h) =>
      h.div(
        [],
        [
          h.submodel({
            slotId: 'first',
            model,
            view: childView,
            toParentMessage: message => message,
          }),
          h.submodel({
            slotId: 'second',
            model,
            view: childView,
            toParentMessage: message => message,
          }),
        ],
      )

    expect(failureMessage(view)).toContain('slot 1: FrameChanged')
  })

  test('checks nested lazy calls when the child view is tested directly', () => {
    const lazyOuter = createLazy()
    const lazyInner = createLazy()
    const childView: View = (model, h) =>
      h.div([], [lazyInner((title: string) => titleView(title), [model.title])])
    const view: View = (model, h) => lazyOuter(childView, [model, h])

    expect(() => Lazy.expectAllReused({ view, model })).not.toThrow()
    expect(() => Lazy.expectAllReused({ view: childView, model })).toThrow(
      'FunctionChanged',
    )
  })

  test('restores the runtime and observer when the second render throws', () => {
    const lazyTitle = createLazy()
    let renderCount = 0
    const view: View = (model, h) => {
      renderCount++
      const body = h.div([], [lazyTitle(titleView, [model.title])])

      if (renderCount === 2) {
        throw new Error('View failed')
      }

      return body
    }
    const outerDispatch = () => {}
    const resolutions: Array<unknown> = []
    setRuntime(outerDispatch, Context.empty())

    try {
      observeLazyResolutions(
        resolution => {
          resolutions.push(resolution)
        },
        () => {
          expect(() => Lazy.expectAllReused({ view, model })).toThrow(
            'View failed',
          )
          expect(requireDispatch()).toBe(outerDispatch)
          createLazy()(titleView, [model.title])
        },
      )

      expect(resolutions).toHaveLength(2)
    } finally {
      clearRuntime()
    }
  })
})
