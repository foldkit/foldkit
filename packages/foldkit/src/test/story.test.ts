import { Option } from 'effect'
import { describe, expect, expectTypeOf, test } from 'vitest'

import {
  ClickedDecrement,
  ClickedFetch,
  ClickedIncrement,
  FetchCount,
  SucceededFetchCount,
  update,
} from './apps/counter'
import {
  CancelledForm,
  CompletedReset,
  GotChildMessage,
  RequestedCancel,
  RequestedSave,
  ResetForm,
  SubmitForm,
  SubmittedForm,
  SucceededSubmit,
  childUpdate,
  initialParentModel,
  parentUpdate,
} from './apps/formChild'
import type { ChildOutMessage } from './apps/formChild'
import * as Story from './story'

// TEST

describe('message', () => {
  test('multiple Messages update the Model sequentially', () => {
    Story.story(
      update,
      Story.with({ count: 0 }),
      Story.message(ClickedIncrement()),
      Story.message(ClickedIncrement()),
      Story.message(ClickedDecrement()),
      Story.tap(({ model }) => {
        expect(model.count).toBe(1)
      }),
    )
  })

  test('simulation tracks the most recent Message', () => {
    Story.story(
      update,
      Story.with({ count: 0 }),
      Story.message(ClickedIncrement()),
      Story.tap(({ message }) => {
        expect(message?._tag).toBe('ClickedIncrement')
      }),
    )
  })

  test('Message produces Commands that stay pending', () => {
    Story.story(
      update,
      Story.with({ count: 0 }),
      Story.message(ClickedFetch()),
      Story.tap(({ commands }) => {
        expect(commands).toHaveLength(1)
        expect(commands[0]?.name).toBe(FetchCount.name)
      }),
      Story.resolveAll([[FetchCount, SucceededFetchCount({ count: 42 })]]),
    )
  })
})

describe('resolve', () => {
  test('throws when the Command is not pending', () => {
    expect(() =>
      Story.story(
        update,
        Story.with({ count: 0 }),
        Story.message(ClickedIncrement()),
        Story.resolve(FetchCount, SucceededFetchCount({ count: 42 })),
      ),
    ).toThrow(
      'I tried to resolve "FetchCount" but it wasn\'t in the pending Commands',
    )
  })

  test('throws when resolving the wrong Command while others are pending', () => {
    expect(() =>
      Story.story(
        update,
        Story.with({ count: 0 }),
        Story.message(ClickedFetch()),
        Story.resolve(SubmitForm, SucceededSubmit({ id: 'abc' })),
      ),
    ).toThrow(
      'I tried to resolve "SubmitForm" but it wasn\'t in the pending Commands',
    )
  })

  test('resolve feeds the result Message through update', () => {
    Story.story(
      update,
      Story.with({ count: 0 }),
      Story.message(ClickedFetch()),
      Story.tap(({ model }) => {
        expect(model.count).toBe(0)
      }),
      Story.resolve(FetchCount, SucceededFetchCount({ count: 42 })),
      Story.tap(({ model, message }) => {
        expect(model.count).toBe(42)
        expect(message?._tag).toBe('SucceededFetchCount')
      }),
    )
  })
})

describe('resolveAll', () => {
  test('resolveAll resolves multiple Commands at once', () => {
    Story.story(
      update,
      Story.with({ count: 0 }),
      Story.message(ClickedFetch()),
      Story.resolveAll([[FetchCount, SucceededFetchCount({ count: 42 })]]),
      Story.tap(({ model }) => {
        expect(model.count).toBe(42)
      }),
    )
  })

  test('resolveAll handles cascading resolution', () => {
    Story.story(
      childUpdate,
      Story.with({ status: 'Idle' }),
      Story.message(SubmittedForm()),
      Story.resolveAll([
        [SubmitForm, SucceededSubmit({ id: 'abc' })],
        [ResetForm, CompletedReset()],
      ]),
      Story.tap(({ model }) => {
        expect(model.status).toBe('Idle')
      }),
    )
  })
})

