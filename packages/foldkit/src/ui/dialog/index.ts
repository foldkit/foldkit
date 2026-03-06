import { Effect, Match as M, Option, Schema as S } from 'effect'

import type { Command } from '../../command'
import { html } from '../../html'
import type { Html } from '../../html'
import { createLazy } from '../../html/lazy'
import { m } from '../../message'
import { evo } from '../../struct'
import * as Task from '../../task'

// MODEL

/** Schema for the dialog component's state, tracking its unique ID and open/closed status. */
export const Model = S.Struct({
  id: S.String,
  isOpen: S.Boolean,
})

export type Model = typeof Model.Type

// MESSAGE

/** Sent when the dialog should open. Triggers the showModal command. */
export const Opened = m('Opened')
/** Sent when the dialog should close (Escape key, backdrop click, or programmatic). Triggers the closeModal command. */
export const Closed = m('Closed')
/** Placeholder message used when no action is needed, such as after a showModal or closeModal command completes. */
export const NoOp = m('NoOp')

/** Union of all messages the dialog component can produce. */
export const Message = S.Union(Opened, Closed, NoOp)

export type Opened = typeof Opened.Type
export type Closed = typeof Closed.Type
export type NoOp = typeof NoOp.Type

export type Message = typeof Message.Type

// INIT

/** Configuration for creating a dialog model with `init`. */
export type InitConfig = Readonly<{
  id: string
  isOpen?: boolean
}>

/** Creates an initial dialog model from a config. Defaults to closed. */
export const init = (config: InitConfig): Model => ({
  id: config.id,
  isOpen: config.isOpen ?? false,
})

// UPDATE

const dialogSelector = (id: string): string => `#${id}`

/** Processes a dialog message and returns the next model and commands. */
export const update = (
  model: Model,
  message: Message,
): [Model, ReadonlyArray<Command<Message>>] =>
  M.value(message).pipe(
    M.withReturnType<[Model, ReadonlyArray<Command<Message>>]>(),
    M.tagsExhaustive({
      Opened: () => {
        const maybeShow = Option.liftPredicate(
          Task.showModal(dialogSelector(model.id)).pipe(
            Effect.ignore,
            Effect.as(NoOp()),
          ),
          () => !model.isOpen,
        )

        return [evo(model, { isOpen: () => true }), Option.toArray(maybeShow)]
      },
      Closed: () => {
        const maybeClose = Option.liftPredicate(
          Task.closeModal(dialogSelector(model.id)).pipe(
            Effect.ignore,
            Effect.as(NoOp()),
          ),
          () => model.isOpen,
        )

        return [evo(model, { isOpen: () => false }), Option.toArray(maybeClose)]
      },
      NoOp: () => [model, []],
    }),
  )

// VIEW

/** Returns the ID used for `aria-labelledby` on the dialog. Apply this to your title element. */
export const titleId = (model: Model): string => `${model.id}-title`

/** Returns the ID used for `aria-describedby` on the dialog. Apply this to your description element. */
export const descriptionId = (model: Model): string => `${model.id}-description`

/** Configuration for rendering a dialog with `view`. */
export type ViewConfig<Message> = Readonly<{
  model: Model
  toMessage: (message: Closed | NoOp) => Message
  panelContent: Html
  panelClassName: string
  backdropClassName: string
  className?: string
}>

/** Renders a headless dialog component backed by the native `<dialog>` element with `showModal()`. */
export const view = <Message>(config: ViewConfig<Message>): Html => {
  const {
    AriaDescribedBy,
    AriaLabelledBy,
    Class,
    DataAttribute,
    Id,
    OnCancel,
    OnClick,
    keyed,
  } = html<Message>()

  const {
    model: { id, isOpen },
    toMessage,
    panelContent,
    panelClassName,
    backdropClassName,
    className,
  } = config

  const dialogAttributes = [
    Id(id),
    AriaLabelledBy(`${id}-title`),
    AriaDescribedBy(`${id}-description`),
    OnCancel(toMessage(Closed())),
    ...(isOpen ? [DataAttribute('open', '')] : []),
    ...(className ? [Class(className)] : []),
  ]

  const backdrop = keyed('div')(
    `${id}-backdrop`,
    [Class(backdropClassName), OnClick(toMessage(Closed()))],
    [],
  )

  const panel = keyed('div')(
    `${id}-panel`,
    [Class(panelClassName)],
    [panelContent],
  )

  const content = isOpen ? [backdrop, panel] : []

  return keyed('dialog')(id, dialogAttributes, content)
}

/** Creates a memoized dialog view. Static config is captured in a closure;
 *  only `model` and `toMessage` are compared per render via `createLazy`. */
export const lazy = <Message>(
  staticConfig: Omit<ViewConfig<Message>, 'model' | 'toMessage'>,
): ((model: Model, toMessage: ViewConfig<Message>['toMessage']) => Html) => {
  const lazyView = createLazy()

  return (model, toMessage) =>
    lazyView(
      (
        currentModel: Model,
        currentToMessage: ViewConfig<Message>['toMessage'],
      ) =>
        view({
          ...staticConfig,
          model: currentModel,
          toMessage: currentToMessage,
        }),
      [model, toMessage],
    )
}
