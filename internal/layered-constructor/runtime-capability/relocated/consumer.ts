import { ApplicationBlock } from 'chat-proof/application'
import { ChatRoomContract } from 'chat-proof/chatRoom/definition'
import { detachedHandlerBuild, missingCapability } from 'chat-proof/checks'
import {
  AuditLog,
  ConfiguredBlock,
  StartupConfiguration,
} from 'chat-proof/constructionServices'
import { FailureBlock } from 'chat-proof/errors'
import { pureStory } from 'chat-proof/story'
import { type Context, Effect, Layer } from 'effect'
import type { ExecutableOf, RuntimeCapability } from 'foldkit/block'

type Expect<Value extends true> = Value
type Equal<Left, Right> = [Left, Right] extends [Right, Left] ? true : false
export type ConstructorServiceIsExact = Expect<
  Equal<Layer.Services<typeof ConfiguredBlock.layer>, StartupConfiguration>
>
export type HandlerServiceIsExact = Expect<
  Equal<
    Layer.Services<ExecutableOf<typeof ConfiguredBlock>['EffectsLayer']>,
    AuditLog
  >
>
export type BuildErrorIsExact = Expect<
  Equal<
    Layer.Error<ExecutableOf<typeof FailureBlock>['EffectsLayer']>,
    'HandlerUnavailable'
  >
>
export type StoryNeedsNoHandlers = Expect<
  Equal<Effect.Services<typeof pureStory>, never>
>
export type BuildNeedsNoRuntime = Expect<
  Equal<Effect.Services<typeof detachedHandlerBuild>, never>
>
export type InvocationStillNeedsRuntime = Expect<
  Equal<
    Effect.Services<typeof missingCapability>,
    RuntimeCapability<typeof ChatRoomContract.owner>
  >
>
declare const wrong: Context.Context<
  RuntimeCapability<typeof ApplicationBlock.owner>
>

if (false) {
  Effect.runPromise(detachedHandlerBuild)
  // @ts-expect-error Relocation retains invocation's exact Runtime capability requirement.
  Effect.runPromise(missingCapability)
  const wrongProvider = missingCapability.pipe(Effect.provideContext(wrong))
  // @ts-expect-error A different owner's occurrence does not satisfy this Room.
  Effect.runPromise(wrongProvider)
}