describe('story', () => {
  test('throws on unresolved Commands at the end', () => {
    expect(() =>
      Story.story(
        update,
        Story.with({ count: 0 }),
        Story.message(ClickedFetch()),
      ),
    ).toThrow('I found Commands without resolvers')
  })

  test('throws when sending a Message with pending Commands', () => {
    expect(() =>
      Story.story(
        update,
        Story.with({ count: 0 }),
        Story.message(ClickedFetch()),
        Story.message(ClickedIncrement()),
      ),
    ).toThrow('I found unresolved Commands when you sent a new Message')
  })

  test('succeeds with a Message that produces no Commands', () => {
    Story.story(
      update,
      Story.with({ count: 0 }),
      Story.message(ClickedIncrement()),
      Story.tap(({ model, commands }) => {
        expect(model.count).toBe(1)
        expect(commands).toHaveLength(0)
      }),
    )
  })
})

describe('outMessage', () => {
  test('OutMessage updates at each step in the story', () => {
    Story.story(
      childUpdate,
      Story.with({ status: 'Idle' }),
      Story.message(SubmittedForm()),
      Story.tap(({ outMessage }) => {
        expect(outMessage).toEqual(Option.none())
      }),
      Story.resolve(SubmitForm, SucceededSubmit({ id: 'abc' })),
      Story.tap(({ outMessage }) => {
        expect(outMessage).toEqual(Option.some(RequestedSave({ id: 'abc' })))
      }),
      Story.resolve(ResetForm, CompletedReset()),
      Story.tap(({ outMessage }) => {
        expect(outMessage).toEqual(Option.none())
      }),
    )
  })

  test('Message that produces no Commands can still emit an OutMessage', () => {
    Story.story(
      childUpdate,
      Story.with({ status: 'Idle' }),
      Story.message(CancelledForm()),
      Story.tap(({ outMessage }) => {
        expect(outMessage).toEqual(Option.some(RequestedCancel()))
      }),
    )
  })
})

describe('resolve with toParentMessage', () => {
  test('parent resolves mapped child Commands with toParentMessage', () => {
    Story.story(
      parentUpdate,
      Story.with(initialParentModel),
      Story.message(GotChildMessage({ message: SubmittedForm() })),
      Story.tap(({ model, commands }) => {
        expect(model.child.status).toBe('Submitting')
        expect(commands[0]?.name).toBe(SubmitForm.name)
      }),
      Story.resolve(SubmitForm, SucceededSubmit({ id: 'abc' }), message =>
        GotChildMessage({ message }),
      ),
      Story.tap(({ model }) => {
        expect(model.child.status).toBe('Submitted')
        expect(model.savedIds).toEqual(['abc'])
      }),
      Story.resolve(ResetForm, CompletedReset(), message =>
        GotChildMessage({ message }),
      ),
      Story.tap(({ model }) => {
        expect(model.child.status).toBe('Idle')
        expect(model.savedIds).toEqual(['abc'])
      }),
    )
  })
})

describe('tap', () => {
  test('runs assertions without breaking the chain', () => {
    Story.story(
      update,
      Story.with({ count: 0 }),
      Story.message(ClickedIncrement()),
      Story.tap(({ model }) => {
        expect(model.count).toBe(1)
      }),
      Story.message(ClickedIncrement()),
      Story.tap(({ model }) => {
        expect(model.count).toBe(2)
      }),
    )
  })
})

describe('type safety', () => {
  test('with returns a WithStep', () => {
    const step = Story.with({ count: 0 })
    expectTypeOf(step).toMatchTypeOf<Story.WithStep<{ count: number }>>()
  })

  test('story infers OutMessage from a 3-tuple update', () => {
    Story.story(
      childUpdate,
      Story.with({ status: 'Idle' }),
      Story.tap(({ outMessage }) => {
        expectTypeOf(outMessage).toEqualTypeOf<Option.Option<ChildOutMessage>>()
      }),
    )
  })

  test('story defaults OutMessage to undefined for a 2-tuple update', () => {
    Story.story(
      update,
      Story.with({ count: 0 }),
      Story.tap(({ outMessage }) => {
        expectTypeOf(outMessage).toEqualTypeOf<undefined>()
      }),
    )
  })

  test('resolve constrains the result Message to the Command definition', () => {
    const resolver = Story.resolve(
      FetchCount,
      SucceededFetchCount({ count: 0 }),
    )
    expectTypeOf(resolver).toBeFunction()
  })
})
