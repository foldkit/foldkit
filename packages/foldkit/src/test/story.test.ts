import { Array } from 'effect'
import { describe, expect, expectTypeOf, test } from 'vitest'

import * as Interruptible from '../command/interruptible/index.js'
import {
  Message as CounterMessage,
  FetchCount,
  FetchCountById,
  update,
} from './apps/counter.js'
import {
  Message as DraftsMessage,
  SaveDraft,
  update as draftsUpdate,
  initialModel as initialDraftsModel,
} from './apps/drafts.js'
import {
  ChildMessage as FormChildJsChildMessage,
  ChildOutMessage as FormChildJsChildOutMessage,
  ParentMessage,
  ResetForm,
  SubmitForm,
  childUpdate,
  initialParentModel,
  parentUpdate,
} from './apps/formChild.js'
import {
  CancelUploadFile,
  UploadFile,
  Message as UploadsMessage,
  type Model as UploadsModel,
  initialModel as initialUploadsModel,
  update as uploadsUpdate,
} from './apps/uploads.js'
import * as Story from './story.js'

// TEST

describe('message', () => {
  test('multiple Messages update the Model sequentially', () => {
    Story.story(
      update,
      Story.given({ count: 0, log: [] }),
      Story.message(CounterMessage.ClickedIncrement()),
      Story.message(CounterMessage.ClickedIncrement()),
      Story.message(CounterMessage.ClickedDecrement()),
      Story.model(model => {
        expect(model.count).toBe(1)
      }),
    )
  })

  test('Message produces Commands that stay pending', () => {
    Story.story(
      update,
      Story.given({ count: 0, log: [] }),
      Story.message(CounterMessage.ClickedFetch()),
      Story.Command.expectHas(FetchCount),
      Story.Command.resolveAll([
        FetchCount,
        CounterMessage.SucceededFetchCount({ count: 42 }),
      ]),
    )
  })
})

describe('resolve', () => {
  test('throws when the Command is not pending', () => {
    expect(() =>
      Story.story(
        update,
        Story.given({ count: 0, log: [] }),
        Story.message(CounterMessage.ClickedIncrement()),
        Story.Command.resolve(
          FetchCount,
          CounterMessage.SucceededFetchCount({ count: 42 }),
        ),
      ),
    ).toThrow(
      'I tried to resolve "FetchCount" but no matching pending Command was found',
    )
  })

  test('throws when resolving the wrong Command while others are pending', () => {
    expect(() =>
      Story.story(
        update,
        Story.given({ count: 0, log: [] }),
        Story.message(CounterMessage.ClickedFetch()),
        Story.Command.resolve(
          SubmitForm,
          FormChildJsChildMessage.SucceededSubmitForm({ id: 'abc' }),
        ),
      ),
    ).toThrow(
      'I tried to resolve "SubmitForm" but no matching pending Command was found',
    )
  })

  test('resolve feeds the result Message through update', () => {
    Story.story(
      update,
      Story.given({ count: 0, log: [] }),
      Story.message(CounterMessage.ClickedFetch()),
      Story.model(model => {
        expect(model.count).toBe(0)
      }),
      Story.Command.resolve(
        FetchCount,
        CounterMessage.SucceededFetchCount({ count: 42 }),
      ),
      Story.model(model => {
        expect(model.count).toBe(42)
      }),
    )
  })

  test('throws when multiple pending Commands match a Definition matcher', () => {
    expect(() =>
      Story.story(
        update,
        Story.given({ count: 0, log: [] }),
        Story.message(CounterMessage.StartedThreeFetches()),
        Story.Command.resolve(
          FetchCount,
          CounterMessage.SucceededFetchCount({ count: 42 }),
        ),
      ),
    ).toThrow(
      'I tried to resolve "FetchCount" but multiple pending Commands match',
    )
  })

  test('throws when multiple pending Commands match an Instance matcher', () => {
    expect(() =>
      Story.story(
        update,
        Story.given({ count: 0, log: [] }),
        Story.message(CounterMessage.StartedTwoFetchesById()),
        Story.Command.resolve(
          FetchCountById({ id: 5 }),
          CounterMessage.SucceededFetchCount({ count: 10 }),
        ),
      ),
    ).toThrow(
      'I tried to resolve "FetchCountById {"id":5}" but multiple pending Commands match',
    )
  })
})

