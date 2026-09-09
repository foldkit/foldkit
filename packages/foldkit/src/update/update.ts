import { Array, Function, Option, pipe } from 'effect'

import { type AsyncData } from '../asyncData/index.js'
import { type Command, mapMessage, mapMessages } from '../command/index.js'

/** The Commands collection an update return may include. The collection keeps
 *  the order in which the update returned them, but the runtime forks the
 *  Commands independently. `R` is the services the Commands need and defaults
 *  to `never` for applications without resources.
 *
 *  Name an alias when a module reuses the same Message and service types:
 *
 *  ```ts
 *  export type Commands = Update.Commands<Message, AppServices>
 *  ``` */
export type Commands<Message, R = never> = ReadonlyArray<
  Command<Message, never, R>
>

/** The record an update returns when it cannot emit an OutMessage: the next
 *  Model and any Commands to run.
 *
 *  Inline the type when a matcher is its only use:
 *
 *  ```ts
 *  export const update = (model: Model, message: Message) =>
 *    Message.match<Update.Return<Model, Message>>(message, {
 *      ClickedSave: () => ({ model, commands: [Save()] }),
 *      SucceededSave: ({ note }) => ({
 *        model: evo(model, { note: () => note }),
 *      }),
 *    })
 *  ```
 *
 *  Give it a local `UpdateReturn` alias when another matcher or helper in the
 *  module needs the same type. */
export type Return<Model, Message, R = never> = Readonly<{
  model: Model
  commands?: Commands<Message, R>
  /** This result emits no OutMessage. The field may be omitted but cannot hold
   *  a value. TypeScript therefore rejects a result containing an OutMessage
   *  where a caller would keep only the Model and Commands. */
  outMessage?: never
}>

/** The return shape of an update that can also surface an OutMessage to its
 *  parent. Omit `commands` when the update statically creates none. Return a
 *  computed Commands collection directly, even when it may be empty. Omit
 *  `outMessage` when the update emitted nothing. A Submodel that cannot emit
 *  an OutMessage returns {@link Return} instead. */
export type ReturnWithOutMessage<
  Model,
  Message,
  OutMessage,
  R = never,
> = Readonly<{
  model: Model
  commands?: Commands<Message, R>
  outMessage?: OutMessage
}>

/** Adds a known or optional OutMessage to a plain update return while
 *  preserving its Model and Commands. Use this helper when attaching to an
 *  existing return or when the value has the type `OutMessage | undefined`.
 *  `undefined` means that the operation emitted no OutMessage, so the returned
 *  record omits the property.
 *
 *  The input must be a {@link Return}, so this helper cannot replace an
 *  OutMessage that an update already emitted.
 *
 *  ```ts
 *  const editorSave = Update.combine(model, [writeDraft, clearErrors])
 *
 *  return pipe(editorSave, Update.withOutMessage(outMessage))
 *  ```
 *
 *  When the OutMessage is already known while constructing a new result,
 *  include it directly: `{ model, commands, outMessage }`. If the OutMessage
 *  may be `undefined`, pass the new result first:
 *  `Update.withOutMessage({ model, commands }, outMessage)`. */
export const withOutMessage: {
  <OutMessage>(
    outMessage: OutMessage | undefined,
  ): <Model, Message, R = never>(
    updateReturn: Return<Model, Message, R>,
  ) => ReturnWithOutMessage<Model, Message, OutMessage, R>
  <Model, Message, OutMessage, R = never>(
    updateReturn: Return<Model, Message, R>,
    outMessage: OutMessage | undefined,
  ): ReturnWithOutMessage<Model, Message, OutMessage, R>
} = Function.dual(
  2,
  <Model, Message, OutMessage, R = never>(
    updateReturn: Return<Model, Message, R>,
    outMessage: OutMessage | undefined,
  ): ReturnWithOutMessage<Model, Message, OutMessage, R> =>
    outMessage === undefined ? updateReturn : { ...updateReturn, outMessage },
)

/** One self-contained edit to the Model paired with the Commands to run:
 *  the unit {@link combine} composes. A step that needs arguments is a
 *  function returning a Step
 *  (`(noteId: NoteId) => Update.Step<Model, Message>`). */
