import { Effect, Option, Predicate, Schema } from 'effect'
import { describe, expect, it, vi } from 'vitest'

import * as Command from '../command/index.js'
import { defineMessageUnion } from '../schema/index.js'
import { modifyFields } from '../struct/index.js'
import { makeResultRecipe } from '../update/operationRecipe.js'
import {
  hasObservableUpdateContext,
  makeCompositionUpdate,
  registerBindingDelivery,
  trackParentMessageMapper,
} from './delivery.js'
import { assertRegisteredBinding } from './operationGraph.js'

const Model = Schema.Struct({ count: Schema.Number, isAllowed: Schema.Boolean })
type Model = typeof Model.Type
const ChildMessage = defineMessageUnion({
  ChangedCount: { amount: Schema.Number },
})
const Message = defineMessageUnion({
  ClickedAdd: {},
  ClickedReset: {},
  CompletedRecordCount: {},
  GotCounterMessage: { message: ChildMessage },
})
type Message = typeof Message.Type
const Envelope = Schema.Struct({ message: ChildMessage })
const BeforeFrame = Schema.Struct({ before: Model })
type BeforeFrame = typeof BeforeFrame.Type
const initialModel = Model.make({ count: 1, isAllowed: false })
const RecordCount = Command.define('ComposedRuntime/RecordCount', {
  messages: [Message.CompletedRecordCount],
  handler: function* () {
    return () => Effect.succeed(Message.CompletedRecordCount())
  },
})

type RuntimeHandler = (...args: ReadonlyArray<never>) => unknown

type RuntimeMethod = ReturnType<
  ReturnType<typeof makeCompositionUpdate>['withContext']
>

const requireMethod = (target: object, name: string): RuntimeMethod => {
  const method = Reflect.get(target, name)

  if (!Predicate.isFunction(method)) {
    throw new Error(`Missing runtime update method ${name}.`)
  }

  return method
}

const makeRuntimeUpdates = (
  ...args: Parameters<typeof makeCompositionUpdate>
) => {
  const update = makeCompositionUpdate(...args)
  const cases = requireMethod(update, 'cases')
  const contextualCases = requireMethod(cases, 'withContext')
  const each = requireMethod(update, 'each')
  const on = requireMethod(update, 'on')
  const except = requireMethod(update, 'except')
  const routeChildren = requireMethod(update, 'routeChildren')
  const compose = requireMethod(update, 'compose')

  return Object.assign(update, {
    cases: Object.assign(
      (record: object) => Reflect.apply(cases, update, [record]),
      {
        withContext: (factory: RuntimeHandler) =>
          Reflect.apply(contextualCases, cases, [factory]),
      },
    ),
    each: (handler: RuntimeHandler) => Reflect.apply(each, update, [handler]),
    on: (tags: ReadonlyArray<string>, handler: RuntimeHandler) =>
      Reflect.apply(on, update, [tags, handler]),
    except: (tags: ReadonlyArray<string>, handler: RuntimeHandler) =>
      Reflect.apply(except, update, [tags, handler]),
    routeChildren: () => Reflect.apply(routeChildren, update, []),
    compose: (...pieces: ReadonlyArray<object>) =>
      Reflect.apply(compose, update, pieces),
  })
}

const makeFixture = () => {
  const events: Array<string> = []
  const tracked = trackParentMessageMapper(
    (message: typeof ChildMessage.Type) =>
      Message.GotCounterMessage({ message }),
  )
  const binding = {
    placement: 'counter',
    fold: vi.fn((model: Model, amount: number) => {
      assertRegisteredBinding(binding, 'counter')
      events.push(`route:${model.count}`)

      return makeResultRecipe((current: Model) => ({
        model: modifyFields(current, { count: count => count + amount }),
        outMessage: { _tag: 'ReportedCount', count: current.count + amount },
      }))
    }),
  }
  const args = vi.fn((model: unknown, message: unknown) => {
    const current = Schema.decodeUnknownSync(Model)(model)
    const childMessage = Schema.decodeUnknownSync(Envelope)(message).message

    return current.isAllowed
      ? Option.some([childMessage.amount])
      : Option.none()
  })
  registerBindingDelivery(binding, tracked, {
    outgoingParentMessage: Message.GotCounterMessage,
    fromParentMessage: { parentMessage: Message.GotCounterMessage, args },
  })
  const makeUpdate = makeRuntimeUpdates(Message, [binding])
  const base = makeUpdate({
    ClickedAdd: (model: Model) => ({
      model: modifyFields(model, { count: count => count + 2 }),
    }),
    ClickedReset: (model: Model) => ({
      model: modifyFields(model, { count: () => 0 }),
    }),
    CompletedRecordCount: (model: Model) => ({ model }),
  })

  return { makeUpdate, base, tracked, binding, args, events }
}