describe('resolveAll', () => {
  test('resolveAll resolves multiple Commands at once', () => {
    Story.story(
      update,
      Story.given({ count: 0, log: [] }),
      Story.message(CounterMessage.ClickedFetch()),
      Story.Command.resolveAll([
        FetchCount,
        CounterMessage.SucceededFetchCount({ count: 42 }),
      ]),
      Story.model(model => {
        expect(model.count).toBe(42)
      }),
    )
  })

  test('resolveAll handles cascading resolution', () => {
    Story.story(
      childUpdate,
      Story.given({ status: 'Idle' }),
      Story.message(FormChildJsChildMessage.SubmittedForm()),
      Story.Command.resolveAll(
        [
          SubmitForm,
          FormChildJsChildMessage.SucceededSubmitForm({ id: 'abc' }),
        ],
        [ResetForm, FormChildJsChildMessage.CompletedResetForm()],
      ),
      Story.model(model => {
        expect(model.status).toBe('Idle')
      }),
    )
  })

  test('repeated Definition entries dispatch in declaration order', () => {
    Story.story(
      update,
      Story.given({ count: 0, log: [] }),
      Story.message(CounterMessage.StartedThreeFetches()),
      Story.Command.resolveAll(
        [FetchCount, CounterMessage.SucceededFetchCount({ count: 1 })],
        [FetchCount, CounterMessage.SucceededFetchCount({ count: 2 })],
        [FetchCount, CounterMessage.SucceededFetchCount({ count: 3 })],
      ),
      Story.model(model => {
        expect(model.log).toEqual([1, 2, 3])
        expect(model.count).toBe(3)
      }),
    )
  })

  test('Array.makeBy declares N identical responses for N dispatches', () => {
    Story.story(
      update,
      Story.given({ count: 0, log: [] }),
      Story.message(CounterMessage.StartedThreeFetches()),
      Story.Command.resolveAll(
        ...Array.makeBy(
          3,
          () =>
            [
              FetchCount,
              CounterMessage.SucceededFetchCount({ count: 7 }),
            ] as const,
        ),
      ),
      Story.model(model => {
        expect(model.log).toEqual([7, 7, 7])
        expect(model.count).toBe(7)
      }),
    )
  })

  test('repeated Instance entries dispatch in declaration order', () => {
    Story.story(
      update,
      Story.given({ count: 0, log: [] }),
      Story.message(CounterMessage.StartedTwoFetchesById()),
      Story.Command.resolveAll(
        [
          FetchCountById({ id: 5 }),
          CounterMessage.SucceededFetchCount({ count: 10 }),
        ],
        [
          FetchCountById({ id: 5 }),
          CounterMessage.SucceededFetchCount({ count: 20 }),
        ],
      ),
      Story.model(model => {
        expect(model.log).toEqual([10, 20])
      }),
    )
  })

  test('Array.makeBy composes with single entries in the same call', () => {
    Story.story(
      update,
      Story.given({ count: 0, log: [] }),
      Story.message(CounterMessage.StartedMixedFetches()),
      Story.Command.resolveAll(
        [FetchCount, CounterMessage.SucceededFetchCount({ count: 1 })],
        [FetchCount, CounterMessage.SucceededFetchCount({ count: 2 })],
        ...Array.makeBy(
          2,
          () =>
            [
              FetchCountById,
              CounterMessage.SucceededFetchCount({ count: 99 }),
            ] as const,
        ),
      ),
      Story.model(model => {
        expect(model.log).toEqual([1, 2, 99, 99])
      }),
    )
  })

  test('extra entries leave leftovers without error', () => {
    Story.story(
      update,
      Story.given({ count: 0, log: [] }),
      Story.message(CounterMessage.ClickedFetch()),
      Story.Command.resolveAll(
        [FetchCount, CounterMessage.SucceededFetchCount({ count: 1 })],
        [FetchCount, CounterMessage.SucceededFetchCount({ count: 2 })],
        [FetchCount, CounterMessage.SucceededFetchCount({ count: 3 })],
      ),
      Story.model(model => {
        expect(model.log).toEqual([1])
      }),
    )
  })

  test('leftover entries are consumed by a later cascade', () => {
    Story.story(
      update,
      Story.given({ count: 0, log: [] }),
      Story.message(CounterMessage.ClickedFetch()),
      Story.Command.resolveAll(
        [FetchCount, CounterMessage.SucceededFetchCount({ count: 1 })],
        [FetchCount, CounterMessage.SucceededFetchCount({ count: 2 })],
      ),
      Story.model(model => {
        expect(model.log).toEqual([1])
      }),
      Story.message(CounterMessage.ClickedFetch()),
      Story.Command.resolveAll(),
      Story.model(model => {
        expect(model.log).toEqual([1, 2])
      }),
    )
  })

  test('throws when entries leave dispatches unresolved', () => {
    expect(() =>
      Story.story(
        update,
        Story.given({ count: 0, log: [] }),
        Story.message(CounterMessage.StartedThreeFetches()),
        Story.Command.resolveAll([
          FetchCount,
          CounterMessage.SucceededFetchCount({ count: 1 }),
        ]),
      ),
    ).toThrow('I found Commands without resolvers')
  })

  test('latest-wins eviction replaces all same-fingerprint leftovers', () => {
    Story.story(
      update,
      Story.given({ count: 0, log: [] }),
      Story.Command.resolveAll(
        [FetchCount, CounterMessage.SucceededFetchCount({ count: 100 })],
        [FetchCount, CounterMessage.SucceededFetchCount({ count: 200 })],
      ),
      Story.message(CounterMessage.ClickedFetch()),
      Story.Command.resolveAll([
        FetchCount,
        CounterMessage.SucceededFetchCount({ count: 7 }),
      ]),
      Story.model(model => {
        expect(model.log).toEqual([7])
      }),
    )
  })

  test('requires each result Message to belong to its Command', () => {
    Story.Command.resolveAll([
      FetchCount,
      // @ts-expect-error CompletedResetForm is not a FetchCount result Message
      FormChildJsChildMessage.CompletedResetForm(),
    ])
  })
})

