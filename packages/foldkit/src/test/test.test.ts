import { Effect, Match as M, Option, Schema as S } from 'effect'
import { describe, expect, expectTypeOf, test } from 'vitest'

import { define } from '../command'
import { m } from '../message'
import * as Test from './index'

// COUNTER

const ClickedIncrement = m('ClickedIncrement')
const ClickedDecrement = m('ClickedDecrement')
const ClickedFetch = m('ClickedFetch')
const SucceededFetch = m('SucceededFetch', { count: S.Number })
const FailedFetch = m('FailedFetch', { error: S.String })

const Message = S.Union(
  ClickedIncrement,
  ClickedDecrement,
  ClickedFetch,
  SucceededFetch,
  FailedFetch,
)
type Message = typeof Message.Type

const Model = S.Struct({ count: S.Number })
type Model = typeof Model.Type

const FetchCount = define('FetchCount', SucceededFetch, FailedFetch)

const fetchCount = FetchCount(Effect.sync(() => SucceededFetch({ count: 0 })))

type UpdateReturn = readonly [Model, ReadonlyArray<any>]

const update = (model: Model, message: Message): UpdateReturn =>
  M.value(message).pipe(
    M.withReturnType<UpdateReturn>(),
    M.tagsExhaustive({
      ClickedIncrement: () => [{ count: model.count + 1 }, []],
      ClickedDecrement: () => [{ count: model.count - 1 }, []],
      ClickedFetch: () => [model, [fetchCount]],
      SucceededFetch: ({ count }) => [{ count }, []],
      FailedFetch: () => [model, []],
    }),
  )

// CHILD

const SubmittedForm = m('SubmittedForm')
const SucceededSubmit = m('SucceededSubmit', { id: S.String })
const CancelledForm = m('CancelledForm')
const CompletedReset = m('CompletedReset')

const ChildMessage = S.Union(
  SubmittedForm,
  ClickedFetch,
  SucceededSubmit,
  CancelledForm,
  CompletedReset,
)
type ChildMessage = typeof ChildMessage.Type

const RequestedSave = m('RequestedSave', { id: S.String })
const RequestedCancel = m('RequestedCancel')

const ChildOutMessage = S.Union(RequestedSave, RequestedCancel)
type ChildOutMessage = typeof ChildOutMessage.Type

const ChildModel = S.Struct({ status: S.String })
type ChildModel = typeof ChildModel.Type

const SubmitForm = define('SubmitForm', SucceededSubmit)
const submitForm = SubmitForm(Effect.sync(() => SucceededSubmit({ id: 'abc' })))

const ResetForm = define('ResetForm', CompletedReset)
const resetForm = ResetForm(Effect.sync(() => CompletedReset()))

type ChildReturn = readonly [
  ChildModel,
  ReadonlyArray<any>,
  Option.Option<ChildOutMessage>,
]

const childUpdate = (
  childModel: ChildModel,
  message: ChildMessage,
): ChildReturn =>
  M.value(message).pipe(
    M.withReturnType<ChildReturn>(),
    M.tagsExhaustive({
      SubmittedForm: () => [
        { status: 'Submitting' },
        [submitForm],
        Option.none(),
      ],
      ClickedFetch: () => [childModel, [fetchCount], Option.none()],
      SucceededSubmit: ({ id }) => [
        { status: 'Submitted' },
        [resetForm],
        Option.some(RequestedSave({ id })),
      ],
      CancelledForm: () => [
        { status: 'Idle' },
        [],
        Option.some(RequestedCancel()),
      ],
      CompletedReset: () => [{ status: 'Idle' }, [], Option.none()],
    }),
  )

// PARENT (for toParentMessage tests)

const GotChildMessage = m('GotChildMessage', { message: ChildMessage })
const CompletedParentReset = m('CompletedParentReset')

const ParentMessage = S.Union(GotChildMessage, CompletedParentReset)
type ParentMessage = typeof ParentMessage.Type

const ParentModel = S.Struct({
  child: ChildModel,
  savedIds: S.Array(S.String),
  cancelled: S.Boolean,
})
type ParentModel = typeof ParentModel.Type