export type Step<Model, Message, R = never> = (
  model: Model,
) => Return<Model, Message, R>

/** {@link Step} for an update that also surfaces an OutMessage to its
 *  parent: maps a Model to a {@link ReturnWithOutMessage} over the same
 *  Model. */
export type StepWithOutMessage<Model, Message, OutMessage, R = never> = (
  model: Model,
) => ReturnWithOutMessage<Model, Message, OutMessage, R>

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
 *  `{ model }`.
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
    const seed: Return<Model, Message, R> = { model }
    return Array.reduce(steps, seed, (current, step) => {
      const next = step(current.model)
      const commands = [...(current.commands ?? []), ...(next.commands ?? [])]
      return { model: next.model, commands }
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
 *  state with nothing to revalidate) the step returns `{ model }`: same
 *  Model, no Command. A handler can list every affected cache, and only the
 *  caches that currently hold data reload.
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
        onNone: () => ({ model }),
        onSome: next => ({
          model: refreshable.write(model, next),
          commands: [refreshable.load],
        }),
      }),
    )

/** The four capabilities that fold one child Submodel's update into the
 *  parent, for a child whose update cannot emit an OutMessage.
 *
 *  - `update`: the child update function to run.
 *  - `read`: the getter half of the lens onto the child: reads the child
 *    Model from the parent Model. Returns an `Option` because a child
 *    may not be mounted (for example a page behind a route or a keyed
 *    collection miss); a single always-present field wraps in
 *    `Option.some`.
 *  - `write`: the setter half of the lens: writes the updated child
 *    Model back into the parent Model.
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

/** The lifters a `foldOutMessage` receives as its second parameter,
 *  already bound to the fold config's `toParentMessage`.
 *
 *  The fold already lifts the Commands returned by the child's `update`.
 *  Use these lifters for a Command returned by the parent's OutMessage Step
 *  when that Command still produces the child's Message. For example, the
 *  parent may handle a child's `Requested*` fact by returning a child Command
 *  built with routing context only the parent holds.
 *
 *  The lifters apply the same lift the fold gives the child's own
 *  Commands, so the Step writes no `Command.mapMessage` call and keeps
 *  no second copy of the wrapper, and the mapping stays recorded on the
 *  Command for `Story.Command.resolve` and `Scene.Command.resolve`.
 *
 *  The annotated standalone const takes both parameters, so pass the
 *  OutMessage value to its union matcher:
 *
 *  ```ts
 *  const foldLoginOutMessage = (
 *    outMessage: Login.OutMessage,
 *    { liftCommand }: Update.FoldContext<Login.Message, Message>,
 *  ) =>
 *    Login.OutMessage.match<Update.Step<Model, Message>>(outMessage, {
 *      RequestedMagicLink:
 *        ({ email }) =>
 *        model => ({
 *          model,
 *          commands: [
 *            liftCommand(
 *              Login.SendMagicLink({ email, redirectRoute: model.route }),
 *            ),
 *          ],
 *        }),
 *    })
 *  ``` */
export type FoldContext<ChildMessage, ParentMessage> = Readonly<{
  liftCommand: <E = never, R = never>(
    command: Command<ChildMessage, E, R>,
  ) => Command<ParentMessage, E, R>
  liftCommands: <E = never, R = never>(
    commands: ReadonlyArray<Command<ChildMessage, E, R>>,
  ) => ReadonlyArray<Command<ParentMessage, E, R>>
}>

/** {@link ChildFold} for a child whose update returns
 *  {@link ReturnWithOutMessage}, adding the fifth capability:
 *
 *  - `foldOutMessage`: folds the child's OutMessage into the parent as a
 *    {@link Step}. The Step receives the parent Model with the child
 *    already written back, and its Commands follow the child's in the
 *    returned batch. Match on the OutMessage tag through its union matcher,
 *    and build a multi-step fold with {@link combine}. Takes an optional
 *    second parameter, a
 *    {@link FoldContext} of lifters bound to `toParentMessage`, for a
 *    Command the Step returns whose result is the child's Message. Parent Model
 *    inference comes from `read` and `write`; the child wrapper and OutMessage
 *    Step infer their Message and service requirements independently, and the
 *    resulting Fold requires their unions. */
