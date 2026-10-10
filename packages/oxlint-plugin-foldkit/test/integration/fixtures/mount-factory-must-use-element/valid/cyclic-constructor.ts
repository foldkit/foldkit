import { Effect, Scope } from 'effect'
import { Mount } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

const Message = defineMessageUnion({ CompletedCyclicMount: {} })
type Handler = (input: Readonly<{ element: Element }>) => Effect.Effect<
  typeof Message.CompletedCyclicMount.Type
>

const recursiveBuild: Effect.Effect<Handler> = Effect.flatMap(
  Effect.void,
  () => recursiveBuild,
)

const RecursiveConstructor = Mount.define('RecursiveConstructor', {
  messages: [Message.CompletedCyclicMount],
})

RecursiveConstructor.toLayer(recursiveBuild)

const firstBuild: Effect.Effect<Handler> = Effect.flatMap(
  Effect.void,
  () => secondBuild,
)
const secondBuild: Effect.Effect<Handler> = Effect.flatMap(
  Effect.void,
  () => firstBuild,
)

const IndirectRecursiveConstructor = Mount.define(
  'IndirectRecursiveConstructor',
  { messages: [Message.CompletedCyclicMount] },
)

IndirectRecursiveConstructor.toLayer(firstBuild)

const scopedBuild: Effect.Effect<Handler, never, Scope.Scope> =
  Effect.acquireRelease(
    Effect.flatMap(Effect.void, () => scopedBuild),
    () => Effect.void,
  )

const HostMount = Mount.define('ScopedRecursiveConstructor', {
  messages: [Message.CompletedCyclicMount],
})

HostMount.toLayer(scopedBuild)