type ParentReturn = readonly [ParentModel, ReadonlyArray<any>]

const parentUpdate = (
  parentModel: ParentModel,
  message: ParentMessage,
): ParentReturn =>
  M.value(message).pipe(
    M.withReturnType<ParentReturn>(),
    M.tagsExhaustive({
      GotChildMessage: ({ message }) => {
        const [nextChild, commands, maybeOutMessage] = childUpdate(
          parentModel.child,
          message,
        )
        const nextParent = Option.match(maybeOutMessage, {
          onNone: () => ({ ...parentModel, child: nextChild }),
          onSome: outMessage =>
            M.value(outMessage).pipe(
              M.withReturnType<ParentModel>(),
              M.tagsExhaustive({
                RequestedSave: ({ id }) => ({
                  ...parentModel,
                  child: nextChild,
                  savedIds: [...parentModel.savedIds, id],
                }),
                RequestedCancel: () => ({
                  ...parentModel,
                  child: nextChild,
                  cancelled: true,
                }),
              }),
            ),
        })
        return [nextParent, commands]
      },
      CompletedParentReset: () => [parentModel, []],
    }),
  )

// TESTS

describe('message', () => {
  test('multiple Messages update the Model sequentially', () => {
    Test.story(
      update,
      Test.with({ count: 0 }),
      Test.message(ClickedIncrement()),
      Test.message(ClickedIncrement()),
      Test.message(ClickedDecrement()),
      Test.tap(({ model }) => {
        expect(model.count).toBe(1)
      }),
    )
  })

  test('simulation tracks the most recent Message', () => {
    Test.story(
      update,
      Test.with({ count: 0 }),
      Test.message(ClickedIncrement()),
      Test.tap(({ message }) => {
        expect(message?._tag).toBe('ClickedIncrement')
      }),
    )
  })

  test('Message produces Commands that stay pending', () => {
    Test.story(
      update,
      Test.with({ count: 0 }),
      Test.message(ClickedFetch()),
      Test.tap(({ commands }) => {
        expect(commands).toHaveLength(1)
        expect(commands[0]?.name).toBe(FetchCount.name)
      }),
      Test.resolveAll([[FetchCount, SucceededFetch({ count: 42 })]]),
    )
  })
})

describe('resolve', () => {
  test('throws when the Command is not pending', () => {
    expect(() =>
      Test.story(
        update,
        Test.with({ count: 0 }),
        Test.message(ClickedIncrement()),
        Test.resolve(FetchCount, SucceededFetch({ count: 42 })),
      ),
    ).toThrow(
      'I tried to resolve "FetchCount" but it wasn\'t in the pending Commands',
    )
  })

  test('resolve feeds the result Message through update', () => {
    Test.story(
      update,
      Test.with({ count: 0 }),
      Test.message(ClickedFetch()),
      Test.tap(({ model }) => {
        expect(model.count).toBe(0)
      }),
      Test.resolve(FetchCount, SucceededFetch({ count: 42 })),
      Test.tap(({ model, message }) => {
        expect(model.count).toBe(42)
        expect(message?._tag).toBe('SucceededFetch')
      }),
    )
  })
})

describe('resolveAll', () => {
  test('resolveAll resolves multiple Commands at once', () => {
    Test.story(
      update,
      Test.with({ count: 0 }),
      Test.message(ClickedFetch()),
      Test.resolveAll([[FetchCount, SucceededFetch({ count: 42 })]]),
      Test.tap(({ model }) => {
        expect(model.count).toBe(42)
      }),
    )
  })

  test('resolveAll handles cascading resolution', () => {
    Test.story(
      childUpdate,
      Test.with({ status: 'Idle' }),
      Test.message(SubmittedForm()),
      Test.resolveAll([
        [SubmitForm, SucceededSubmit({ id: 'abc' })],
        [ResetForm, CompletedReset()],
      ]),
      Test.tap(({ model }) => {
        expect(model.status).toBe('Idle')
      }),
    )
  })
})