export type ChildFoldWithOutMessage<
  ParentModel,
  ParentMessage,
  ChildModel,
  Input,
  ChildMessage,
  ChildOutMessage,
  ChildRequirements = never,
  OutMessageStepRequirements = ChildRequirements,
  OutMessageStepMessage = ParentMessage,
> = Readonly<{
  update: (
    childModel: ChildModel,
    input: Input,
  ) => ReturnWithOutMessage<
    ChildModel,
    ChildMessage,
    ChildOutMessage,
    ChildRequirements
  >
  read: (model: ParentModel) => Option.Option<ChildModel>
  write: (model: ParentModel, nextChildModel: ChildModel) => ParentModel
  toParentMessage: (message: ChildMessage) => ParentMessage
  foldOutMessage: (
    outMessage: ChildOutMessage,
    context: FoldContext<ChildMessage, ParentMessage>,
  ) => Step<
    NoInfer<ParentModel>,
    OutMessageStepMessage,
    OutMessageStepRequirements
  >
}>

/** {@link ChildFoldWithOutMessage} for a parent that derives its own
 *  OutMessage while folding the child's. The returned
 *  {@link StepWithOutMessage} receives the parent Model with the child already
 *  written back. Use this shape when no child OutMessage is forwarded one to
 *  one, so the fold needs no `toParentOutMessage` adapter. */
export type ChildFoldWithDerivedParentOutMessage<
  ParentModel,
  ParentMessage,
  ChildModel,
  Input,
  ChildMessage,
  ChildOutMessage,
  ParentOutMessage,
  ChildRequirements = never,
  OutMessageStepRequirements = ChildRequirements,
  OutMessageStepMessage = ParentMessage,
> = Readonly<{
  update: (
    childModel: ChildModel,
    input: Input,
  ) => ReturnWithOutMessage<
    ChildModel,
    ChildMessage,
    ChildOutMessage,
    ChildRequirements
  >
  read: (model: ParentModel) => Option.Option<ChildModel>
  write: (model: ParentModel, nextChildModel: ChildModel) => ParentModel
  toParentMessage: (message: ChildMessage) => ParentMessage
  toParentOutMessage?: never
  foldOutMessage: (
    outMessage: ChildOutMessage,
    context: FoldContext<ChildMessage, ParentMessage>,
  ) => StepWithOutMessage<
    NoInfer<ParentModel>,
    OutMessageStepMessage,
    ParentOutMessage,
    OutMessageStepRequirements
  >
}>

/** {@link ChildFoldWithOutMessage} for a parent that is itself a
 *  Submodel, so the fold can return the parent's own OutMessage. Adds:
 *
 *  - `toParentOutMessage`: lifts the child's OutMessage into the
 *    parent's own OutMessage. Return `undefined` for a named child variant
 *    that stops at this parent. When the child returns no OutMessage, the fold
 *    omits `outMessage`.
 *  - `foldOutMessage` stays available for a parent that also updates
 *    its own state from the child's OutMessage, and is optional here.
 *    It may emit a derived parent OutMessage. That OutMessage replaces the
 *    one-to-one lift for the dispatch. When the Step emits nothing, the lift
 *    runs as usual.
 *
 *  Use this shape only when at least one child OutMessage should continue to
 *  the current Submodel's parent. If every child OutMessage stops here, use
 *  {@link ChildFoldWithDerivedParentOutMessage} when the fold derives its own
 *  OutMessage, or {@link ChildFoldWithOutMessage} when it does not. When
 *  provided, `foldOutMessage` still handles each variant locally, including
 *  variants that continue upward. */
export type ChildFoldWithParentOutMessage<
  ParentModel,
  ParentMessage,
  ChildModel,
  Input,
  ChildMessage,
  ChildOutMessage,
  ParentOutMessage,
  ChildRequirements = never,
  OutMessageStepRequirements = ChildRequirements,
  OutMessageStepMessage = ParentMessage,
  DerivedParentOutMessage = ParentOutMessage,
