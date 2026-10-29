import { Effect, Schema } from 'effect'
import * as Foldkit from 'foldkit'

import * as PlatformBrowser from '@effect/platform-browser'
import * as PlatformNode from '@effect/platform-node'
import * as PlatformNodeShared from '@effect/platform-node-shared'
import * as DevtoolsMcp from '@foldkit/devtools-mcp'
import * as Devtools from '@foldkit/devtools/vite'
import * as Markdown from '@foldkit/markdown'
import * as Node from '@foldkit/node'
import * as Ui from '@foldkit/ui'
import * as VitePlugin from '@foldkit/vite-plugin'

export type PublicPackageNamespaces = Readonly<{
  foldkit: typeof Foldkit
  ui: typeof Ui
  devtools: typeof Devtools
  devtoolsMcp: typeof DevtoolsMcp
  markdown: typeof Markdown
  node: typeof Node
  vitePlugin: typeof VitePlugin
  platformBrowser: typeof PlatformBrowser
  platformNode: typeof PlatformNode
  platformNodeShared: typeof PlatformNodeShared
}>

const Model = Schema.Struct({ count: Schema.Number })
type Model = typeof Model.Type

const Message = Foldkit.Message.defineMessageUnion({ CompletedWait: {} })
type Message = typeof Message.Type

const PackedEffectConsumerDefinition = Foldkit.Block.makeDefinition(
  'PackedEffectConsumer',
  {
    Model,
    Message,
  },
)

const Wait = PackedEffectConsumerDefinition.makeCommand('Wait', {
  messages: [Message.CompletedWait],
  handler: function* () {
    return () =>
      Effect.sleep('1 millis').pipe(Effect.as(Message.CompletedWait()))
  },
})

export const EffectsLayer = Wait.layer
export const wait: Effect.Effect<Message> = Wait().effect.pipe(
  Effect.provide(EffectsLayer),
)

export type PackageEffect = Effect.Effect<Message>
