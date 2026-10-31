import { Array, Function, Option, pipe } from 'effect'

import type { AsyncData } from '../asyncData/index.js'
import type { Send } from '../blocks/block.js'
import type { Command } from '../command/index.js'

/** The Commands an update returns, typed by the Messages they produce and
 *  the services `R` their Effects require.
 *
 *  Name an alias when a module reuses the same Message and service types:
 *
 *  ```ts
 *  export type Commands = Update.Commands<Message, AppServices>
 *  ```
 */
export type Commands<Message, R = never> = ReadonlyArray<
  Command<Message, never, R>
>

/** The Effect services required by the Commands in an update result. */
export type RequirementsOfResult<Output> =
  Output extends Readonly<{
    commands?: infer ResultCommands
  }>
    ? NonNullable<ResultCommands> extends ReadonlyArray<infer CommandValue>
      ? CommandValue extends Command<any, any, infer R>
        ? R
        : never
      : never
    : never

/** The Effect services required by the Commands an update function can
 *  return. Services used only by Mounts or Subscriptions are not included.
 *
 *  ```ts
 *  type SaveRequirements = Update.RequirementsOf<typeof saveStep>
 *  ``` */
export type RequirementsOf<
  Update extends (...args: ReadonlyArray<any>) => unknown,
> = RequirementsOfResult<ReturnType<Update>>

/** The return shape of an update that emits no OutMessage. Omit `commands`
 *  when the update creates none, and `messages` when it sends no child
 *  instance a Message.
 *
 *  Use it as the return-type generic of an exhaustive matcher:
 *
 *  ```ts
 *  Message.match<Update.Return<Model, Message>>(message, {
 *    ClickedSave: () => ({ model, commands: [Save()] }),
 *    ChangedNote: ({ note }) => ({ model: modifyFields(model, { note: () => note }) }),
 *  })
 *  ```
 */
export type Return<Model, Message, R = never> = Readonly<{
  model: Model
  commands?: Commands<Message, R> | undefined
  messages?: ReadonlyArray<Send> | undefined
  /** This result emits no OutMessage. The field may be omitted but cannot
   *  hold a value, so TypeScript rejects a result containing an OutMessage
   *  where a caller would keep only the Model and Commands. */
  outMessage?: never
}>

/** The return shape of an update that can also report an OutMessage to its
 *  parent. Omit `outMessage` when the update emitted nothing. */
export type ReturnWithOutMessage<
  Model,
  Message,
  OutMessage,
  R = never,
> = Readonly<{
  model: Model
  commands?: Commands<Message, R> | undefined
  messages?: ReadonlyArray<Send> | undefined
  outMessage?: OutMessage | undefined
}>

/** One self-contained edit to the Model paired with the Commands to run: the
 *  unit {@link combineSteps} composes. A Step that needs arguments is a
 *  function returning a Step
 *  (`(noteId: NoteId) => Update.Step<Model, Message>`). */
export type Step<Model, Message, R = never> = (
  model: Model,
) => Return<Model, Message, R>

/** A {@link Step} that can also report an OutMessage. */
export type StepWithOutMessage<Model, Message, OutMessage, R = never> = (
  model: Model,
) => ReturnWithOutMessage<Model, Message, OutMessage, R>

/** What {@link combineSteps} accepts: a function from a Model to a result
 *  over the same Model. */
export type AnyStep<Model> = (model: Model) => Readonly<{
  model: Model
  commands?: ReadonlyArray<unknown> | undefined
  messages?: ReadonlyArray<Send> | undefined
  outMessage?: unknown
}>

type ResultOf<S> = S extends (model: never) => infer Result ? Result : never

type CommandOf<S> =
  ResultOf<S> extends Readonly<{
    commands?: ReadonlyArray<infer CommandValue> | undefined
  }>
    ? CommandValue
    : never

type OutMessageOf<S> =
  ResultOf<S> extends Readonly<{ outMessage?: infer OutMessage }>
    ? Exclude<OutMessage, undefined>
    : never

type ModelOf<S> = S extends (model: infer Model) => unknown ? Model : never

/** The result of {@link combineSteps}: the last Step's Model, every Step's
 *  Commands and child Messages in order, and the OutMessage a Step reported. */
export type Combined<Model, Steps extends ReadonlyArray<unknown>> = Readonly<{
  model: Model
  commands: ReadonlyArray<CommandOf<Steps[number]>>
  messages: ReadonlyArray<Send>
  outMessage?: OutMessageOf<Steps[number]>
}>

type MutableCombined = {
  model: unknown
  commands: ReadonlyArray<unknown>
  messages: ReadonlyArray<Send>
  outMessage?: unknown
}

const runSteps = (
  model: unknown,
  steps: ReadonlyArray<AnyStep<unknown>>,
): MutableCombined =>
  Array.reduce(
    steps,
    { model, commands: Array.empty(), messages: Array.empty() },
    (combined: MutableCombined, step): MutableCombined => {
      const result = step(combined.model)

      if (
        result.outMessage !== undefined &&
        combined.outMessage !== undefined
      ) {
        throw new Error(
          '[foldkit] Update.combineSteps received more than one OutMessage. An update reports at most one OutMessage, so emit it from one Step.',
        )
      }

      const outMessage = result.outMessage ?? combined.outMessage

      return {
        model: result.model,
        commands: [...combined.commands, ...(result.commands ?? [])],
        messages: [...combined.messages, ...(result.messages ?? [])],
        ...(outMessage === undefined ? {} : { outMessage }),
      }
    },
  )