> = Readonly<{
  update: (
    childModel: ChildModel,
    input: Input,
  ) => ReturnWithOutMessage<
    ChildModel,
    ChildMessage,
    ChildOutMessage,
    ChildRequirements
  >
  read: (model: ParentModel) => Option.Option<ChildModel>
  write: (model: ParentModel, nextChildModel: ChildModel) => ParentModel
  toParentMessage: (message: ChildMessage) => ParentMessage
  toParentOutMessage: (
    outMessage: ChildOutMessage,
  ) => ParentOutMessage | undefined
  foldOutMessage?: (
    outMessage: ChildOutMessage,
    context: FoldContext<ChildMessage, ParentMessage>,
  ) => StepWithOutMessage<
    NoInfer<ParentModel>,
    OutMessageStepMessage,
    DerivedParentOutMessage,
    OutMessageStepRequirements
  >
}>

type AnyUpdateReturn = Readonly<{
  model: any
  commands?: Commands<any, any>
  outMessage?: any
}>

/** @internal Implementation-facing view of every {@link ChildFold}
 *  shape: the child update's `outMessage`, `foldOutMessage`, and
 *  `toParentOutMessage` are optional, and every type parameter is erased.
 *  The overloads on {@link foldChild} carry the public contract. */
type AnyChildFold = Readonly<{
  update: (childModel: any, input: any) => AnyUpdateReturn
  read: (model: any) => Option.Option<any>
  write: (model: any, nextChildModel: any) => any
  toParentMessage: (message: any) => any
  toParentOutMessage?: (outMessage: any) => any | undefined
  foldOutMessage?: (
    outMessage: any,
    context: FoldContext<any, any>,
  ) => (model: any) => AnyUpdateReturn
}>

/** The dual function {@link foldChild} returns. Data-first runs the
 *  fold now (`fold(model, input)` returns a {@link Return}); data-last
 *  builds a composable {@link Step} (`fold(input)`, for
 *  {@link combine}). */
export type Fold<ParentModel, ParentMessage, Input, R = never> = {
  (model: ParentModel, input: Input): Return<ParentModel, ParentMessage, R>
  (input: Input): Step<ParentModel, ParentMessage, R>
}

/** {@link Fold} for a {@link ChildFoldWithParentOutMessage}: the
 *  data-first form returns a {@link ReturnWithOutMessage} and the
 *  data-last form builds a {@link StepWithOutMessage}, so the fold slots
 *  directly into a parent that is itself a Submodel. */
export type FoldWithOutMessage<
  ParentModel,
  ParentMessage,
  Input,
  ParentOutMessage,
  R = never,
> = {
  (
    model: ParentModel,
    input: Input,
  ): ReturnWithOutMessage<ParentModel, ParentMessage, ParentOutMessage, R>
  (
    input: Input,
  ): StepWithOutMessage<ParentModel, ParentMessage, ParentOutMessage, R>
}

/** Folds a child Submodel's update into the parent: the update half of
 *  embedding a child, complementing `h.submodel` on the view half. Give
 *  it the facts that vary per child (a {@link ChildFold}, or a
 *  {@link ChildFoldWithOutMessage} when the child's update returns
 *  OutMessages) and it returns a dual {@link Fold}:
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
 *  GotSearchMessage: ({ message }) => foldSearch(model, message),
 *  ```
 *
 *  The fold runs `update` against the child Model `read` returns, writes
 *  the child back, and lifts the child's Commands through
 *  `toParentMessage`. When `read` returns `None` the fold returns
 *  `{ model }`: a Message for an unmounted child is a no-op. When the
 *  child's update returns an OutMessage, `foldOutMessage` runs against
 *  the Model with the child already written back, and its Commands
 *  follow the child's in the returned batch.
 *
 *  `foldOutMessage` takes an optional second parameter, a
 *  {@link FoldContext} carrying `liftCommand` and `liftCommands` bound to
 *  this config's `toParentMessage`. Reach for it when the Step returns a
 *  Command that produces the child's Message, such as an animating
 *  component's overridable leave Command.
 *
 *  A parent that is itself a Submodel receives a
 *  {@link FoldWithOutMessage} when `foldOutMessage` emits a derived parent
 *  OutMessage. Add `toParentOutMessage` only when at least one child OutMessage
 *  should continue to the current Submodel's parent. When provided,
 *  `foldOutMessage` still handles forwarded variants locally. A derived
 *  OutMessage replaces the one-to-one lift for the dispatch. When the Step
 *  emits nothing, the lift runs as usual.
 *
 *  An entry point that takes nothing but the child Model, such as
 *  `Dialog.close`, has no input to pass: fold it with
 *  {@link foldChildStep}, which returns the {@link Step} directly.
 *
 *  `update` closes over per-dispatch context, and the data-last form
 *  composes with {@link combine}, here to put a navigation Command ahead
 *  of the child's:
 *
 *  ```ts
 *  const enterJoinedRoom = (roomId: string, player: Player): UpdateStep =>
 *    Update.combine([
 *      model => ({ model, commands: [NavigateToRoom({ roomId })] }),
 *      Update.foldChild({
 *        update: (room: Room.Model, joinedPlayer: Player) =>
 *          Room.informJoined(room, joinedPlayer, { roomId }),
 *        read: readRoom,
 *        write: writeRoom,
 *        toParentMessage: toGotRoomMessage,
 *      })(player),
 *    ])
 *  ``` */
