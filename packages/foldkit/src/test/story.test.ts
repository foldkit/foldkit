import { describe, expect, expectTypeOf, test } from 'vitest'

import {
  ClickedDecrement,
  ClickedFetch,
  ClickedFetchById,
  ClickedIncrement,
  FetchCount,
  FetchCountById,
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
      Story.Command.expectHas(FetchCount),
      Story.Command.resolveAll([
        FetchCount,
        SucceededFetchCount({ count: 42 }),
      ]),
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
        Story.Command.resolve(FetchCount, SucceededFetchCount({ count: 42 })),
      ),
    ).toThrow(
      'I tried to resolve "FetchCount" but no matching pending Command was found',
    )
  })

  test('throws when resolving the wrong Command while others are pending', () => {
    expect(() =>
      Story.story(
        update,
        Story.with({ count: 0 }),
        Story.message(ClickedFetch()),
        Story.Command.resolve(SubmitForm, SucceededSubmit({ id: 'abc' })),
      ),
    ).toThrow(
      'I tried to resolve "SubmitForm" but no matching pending Command was found',
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
      Story.Command.resolve(FetchCount, SucceededFetchCount({ count: 42 })),
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
      Story.Command.resolveAll([
        FetchCount,
        SucceededFetchCount({ count: 42 }),
      ]),
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
      Story.Command.resolveAll(
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
      Story.Command.expectExact(FetchCount),
      Story.Command.resolveAll([
        FetchCount,
        SucceededFetchCount({ count: 42 }),
      ]),
    )
  })

  test('throws when a Command is missing', () => {
    expect(() =>
      Story.story(
        update,
        Story.with({ count: 0 }),
        Story.message(ClickedFetch()),
        Story.Command.expectExact(FetchCount, SubmitForm),
        Story.Command.resolveAll([
          FetchCount,
          SucceededFetchCount({ count: 42 }),
        ]),
      ),
    ).toThrow('Expected exactly these Commands')
  })

  test('throws when there are extra pending Commands', () => {
    expect(() =>
      Story.story(
        update,
        Story.with({ count: 0 }),
        Story.message(ClickedFetch()),
        Story.Command.expectExact(),
        Story.Command.resolveAll([
          FetchCount,
          SucceededFetchCount({ count: 42 }),
        ]),
      ),
    ).toThrow('Expected exactly these Commands')
  })
})

describe('instance-strict Command matching', () => {
  test('expectHas with a Command instance matches by name AND args', () => {
    Story.story(
      update,
      Story.with({ count: 0 }),
      Story.message(ClickedFetchById({ id: 7 })),
      Story.Command.expectHas(FetchCountById({ id: 7 })),
      Story.Command.resolveAll([
        FetchCountById,
        SucceededFetchCount({ count: 7 }),
      ]),
    )
  })

  test('expectHas with a Command instance fails when args differ', () => {
    expect(() =>
      Story.story(
        update,
        Story.with({ count: 0 }),
        Story.message(ClickedFetchById({ id: 7 })),
        Story.Command.expectHas(FetchCountById({ id: 99 })),
        Story.Command.resolveAll([
          FetchCountById,
          SucceededFetchCount({ count: 7 }),
        ]),
      ),
    ).toThrow('Expected to find Commands')
  })

  test('expectExact with a Command instance asserts the exact args', () => {
    Story.story(
      update,
      Story.with({ count: 0 }),
      Story.message(ClickedFetchById({ id: 42 })),
      Story.Command.expectExact(FetchCountById({ id: 42 })),
      Story.Command.resolveAll([
        FetchCountById,
        SucceededFetchCount({ count: 42 }),
      ]),
    )
  })

  test('resolve with a Command instance only resolves matching args', () => {
    expect(() =>
      Story.story(
        update,
        Story.with({ count: 0 }),
        Story.message(ClickedFetchById({ id: 7 })),
        Story.Command.resolve(
          FetchCountById({ id: 99 }),
          SucceededFetchCount({ count: 99 }),
        ),
      ),
    ).toThrow(
      'I tried to resolve "FetchCountById {"id":99}" but no matching pending Command was found',
    )
  })

  test('resolve with a Command instance feeds the result through update', () => {
    Story.story(
      update,
      Story.with({ count: 0 }),
      Story.message(ClickedFetchById({ id: 42 })),
      Story.Command.resolve(
        FetchCountById({ id: 42 }),
        SucceededFetchCount({ count: 42 }),
      ),
      Story.model(model => {
        expect(model.count).toBe(42)
      }),
    )
  })

  test('resolveAll keeps Instance matchers distinct across Messages', () => {
    Story.story(
      update,
      Story.with({ count: 0 }),
      Story.message(ClickedFetchById({ id: 1 })),
      Story.Command.resolveAll([
        FetchCountById({ id: 1 }),
        SucceededFetchCount({ count: 100 }),
      ]),
      Story.message(ClickedFetchById({ id: 2 })),
      Story.Command.resolveAll([
        FetchCountById({ id: 2 }),
        SucceededFetchCount({ count: 200 }),
      ]),
      Story.model(model => {
        expect(model.count).toBe(200)
      }),
    )
  })

  test('mixed Definition and Instance matchers in resolveAll', () => {
    Story.story(
      update,
      Story.with({ count: 0 }),
      Story.message(ClickedFetchById({ id: 5 })),
      Story.Command.resolveAll([
        FetchCountById,
        SucceededFetchCount({ count: 5 }),
      ]),
      Story.model(model => {
        expect(model.count).toBe(5)
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
      Story.model(model => {
        expect(model.count).toBe(1)
      }),
      Story.Command.expectNone(),
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
      Story.Command.resolve(SubmitForm, SucceededSubmit({ id: 'abc' })),
      Story.expectOutMessage(RequestedSave({ id: 'abc' })),
      Story.Command.resolve(ResetForm, CompletedReset()),
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
      Story.Command.expectHas(SubmitForm),
      Story.Command.resolve(
        SubmitForm,
        SucceededSubmit({ id: 'abc' }),
        message => GotChildMessage({ message }),
      ),
      Story.model(model => {
        expect(model.child.status).toBe('Submitted')
        expect(model.savedIds).toEqual(['abc'])
      }),
      Story.Command.resolve(ResetForm, CompletedReset(), message =>
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
      Story.Command.resolveAll(
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
    const resolver = Story.Command.resolve(
      FetchCount,
      SucceededFetchCount({ count: 0 }),
    )
    expectTypeOf(resolver).toBeFunction()
  })
})