describe('resolveAllExact', () => {
  test('requires each result Message to belong to its Command', () => {
    Story.Command.resolveAllExact([
      FetchCount,
      // @ts-expect-error CompletedResetForm is not a FetchCount result Message
      FormChildJsChildMessage.CompletedResetForm(),
    ])
  })

  test('resolves cascading Commands', () => {
    Story.story(
      childUpdate,
      Story.given({ status: 'Idle' }),
      Story.message(FormChildJsChildMessage.SubmittedForm()),
      Story.Command.resolveAllExact(
        [
          SubmitForm,
          FormChildJsChildMessage.SucceededSubmitForm({ id: 'abc' }),
        ],
        [ResetForm, FormChildJsChildMessage.CompletedResetForm()],
      ),
      Story.model(model => {
        expect(model.status).toBe('Idle')
      }),
    )
  })

  test('resolves repeated Definition entries in declaration order', () => {
    Story.story(
      update,
      Story.given({ count: 0, log: [] }),
      Story.message(CounterMessage.StartedThreeFetches()),
      Story.Command.resolveAllExact(
        [FetchCount, CounterMessage.SucceededFetchCount({ count: 1 })],
        [FetchCount, CounterMessage.SucceededFetchCount({ count: 2 })],
        [FetchCount, CounterMessage.SucceededFetchCount({ count: 3 })],
      ),
      Story.model(model => {
        expect(model.log).toEqual([1, 2, 3])
      }),
    )
  })

  test('throws with every expected Command that was not dispatched', () => {
    expect(() =>
      Story.story(
        update,
        Story.given({ count: 0, log: [] }),
        Story.message(CounterMessage.ClickedFetch()),
        Story.Command.resolveAllExact(
          [FetchCount, CounterMessage.SucceededFetchCount({ count: 1 })],
          [
            SubmitForm,
            FormChildJsChildMessage.SucceededSubmitForm({ id: 'abc' }),
          ],
          [ResetForm, FormChildJsChildMessage.CompletedResetForm()],
        ),
      ),
    ).toThrow(
      'resolveAllExact expected Commands that were not dispatched:\n\n' +
        '    SubmitForm\n' +
        '    ResetForm',
    )
  })

  test('throws when repeated entries outnumber matching dispatches', () => {
    expect(() =>
      Story.story(
        update,
        Story.given({ count: 0, log: [] }),
        Story.message(CounterMessage.ClickedFetch()),
        Story.Command.resolveAllExact(
          [FetchCount, CounterMessage.SucceededFetchCount({ count: 1 })],
          [FetchCount, CounterMessage.SucceededFetchCount({ count: 2 })],
        ),
      ),
    ).toThrow(
      'resolveAllExact expected Commands that were not dispatched:\n\n' +
        '    FetchCount',
    )
  })

  test('retains the unresolved actual Command failure', () => {
    expect(() =>
      Story.story(
        update,
        Story.given({ count: 0, log: [] }),
        Story.message(CounterMessage.StartedThreeFetches()),
        Story.Command.resolveAllExact(
          [FetchCount, CounterMessage.SucceededFetchCount({ count: 1 })],
          [FetchCount, CounterMessage.SucceededFetchCount({ count: 2 })],
        ),
      ),
    ).toThrow('I found Commands without resolvers:\n\n    FetchCount')
  })
})