export const foldChild: {
  <
    ParentModel,
    ParentMessage,
    ChildModel,
    Input,
    ChildMessage,
    ChildOutMessage,
    ParentOutMessage,
    ChildRequirements = never,
    OutMessageStepRequirements = ChildRequirements,
    OutMessageStepMessage = ParentMessage,
    DerivedParentOutMessage = ParentOutMessage,
  >(
    childFold: ChildFoldWithParentOutMessage<
      ParentModel,
      ParentMessage,
      ChildModel,
      Input,
      ChildMessage,
      ChildOutMessage,
      ParentOutMessage,
      ChildRequirements,
      OutMessageStepRequirements,
      OutMessageStepMessage,
      DerivedParentOutMessage
    >,
  ): FoldWithOutMessage<
    ParentModel,
    ParentMessage | OutMessageStepMessage,
    Input,
    ParentOutMessage | DerivedParentOutMessage,
    ChildRequirements | OutMessageStepRequirements
  >
  <
    ParentModel,
    ParentMessage,
    ChildModel,
    Input,
    ChildMessage,
    ChildOutMessage,
    ChildRequirements = never,
    OutMessageStepRequirements = ChildRequirements,
    OutMessageStepMessage = ParentMessage,
  >(
    childFold: ChildFoldWithOutMessage<
      ParentModel,
      ParentMessage,
      ChildModel,
      Input,
      ChildMessage,
      ChildOutMessage,
      ChildRequirements,
      OutMessageStepRequirements,
      OutMessageStepMessage
    >,
  ): Fold<
    ParentModel,
    ParentMessage | OutMessageStepMessage,
    Input,
    ChildRequirements | OutMessageStepRequirements
  >
  <
    ParentModel,
    ParentMessage,
    ChildModel,
    Input,
    ChildMessage,
    ChildOutMessage,
    ParentOutMessage,
    ChildRequirements = never,
    OutMessageStepRequirements = ChildRequirements,
    OutMessageStepMessage = ParentMessage,
  >(
    childFold: ChildFoldWithDerivedParentOutMessage<
      ParentModel,
      ParentMessage,
      ChildModel,
      Input,
      ChildMessage,
      ChildOutMessage,
      ParentOutMessage,
      ChildRequirements,
      OutMessageStepRequirements,
      OutMessageStepMessage
    >,
  ): FoldWithOutMessage<
    ParentModel,
    ParentMessage | OutMessageStepMessage,
    Input,
    ParentOutMessage,
    ChildRequirements | OutMessageStepRequirements
  >
  <ParentModel, ParentMessage, ChildModel, Input, ChildMessage, R = never>(
    childFold: ChildFold<
      ParentModel,
      ParentMessage,
      ChildModel,
      Input,
      ChildMessage,
      R
    >,
  ): Fold<ParentModel, ParentMessage, Input, R>
} = (childFold: AnyChildFold) => {
  const context = makeFoldContext(childFold.toParentMessage)

  return Function.dual(2, (model: any, input: any) =>
    runChildFold(childFold, context, model, input),
  )
}

const makeFoldContext = (
  toParentMessage: (message: any) => any,
): FoldContext<any, any> => ({
  liftCommand: command => mapMessage(command, toParentMessage),
  liftCommands: commands => mapMessages(commands, toParentMessage),
})

