import { Context, Effect, Layer } from 'effect'
import * as Block from 'foldkit/block'
import * as Server from 'foldkit/experimental/server'
import * as Program from 'foldkit/program'
import * as Scene from 'foldkit/scene'
import * as Story from 'foldkit/story'

import { PendingHostBlock } from './block.js'
import { ReadValue } from './command.js'
import { GraphSettings, HostBlock, Message } from './contracts.js'
import { HostHandlers } from './provider.js'
import { SelectedHostBlock } from './selected.js'
import {
  Family,
  FamilyHandlers,
  NativeHandlers,
  NativePending,
} from './variants.js'

const ForeignNamespace = Block.makeNamespace('ForeignHostHandlerConsumer')
const ForeignReadValue = ForeignNamespace.makeCommand('ReadValue', {
  messages: [Message.CompletedReadValue],
})
const foreign = ForeignReadValue.toLayer(
  Effect.succeed(() =>
    Effect.succeed(Message.CompletedReadValue({ value: '' })),
  ),
)

// @ts-expect-error Host selection must provide the original handler contract.
PendingHostBlock.provideHandlers(foreign)
// @ts-expect-error Every declared host handler must have a selected provider.
PendingHostBlock.provideHandlers(Layer.empty)
// @ts-expect-error Host selection must not provide unrelated handlers.
PendingHostBlock.provideHandlers(Layer.merge(HostHandlers, foreign))
// @ts-expect-error Once resolved, host selection is unavailable.
SelectedHostBlock.provideHandlers(HostHandlers)
// @ts-expect-error A pending ordinary Block is not a Program root.
Program.make({ block: PendingHostBlock, container: null })
export const pendingWithBlock = Story.withBlock<typeof PendingHostBlock, void>(
  // @ts-expect-error A pure Story still requires the host provider contract to be selected.
  PendingHostBlock,
  () => undefined,
)
export const pendingStory = Story.story<typeof PendingHostBlock>(
  // @ts-expect-error Block-aware Story must not bypass host readiness.
  PendingHostBlock,
  Story.init(),
)
export const pendingConfiguredStory = Story.story<typeof PendingHostBlock>(
  // @ts-expect-error Configured Story must not bypass host readiness.
  { block: PendingHostBlock },
  Story.init(),
)
export const pendingScene = Scene.scene<typeof PendingHostBlock>(
  // @ts-expect-error Block-aware Scene must not bypass host readiness.
  PendingHostBlock,
  Scene.init(),
)
export const pendingServer = Server.renderToString(
  // @ts-expect-error Server roots must resolve host providers, even though SSR does not build them.
  PendingHostBlock,
  {},
  { isHydratable: false },
)

class UndeclaredService extends Context.Service<UndeclaredService, string>()(
  'HostHandlerConsumer/UndeclaredService',
) {}
const undeclaredService = ReadValue.toLayer(
  Effect.gen(function* () {
    const value = yield* UndeclaredService
    return () => Effect.succeed(Message.CompletedReadValue({ value }))
  }),
)
// @ts-expect-error Selected provider Services must fit the independent effects contract.
PendingHostBlock.provideHandlers(undeclaredService)
declare const isEnabled: boolean
const undeclaredError = ReadValue.toLayer(
  Effect.gen(function* () {
    if (isEnabled) {
      return yield* Effect.fail('undeclared')
    }

    return () => Effect.succeed(Message.CompletedReadValue({ value: '' }))
  }),
)
// @ts-expect-error Selected provider constructor errors must fit the effects contract.
PendingHostBlock.provideHandlers(undeclaredError)

const conditionalHandlers = isEnabled ? HostHandlers : Layer.empty
// @ts-expect-error Every selected Layer alternative must supply the original host handler.
PendingHostBlock.provideHandlers(conditionalHandlers)
declare const erasedHandlers: Layer.Layer<any>
// @ts-expect-error Erased handler outputs do not establish original handler coverage.
PendingHostBlock.provideHandlers(erasedHandlers)
// @ts-expect-error Native selection also requires every Layer alternative to provide the original.
NativePending.provideHandlers(isEnabled ? NativeHandlers : Layer.empty)
// @ts-expect-error Native selection rejects erased handler outputs.
NativePending.provideHandlers(erasedHandlers)
// @ts-expect-error Family selection also requires every Layer alternative to provide the original.
Family.provideHandlers(isEnabled ? FamilyHandlers : Layer.empty)
// @ts-expect-error Family selection rejects erased handler outputs.
Family.provideHandlers(erasedHandlers)

const ProvidedPending = PendingHostBlock.provide(
  Layer.succeed(GraphSettings, { isUnavailable: false }),
)
const unresolvedContract = Story.withBlock<typeof HostBlock, void>(
  HostBlock,
  block => {
    block.init()
  },
).pipe(Effect.provide(ProvidedPending.layer))
// @ts-expect-error A pending implementation Layer does not provide the ready passive contract.
Effect.runPromise(unresolvedContract)

ReadValue.toLayer(
  // @ts-expect-error A selected host provider must return its declared result Message.
  Effect.succeed(() => Effect.succeed(Message.ClickedReadValue())),
)
