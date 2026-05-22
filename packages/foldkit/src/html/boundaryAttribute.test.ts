import { describe, it } from '@effect/vitest'
import { Context } from 'effect'
import { h as snabbdomH } from 'snabbdom'
import { afterEach, beforeEach, expect } from 'vitest'

import { MountTracker } from '../mount/index.js'
import { Dispatch } from '../runtime/index.js'
import {
  type BoundaryRegistry,
  beginRender,
  createBoundaryRegistry,
} from './boundary.js'
import { boundaryAttributes } from './boundaryAttribute.js'
import { html } from './index.js'
import {
  type DispatchSync,
  clearRuntime,
  setRuntime,
} from './runtimeSingleton.js'
import { submodel } from './submodel.js'

const setUpRuntime = (
  registry: BoundaryRegistry,
  dispatched: Array<unknown>,
): void => {
  const dispatchSync: DispatchSync = message => {
    dispatched.push(message)
  }
  const dispatchService = Dispatch.of({
    dispatchAsync: () =>
      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
      Promise.resolve() as unknown as ReturnType<
        typeof Dispatch.Service.dispatchAsync
      >,
    dispatchSync,
  })
  const context = Context.make(Dispatch, dispatchService).pipe(
    Context.add(MountTracker, {
      started: () => {},
      ended: () => {},
    }),
  )
  setRuntime(dispatchSync, context, registry)
}

type ChildClicked = Readonly<{ _tag: 'ChildClicked' }>
type ParentDirect = Readonly<{ _tag: 'ParentDirect' }>
type GotChild = Readonly<{ _tag: 'GotChild'; message: ChildClicked }>

const GotChild = (args: { message: ChildClicked }): GotChild => ({
  _tag: 'GotChild',
  ...args,
})