const runChildFold = (
  childFold: AnyChildFold,
  context: FoldContext<any, any>,
  model: any,
  input: any,
): any =>
  pipe(
    model,
    childFold.read,
    Option.match({
      onNone: () => ({ model }),
      onSome: childModel => {
        const childUpdate = childFold.update(childModel, input)
        const modelWithChild = childFold.write(model, childUpdate.model)
        const mappedCommands = mapMessages(
          childUpdate.commands,
          childFold.toParentMessage,
        )

        const update =
          childFold.foldOutMessage === undefined ||
          childUpdate.outMessage === undefined
            ? { model: modelWithChild, commands: mappedCommands }
            : appendOutMessageStep(
                childFold.foldOutMessage,
                childUpdate.outMessage,
                context,
                modelWithChild,
                mappedCommands,
              )

        if (update.outMessage !== undefined) {
          return update
        }

        if (
          childFold.toParentOutMessage === undefined ||
          childUpdate.outMessage === undefined
        ) {
          return update
        }

        const parentOutMessage = childFold.toParentOutMessage(
          childUpdate.outMessage,
        )

        return parentOutMessage === undefined
          ? update
          : { ...update, outMessage: parentOutMessage }
      },
    }),
  )

/** {@link ChildFold} for an entry point that takes nothing but the child
 *  Model, such as `Dialog.close` or a Submodel's `informRouteChanged` that
 *  derives everything it needs from its own state. There is no `input`, so
 *  {@link foldChildStep} returns the {@link Step} itself rather than a dual
 *  {@link Fold}. */
export type ChildStepFold<
  ParentModel,
  ParentMessage,
  ChildModel,
  ChildMessage,
  R = never,
> = Readonly<{
  update: (childModel: ChildModel) => Return<ChildModel, ChildMessage, R>
  read: (model: ParentModel) => Option.Option<ChildModel>
  write: (model: ParentModel, nextChildModel: ChildModel) => ParentModel
  toParentMessage: (message: ChildMessage) => ParentMessage
}>

/** {@link ChildStepFold} for an entry point whose return carries the child's
 *  OutMessage channel, adding `foldOutMessage`. It behaves exactly as it does
 *  in {@link ChildFoldWithOutMessage}, down to the optional second parameter,
 *  a {@link FoldContext} of lifters bound to `toParentMessage`, and combines
 *  the child update and OutMessage Step Message and service requirements. */
export type ChildStepFoldWithOutMessage<
  ParentModel,
  ParentMessage,
  ChildModel,
  ChildMessage,
  ChildOutMessage,
  ChildRequirements = never,
  OutMessageStepRequirements = ChildRequirements,
  OutMessageStepMessage = ParentMessage,
> = Readonly<{
  update: (
    childModel: ChildModel,
  ) => ReturnWithOutMessage<
    ChildModel,
    ChildMessage,
    ChildOutMessage,
    ChildRequirements
  >
  read: (model: ParentModel) => Option.Option<ChildModel>
  write: (model: ParentModel, nextChildModel: ChildModel) => ParentModel
  toParentMessage: (message: ChildMessage) => ParentMessage
  foldOutMessage: (
    outMessage: ChildOutMessage,
    context: FoldContext<ChildMessage, ParentMessage>,
  ) => Step<
    NoInfer<ParentModel>,
    OutMessageStepMessage,
    OutMessageStepRequirements
  >
}>

/** {@link ChildStepFoldWithOutMessage} for a parent that derives its own
 *  OutMessage while folding the child's. This is the no-argument counterpart
 *  to {@link ChildFoldWithDerivedParentOutMessage}. */
export type ChildStepFoldWithDerivedParentOutMessage<
  ParentModel,
  ParentMessage,
  ChildModel,
  ChildMessage,
  ChildOutMessage,
  ParentOutMessage,
  ChildRequirements = never,
  OutMessageStepRequirements = ChildRequirements,
  OutMessageStepMessage = ParentMessage,