describe('expectExactCommands', () => {
  test('passes when pending Commands match exactly', () => {
    Story.story(
      update,
      Story.given({ count: 0, log: [] }),
      Story.message(CounterMessage.ClickedFetch()),
      Story.Command.expectExact(FetchCount),
      Story.Command.resolveAll([
        FetchCount,
        CounterMessage.SucceededFetchCount({ count: 42 }),
      ]),
    )
  })

  test('throws when a Command is missing', () => {
    expect(() =>
      Story.story(
        update,
        Story.given({ count: 0, log: [] }),
        Story.message(CounterMessage.ClickedFetch()),
        Story.Command.expectExact(FetchCount, SubmitForm),
        Story.Command.resolveAll([
          FetchCount,
          CounterMessage.SucceededFetchCount({ count: 42 }),
        ]),
      ),
    ).toThrow('Expected exactly these Commands')
  })

  test('throws when there are extra pending Commands', () => {
    expect(() =>
      Story.story(
        update,
        Story.given({ count: 0, log: [] }),
        Story.message(CounterMessage.ClickedFetch()),
        Story.Command.expectExact(),
        Story.Command.resolveAll([
          FetchCount,
          CounterMessage.SucceededFetchCount({ count: 42 }),
        ]),
      ),
    ).toThrow('Expected exactly these Commands')
  })
})

