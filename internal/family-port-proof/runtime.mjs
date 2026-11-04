import { Context, Effect, Exit, Layer, Option, Result, Schema } from 'effect'
import * as AsyncData from 'foldkit/asyncData'
import * as Query from 'foldkit/experimental/query'
import * as Story from 'foldkit/story'
import assert from 'node:assert/strict'

import * as Listbox from '@foldkit/ui/listbox'

import * as F from './accepted.ts'

const events = []
const Passive = Query.define({
  name: 'PassiveFamilyPort',
  data: Schema.String,
  error: Schema.String,
  handler: function* () {
    events.push('handler')
    return () => Effect.succeed('ready')
  },
})
assert.deepEqual(events, [])
for (const factory of [Passive, F.Windows, F.Apple, F.MultiApple]) {
  assert.equal('get' in factory, false)
  assert.equal('contract' in factory, false)
  assert.equal('makeBlock' in factory, false)
}
for (const fixed of [F.Apple, F.MultiApple]) {
  assert.equal('makeLayer' in fixed, false)
  assert.equal('provideHandlers' in fixed, false)
}
await Effect.runPromise(
  Story.withBlock(Passive, executable => {
    assert.deepEqual(events, [])
    const initial = executable.init()
    assert.deepEqual(Passive.read(initial.model), AsyncData.Idle())
  }).pipe(Effect.provide(Query.layer)),
)
assert.deepEqual(events, [])
await Effect.runPromise(
  Story.withBlock(Passive, executable =>
    Layer.build(executable.EffectsLayer),
  ).pipe(Effect.provide(Query.layer)),
)
assert.deepEqual(events, ['handler'])

const resourceEvents = []
const scopedLayer = F.Quotes.makeLayer(
  Effect.gen(function* () {
    yield* Effect.acquireRelease(
      Effect.sync(() => resourceEvents.push('acquire')),
      () => Effect.sync(() => resourceEvents.push('release')),
    )

    return {
      children: [],
      init: F.initQuotes,
      update: F.updateQuotes,
      inMessageUpdate: F.receiveQuotes,
      EffectsLayer: Layer.empty,
      hostHandlers: [F.Quotes.Fetch],
    }
  }),
)
assert.deepEqual(resourceEvents, [])
await Effect.runPromise(
  Story.withBlock({ block: F.Quotes, layer: scopedLayer }, executable => {
    assert.deepEqual(resourceEvents, ['acquire'])
    assert.equal(executable.init().model.generation, 0)
  }).pipe(Effect.provide(Query.layer)),
)
assert.deepEqual(resourceEvents, ['acquire', 'release'])
const failure = await Effect.runPromise(Effect.exit(F.failingQuotesStory))
assert.equal(failure._tag, 'Failure')
assert.match(String(failure.cause), /unavailable/)

await Effect.runPromise(
  Story.withBlock(F.Windows, executable => {
    const initial = executable.init()
    const args = { label: 'devin', offset: 0, limit: 60 }
    const loading = executable.update(
      initial.model,
      F.Windows.Message.RequestedLoadIfMissing({ args }),
    )
    const fetch = loading.commands.find(
      command => command.name === F.Windows.Fetch.name,
    )
    assert.ok(fetch)
    const completed = F.Windows.Message.CompletedFetch({
      ...fetch.args,
      result: Result.succeed(['devin.com']),
      completedAtMillis: 1,
    })
    const accepted = executable.update(loading.model, completed)
    assert.deepEqual(
      accepted.outMessage,
      F.Windows.OutMessage.CompletedFetch({
        args,
        generation: completed.generation,
        result: Result.succeed(['devin.com']),
        completedAtMillis: 1,
      }),
    )
    const canceled = executable.update(
      loading.model,
      F.Windows.Message.RequestedCancel({ args }),
    )
    const late = executable.update(canceled.model, completed)
    assert.equal(late.model, canceled.model)
    assert.equal(late.outMessage, undefined)
  }).pipe(Effect.provide(Query.layer)),
)