> = Readonly<{
  update: (
    childModel: ChildModel,
  ) => ReturnWithOutMessage<
    ChildModel,
    ChildMessage,
    ChildOutMessage,
    ChildRequirements
  >
  read: (model: ParentModel) => Option.Option<ChildModel>
  write: (model: ParentModel, nextChildModel: ChildModel) => ParentModel
  toParentMessage: (message: ChildMessage) => ParentMessage
  toParentOutMessage?: never
  foldOutMessage: (
    outMessage: ChildOutMessage,
    context: FoldContext<ChildMessage, ParentMessage>,
  ) => StepWithOutMessage<
    NoInfer<ParentModel>,
    OutMessageStepMessage,
    ParentOutMessage,
    OutMessageStepRequirements
  >
}>

/** {@link ChildStepFoldWithOutMessage} for a parent that is itself a
 *  Submodel. `toParentOutMessage` turns the child's OutMessage into the
 *  parent's OutMessage. Return `undefined` for a named child variant that
 *  stops at this parent. `foldOutMessage` remains available when the parent
 *  also updates its own state from the child's OutMessage. A derived
 *  OutMessage from that Step replaces the one-to-one lift for the dispatch.
 *  When the Step emits nothing, the lift runs as usual.
 *
 *  Use this shape only when at least one child OutMessage should continue to
 *  the current Submodel's parent. If every child OutMessage stops here, use
 *  {@link ChildStepFoldWithDerivedParentOutMessage} when the fold derives its
 *  own OutMessage, or {@link ChildStepFoldWithOutMessage} when it does not.
 *  When provided, `foldOutMessage` still handles each variant locally,
 *  including variants that continue upward. */
export type ChildStepFoldWithParentOutMessage<
  ParentModel,
  ParentMessage,
  ChildModel,
  ChildMessage,
  ChildOutMessage,
  ParentOutMessage,
  ChildRequirements = never,
  OutMessageStepRequirements = ChildRequirements,
  OutMessageStepMessage = ParentMessage,
  DerivedParentOutMessage = ParentOutMessage,
> = Readonly<{
  update: (
    childModel: ChildModel,
  ) => ReturnWithOutMessage<
    ChildModel,
    ChildMessage,
    ChildOutMessage,
    ChildRequirements
  >
  read: (model: ParentModel) => Option.Option<ChildModel>
  write: (model: ParentModel, nextChildModel: ChildModel) => ParentModel
  toParentMessage: (message: ChildMessage) => ParentMessage
  toParentOutMessage: (
    outMessage: ChildOutMessage,
  ) => ParentOutMessage | undefined
  foldOutMessage?: (
    outMessage: ChildOutMessage,
    context: FoldContext<ChildMessage, ParentMessage>,
  ) => StepWithOutMessage<
    NoInfer<ParentModel>,
    OutMessageStepMessage,
    DerivedParentOutMessage,
    OutMessageStepRequirements
  >
}>

/** @internal Implementation-facing view of both {@link ChildStepFold}
 *  shapes. The overloads on {@link foldChildStep} carry the public
 *  contract. */
type AnyChildStepFold = Readonly<{
  update: (childModel: any) => AnyUpdateReturn
  read: (model: any) => Option.Option<any>
  write: (model: any, nextChildModel: any) => any
  toParentMessage: (message: any) => any
  toParentOutMessage?: (outMessage: any) => any | undefined
  foldOutMessage?: (
    outMessage: any,
    context: FoldContext<any, any>,
  ) => (model: any) => AnyUpdateReturn
}>

/** Folds a child entry point that takes nothing but the child Model, and
 *  returns the {@link Step} directly. Everything else matches
 *  {@link foldChild}: the child is read, updated, and written back, its
 *  Commands are lifted through `toParentMessage`, a `None` from `read` makes
 *  the Step a no-op, and `foldOutMessage` runs against the Model with the
 *  child already written back.
 *
 *  Reach for it wherever a Submodel exposes a no-argument entry point, so the
 *  call site composes with {@link combine} as a plain Step and never invents
 *  an input the child does not take:
 *
 *  ```ts
 *  const foldMobileMenuDialogClose = Update.foldChildStep({
 *    update: Dialog.close,
 *    read: readMobileMenuDialog,
 *    write: writeMobileMenuDialog,
 *    toParentMessage: toGotMobileMenuDialogMessage,
 *    foldOutMessage: foldMobileMenuDialogOutMessage,
 *  })
 *
 *  // in the parent update
 *  Update.combine(model, [writeRouteFields, foldMobileMenuDialogClose])
 *  ```
 *
 *  `foldOutMessage` takes the same optional second parameter as
 *  {@link foldChild}: a {@link FoldContext} carrying `liftCommand` and
 *  `liftCommands` bound to this config's `toParentMessage`, for a Command the
 *  Step returns whose result is the child's Message.
 *
 *  A parent that is itself a Submodel receives a
 *  {@link StepWithOutMessage} when `foldOutMessage` emits a derived parent
 *  OutMessage. Add `toParentOutMessage` only when at least one child OutMessage
 *  should continue to the current Submodel's parent. When provided,
 *  `foldOutMessage` still handles forwarded variants locally. A derived
 *  OutMessage replaces the one-to-one lift for the dispatch. When the Step
 *  emits nothing, the lift runs as usual. */