describe('instance-strict Command matching', () => {
  test('expectHas with a Command instance matches by name AND args', () => {
    Story.story(
      update,
      Story.given({ count: 0, log: [] }),
      Story.message(CounterMessage.ClickedFetchById({ id: 7 })),
      Story.Command.expectHas(FetchCountById({ id: 7 })),
      Story.Command.resolveAll([
        FetchCountById,
        CounterMessage.SucceededFetchCount({ count: 7 }),
      ]),
    )
  })

  test('expectHas with a Command instance fails when args differ', () => {
    expect(() =>
      Story.story(
        update,
        Story.given({ count: 0, log: [] }),
        Story.message(CounterMessage.ClickedFetchById({ id: 7 })),
        Story.Command.expectHas(FetchCountById({ id: 99 })),
        Story.Command.resolveAll([
          FetchCountById,
          CounterMessage.SucceededFetchCount({ count: 7 }),
        ]),
      ),
    ).toThrow('Expected to find Commands')
  })

  test('expectExact with a Command instance asserts the exact args', () => {
    Story.story(
      update,
      Story.given({ count: 0, log: [] }),
      Story.message(CounterMessage.ClickedFetchById({ id: 42 })),
      Story.Command.expectExact(FetchCountById({ id: 42 })),
      Story.Command.resolveAll([
        FetchCountById,
        CounterMessage.SucceededFetchCount({ count: 42 }),
      ]),
    )
  })

  test('resolve with a Command instance only resolves matching args', () => {
    expect(() =>
      Story.story(
        update,
        Story.given({ count: 0, log: [] }),
        Story.message(CounterMessage.ClickedFetchById({ id: 7 })),
        Story.Command.resolve(
          FetchCountById({ id: 99 }),
          CounterMessage.SucceededFetchCount({ count: 99 }),
        ),
      ),
    ).toThrow(
      'I tried to resolve "FetchCountById {"id":99}" but no matching pending Command was found',
    )
  })

  test('resolve with a Command instance feeds the result through update', () => {
    Story.story(
      update,
      Story.given({ count: 0, log: [] }),
      Story.message(CounterMessage.ClickedFetchById({ id: 42 })),
      Story.Command.resolve(
        FetchCountById({ id: 42 }),
        CounterMessage.SucceededFetchCount({ count: 42 }),
      ),
      Story.model(model => {
        expect(model.count).toBe(42)
      }),
    )
  })

  test('resolveAll keeps Instance matchers distinct across Messages', () => {
    Story.story(
      update,
      Story.given({ count: 0, log: [] }),
      Story.message(CounterMessage.ClickedFetchById({ id: 1 })),
      Story.Command.resolveAll([
        FetchCountById({ id: 1 }),
        CounterMessage.SucceededFetchCount({ count: 100 }),
      ]),
      Story.message(CounterMessage.ClickedFetchById({ id: 2 })),
      Story.Command.resolveAll([
        FetchCountById({ id: 2 }),
        CounterMessage.SucceededFetchCount({ count: 200 }),
      ]),
      Story.model(model => {
        expect(model.count).toBe(200)
      }),
    )
  })

  test('mixed Definition and Instance matchers in resolveAll', () => {
    Story.story(
      update,
      Story.given({ count: 0, log: [] }),
      Story.message(CounterMessage.ClickedFetchById({ id: 5 })),
      Story.Command.resolveAll([
        FetchCountById,
        CounterMessage.SucceededFetchCount({ count: 5 }),
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
        Story.given({ count: 0, log: [] }),
        Story.message(CounterMessage.ClickedFetch()),
      ),
    ).toThrow('I found Commands without resolvers')
  })

  test('throws when sending a Message with pending Commands', () => {
    expect(() =>
      Story.story(
        update,
        Story.given({ count: 0, log: [] }),
        Story.message(CounterMessage.ClickedFetch()),
        Story.message(CounterMessage.ClickedIncrement()),
      ),
    ).toThrow('I found unresolved Commands when you sent a new Message')
  })

  test('succeeds with a Message that produces no Commands', () => {
    Story.story(
      update,
      Story.given({ count: 0, log: [] }),
      Story.message(CounterMessage.ClickedIncrement()),
      Story.model(model => {
        expect(model.count).toBe(1)
      }),
      Story.Command.expectNone(),
    )
  })
})

describe('interruptible Commands', () => {
  test('a keyed Command may stay pending across Messages and is dropped when its Interrupt resolves', () => {
    Story.story(
      uploadsUpdate,
      Story.given(initialUploadsModel),
      Story.message(UploadsMessage.ClickedStartUpload()),
      Story.Command.expectHas(UploadFile),
      Story.message(UploadsMessage.ClickedCancelUpload({ uploadId: 0 })),
      Story.Command.resolve(
        CancelUploadFile({ uploadId: 0 }),
        UploadsMessage.CompletedCancelUploadFile({
          uploadId: 0,
          outcome: Interruptible.Interrupted(),
        }),
      ),
      Story.model((model: UploadsModel) => {
        expect(model.uploads).toEqual([{ id: 0, status: 'Cancelled' }])
      }),
      Story.Command.expectNone(),
    )
  })

  test('resolves a keyed Command by its bare Definition, matching by name', () => {
    Story.story(
      uploadsUpdate,
      Story.given(initialUploadsModel),
      Story.message(UploadsMessage.ClickedStartUpload()),
      Story.Command.resolve(
        UploadFile,
        UploadsMessage.SucceededUploadFile({ uploadId: 0 }),
      ),
      Story.model(model => {
        expect(model.uploads).toEqual([{ id: 0, status: 'Done' }])
      }),
      Story.Command.expectNone(),
    )
  })

  test('resolves a name-keyed Command by its bare Definition, matching by name', () => {
    Story.story(
      draftsUpdate,
      Story.given(initialDraftsModel),
      Story.message(DraftsMessage.ClickedSaveDraft()),
      Story.Command.resolve(
        SaveDraft,
        DraftsMessage.SucceededSaveDraft({ revision: 0 }),
      ),
      Story.model(model => {
        expect(model.status).toBe('Saved')
      }),
      Story.Command.expectNone(),
    )
  })

  test('resolveAll resolves keyed Commands by their bare Definition', () => {
    Story.story(
      uploadsUpdate,
      Story.given(initialUploadsModel),
      Story.message(UploadsMessage.ClickedStartUpload()),
      Story.message(UploadsMessage.ClickedStartUpload()),
      Story.Command.resolveAll(
        [UploadFile, UploadsMessage.SucceededUploadFile({ uploadId: 0 })],
        [UploadFile, UploadsMessage.SucceededUploadFile({ uploadId: 1 })],
      ),
      Story.model(model => {
        expect(model.uploads).toEqual([
          { id: 0, status: 'Done' },
          { id: 1, status: 'Done' },
        ])
      }),
      Story.Command.expectNone(),
    )
  })

  test('resolving an Interrupt with NotFound keeps nothing pending and skips the status change', () => {
    Story.story(
      uploadsUpdate,
      Story.given(initialUploadsModel),
      Story.message(UploadsMessage.ClickedStartUpload()),
      Story.Command.resolve(
        UploadFile({ uploadId: 0 }),
        UploadsMessage.SucceededUploadFile({ uploadId: 0 }),
      ),
      Story.message(UploadsMessage.ClickedCancelUpload({ uploadId: 0 })),
      Story.Command.resolve(
        CancelUploadFile({ uploadId: 0 }),
        UploadsMessage.CompletedCancelUploadFile({
          uploadId: 0,
          outcome: Interruptible.NotFound(),
        }),
      ),
      Story.model((model: UploadsModel) => {
        expect(model.uploads).toEqual([{ id: 0, status: 'Done' }])
      }),
    )
  })

  test('interrupting one key leaves Commands under other keys pending', () => {
    Story.story(
      uploadsUpdate,
      Story.given(initialUploadsModel),
      Story.message(UploadsMessage.ClickedStartUpload()),
      Story.message(UploadsMessage.ClickedStartUpload()),
      Story.Command.expectHas(
        UploadFile({ uploadId: 0 }),
        UploadFile({ uploadId: 1 }),
      ),
      Story.message(UploadsMessage.ClickedCancelUpload({ uploadId: 1 })),
      Story.Command.resolve(
        CancelUploadFile({ uploadId: 1 }),
        UploadsMessage.CompletedCancelUploadFile({
          uploadId: 1,
          outcome: Interruptible.Interrupted(),
        }),
      ),
      Story.Command.expectExact(UploadFile({ uploadId: 0 })),
      Story.Command.resolve(
        UploadFile({ uploadId: 0 }),
        UploadsMessage.SucceededUploadFile({ uploadId: 0 }),
      ),
      Story.model((model: UploadsModel) => {
        expect(model.uploads).toEqual([
          { id: 0, status: 'Done' },
          { id: 1, status: 'Cancelled' },
        ])
      }),
    )
  })

  test('same-key Commands stay pending together and an Interrupt resolution drops them all', () => {
    Story.story(
      uploadsUpdate,
      Story.given(initialUploadsModel),
      Story.message(UploadsMessage.ClickedStartUpload()),
      Story.message(UploadsMessage.ClickedRetryUpload({ uploadId: 0 })),
      Story.Command.expectExact(
        UploadFile({ uploadId: 0 }),
        UploadFile({ uploadId: 0 }),
      ),
      Story.message(UploadsMessage.ClickedCancelUpload({ uploadId: 0 })),
      Story.Command.resolve(
        CancelUploadFile({ uploadId: 0 }),
        UploadsMessage.CompletedCancelUploadFile({
          uploadId: 0,
          outcome: Interruptible.Interrupted(),
        }),
      ),
      Story.Command.expectNone(),
      Story.model((model: UploadsModel) => {
        expect(model.uploads).toEqual([{ id: 0, status: 'Cancelled' }])
      }),
    )
  })

  test('a keyed Command left pending at the end of the story still throws', () => {
    expect(() =>
      Story.story(
        uploadsUpdate,
        Story.given(initialUploadsModel),
        Story.message(UploadsMessage.ClickedStartUpload()),
      ),
    ).toThrow('I found Commands without resolvers')
  })
})

describe('outMessage', () => {
  test('OutMessage updates at each step in the story', () => {
    Story.story(
      childUpdate,
      Story.given({ status: 'Idle' }),
      Story.message(FormChildJsChildMessage.SubmittedForm()),
      Story.expectNoOutMessage(),
      Story.Command.resolve(
        SubmitForm,
        FormChildJsChildMessage.SucceededSubmitForm({ id: 'abc' }),
      ),
      Story.expectOutMessage(
        FormChildJsChildOutMessage.RequestedSave({ id: 'abc' }),
      ),
      Story.Command.resolve(
        ResetForm,
        FormChildJsChildMessage.CompletedResetForm(),
      ),
      Story.expectNoOutMessage(),
    )
  })

  test('Message that produces no Commands can still emit an OutMessage', () => {
    Story.story(
      childUpdate,
      Story.given({ status: 'Idle' }),
      Story.message(FormChildJsChildMessage.CancelledForm()),
      Story.expectOutMessage(FormChildJsChildOutMessage.RequestedCancel()),
    )
  })
})

describe("resolve applies the Command's own message mapping", () => {
  test('parent resolves mapped child Commands with the raw result Message', () => {
    Story.story(
      parentUpdate,
      Story.given(initialParentModel),
      Story.message(
        ParentMessage.GotChildMessage({
          message: FormChildJsChildMessage.SubmittedForm(),
        }),
      ),
      Story.model(model => {
        expect(model.child.status).toBe('Submitting')
      }),
      Story.Command.expectHas(SubmitForm),
      Story.Command.resolve(
        SubmitForm,
        FormChildJsChildMessage.SucceededSubmitForm({ id: 'abc' }),
      ),
      Story.model(model => {
        expect(model.child.status).toBe('Submitted')
        expect(model.savedIds).toEqual(['abc'])
      }),
      Story.Command.resolve(
        ResetForm,
        FormChildJsChildMessage.CompletedResetForm(),
      ),
      Story.model(model => {
        expect(model.child.status).toBe('Idle')
        expect(model.savedIds).toEqual(['abc'])
      }),
    )
  })
})

describe("resolveAll applies each Command's own message mapping", () => {
  test('parent resolves mapped child Commands with the raw result Messages', () => {
    Story.story(
      parentUpdate,
      Story.given(initialParentModel),
      Story.message(
        ParentMessage.GotChildMessage({
          message: FormChildJsChildMessage.SubmittedForm(),
        }),
      ),
      Story.model(model => {
        expect(model.child.status).toBe('Submitting')
      }),
      Story.Command.resolveAll(
        [
          SubmitForm,
          FormChildJsChildMessage.SucceededSubmitForm({ id: 'abc' }),
        ],
        [ResetForm, FormChildJsChildMessage.CompletedResetForm()],
      ),
      Story.model(model => {
        expect(model.child.status).toBe('Idle')
        expect(model.savedIds).toEqual(['abc'])
      }),
    )
  })
})

describe('type safety', () => {
  test('given returns a GivenStep', () => {
    const step = Story.given({ count: 0, log: [] })
    expectTypeOf(step).toMatchTypeOf<Story.GivenStep<{ count: number }>>()
  })

  test('story infers OutMessage from an update return', () => {
    Story.story(
      childUpdate,
      Story.given({ status: 'Idle' }),
      Story.expectNoOutMessage(),
    )
  })

  test('resolve constrains the result Message to the Command definition', () => {
    const resolver = Story.Command.resolve(
      FetchCount,
      CounterMessage.SucceededFetchCount({ count: 0 }),
    )
    expectTypeOf(resolver).toBeFunction()
  })

  test('resolve accepts a bare interruptible Command definition', () => {
    const resolver = Story.Command.resolve(
      UploadFile,
      UploadsMessage.SucceededUploadFile({ uploadId: 0 }),
    )
    expectTypeOf(resolver).toBeFunction()
  })

  test('resolve accepts a bare name-keyed interruptible Command definition', () => {
    const resolver = Story.Command.resolve(
      SaveDraft,
      DraftsMessage.SucceededSaveDraft({ revision: 0 }),
    )
    expectTypeOf(resolver).toBeFunction()
  })
})
