import { Effect, Layer, Option, pipe } from 'effect'
import { Program, Runtime, Url } from 'foldkit'
import type { FactsOf, ExecutableOf } from 'foldkit/experimental/layered'
import { Story, withBlock } from 'foldkit/experimental/layered/testing'

import { ApplicationBlock } from '../src/client/block'
import {
  DomainsQueryBinding,
  FiltersDialogBinding,
} from '../src/client/composition'
import { ApplicationDefinition } from '../src/client/definition'
import { Message } from '../src/client/message'
import { DomainsClient } from '../src/client/rpc'
import { ApplicationLayer } from '../src/client/services'

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false
type Assert<Value extends true> = Value

export type CompletionName = Assert<
  Equal<
    Extract<keyof typeof ApplicationDefinition, 'make' | 'makeBlock'>,
    'makeBlock'
  >
>
export type ConstructionNeedsNoClient = Assert<
  Equal<Layer.Services<typeof ApplicationBlock.layer>, never>
>
export type ConstructionCannotFail = Assert<
  Equal<Layer.Error<typeof ApplicationBlock.layer>, never>
>
export type HandlerLayerNeedsClient = Assert<
  Equal<
    Layer.Services<ExecutableOf<typeof ApplicationBlock>['EffectsLayer']>,
    DomainsClient
  >
>
export type RuntimeNeedsClient = Assert<
  Equal<FactsOf<typeof ApplicationBlock>['programRequirements'], DomainsClient>
>

const url = pipe(Url.fromString('http://localhost/'), Option.getOrThrow)

export const pureStory = Story.story(ApplicationBlock, Story.init(url))
export type StoryNeedsNoClient = Assert<
  Equal<Effect.Services<typeof pureStory>, never>
>

DomainsQueryBinding.requestLoadIfStale(
  { label: 'devin', offset: 0, limit: 4 },
  100,
)
DomainsQueryBinding.requestLoadIfStale(
  { label: 'devin', offset: 0, limit: 4 },
  // @ts-expect-error Timestamp inputs retain their number contract through the portable Binding.
  'now',
)
FiltersDialogBinding.requestClose()
// @ts-expect-error Dialog operations remain distinct from Query operations.
FiltersDialogBinding.requestLoadIfStale(
  { label: 'devin', offset: 0, limit: 4 },
  100,
)
// @ts-expect-error Root Message payload inference is exact.
Message.UpdatedSearch({ value: 123 })

withBlock(ApplicationBlock, block => {
  block.init(url)
  // @ts-expect-error The root still initializes from a decoded Url.
  block.init('http://localhost/')
  // @ts-expect-error Local Message constructors keep their exact payloads.
  block.Message.UpdatedSearch({ value: 123 })
})

const pending = Program.make({
  block: ApplicationBlock,
  container: null,
  routing: {
    onUrlRequest: ApplicationBlock.Message.ClickedLink,
    onUrlChange: ApplicationBlock.Message.ChangedUrl,
  },
})
// @ts-expect-error Production startup requires the real DomainsClient handler provider.
Runtime.hydrate(pending)
Runtime.hydrate(pending.provide(ApplicationLayer))
