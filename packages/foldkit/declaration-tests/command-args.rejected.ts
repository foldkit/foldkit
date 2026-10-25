import { Effect, Option } from 'effect'
import * as Scene from 'foldkit/scene'
import * as Story from 'foldkit/story'

import { Paint, Ping, parentPending } from './command-args.accepted.js'

// @ts-expect-error Only Definitions are accepted, not constructed invocations.
Scene.Command.argsOf(Paint({ generation: 1 }))
// @ts-expect-error Names do not identify a Command Definition.
Story.Command.argsOf(Paint.name)
// @ts-expect-error A same-named function without the Definition brand is not accepted.
Scene.Command.argsOf(() => ({ name: Paint.name, effect: Effect.void }))

const maybeArgs = Story.Command.argsOf(Paint)(parentPending)
if (Option.isSome(maybeArgs)) {
  // @ts-expect-error The projected generation remains numeric.
  const generation: string = maybeArgs.value.generation
  // @ts-expect-error Projecting args does not replace the qualified display name.
  const name: typeof Paint.name = parentPending.name
  // @ts-expect-error A parent Effect remains a parent Effect, including its Error and Services.
  const child: ReturnType<typeof Paint> = parentPending
  // @ts-expect-error An args object does not carry a child-local Effect.
  maybeArgs.value.effect
  void generation
  void name
  void child
}

declare const metadata: Scene.AnyCommand
const projected = Scene.Command.argsOf(Paint)(metadata)
if (Option.isSome(projected)) {
  // @ts-expect-error Projecting args does not manufacture an executable child Effect.
  metadata.effect
  // @ts-expect-error The original metadata is not narrowed by the projection.
  const generation: number = metadata.args.generation
  void generation
}
const argless = Story.Command.argsOf(Ping)(metadata)
if (Option.isSome(argless)) {
  // @ts-expect-error An argless match contains undefined.
  argless.value.generation
}
