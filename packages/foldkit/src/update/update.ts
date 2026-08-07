import { Array, Function, Option, pipe } from 'effect'

import { type AsyncData } from '../asyncData/index.js'
import { type Command, mapMessages } from '../command/index.js'

/** The Commands half of an update return: every Command the update wants
 *  the runtime to run, in order. `R` is the services the Commands need
 *  and defaults to `never` for applications without resources.
 *
 *  Each update module pins its concrete types once and uses the alias
 *  throughout; the root update and every Submodel define their own:
 *
 *  ```ts
 *  export type Commands = Update.Commands<Message, AppServices>
 *  ``` */
export type Commands<Message, R = never> = ReadonlyArray<
  Command<Message, never, R>
>

/** The pair every update function returns: the next Model and the
 *  Commands to run.
 *
 *  Each update module pins its concrete types once and aliases the
 *  result, the root update and every Submodel alike:
 *
 *  ```ts
 *  export type UpdateReturn = Update.Return<Model, Message>
 *  export const withUpdateReturn = M.withReturnType<UpdateReturn>()
 *  ``` */
export type Return<Model, Message, R = never> = readonly [
  Model,
  Commands<Message, R>,
]

/** The return shape of an update that also surfaces an OutMessage to its
 *  parent. The third element is an `Option`: the update always returns
 *  the channel, and `None` means there is nothing for the parent this
 *  time. Named for the shape, not the caller: a Submodel without an
 *  OutMessage channel returns a plain {@link Return}. */
export type ReturnWithOutMessage<
  Model,
  Message,
  OutMessage,
  R = never,
> = readonly [Model, Commands<Message, R>, Option.Option<OutMessage>]

/** One self-contained edit to the Model paired with the Commands to run:
 *  the unit {@link combine} composes. A step that needs arguments is a
 *  function returning a Step (`(noteId: NoteId) => Step<...>`). */
export type Step<Model, Message, R = never> = (
  model: Model,
) => Return<Model, Message, R>

/** Composes a list of update steps into one. Each step runs against the
 *  Model the previous step produced, and every step's Commands are
 *  concatenated into a single batch, in step order.
 *
 *  Dual: call it data-first with the Model to run the steps now
 *  (`combine(model, steps)` returns a {@link Return}), or data-last with
 *  only the steps to build a composable {@link Step} that runs later
 *  (`combine(steps)`, for a `pipe` or a nested step list).
 *
 *  Steps only ever accumulate Commands; a step cannot cancel or replace
 *  another step's Commands, and no Command runs during the fold. The
 *  runtime runs the batch after update returns. `combine([])` returns
 *  `[model, []]`.
 *
 *  ```ts
 *  SucceededUpdateNote: ({ note }) =>
 *    combine(model, [
 *      replaceNoteInCaches(note),
 *      refreshNote(note.id),
 *      refreshAllNotes,
 *      refreshNotebookNotes(note.maybeNotebookId),
 *      ...(hasMoved ? [refreshNotebookNotes(previousNotebookId)] : []),
 *      showToast('Success', `Updated ${note.title}`),
 *    ])
 *  ``` */
