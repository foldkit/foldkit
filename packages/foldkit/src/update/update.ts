import { Array, Function, Option, pipe } from 'effect'

import { type AsyncData } from '../asyncData/index.js'
import { type Command, mapMessage, mapMessages } from '../command/index.js'

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
 *  The fold lifts the Commands the child's `update` returns on its own.
 *  This covers the other case: a Command the parent returns on the
 *  child's behalf from the OutMessage Step, whose result Message is the
 *  child's and therefore still needs wrapping, such as a parent handling
 *  a child's `Requested*` fact by returning the child's Command that
 *  fulfills it, built with context only the parent holds.
 *
 *  The lifters apply the same lift the fold gives the child's own
 *  Commands, so the Step writes no `Command.mapMessage` call and keeps
 *  no second copy of the wrapper, and the mapping stays recorded on the
 *  Command for `Story.Command.resolve` and `Scene.Command.resolve`.
 *
 *  The annotated standalone const takes both parameters, so the match
 *  moves from `M.type` to `M.value` on the OutMessage:
 *
 *  ```ts
 *  const foldLoginOutMessage: (
 *    outMessage: Login.OutMessage,
 *    context: Update.FoldContext<Login.Message, Message>,
 *  ) => Update.Step<Model, Message> = (outMessage, { liftCommand }) =>
 *    M.value(outMessage).pipe(
 *      M.withReturnType<Update.Step<Model, Message>>(),
 *      M.tagsExhaustive({
 *        RequestedMagicLink: ({ email }) => model => [
 *          model,
 *          [
 *            liftCommand(
 *              Login.SendMagicLink({ email, redirectRoute: model.route }),
 *            ),
 *          ],
 *        ],
 *      }),
 *    )
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
 *    returned batch. Match on the OutMessage tag inside
 *    (`M.tagsExhaustive`), and build a multi-step fold with
 *    {@link combine}. Takes an optional second parameter, a
 *    {@link FoldContext} of lifters bound to `toParentMessage`, for a
 *    Command the Step returns whose result is the child's Message. */
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
    context: FoldContext<ChildMessage, ParentMessage>,
  ) => Step<ParentModel, ParentMessage, R>
}>

/** {@link ChildFoldWithOutMessage} for a parent that is itself a
 *  Submodel, so the fold's result carries the parent's own OutMessage
 *  channel as a third tuple element. Adds:
 *
 *  - `toParentOutMessage`: lifts the child's OutMessage into the
 *    parent's own OutMessage; `None` passes nothing upward. When the
 *    child returns no OutMessage the fold's third element is `None`.
 *  - `foldOutMessage` stays available for a parent that also updates
 *    its own state from the child's OutMessage, and is optional here.
 *
 *  A parent Submodel embedding a child with no OutMessage channel needs
 *  no config at all: spread the plain fold into its return,
 *  `[...foldStartDate(model, message), Option.none()]`. */
export type ChildFoldWithParentOutMessage<
  ParentModel,
  ParentMessage,
  ChildModel,
  Input,
  ChildMessage,
  ChildOutMessage,
  ParentOutMessage,
  R = never,
> = Readonly<{
  update: (
    childModel: ChildModel,
    input: Input,
  ) => ReturnWithOutMessage<ChildModel, ChildMessage, ChildOutMessage, R>
  read: (model: ParentModel) => Option.Option<ChildModel>
  write: (model: ParentModel, nextChildModel: ChildModel) => ParentModel
  toParentMessage: (message: ChildMessage) => ParentMessage
  toParentOutMessage: (
    outMessage: ChildOutMessage,
  ) => Option.Option<ParentOutMessage>
  foldOutMessage?: (
    outMessage: ChildOutMessage,
    context: FoldContext<ChildMessage, ParentMessage>,
  ) => Step<ParentModel, ParentMessage, R>
}>

/** @internal Implementation-facing view of every {@link ChildFold}
 *  shape: the child update's third tuple element, `foldOutMessage`, and
 *  `toParentOutMessage` are optional, and every type parameter is
 *  erased. The overloads on {@link foldChild} carry the public
 *  contract. */
type AnyChildFold = Readonly<{
  update: (
    childModel: any,
    input: any,
  ) => readonly [any, Commands<any, any>, Option.Option<any>?]
  read: (model: any) => Option.Option<any>
  write: (model: any, nextChildModel: any) => any
  toParentMessage: (message: any) => any
  toParentOutMessage?: (outMessage: any) => Option.Option<any>
  foldOutMessage?: (
    outMessage: any,
    context: FoldContext<any, any>,
  ) => Step<any, any, any>
}>

/** {@link Step} for an update that also surfaces an OutMessage to its
 *  parent: maps a Model to a {@link ReturnWithOutMessage} over the same
 *  Model. */
export type StepWithOutMessage<Model, Message, OutMessage, R = never> = (
  model: Model,
) => ReturnWithOutMessage<Model, Message, OutMessage, R>

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
 *  `[model, []]`: a Message for an unmounted child is a no-op. When the
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
 *  A parent that is itself a Submodel passes a
 *  {@link ChildFoldWithParentOutMessage} and receives a
 *  {@link FoldWithOutMessage}, whose results carry the parent's own
 *  OutMessage channel as a third element.
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
 *      model => [model, [NavigateToRoom({ roomId })]],
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
    R = never,
  >(
    childFold: ChildFoldWithParentOutMessage<
      ParentModel,
      ParentMessage,
      ChildModel,
      Input,
      ChildMessage,
      ChildOutMessage,
      ParentOutMessage,
      R
    >,
  ): FoldWithOutMessage<ParentModel, ParentMessage, Input, ParentOutMessage, R>
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
  ): Fold<ParentModel, ParentMessage, Input, R>
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
      onNone: () =>
        childFold.toParentOutMessage === undefined
          ? [model, []]
          : [model, [], Option.none()],
      onSome: childModel => {
        const [nextChildModel, childCommands, maybeOutMessage] =
          childFold.update(childModel, input)
        const modelWithChild = childFold.write(model, nextChildModel)
        const mappedCommands = mapMessages(
          childCommands,
          childFold.toParentMessage,
        )

        const [nextModel, commands] =
          childFold.foldOutMessage === undefined ||
          maybeOutMessage === undefined ||
          Option.isNone(maybeOutMessage)
            ? [modelWithChild, mappedCommands]
            : appendOutMessageStep(
                childFold.foldOutMessage,
                maybeOutMessage.value,
                context,
                modelWithChild,
                mappedCommands,
              )

        if (childFold.toParentOutMessage === undefined) {
          return [nextModel, commands]
        }

        const maybeParentOutMessage =
          maybeOutMessage === undefined
            ? Option.none()
            : Option.flatMap(maybeOutMessage, childFold.toParentOutMessage)
        return [nextModel, commands, maybeParentOutMessage]
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
 *  a {@link FoldContext} of lifters bound to `toParentMessage`. */
export type ChildStepFoldWithOutMessage<
  ParentModel,
  ParentMessage,
  ChildModel,
  ChildMessage,
  ChildOutMessage,
  R = never,
> = Readonly<{
  update: (
    childModel: ChildModel,
  ) => ReturnWithOutMessage<ChildModel, ChildMessage, ChildOutMessage, R>
  read: (model: ParentModel) => Option.Option<ChildModel>
  write: (model: ParentModel, nextChildModel: ChildModel) => ParentModel
  toParentMessage: (message: ChildMessage) => ParentMessage
  foldOutMessage: (
    outMessage: ChildOutMessage,
    context: FoldContext<ChildMessage, ParentMessage>,
  ) => Step<ParentModel, ParentMessage, R>
}>

/** @internal Implementation-facing view of both {@link ChildStepFold}
 *  shapes. The overloads on {@link foldChildStep} carry the public
 *  contract. */
type AnyChildStepFold = Readonly<{
  update: (
    childModel: any,
  ) => readonly [any, Commands<any, any>, Option.Option<any>?]
  read: (model: any) => Option.Option<any>
  write: (model: any, nextChildModel: any) => any
  toParentMessage: (message: any) => any
  foldOutMessage?: (
    outMessage: any,
    context: FoldContext<any, any>,
  ) => Step<any, any, any>
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
 *  `foldOutMessage` takes the same optional second parameter `foldChild`'s
 *  does, a {@link FoldContext} carrying `liftCommand` and `liftCommands` bound
 *  to this config's `toParentMessage`, for a Command the Step returns whose
 *  result is the child's Message.
 *
 *  A parent that is itself a Submodel, and so needs its own OutMessage
 *  channel on the result, uses {@link foldChild}. */
export const foldChildStep: {
  <
    ParentModel,
    ParentMessage,
    ChildModel,
    ChildMessage,
    ChildOutMessage,
    R = never,
  >(
    childFold: ChildStepFoldWithOutMessage<
      ParentModel,
      ParentMessage,
      ChildModel,
      ChildMessage,
      ChildOutMessage,
      R
    >,
  ): Step<ParentModel, ParentMessage, R>
  <ParentModel, ParentMessage, ChildModel, ChildMessage, R = never>(
    childFold: ChildStepFold<
      ParentModel,
      ParentMessage,
      ChildModel,
      ChildMessage,
      R
    >,
  ): Step<ParentModel, ParentMessage, R>
} = (childFold: AnyChildStepFold): Step<any, any, any> => {
  const context = makeFoldContext(childFold.toParentMessage)

  return model => runChildFold(childFold, context, model, undefined)
}

const appendOutMessageStep = (
  foldOutMessage: (
    outMessage: any,
    context: FoldContext<any, any>,
  ) => Step<any, any, any>,
  outMessage: any,
  context: FoldContext<any, any>,
  modelWithChild: any,
  mappedCommands: Commands<any, any>,
): Return<any, any, any> => {
  const [nextModel, outCommands] = foldOutMessage(
    outMessage,
    context,
  )(modelWithChild)
  return [nextModel, [...mappedCommands, ...outCommands]]
}