describe('boundaryAttributes', () => {
  let registry: BoundaryRegistry
  let dispatched: Array<unknown>

  beforeEach(() => {
    registry = createBoundaryRegistry()
    dispatched = []
    setUpRuntime(registry, dispatched)
    beginRender(registry)
  })

  afterEach(() => {
    clearRuntime()
  })

  it('routes a published OnClick through the Submodel boundary even when the consumer builds the element in the parent boundary', () => {
    // This is the scenario the BoundaryAttribute design solves. The
    // Submodel publishes attribute records that the consumer spreads
    // into its own `h.div(...)` in the parent's boundary. Without
    // boundaryAttributes, the handler would close over the parent's
    // dispatcher at vnode-construction time and bypass the Submodel's
    // wrap. With boundaryAttributes, the published attribute carries
    // the child's dispatcher and the runtime routes the handler
    // through Checkbox's wrap.
    const fakeCheckboxView = (_model: object, inputs: { toView: any }) => {
      const h = html<ChildClicked>()
      const checkboxAttributes = [h.OnClick({ _tag: 'ChildClicked' })]
      return inputs.toView({
        checkbox: boundaryAttributes(checkboxAttributes),
      })
    }

    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    const branded = fakeCheckboxView as any

    const result = submodel({
      id: 'fake-checkbox',
      view: branded,
      model: {},
      inputs: {
        toView: (attributes: { checkbox: ReadonlyArray<unknown> }) => {
          const hParent = html<ParentDirect>()
          return hParent.div(
            /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
            [...(attributes.checkbox as any)],
            [],
          )
        },
      },
      toParentMessage: message => GotChild({ message }),
    })

    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    const onClick = result?.data?.on?.click as () => void
    onClick()

    expect(dispatched).toEqual([
      {
        _tag: 'GotChild',
        message: { _tag: 'ChildClicked' },
      },
    ])
  })

  it("preserves the consumer's own OnClick alongside published BoundaryAttributes", () => {
    // The consumer can mix its own attributes with the published
    // ones. Each routes through the correct dispatcher: the consumer's
    // OnClick goes unwrapped (parent boundary), the published one
    // routes through the Submodel's wrap.
    const fakeCheckboxView = (_model: object, inputs: { toView: any }) => {
      const h = html<ChildClicked>()
      const checkboxAttributes = [h.OnClick({ _tag: 'ChildClicked' })]
      return inputs.toView({
        checkbox: boundaryAttributes(checkboxAttributes),
      })
    }

    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    const branded = fakeCheckboxView as any

    const result = submodel({
      id: 'fake-checkbox',
      view: branded,
      model: {},
      inputs: {
        toView: (attributes: { checkbox: ReadonlyArray<unknown> }) => {
          const hParent = html<ParentDirect>()
          // Consumer wraps Checkbox's checkbox attributes in a button,
          // adding their own keyup handler. The keyup should dispatch
          // ParentDirect (no wrap); the click should dispatch
          // GotChild({ ChildClicked }).
          return hParent.button(
            [
              /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
              ...(attributes.checkbox as any),
              hParent.OnKeyPress(() => ({
                _tag: 'ParentDirect' as const,
              })),
            ],
            [],
          )
        },
      },
      toParentMessage: message => GotChild({ message }),
    })

    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    const onClick = result?.data?.on?.click as () => void
    onClick()

    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    const onKeyPress = result?.data?.on?.keypress as (e: KeyboardEvent) => void
    onKeyPress(
      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
      {
        key: 'a',
        shiftKey: false,
        ctrlKey: false,
        altKey: false,
        metaKey: false,
      } as KeyboardEvent,
    )

    expect(dispatched).toEqual([
      {
        _tag: 'GotChild',
        message: { _tag: 'ChildClicked' },
      },
      { _tag: 'ParentDirect' },
    ])
  })

  it('binds each attribute group to the boundary that called boundaryAttributes', () => {
    // Two Submodels publish separate attribute groups. Each group's
    // handlers route through its own Submodel's wrap, not the other's.
    // When both publish a handler for the same DOM event (here, click),
    // both fire in spread order with their own wrap applied.
    type FirstChild = Readonly<{ _tag: 'FirstChild' }>
    type SecondChild = Readonly<{ _tag: 'SecondChild' }>
    type GotFirst = Readonly<{ _tag: 'GotFirst'; message: FirstChild }>
    type GotSecond = Readonly<{ _tag: 'GotSecond'; message: SecondChild }>

    const GotFirst = (args: { message: FirstChild }): GotFirst => ({
      _tag: 'GotFirst',
      ...args,
    })
    const GotSecond = (args: { message: SecondChild }): GotSecond => ({
      _tag: 'GotSecond',
      ...args,
    })

    let firstAttributes: ReadonlyArray<unknown> = []
    let secondAttributes: ReadonlyArray<unknown> = []

    submodel({
      id: 'first',
      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
      view: ((_: object, inputs: { capture: any }) => {
        const h = html<FirstChild>()
        firstAttributes = boundaryAttributes([
          h.OnClick({ _tag: 'FirstChild' }),
        ])
        inputs.capture(firstAttributes)
        return snabbdomH('span')
      }) as any,
      model: {},
      inputs: {
        capture: (attrs: ReadonlyArray<unknown>) => {
          firstAttributes = attrs
        },
      },
      toParentMessage: message => GotFirst({ message }),
    })

    submodel({
      id: 'second',
      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
      view: ((_: object, inputs: { capture: any }) => {
        const h = html<SecondChild>()
        secondAttributes = boundaryAttributes([
          h.OnClick({ _tag: 'SecondChild' }),
        ])
        inputs.capture(secondAttributes)
        return snabbdomH('span')
      }) as any,
      model: {},
      inputs: {
        capture: (attrs: ReadonlyArray<unknown>) => {
          secondAttributes = attrs
        },
      },
      toParentMessage: message => GotSecond({ message }),
    })

    // Build a parent vnode using both attribute sets and verify each
    // routes correctly.
    const hParent = html<ParentDirect>()
    const merged = hParent.div(
      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
      [...firstAttributes, ...secondAttributes] as any,
      [],
    )

    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    const onClick = merged?.data?.on?.click as () => void
    onClick()

    expect(dispatched).toEqual([
      { _tag: 'GotFirst', message: { _tag: 'FirstChild' } },
      { _tag: 'GotSecond', message: { _tag: 'SecondChild' } },
    ])
  })

  it("fires both the published BoundaryAttribute OnClick and the consumer's own OnClick on the same element", () => {
    // Regression for the same-event overwrite bug. Previously
    // `updateDataOn` used `Object.assign`, so a consumer spreading a
    // published BoundaryAttribute OnClick alongside their own OnClick
    // would silently drop one of the two. The chained behavior fires
    // both in spread order, each through the correct dispatch chain.
    const fakeView = (_model: object, inputs: { toView: any }) => {
      const h = html<ChildClicked>()
      return inputs.toView({
        attrs: boundaryAttributes([h.OnClick({ _tag: 'ChildClicked' })]),
      })
    }

    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    const branded = fakeView as any

    const result = submodel({
      id: 'fake',
      view: branded,
      model: {},
      inputs: {
        toView: (a: { attrs: ReadonlyArray<unknown> }) => {
          const hParent = html<ParentDirect>()
          return hParent.button(
            [
              /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
              ...(a.attrs as any),
              hParent.OnClick({ _tag: 'ParentDirect' }),
            ],
            [],
          )
        },
      },
      toParentMessage: message => GotChild({ message }),
    })

    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    const onClick = result?.data?.on?.click as () => void
    onClick()

    expect(dispatched).toEqual([
      { _tag: 'GotChild', message: { _tag: 'ChildClicked' } },
      { _tag: 'ParentDirect' },
    ])
  })
})
