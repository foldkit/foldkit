import { describe, expect, expectTypeOf, test } from 'vitest'

import {
  ClickedDecrement,
  ClickedFetch,
  ClickedIncrement,
  FetchCount,
  SucceededFetchCount,
  update,
} from './apps/counter.js'
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
} from './apps/formChild.js'
import * as Story from './story.js'

// TEST

describe('message', () => {
  test('multiple Messages update the Model sequentially', () => {
    Story.story(
      update,
      Story.with({ count: 0 }),
      Story.message(ClickedIncrement()),
      Story.message(ClickedIncrement()),
      Story.message(ClickedDecrement()),
      Story.model(model => {
        expect(model.count).toBe(1)
      }),
    )
  })

  test('Message produces Commands that stay pending', () => {
    Story.story(
      update,
      Story.with({ count: 0 }),
      Story.message(ClickedFetch()),
      Story.expectHasCommands(FetchCount),
      Story.resolveAll([FetchCount, SucceededFetchCount({ count: 42 })]),
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
      Story.model(model => {
        expect(model.count).toBe(0)
      }),
      Story.resolve(FetchCount, SucceededFetchCount({ count: 42 })),
      Story.model(model => {
        expect(model.count).toBe(42)
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
      Story.resolveAll([FetchCount, SucceededFetchCount({ count: 42 })]),
      Story.model(model => {
        expect(model.count).toBe(42)
      }),
    )
  })

  test('resolveAll handles cascading resolution', () => {
    Story.story(
      childUpdate,
      Story.with({ status: 'Idle' }),
      Story.message(SubmittedForm()),
      Story.resolveAll(
        [SubmitForm, SucceededSubmit({ id: 'abc' })],
        [ResetForm, CompletedReset()],
      ),
      Story.model(model => {
        expect(model.status).toBe('Idle')
      }),
    )
  })
})

describe('expectExactCommands', () => {
  test('passes when pending Commands match exactly', () => {
    Story.story(
      update,
      Story.with({ count: 0 }),
      Story.message(ClickedFetch()),
      Story.expectExactCommands(FetchCount),
      Story.resolveAll([FetchCount, SucceededFetchCount({ count: 42 })]),
    )
  })

  test('throws when a Command is missing', () => {
    expect(() =>
      Story.story(
        update,
        Story.with({ count: 0 }),
        Story.message(ClickedFetch()),
        Story.expectExactCommands(FetchCount, SubmitForm),
        Story.resolveAll([FetchCount, SucceededFetchCount({ count: 42 })]),
      ),
    ).toThrow('Expected exactly these Commands')
  })

  test('throws when there are extra pending Commands', () => {
    expect(() =>
      Story.story(
        update,
        Story.with({ count: 0 }),
        Story.message(ClickedFetch()),
        Story.expectExactCommands(),
        Story.resolveAll([FetchCount, SucceededFetchCount({ count: 42 })]),
      ),
    ).toThrow('Expected exactly these Commands')
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
      Story.model(model => {
        expect(model.count).toBe(1)
      }),
      Story.expectNoCommands(),
    )
  })
})

describe('outMessage', () => {
  test('OutMessage updates at each step in the story', () => {
    Story.story(
      childUpdate,
      Story.with({ status: 'Idle' }),
      Story.message(SubmittedForm()),
      Story.expectNoOutMessage(),
      Story.resolve(SubmitForm, SucceededSubmit({ id: 'abc' })),
      Story.expectOutMessage(RequestedSave({ id: 'abc' })),
      Story.resolve(ResetForm, CompletedReset()),
      Story.expectNoOutMessage(),
    )
  })

  test('Message that produces no Commands can still emit an OutMessage', () => {
    Story.story(
      childUpdate,
      Story.with({ status: 'Idle' }),
      Story.message(CancelledForm()),
      Story.expectOutMessage(RequestedCancel()),
    )
  })
})

describe('resolve with toParentMessage', () => {
  test('parent resolves mapped child Commands with toParentMessage', () => {
    Story.story(
      parentUpdate,
      Story.with(initialParentModel),
      Story.message(GotChildMessage({ message: SubmittedForm() })),
      Story.model(model => {
        expect(model.child.status).toBe('Submitting')
      }),
      Story.expectHasCommands(SubmitForm),
      Story.resolve(SubmitForm, SucceededSubmit({ id: 'abc' }), message =>
        GotChildMessage({ message }),
      ),
      Story.model(model => {
        expect(model.child.status).toBe('Submitted')
        expect(model.savedIds).toEqual(['abc'])
      }),
      Story.resolve(ResetForm, CompletedReset(), message =>
        GotChildMessage({ message }),
      ),
      Story.model(model => {
        expect(model.child.status).toBe('Idle')
        expect(model.savedIds).toEqual(['abc'])
      }),
    )
  })
})

describe('resolveAll with toParentMessage', () => {
  test('parent resolves mapped child Commands with per-pair mappers', () => {
    Story.story(
      parentUpdate,
      Story.with(initialParentModel),
      Story.message(GotChildMessage({ message: SubmittedForm() })),
      Story.model(model => {
        expect(model.child.status).toBe('Submitting')
      }),
      Story.resolveAll(
        [
          SubmitForm,
          SucceededSubmit({ id: 'abc' }),
          message => GotChildMessage({ message }),
        ],
        [ResetForm, CompletedReset(), message => GotChildMessage({ message })],
      ),
      Story.model(model => {
        expect(model.child.status).toBe('Idle')
        expect(model.savedIds).toEqual(['abc'])
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
      Story.expectNoOutMessage(),
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
