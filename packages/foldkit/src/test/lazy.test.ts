import { Context, Schema } from 'effect'
import { describe, expect, test } from 'vitest'

import { makeDefinition } from '../block/define.js'
import * as Block from '../block/public.js'
import { block } from '../html/block.js'
import {
  type Html,
  type HtmlBuilder,
  createKeyedLazy,
  createLazy,
  defineView,
  __htmlBuilder as htmlBuilderFor,
  inertHtml as ih,
} from '../html/index.js'
import { observeLazyResolutions } from '../html/lazy.js'
import {
  clearRuntime,
  requireDispatch,
  setRuntime,
} from '../html/runtimeSingleton.js'
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

const failureMessage = (view: View): string => {
  try {
    Lazy.expectAllReused({ view, model })
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

  test('accepts a Composition view with registered child capabilities', () => {
    const lazyTitle = createLazy()

    const ChildComposition = makeDefinition('LazyAssertionChild', {
      Model,
      Message: Schema.Never,
    }).makeComposition()
    const childView = ChildComposition.makeView((model, h) =>
      h.div([], [lazyTitle(titleView, [model.title])]),
    )
    const prepareChild = () =>
      ChildComposition.prepareBlock({
        init: ChildComposition.makeInit(() => ({ model })),
        update: ChildComposition.makeUpdate({}),
        view: childView,
      })
    const child: Block.FromAssemblyWithView<typeof Model, typeof prepareChild> =
      Block.assemble(prepareChild)
    const ParentModel = Schema.Struct({ child: Model })
    type ParentModel = typeof ParentModel.Type
    const ParentDefinition = makeDefinition('LazyAssertionParent', {
      Model: ParentModel,
      Message: Schema.Never,
    })
    const ChildBinding = ParentDefinition.makeBinding(child, { field: 'child' })
    const ParentComposition = ParentDefinition.makeComposition({
      bindings: [ChildBinding],
    })
    const view = ParentComposition.makeView((model, h) =>
      h.block(ChildBinding.embedView({ slotId: 'child', model: model.child })),
    )
    const parentModel = ParentModel.make({ child: model })

    expect(() =>
      Lazy.expectAllReused({ view, model: parentModel }),
    ).not.toThrow()

    if (false) {
      // @ts-expect-error The view's exact parent Model is still required.
      Lazy.expectAllReused({ view, model })
    }
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

  test('reuses lazy views inside Block boundaries across assertions', () => {
    const lazyTitle = createLazy()
    const childView = defineView<Model>((model, h) =>
      h.div([], [lazyTitle(titleView, [model.title])]),
    )
    const view: View = model =>
      block(
        {
          slotId: 'child',
          model,
          view: childView,
          toParentMessage: message => message,
        },
        htmlBuilderFor(),
      )

    expect(() => Lazy.expectAllReused({ view, model })).not.toThrow()
    expect(() => Lazy.expectAllReused({ view, model })).not.toThrow()
  })

  test('reports FrameChanged when a slot is shared across Block boundaries', () => {
    const lazyTitle = createLazy()
    const childView = defineView<Model>((model, h) =>
      h.div([], [lazyTitle(titleView, [model.title])]),
    )
    const view: View = (model, h) =>
      h.div(
        [],
        [
          block(
            {
              slotId: 'first',
              model,
              view: childView,
              toParentMessage: message => message,
            },
            htmlBuilderFor(),
          ),
          block(
            {
              slotId: 'second',
              model,
              view: childView,
              toParentMessage: message => message,
            },
            htmlBuilderFor(),
          ),
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