/**
 * Composes a list of update Steps into one. Each Step runs against the Model
 * the previous Step produced. Their Commands and child Messages are
 * concatenated in order. The Runtime runs the Commands independently, so
 * array order does not sequence their effects or completion. At most one
 * Step may report an OutMessage; the combined result carries it.
 *
 * Dual: pass the Model and Steps (`combineSteps(model, steps)`), or pass only
 * the Steps to build a Step that runs later (`combineSteps(steps)`, for an
 * update record entry, a `pipe`, or a nested Step list). `combineSteps(model, [])`
 * returns the Model with no Commands.
 *
 * ```ts
 * SucceededUpdateNote: (model, { note }) =>
 *   Update.combineSteps(model, [
 *     replaceNoteInCachesStep(note),
 *     refreshNoteStep(note.id),
 *     stepModel => ({ model: stepModel, messages: [stepModel.toast.send(Toast.Message.RequestedShow())] }),
 *   ])
 * ```
 */
export const combineSteps: {
  <const Steps extends readonly [AnyStep<any>, ...ReadonlyArray<AnyStep<any>>]>(
    steps: Steps,
  ): (model: ModelOf<Steps[0]>) => Combined<ModelOf<Steps[0]>, Steps>
  <Model, const Steps extends ReadonlyArray<AnyStep<NoInfer<Model>>>>(
    model: Model,
    steps: Steps,
  ): Combined<Model, Steps>
} = Function.dual(2, (model: unknown, steps: ReadonlyArray<AnyStep<unknown>>) =>
  runSteps(model, steps),
)

/** Adds a known or optional OutMessage to an update return that has none,
 *  keeping its Model, Commands, and child Messages. `undefined` means the
 *  update emitted no OutMessage, so the returned record omits the property.
 *
 *  ```ts
 *  const dragCancellation = { model: nextModel, commands }
 *
 *  return pipe(dragCancellation, Update.withOutMessage(maybeOutMessage))
 *  ```
 *
 *  When the OutMessage is known while constructing the result, include it
 *  directly: `{ model, commands, outMessage }`. */
export const withOutMessage: {
  <OutMessage>(
    outMessage: OutMessage | undefined,
  ): <const Input extends Readonly<{ model: unknown; outMessage?: never }>>(
    updateReturn: Input,
  ) => Input & Readonly<{ outMessage?: OutMessage | undefined }>
  <
    const Input extends Readonly<{ model: unknown; outMessage?: never }>,
    OutMessage,
  >(
    updateReturn: Input,
    outMessage: OutMessage | undefined,
  ): Input & Readonly<{ outMessage?: OutMessage | undefined }>
} = Function.dual(
  2,
  (updateReturn: Readonly<{ model: unknown }>, outMessage: unknown) =>
    outMessage === undefined ? updateReturn : { ...updateReturn, outMessage },
)

/** The four capabilities that make one cache field revalidatable.
 *
 *  - `read`: gets the field's AsyncData out of the Model. Returns an
 *    `Option` because keyed caches miss (`HashMap.get`); single fields
 *    wrap in `Option.some`.
 *  - `revalidate`: decides whether and how the entry transitions.
 *    Usually exactly `AsyncData.revalidate` (refresh after a mutation:
 *    only `Success` and `Stale` move to `Refreshing`). Pass
 *    `AsyncData.revalidateOrLoad` instead for load-on-entry semantics.
 *  - `write`: puts the transitioned entry back into the Model.
 *  - `load`: the Command that refetches the data. */
export type Refreshable<Model, Message, A, E, R = never> = Readonly<{
  read: (model: Model) => Option.Option<AsyncData<A, E>>
  revalidate: (current: AsyncData<A, E>) => Option.Option<AsyncData<A, E>>
  write: (model: Model, next: AsyncData<A, E>) => Model
  load: Command<Message, never, R>
}>

/** Turns a {@link Refreshable} into an update step that revalidates one
 *  cache: read the entry, ask `revalidate` whether it should transition,
 *  and only when it says yes write the transitioned state and emit the
 *  load Command. When `revalidate` returns `None` (a missing entry, or a
 *  state with nothing to revalidate) the step returns `{ model }`: same
 *  Model, no Command. A handler can list every affected cache, and only the
 *  caches that currently hold data reload.
 *
 *  ```ts
 *  const refreshAllNotesStep = refresh({
 *    read: model => Option.some(model.allNotes),
 *    revalidate: AsyncData.revalidate,
 *    write: (model, nextAllNotes) => modifyFields(model, { allNotes: () => nextAllNotes }),
 *    load: LoadAllNotes(),
 *  })
 *  ``` */
export const refresh =
  <Model, Message, A, E, R = never>(
    refreshable: Refreshable<Model, Message, A, E, R>,
  ): Step<Model, Message, R> =>
  model =>
    pipe(
      refreshable.read(model),
      Option.flatMap(refreshable.revalidate),
      Option.match({
        onNone: () => ({ model }),
        onSome: next => ({
          model: refreshable.write(model, next),
          commands: [refreshable.load],
        }),
      }),
    )
