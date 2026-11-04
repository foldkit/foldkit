import { Effect, Layer, Option, Result, Schema } from 'effect'
import * as AsyncData from 'foldkit/asyncData'
import type * as Block from 'foldkit/block'
import * as Query from 'foldkit/experimental/query'
import * as Story from 'foldkit/story'

import * as Listbox from '@foldkit/ui/listbox'

import {
  Apple,
  Pear,
  MultiApple,
  Quotes,
  Windows,
  Parent,
  QuotesLayer,
  OtherQuotesLayer,
  initQuotes,
  updateQuotes,
  receiveQuotes,
} from './accepted.js'

const Numbers = Query.define({
  name: 'NumericFamilyProof',
  data: Schema.Number,
  error: Schema.String,
})
const stale = Object.assign({}, Apple, { OutMessage: Pear.OutMessage })
const { OutMessage: removed, ...withoutOutMessage } = Apple
const replaced = { ...withoutOutMessage, OutMessage: Pear.OutMessage }
declare const invalidUnion: typeof Apple | typeof replaced

type CanonicalOf<Value> =
  Value extends Block.FixedRefinement<any, infer Canonical, any>
    ? Canonical
    : never
declare const canonicalOnly: Layer.Layer<CanonicalOf<typeof Apple>>
const canonicalRead = Story.withBlock(Apple, executable =>
  executable.init({ id: 'canonical-only' }),
).pipe(Effect.provide(canonicalOnly))

if (false) {
  // @ts-expect-error A canonical-only provider lacks closed refined-reader admission.
  Effect.runPromise(canonicalRead)
  // @ts-expect-error Getter-free public factories expose no implementation escape.
  Quotes.get
  // @ts-expect-error A contract projection is no longer a public authoring stage.
  Quotes.contract
  // @ts-expect-error Fixed erased refinements cannot construct arbitrary replacements.
  Apple.makeLayer(Effect.succeed({}))
  // @ts-expect-error Fixed erased refinements cannot reselect handlers.
  MultiApple.provideHandlers(Layer.empty)
  Numbers.Message.CompletedFetch({
    generation: 1,
    // @ts-expect-error A per-Schema Query rejects data from another specialization.
    result: Result.succeed('wrong'),
  })
  Windows.Message.RequestedLoadIfMissing({
    // @ts-expect-error A KeyedQuery retains the complete exact Args Schema.
    args: { label: 'devin', offset: 0 },
  })
  // @ts-expect-error A Query keeps expected error payloads exact.
  Quotes.Message.CompletedFetch({ generation: 1, result: Result.fail(1) })
  Quotes.provideHandlers(
    // @ts-expect-error Host selection must supply the original Fetch identity.
    Numbers.toLayer(Effect.succeed(() => Effect.succeed(1))),
  )
  // @ts-expect-error Complete selected public Facts differ despite matching Schemas and owner.
  Story.withBlock({ block: Quotes, layer: OtherQuotesLayer }, () => undefined)
  // @ts-expect-error A broad empty Layer has no checked selected implementation.
  Story.withBlock({ block: Quotes, layer: Layer.empty }, () => undefined)
  // @ts-expect-error Copied closed-family evidence does not admit a changed public identity.
  Parent.makeBinding(stale, {
    read: model => Option.some(model.choice),
    write: (model, choice) => ({ ...model, choice }),
  })
  // @ts-expect-error A union containing a genuinely replaced stale member fails closed.
  Parent.makeBinding(invalidUnion, {
    read: model => Option.some(model.choice),
    write: (model, choice) => ({ ...model, choice }),
  })
  // @ts-expect-error Single and Multi are distinct closed provider families.
  Story.withBlock({ block: MultiApple, layer: Listbox.layer }, () => undefined)
  // @ts-expect-error Exact Value is preserved on OutMessage producers.
  Apple.makeOutMessageStep(() => Apple.OutMessage.Selected({ value: 'Pear' }))
  // @ts-expect-error Ordinary library constructor validation rejects a foreign original host.
  Quotes.makeLayer(
    Effect.succeed({
      children: [],
      init: initQuotes,
      update: updateQuotes,
      inMessageUpdate: receiveQuotes,
      EffectsLayer: Layer.empty,
      hostHandlers: [Numbers.Fetch],
    }),
  )
  const unregistered = {
    owner: Quotes.owner,
    Model: Quotes.Model,
    Message: Quotes.Message,
    OutMessage: Quotes.OutMessage,
  }
  // @ts-expect-error A caller-shaped record with no private reader is not a bare test subject.
  Story.withBlock(unregistered, () => undefined)
}

const quietComposition = Quotes.makeComposition()
const quietUpdate = quietComposition.makeUpdate({
  RequestedLoadIfStale: Quotes.makeNoopStep(),
  CompletedFetch: Quotes.makeNoopStep(),
  CompletedCancelFetch: Quotes.makeNoopStep(),
})
const quietReceive = quietComposition.makeInMessageUpdate({
  RequestedReset: Quotes.makeNoopStep(),
  RequestedRevalidation: Quotes.makeNoopStep(),
  RequestedRevalidationOrLoad: Quotes.makeNoopStep(),
  RequestedLoadIfMissing: Quotes.makeNoopStep(),
  RequestedCancel: Quotes.makeNoopStep(),
})
const quietInit = quietComposition.makeInit(() => ({
  model: Quotes.Model.make({ data: AsyncData.Idle(), generation: 0 }),
}))
declare const choose: boolean
const mixedHostInventory = Effect.sync(() =>
  choose
    ? {
        children: [],
        init: initQuotes,
        update: updateQuotes,
        inMessageUpdate: receiveQuotes,
        EffectsLayer: Layer.empty,
        hostHandlers: [Quotes.Fetch],
      }
    : {
        children: [],
        init: quietInit,
        update: quietUpdate,
        inMessageUpdate: quietReceive,
        EffectsLayer: Layer.empty,
      },
)
if (false) {
  // @ts-expect-error Every family constructor alternative retains its original host declaration.
  Quotes.makeLayer(mixedHostInventory)
}