export const foldChildStep: {
  <
    ParentModel,
    ParentMessage,
    ChildModel,
    ChildMessage,
    ChildOutMessage,
    ParentOutMessage,
    ChildRequirements = never,
    OutMessageStepRequirements = ChildRequirements,
    OutMessageStepMessage = ParentMessage,
    DerivedParentOutMessage = ParentOutMessage,
  >(
    childFold: ChildStepFoldWithParentOutMessage<
      ParentModel,
      ParentMessage,
      ChildModel,
      ChildMessage,
      ChildOutMessage,
      ParentOutMessage,
      ChildRequirements,
      OutMessageStepRequirements,
      OutMessageStepMessage,
      DerivedParentOutMessage
    >,
  ): StepWithOutMessage<
    ParentModel,
    ParentMessage | OutMessageStepMessage,
    ParentOutMessage | DerivedParentOutMessage,
    ChildRequirements | OutMessageStepRequirements
  >
  <
    ParentModel,
    ParentMessage,
    ChildModel,
    ChildMessage,
    ChildOutMessage,
    ChildRequirements = never,
    OutMessageStepRequirements = ChildRequirements,
    OutMessageStepMessage = ParentMessage,
  >(
    childFold: ChildStepFoldWithOutMessage<
      ParentModel,
      ParentMessage,
      ChildModel,
      ChildMessage,
      ChildOutMessage,
      ChildRequirements,
      OutMessageStepRequirements,
      OutMessageStepMessage
    >,
  ): Step<
    ParentModel,
    ParentMessage | OutMessageStepMessage,
    ChildRequirements | OutMessageStepRequirements
  >
  <
    ParentModel,
    ParentMessage,
    ChildModel,
    ChildMessage,
    ChildOutMessage,
    ParentOutMessage,
    ChildRequirements = never,
    OutMessageStepRequirements = ChildRequirements,
    OutMessageStepMessage = ParentMessage,
  >(
    childFold: ChildStepFoldWithDerivedParentOutMessage<
      ParentModel,
      ParentMessage,
      ChildModel,
      ChildMessage,
      ChildOutMessage,
      ParentOutMessage,
      ChildRequirements,
      OutMessageStepRequirements,
      OutMessageStepMessage
    >,
  ): StepWithOutMessage<
    ParentModel,
    ParentMessage | OutMessageStepMessage,
    ParentOutMessage,
    ChildRequirements | OutMessageStepRequirements
  >
  <ParentModel, ParentMessage, ChildModel, ChildMessage, R = never>(
    childFold: ChildStepFold<
      ParentModel,
      ParentMessage,
      ChildModel,
      ChildMessage,
      R
    >,
  ): Step<ParentModel, ParentMessage, R>
} = (childFold: AnyChildStepFold) => {
  const context = makeFoldContext(childFold.toParentMessage)

  return (model: any) => runChildFold(childFold, context, model, undefined)
}

const appendOutMessageStep = (
  foldOutMessage: (
    outMessage: any,
    context: FoldContext<any, any>,
  ) => (model: any) => AnyUpdateReturn,
  outMessage: any,
  context: FoldContext<any, any>,
  modelWithChild: any,
  mappedCommands: Commands<any, any>,
): AnyUpdateReturn => {
  const outMessageFold = foldOutMessage(outMessage, context)(modelWithChild)
  const commands = [...mappedCommands, ...(outMessageFold.commands ?? [])]

  return { ...outMessageFold, commands }
}