await Effect.runPromise(
  Story.withBlock(
    { block: F.OtherQuotes, layer: F.OtherQuotesLayer },
    executable => Layer.build(executable.EffectsLayer),
  ).pipe(
    Effect.provide(Query.layer),
    Effect.provideService(F.OtherSource, { value: 'selected' }),
  ),
)
const wrongSelection = await Effect.runPromise(
  Effect.exit(
    Story.withBlock(
      { block: F.Quotes, layer: F.OtherQuotesLayer },
      executable => executable.init(),
    ).pipe(Effect.provide(Query.layer)),
  ),
)
assert.equal(wrongSelection._tag, 'Failure')
const SameTypes = F.Quotes.provideHandlers(F.Quotes.EffectsLayer)
const sameTypesLayer = SameTypes.makeLayer(
  Effect.succeed({
    children: [],
    init: F.initQuotes,
    update: F.updateQuotes,
    inMessageUpdate: F.receiveQuotes,
    EffectsLayer: Layer.empty,
    hostHandlers: [F.Quotes.Fetch],
  }),
)
const wrongSameTypes = await Effect.runPromise(
  Effect.exit(
    Story.withBlock({ block: F.Quotes, layer: sameTypesLayer }, executable =>
      executable.init(),
    ).pipe(Effect.provide(Query.layer)),
  ),
)
assert.equal(wrongSameTypes._tag, 'Failure')

await Effect.runPromise(
  Story.withBlock(
    { block: F.SelectedWindows, layer: F.WindowsLayer },
    executable => Layer.build(executable.EffectsLayer),
  ).pipe(
    Effect.provide(Query.layer),
    Effect.provideService(F.GraphSource, { generation: 1 }),
    Effect.provideService(F.WindowSource, { suffix: '.com' }),
  ),
)
const failedWindowGraph = await Effect.runPromise(
  Effect.exit(
    F.selectedWindowsStory.pipe(
      Effect.provideService(F.GraphSource, { generation: -1 }),
    ),
  ),
)
assert.equal(failedWindowGraph._tag, 'Failure')
assert.match(String(failedWindowGraph.cause), /negative generation/)

await Effect.runPromise(F.parentStory)
await Effect.runPromise(F.fixedStory)
await Effect.runPromise(F.fixedMultiStory)
const originalProof = Context.Service(
  'foldkit/ui/private/Listbox.Single.SharedImplementation',
)
const fixedChoice = Effect.gen(function* () {
  return yield* F.ChoiceBinding
})
const fixedSubject = Story.withBlock(F.Apple, executable =>
  executable.init({ id: 'guarded' }),
)
await Effect.runPromise(
  Effect.scoped(
    Effect.gen(function* () {
      const first = yield* Layer.build(Layer.fresh(Listbox.layer))
      const second = yield* Layer.build(Layer.fresh(Listbox.layer))
      const capture = Context.get(first, originalProof)
      const cloned = Context.add(second, originalProof, {
        ...Context.get(second, originalProof),
      })
      const mismatched = Context.add(second, originalProof, capture)
      for (const context of [cloned, mismatched]) {
        const direct = yield* Effect.exit(
          fixedSubject.pipe(Effect.provideContext(context)),
        )
        const child = yield* Effect.exit(
          fixedChoice.pipe(Effect.provideContext(context)),
        )
        assert.equal(direct._tag, 'Failure')
        assert.equal(child._tag, 'Failure')
      }
    }),
  ),
)
const expired = await Effect.runPromise(
  Effect.scoped(Layer.build(Layer.fresh(Listbox.layer))),
)
const expiredDirect = await Effect.runPromise(
  Effect.exit(fixedSubject.pipe(Effect.provideContext(expired))),
)
assert.equal(expiredDirect._tag, 'Failure')
await Effect.runPromise(
  Effect.scoped(
    Effect.gen(function* () {
      const current = yield* Layer.build(Layer.fresh(Listbox.layer))
      const mixed = Context.add(
        current,
        originalProof,
        Context.get(expired, originalProof),
      )
      const direct = yield* Effect.exit(
        fixedSubject.pipe(Effect.provideContext(mixed)),
      )
      const child = yield* Effect.exit(
        fixedChoice.pipe(Effect.provideContext(mixed)),
      )
      assert.equal(direct._tag, 'Failure')
      assert.equal(child._tag, 'Failure')
    }),
  ),
)
console.log(
  JSON.stringify({
    groups: 11,
    passiveHandlerConstruction: true,
    scopedReleases: 1,
    getterFreeFactories: 4,
    fixedProducerEscape: false,
    acceptedNotifications: true,
    lateCompletionIgnored: true,
    selectedKeyedConstructorError: true,
    selectedHandlerIdentity: true,
    samePublicTypeSelectionsRemainDistinct: true,
    captureForgeryRejected: true,
    crossAcquisitionRejected: true,
    expiredCaptureRejected: true,
  }),
)