describe('checked update composition runtime spike', () => {
  it('runs one full anchor at its stated position and resolves each current Model once', () => {
    const fixture = makeFixture()
    const { makeUpdate } = fixture
    const resolutions: Array<Model> = []
    const pre = vi.fn((model: Model, _message: Message, frame: BeforeFrame) => {
      expect(frame.before).toBe(initialModel)
      fixture.events.push(`pre:${model.count}`)

      return (stepModel: Model) =>
        makeResultRecipe((current: Model) => {
          resolutions.push(current)
          expect(current).toBe(stepModel)
          return {
            model: modifyFields(current, {
              count: count => count + 10,
              isAllowed: () => true,
            }),
          }
        })
    })
    const post = vi.fn(
      (model: Model, _message: Message, frame: BeforeFrame) => {
        expect(frame.before).toBe(initialModel)
        fixture.events.push(`post:${model.count}`)
        return { model: modifyFields(model, { count: count => count * 2 }) }
      },
    )
    const update = makeUpdate.compose(
      makeUpdate.each(pre),
      fixture.base,
      makeUpdate.each(post),
    )
    expect(pre).not.toHaveBeenCalled()
    expect(post).not.toHaveBeenCalled()
    expect(fixture.binding.fold).not.toHaveBeenCalled()

    const child = fixture.tracked.toParentMessage(
      ChildMessage.ChangedCount({ amount: 4 }),
    )
    const routed = update(initialModel, child)
    expect(routed.model.count).toBe(30)
    expect(routed.outMessage).toEqual({ _tag: 'ReportedCount', count: 15 })
    expect(fixture.events).toEqual(['pre:1', 'route:11', 'post:15'])
    expect(fixture.args).toHaveBeenCalledWith(
      { count: 11, isAllowed: true },
      child,
    )
    expect(fixture.binding.fold).toHaveBeenCalledTimes(1)
    expect(pre).toHaveBeenCalledTimes(1)
    expect(post).toHaveBeenCalledTimes(1)
    expect(resolutions).toEqual([initialModel])

    fixture.events.splice(0)
    const local = update(initialModel, Message.ClickedAdd())
    expect(local.model.count).toBe(26)
    expect(local.outMessage).toBeUndefined()
    expect(fixture.events).toEqual(['pre:1', 'post:13'])
    expect(fixture.binding.fold).toHaveBeenCalledTimes(1)
    expect(resolutions).toEqual([initialModel, initialModel])
    expect(makeUpdate.complete(update)).toBe(update)
  })

  it('supports explicit routing, sparse cases, on and except with collective local coverage', () => {
    const { makeUpdate, tracked, binding } = makeFixture()
    const onAdd = vi.fn((model: Model) => ({
      model: modifyFields(model, { count: count => count + 2 }),
    }))
    const exceptAdd = vi.fn((model: Model) => ({
      model: modifyFields(model, { count: count => count + 3 }),
    }))
    const update = makeUpdate.compose(
      makeUpdate.cases({
        ClickedAdd: (model: Model) => ({ model }),
        ClickedReset: (model: Model) => ({ model }),
        CompletedRecordCount: (model: Model) => ({ model }),
      }),
      makeUpdate.on(['ClickedAdd'], onAdd),
      makeUpdate.routeChildren(),
      makeUpdate.except(['ClickedAdd'], exceptAdd),
    )
    expect(update(initialModel, Message.ClickedAdd()).model.count).toBe(3)
    expect(update(initialModel, Message.ClickedReset()).model.count).toBe(4)
    const child = tracked.toParentMessage(
      ChildMessage.ChangedCount({ amount: 4 }),
    )
    expect(
      update(modifyFields(initialModel, { isAllowed: () => true }), child).model
        .count,
    ).toBe(8)
    expect(onAdd).toHaveBeenCalledTimes(1)
    expect(exceptAdd).toHaveBeenCalledTimes(2)
    expect(binding.fold).toHaveBeenCalledTimes(1)

    const records = makeUpdate.compose(
      makeUpdate.cases({
        ClickedAdd: (model: Model) => ({
          model: modifyFields(model, { count: count => count + 1 }),
        }),
      }),
      makeUpdate.routeChildren(),
      makeUpdate.cases({
        ClickedReset: (model: Model) => ({ model }),
        CompletedRecordCount: (model: Model) => ({ model }),
      }),
    )
    expect(records(initialModel, Message.ClickedAdd()).model.count).toBe(2)
  })

  it('flattens nested recipes with one outer original Model and retains Command identities in order', () => {
    const { makeUpdate, base } = makeFixture()
    const frames: Array<BeforeFrame> = []
    const first = RecordCount()
    const second = RecordCount()
    const inner = makeUpdate.compose(
      makeUpdate.each((model: Model, _message: Message, frame: BeforeFrame) => {
        frames.push(frame)
        return {
          model: modifyFields(model, { count: count => count * 2 }),
          commands: [first],
        }
      }),
      base,
      makeUpdate.each((model: Model, _message: Message, frame: BeforeFrame) => {
        frames.push(frame)
        return {
          model: modifyFields(model, { count: count => count + 3 }),
          commands: [second],
        }
      }),
    )
    const outer = makeUpdate.compose(
      makeUpdate.each((model: Model) => ({
        model: modifyFields(model, { count: count => count + 5 }),
      })),
      inner,
      makeUpdate.each((model: Model) => ({
        model: modifyFields(model, { count: count => count * 2 }),
      })),
    )
    expect(frames).toEqual([])
    const result = outer(initialModel, Message.ClickedAdd())
    expect(result.model.count).toBe(34)
    expect(frames).toHaveLength(2)
    expect(frames.every(frame => frame.before === initialModel)).toBe(true)
    expect(new Set(frames).size).toBe(1)
    expect(result.commands).toEqual([first, second])
    expect(result.commands?.at(0)).toBe(first)
    expect(result.commands?.at(1)).toBe(second)
  })

  it('groups zero-anchor bundles without changing Models, Messages, snapshots or Command order', () => {
    const { makeUpdate, tracked, binding } = makeFixture()
    const visits: Array<
      Readonly<{
        stage: string
        model: Model
        message: Message
        frame: BeforeFrame
      }>
    > = []
    const first = RecordCount()
    const second = RecordCount()
    const third = RecordCount()
    const fourth = RecordCount()
    const pre = makeUpdate.each(
      (
        model: Model,
        message: Message,
        frame: BeforeFrame,
        amount = 2,
        ...parts: ReadonlyArray<string>
      ) => {
        visits.push({ stage: 'Pre', model, message, frame })
        return {
          model: modifyFields(model, {
            count: count => count + amount + parts.length,
            isAllowed: () => true,
          }),
          commands: [first],
        }
      },
    )
    const selected = makeUpdate.on(['ClickedAdd'], (model: Model) => ({
      model: modifyFields(model, { count: count => count * 2 }),
      commands: [second],
    }))
    const full = makeUpdate.withContext(
      (amount = 2, ..._parts: ReadonlyArray<string>) => ({
        ClickedAdd: (model: Model) => ({
          model: modifyFields(model, { count: count => count + amount }),
        }),
        ClickedReset: (model: Model) => ({
          model: modifyFields(model, { count: () => 0 }),
        }),
        CompletedRecordCount: (model: Model) => ({ model }),
      }),
    )
    const local = makeUpdate.cases({
      ClickedAdd: (model: Model) => ({
        model: modifyFields(model, { count: count => count + 3 }),
        commands: [third],
      }),
    })
    const post = makeUpdate.each(
      (model: Model, message: Message, frame: BeforeFrame) => {
        visits.push({ stage: 'Post', model, message, frame })
        return {
          model: modifyFields(model, { count: count => count * 3 }),
          commands: [fourth],
        }
      },
    )
    const before = makeUpdate.compose(pre, makeUpdate.compose(selected))
    const after = makeUpdate.compose(makeUpdate.compose(local), post)
    const grouped = makeUpdate.compose(
      makeUpdate.compose(before, full),
      makeUpdate.compose(after),
    )
    const flat = makeUpdate.compose(pre, selected, full, local, post)
    expect(visits).toEqual([])
    expect(binding.fold).not.toHaveBeenCalled()
    expect(() => makeUpdate.complete(before)).toThrow('before completion')
    expect(() =>
      before(initialModel, Message.ClickedAdd(), 4, 'A', 'B'),
    ).toThrow('before execution')
    expect(visits).toEqual([])

    const clicked = Message.ClickedAdd()
    const flatLocal = flat(initialModel, clicked, 4, 'A', 'B')
    const groupedLocal = grouped(clicked)(initialModel, 4, 'A', 'B')
    expect(groupedLocal).toEqual(flatLocal)
    expect(groupedLocal.model.count).toBe(63)
    expect(groupedLocal.commands).toHaveLength(4)
    expect(groupedLocal.commands?.at(0)).toBe(first)
    expect(groupedLocal.commands?.at(1)).toBe(second)
    expect(groupedLocal.commands?.at(2)).toBe(third)
    expect(groupedLocal.commands?.at(3)).toBe(fourth)
    expect(
      visits.every(
        visit =>
          visit.message === clicked && visit.frame.before === initialModel,
      ),
    ).toBe(true)
    expect(new Set(visits.map(visit => visit.frame)).size).toBe(2)
    expect(visits.map(visit => [visit.stage, visit.model.count])).toEqual([
      ['Pre', 1],
      ['Post', 21],
      ['Pre', 1],
      ['Post', 21],
    ])

    visits.splice(0)
    const child = tracked.toParentMessage(
      ChildMessage.ChangedCount({ amount: 5 }),
    )
    const flatChild = flat(initialModel, child, 4, 'A', 'B')
    const groupedChild = grouped(initialModel, child, 4, 'A', 'B')
    expect(groupedChild).toEqual(flatChild)
    expect(groupedChild.model.count).toBe(36)
    expect(groupedChild.outMessage).toEqual({
      _tag: 'ReportedCount',
      count: 12,
    })
    expect(groupedChild.commands).toHaveLength(2)
    expect(groupedChild.commands?.at(0)).toBe(first)
    expect(groupedChild.commands?.at(1)).toBe(fourth)
    expect(
      visits.every(
        visit => visit.message === child && visit.frame.before === initialModel,
      ),
    ).toBe(true)
    expect(visits.map(visit => [visit.stage, visit.model.count])).toEqual([
      ['Pre', 1],
      ['Post', 12],
      ['Pre', 1],
      ['Post', 12],
    ])
    expect(binding.fold).toHaveBeenCalledTimes(2)
    expect(makeUpdate.complete(grouped)).toBe(grouped)
  })

  it('admits only covered single-anchor roots while allowing incomplete groups to be completed later', () => {
    const { makeUpdate, base } = makeFixture()
    const other = makeFixture()
    const handler = vi.fn((model: Model) => ({ model }))
    const local = makeUpdate.compose(makeUpdate.cases({ ClickedAdd: handler }))
    const routed = makeUpdate.compose(local, makeUpdate.routeChildren())
    const remaining = makeUpdate.compose(
      makeUpdate.cases({ ClickedReset: handler }),
      makeUpdate.cases({ CompletedRecordCount: handler }),
    )
    expect(() => makeUpdate.complete(local)).toThrow(
      'exactly one child routing anchor',
    )
    expect(() => makeUpdate.complete(routed)).toThrow('collectively handle')
    expect(() => local(initialModel, Message.ClickedAdd())).toThrow(
      'before execution',
    )
    expect(() => routed(initialModel, Message.ClickedAdd())).toThrow(
      'collectively handle',
    )
    expect(handler).not.toHaveBeenCalled()
    const complete = makeUpdate.compose(
      makeUpdate.compose(routed),
      makeUpdate.compose(remaining),
    )
    expect(makeUpdate.complete(complete)).toBe(complete)
    expect(complete(initialModel, Message.ClickedReset())).toEqual({
      model: initialModel,
    })
    expect(handler).toHaveBeenCalledTimes(1)
    expect(() => makeUpdate.compose(routed, base)).toThrow(
      'exactly one child routing anchor',
    )
    expect(() =>
      makeUpdate.compose(complete, makeUpdate.routeChildren()),
    ).toThrow('exactly one child routing anchor')
    expect(() =>
      makeUpdate.compose(
        local,
        other.makeUpdate.compose(other.makeUpdate.each(handler)),
      ),
    ).toThrow('belong to this Composition')
    expect(() => makeUpdate.compose({ ...local }, base)).toThrow(
      'belong to this Composition',
    )
  })

  it('preserves default and rest context through direct/curried full and sparse cases', () => {
    const { makeUpdate, tracked } = makeFixture()
    const factory = vi.fn((amount = 2, ...parts: ReadonlyArray<string>) => ({
      ClickedAdd: (model: Model) => ({
        model: modifyFields(model, {
          count: count => count + amount + parts.length,
        }),
      }),
    }))
    const sparse = makeUpdate.compose(
      makeUpdate.routeChildren(),
      makeUpdate.cases.withContext(factory),
      makeUpdate.cases({
        ClickedReset: (model: Model) => ({ model }),
        CompletedRecordCount: (model: Model) => ({ model }),
      }),
    )
    expect(factory).not.toHaveBeenCalled()
    expect(sparse(initialModel, Message.ClickedAdd()).model.count).toBe(3)
    expect(
      sparse(Message.ClickedAdd())(initialModel, 4, 'A', 'B').model.count,
    ).toBe(7)
    const child = tracked.toParentMessage(
      ChildMessage.ChangedCount({ amount: 1 }),
    )
    sparse(modifyFields(initialModel, { isAllowed: () => true }), child, 9)
    expect(factory).toHaveBeenCalledTimes(2)

    const full = makeUpdate.withContext(
      (amount: number, ...parts: ReadonlyArray<string>) => ({
        ClickedAdd: (model: Model) => ({
          model: modifyFields(model, {
            count: count => count + amount + parts.length,
          }),
        }),
        ClickedReset: (model: Model) => ({ model }),
        CompletedRecordCount: (model: Model) => ({ model }),
      }),
    )
    const composed = makeUpdate.compose(
      full,
      makeUpdate.each(
        (
          model: Model,
          _message: Message,
          frame: BeforeFrame,
          amount: number,
          ...parts: ReadonlyArray<string>
        ) => ({
          model: modifyFields(model, {
            count: count => count + frame.before.count + amount + parts.length,
          }),
        }),
      ),
    )
    expect(hasObservableUpdateContext(composed)).toBe(true)
    expect(
      composed(initialModel, Message.ClickedAdd(), 4, 'A').model.count,
    ).toBe(12)
    expect(
      composed(Message.ClickedAdd())(initialModel, 4, 'A').model.count,
    ).toBe(12)
  })

  it('refuses foreign, forged, incomplete and duplicate routing recipes without accepting parts as updates', () => {
    const { makeUpdate, base } = makeFixture()
    expect(() => makeUpdate.compose()).toThrow('requires at least one update')
    const other = makeFixture()
    const all = makeUpdate.each((model: Model) => ({ model }))
    const route = makeUpdate.routeChildren()
    const bundle = makeUpdate.compose(all)
    expect(() => makeUpdate.complete(bundle)).toThrow(
      'exactly one child routing anchor',
    )
    expect(() => makeUpdate.compose(base, route)).toThrow(
      'exactly one child routing anchor',
    )
    expect(() => makeUpdate.compose(base, base)).toThrow(
      'exactly one child routing anchor',
    )
    expect(() => makeUpdate.complete(makeUpdate.compose(route, all))).toThrow(
      'collectively handle',
    )
    expect(() =>
      makeUpdate.complete(
        makeUpdate.compose(
          route,
          makeUpdate.cases({ ClickedAdd: (model: Model) => ({ model }) }),
        ),
      ),
    ).toThrow('collectively handle')
    expect(() => makeUpdate.compose(other.base)).toThrow(
      'belong to this Composition',
    )
    expect(() => makeUpdate.compose({ ...all }, route)).toThrow(
      'belong to this Composition',
    )
    expect(() => Reflect.apply(makeUpdate.complete, undefined, [all])).toThrow(
      'must be authored',
    )
    expect(() =>
      Reflect.apply(makeUpdate.complete, undefined, [
        (model: Model) => ({ model }),
      ]),
    ).toThrow('must be authored')
    expect(() =>
      makeUpdate.on(['GotCounterMessage'], (model: Model) => ({ model })),
    ).toThrow('unknown local tag')
    const deferredMissing = makeUpdate.compose(
      all,
      route,
      makeUpdate.cases.withContext(() => ({})),
    )
    expect(() => deferredMissing(initialModel, Message.ClickedAdd())).toThrow(
      'no handler for local Message',
    )
  })

  it('refuses wrong child provenance and unknown tags before any shared or contextual callback', () => {
    const fixture = makeFixture()
    const other = makeFixture()
    const shared = vi.fn((model: Model) => ({ model }))
    const factory = vi.fn(() => ({
      ClickedAdd: (model: Model) => ({ model }),
      ClickedReset: (model: Model) => ({ model }),
      CompletedRecordCount: (model: Model) => ({ model }),
    }))
    const update = fixture.makeUpdate.compose(
      fixture.makeUpdate.each(shared),
      fixture.makeUpdate.routeChildren(),
      fixture.makeUpdate.cases.withContext(factory),
    )
    const foreign = other.tracked.toParentMessage(
      ChildMessage.ChangedCount({ amount: 1 }),
    )
    expect(() => update(initialModel, foreign)).toThrow('another child Binding')
    expect(() => update(initialModel, { _tag: 'UnknownMessage' })).toThrow(
      'unknown Message tag',
    )
    expect(shared).not.toHaveBeenCalled()
    expect(factory).not.toHaveBeenCalled()
    expect(fixture.binding.fold).not.toHaveBeenCalled()
  })

  it('refuses competing actual OutMessages and preserves ordinary complete update behavior', () => {
    const { makeUpdate, base, tracked, binding } = makeFixture()
    const first = makeUpdate.cases({
      ClickedAdd: (model: Model) => ({
        model,
        outMessage: { _tag: 'First' },
      }),
    })
    const second = makeUpdate.cases({
      ClickedAdd: (model: Model) => ({
        model,
        outMessage: { _tag: 'Second' },
      }),
    })
    expect(() =>
      makeUpdate.compose(
        first,
        base,
        second,
      )(initialModel, Message.ClickedAdd()),
    ).toThrow('competing OutMessages')
    const illegalPolicy = makeUpdate.each(
      (model: Model) => () =>
        makeResultRecipe(() => ({ model, outMessage: { _tag: 'Hidden' } })),
    )
    expect(() =>
      makeUpdate.compose(base, illegalPolicy)(
        initialModel,
        Message.ClickedAdd(),
      ),
    ).toThrow('Shared update policies cannot emit')
    const direct = base(initialModel, Message.ClickedAdd())
    const curried = base(Message.ClickedAdd())(initialModel)
    expect(direct).toEqual(curried)
    expect(direct).toEqual({ model: { count: 3, isAllowed: false } })
    const child = tracked.toParentMessage(
      ChildMessage.ChangedCount({ amount: 2 }),
    )
    expect(base(initialModel, child)).toEqual({ model: initialModel })
    expect(binding.fold).not.toHaveBeenCalled()
  })
})