describe('story', () => {
  test('throws on unresolved Commands at the end', () => {
    expect(() =>
      Test.story(update, Test.with({ count: 0 }), Test.message(ClickedFetch())),
    ).toThrow('I found Commands without resolvers')
  })

  test('throws when sending a Message with pending Commands', () => {
    expect(() =>
      Test.story(
        update,
        Test.with({ count: 0 }),
        Test.message(ClickedFetch()),
        Test.message(ClickedIncrement()),
      ),
    ).toThrow('I found unresolved Commands when you sent a new Message')
  })
})

describe('outMessage', () => {
  test('OutMessage updates at each step in the story', () => {
    Test.story(
      childUpdate,
      Test.with({ status: 'Idle' }),
      Test.message(SubmittedForm()),
      Test.tap(({ outMessage }) => {
        expect(outMessage).toEqual(Option.none())
      }),
      Test.resolve(SubmitForm, SucceededSubmit({ id: 'abc' })),
      Test.tap(({ outMessage }) => {
        expect(outMessage).toEqual(Option.some(RequestedSave({ id: 'abc' })))
      }),
      Test.resolve(ResetForm, CompletedReset()),
      Test.tap(({ outMessage }) => {
        expect(outMessage).toEqual(Option.none())
      }),
    )
  })

  test('Message that produces no Commands can still emit an OutMessage', () => {
    Test.story(
      childUpdate,
      Test.with({ status: 'Idle' }),
      Test.message(CancelledForm()),
      Test.tap(({ outMessage }) => {
        expect(outMessage).toEqual(Option.some(RequestedCancel()))
      }),
    )
  })
})

describe('resolve with toParentMessage', () => {
  const initialParentModel: ParentModel = {
    child: { status: 'Idle' },
    savedIds: [],
    cancelled: false,
  }

  test('parent resolves mapped child Commands with toParentMessage', () => {
    Test.story(
      parentUpdate,
      Test.with(initialParentModel),
      Test.message(GotChildMessage({ message: SubmittedForm() })),
      Test.tap(({ model, commands }) => {
        expect(model.child.status).toBe('Submitting')
        expect(commands[0]?.name).toBe(SubmitForm.name)
      }),
      Test.resolve(SubmitForm, SucceededSubmit({ id: 'abc' }), message =>
        GotChildMessage({ message }),
      ),
      Test.tap(({ model }) => {
        expect(model.child.status).toBe('Submitted')
        expect(model.savedIds).toEqual(['abc'])
      }),
      Test.resolve(ResetForm, CompletedReset(), message =>
        GotChildMessage({ message }),
      ),
      Test.tap(({ model }) => {
        expect(model.child.status).toBe('Idle')
        expect(model.savedIds).toEqual(['abc'])
      }),
    )
  })
})

describe('tap', () => {
  test('runs assertions without breaking the chain', () => {
    Test.story(
      update,
      Test.with({ count: 0 }),
      Test.message(ClickedIncrement()),
      Test.tap(({ model }) => {
        expect(model.count).toBe(1)
      }),
      Test.message(ClickedIncrement()),
      Test.tap(({ model }) => {
        expect(model.count).toBe(2)
      }),
    )
  })
})

describe('type safety', () => {
  test('with returns a WithStep', () => {
    const step = Test.with({ count: 0 })
    expectTypeOf(step).toMatchTypeOf<Test.WithStep<{ count: number }>>()
  })

  test('story infers OutMessage from a 3-tuple update', () => {
    Test.story(
      childUpdate,
      Test.with({ status: 'Idle' }),
      Test.tap(({ outMessage }) => {
        expectTypeOf(outMessage).toEqualTypeOf<Option.Option<ChildOutMessage>>()
      }),
    )
  })

  test('story defaults OutMessage to undefined for a 2-tuple update', () => {
    Test.story(
      update,
      Test.with({ count: 0 }),
      Test.tap(({ outMessage }) => {
        expectTypeOf(outMessage).toEqualTypeOf<undefined>()
      }),
    )
  })

  test('resolve constrains the result Message to the Command definition', () => {
    const resolver = Test.resolve(FetchCount, SucceededFetch({ count: 0 }))
    expectTypeOf(resolver).toBeFunction()
  })
})