export const combine: {
  <Model, Message, R = never>(
    steps: ReadonlyArray<Step<Model, Message, R>>,
  ): Step<Model, Message, R>
  <Model, Message, R = never>(
    model: Model,
    steps: ReadonlyArray<Step<Model, Message, R>>,
  ): Return<Model, Message, R>
} = Function.dual(
  2,
  <Model, Message, R>(
    model: Model,
    steps: ReadonlyArray<Step<Model, Message, R>>,
  ): Return<Model, Message, R> => {
    const seed: Return<Model, Message, R> = [model, []]
    return Array.reduce(steps, seed, ([currentModel, commands], step) => {
      const [nextModel, nextCommands] = step(currentModel)
      return [nextModel, [...commands, ...nextCommands]]
    })
  },
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
 *  state with nothing to revalidate) the step returns `[model, []]`: same
 *  Model, no Command. That one rule is what makes blanket revalidation
 *  safe, because only the caches that actually hold data reload.
 *
 *  ```ts
 *  const refreshAllNotes = refresh({
 *    read: model => Option.some(model.allNotes),
 *    revalidate: AsyncData.revalidate,
 *    write: (model, nextAllNotes) => evo(model, { allNotes: () => nextAllNotes }),
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
        onNone: () => [model, []],
        onSome: next => [refreshable.write(model, next), [refreshable.load]],
      }),
    )

/** The four capabilities that fold one child Submodel's update into the
 *  parent, for a child without an OutMessage channel.
 *
 *  - `update`: the child entry point to run, returning {@link Return}.
 *    Usually the child's update function, so `Input` is the child's
 *    Message, but any entry point with the same return shape fits: an
 *    `informPressedKey(child, key)` takes a string, a `join(child,
 *    player)` takes a domain value. An entry point that takes extra
 *    context is closed over here
 *    (`update: (child, message) => Room.update(child, message, { roomId })`).
 *  - `read`: gets the child Model out of the parent Model. Returns an
 *    `Option` because a child may not be mounted (a page behind a route,
 *    a keyed collection miss); single fields wrap in `Option.some`.
 *  - `write`: puts the updated child Model back into the parent Model.
 *  - `toParentMessage`: lifts a child Message into the parent's Message,
 *    the same contract `h.submodel` takes for the view half. Always the
 *    child's `Got*` wrapper: `message => GotSearchMessage({ message })`. */
export type ChildFold<
  ParentModel,
  ParentMessage,
  ChildModel,
  Input,
  ChildMessage,
  R = never,
> = Readonly<{
  update: (
    childModel: ChildModel,
    input: Input,
  ) => Return<ChildModel, ChildMessage, R>
  read: (model: ParentModel) => Option.Option<ChildModel>
  write: (model: ParentModel, nextChildModel: ChildModel) => ParentModel
  toParentMessage: (message: ChildMessage) => ParentMessage
}>

/** {@link ChildFold} for a child whose update returns
 *  {@link ReturnWithOutMessage}, adding the fifth capability:
 *
 *  - `foldOutMessage`: folds the child's OutMessage into the parent as a
 *    {@link Step}. The Step receives the parent Model with the child
 *    already written back, and its Commands run after the child's. Match
 *    on the OutMessage tag inside (`M.tagsExhaustive`), and compose
 *    multi-part reactions with {@link combine}. */
export type ChildFoldWithOutMessage<
  ParentModel,
  ParentMessage,
  ChildModel,
  Input,
  ChildMessage,
  ChildOutMessage,
  R = never,
> = Readonly<{
  update: (
    childModel: ChildModel,
    input: Input,
  ) => ReturnWithOutMessage<ChildModel, ChildMessage, ChildOutMessage, R>
  read: (model: ParentModel) => Option.Option<ChildModel>
  write: (model: ParentModel, nextChildModel: ChildModel) => ParentModel
  toParentMessage: (message: ChildMessage) => ParentMessage
  foldOutMessage: (
    outMessage: ChildOutMessage,
  ) => Step<ParentModel, ParentMessage, R>
}>

/** @internal Implementation-facing view of both {@link ChildFold} shapes:
 *  the child update's third tuple element and `foldOutMessage` are
 *  optional, and every type parameter is erased. The overloads on
 *  {@link foldChild} carry the public contract. */
type AnyChildFold = Readonly<{
  update: (
    childModel: any,
    input: any,
  ) => readonly [any, Commands<any, any>, Option.Option<any>?]
  read: (model: any) => Option.Option<any>
  write: (model: any, nextChildModel: any) => any
  toParentMessage: (message: any) => any
  foldOutMessage?: (outMessage: any) => Step<any, any, any>
}>

/** Folds a child Submodel's update into the parent: the update half of
 *  embedding a child, complementing `h.submodel` on the view half. Give
 *  it the facts that vary per child (a {@link ChildFold}, or a
 *  {@link ChildFoldWithOutMessage} when the child raises OutMessages) and
 *  it returns `(message) => Step`, so the parent's `Got*` handler is one
 *  line and the fold composes with {@link combine} like any other Step:
 *
 *  ```ts
 *  const foldSearch = Update.foldChild({
 *    update: Search.update,
 *    read: (model: Model) => Option.some(model.search),
 *    write: (model, nextSearch) => evo(model, { search: () => nextSearch }),
 *    toParentMessage: message => GotSearchMessage({ message }),
 *  })
 *
 *  // in the parent update
 *  GotSearchMessage: ({ message }) => foldSearch(message)(model),
 *  ```
 *
 *  The Step runs the child entry point against the Model `read`
 *  returns, writes the child back, and lifts the child's Commands
 *  through `toParentMessage` with `Command.mapMessages`, so the mapping
 *  chain stays recoverable for `Story`/`Scene` `resolve`. When `read`
 *  returns `None` the Step is `[model, []]`: a Message for an unmounted
 *  child is a no-op. When the child raises an OutMessage,
 *  `foldOutMessage` runs against the Model with the child already
 *  written, and its Commands append after the child's mapped Commands.
 *
 *  `Input` is whatever the entry point takes: the child's Message for an
 *  update-driven fold, a plain value for an `inform*` entry point. A
 *  Command that must run before the child's (a navigation racing a
 *  join) is a plain Step composed ahead of the fold with
 *  {@link combine}. */
export const foldChild: {
  <
    ParentModel,
    ParentMessage,
    ChildModel,
    Input,
    ChildMessage,
    ChildOutMessage,
    R = never,
  >(
    childFold: ChildFoldWithOutMessage<
      ParentModel,
      ParentMessage,
      ChildModel,
      Input,
      ChildMessage,
      ChildOutMessage,
      R
    >,
  ): (input: Input) => Step<ParentModel, ParentMessage, R>
  <ParentModel, ParentMessage, ChildModel, Input, ChildMessage, R = never>(
    childFold: ChildFold<
      ParentModel,
      ParentMessage,
      ChildModel,
      Input,
      ChildMessage,
      R
    >,
  ): (input: Input) => Step<ParentModel, ParentMessage, R>
} =
  (childFold: AnyChildFold) =>
  (input: any): Step<any, any, any> =>
  model =>
    pipe(
      childFold.read(model),
      Option.match({
        onNone: () => [model, []],
        onSome: childModel => {
          const [nextChildModel, childCommands, maybeOutMessage] =
            childFold.update(childModel, input)
          const modelWithChild = childFold.write(model, nextChildModel)
          const mappedCommands = mapMessages(
            childCommands,
            childFold.toParentMessage,
          )

          if (
            childFold.foldOutMessage === undefined ||
            maybeOutMessage === undefined
          ) {
            return [modelWithChild, mappedCommands]
          }

          const { foldOutMessage } = childFold
          return Option.match(maybeOutMessage, {
            onNone: () => [modelWithChild, mappedCommands],
            onSome: outMessage => {
              const [nextModel, outCommands] =
                foldOutMessage(outMessage)(modelWithChild)
              return [nextModel, [...mappedCommands, ...outCommands]]
            },
          })
        },
      }),
    )
