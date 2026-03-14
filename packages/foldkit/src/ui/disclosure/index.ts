import { Effect, Match as M, Option, Schema as S } from 'effect'

import type { Command } from '../../command'
import { type Html, type TagName, createLazy, html } from '../../html'
import { m } from '../../message'
import { evo } from '../../struct'
import * as Task from '../../task'

// MODEL

/** Schema for the disclosure component's state, tracking its unique ID and open/closed status. */
export const Model = S.Struct({
  id: S.String,
  isOpen: S.Boolean,
})

export type Model = typeof Model.Type

// MESSAGE

/** Sent when the disclosure button is clicked. Toggles the open/closed state. */
export const Toggled = m('Toggled')
/** Sent to explicitly close the disclosure, regardless of its current state. */
export const Closed = m('Closed')
/** Sent when the focus-button command completes after closing. */
export const CompletedButtonFocus = m('CompletedButtonFocus')

/** Union of all messages the disclosure component can produce. */
export const Message = S.Union(Toggled, Closed, CompletedButtonFocus)

export type Toggled = typeof Toggled.Type
export type Closed = typeof Closed.Type
export type CompletedButtonFocus = typeof CompletedButtonFocus.Type

export type Message = typeof Message.Type

// INIT

/** Configuration for creating a disclosure model with `init`. */
export type InitConfig = Readonly<{
  id: string
  isOpen?: boolean
}>

/** Creates an initial disclosure model from a config. Defaults to closed. */
export const init = (config: InitConfig): Model => ({
  id: config.id,
  isOpen: config.isOpen ?? false,
})

// UPDATE

const buttonId = (id: string): string => `${id}-button`

const buttonSelector = (id: string): string => `#${CSS.escape(buttonId(id))}`

const panelId = (id: string): string => `${id}-panel`

/** Processes a disclosure message and returns the next model and commands. */
export const update = (
  model: Model,
  message: Message,
): [Model, ReadonlyArray<Command<Message>>] =>
  M.value(message).pipe(
    M.withReturnType<[Model, ReadonlyArray<Command<Message>>]>(),
    M.tagsExhaustive({
      Toggled: () => {
        const maybeFocus = Option.liftPredicate(
          Task.focus(buttonSelector(model.id)).pipe(
            Effect.ignore,
            Effect.as(CompletedButtonFocus()),
          ),
          () => model.isOpen,
        )

        return [
          evo(model, { isOpen: () => !model.isOpen }),
          Option.toArray(maybeFocus),
        ]
      },
      Closed: () => {
        const maybeFocus = Option.liftPredicate(
          Task.focus(buttonSelector(model.id)).pipe(
            Effect.ignore,
            Effect.as(CompletedButtonFocus()),
          ),
          () => model.isOpen,
        )

        return [evo(model, { isOpen: () => false }), Option.toArray(maybeFocus)]
      },
      CompletedButtonFocus: () => [model, []],
    }),
  )

// VIEW

/** Configuration for rendering a disclosure with `view`. */
export type ViewConfig<Message> = Readonly<{
  model: Model
  toMessage: (message: Toggled | Closed | CompletedButtonFocus) => Message
  buttonClassName: string
  buttonContent: Html
  panelClassName: string
  panelContent: Html
  isDisabled?: boolean
  persistPanel?: boolean
  buttonElement?: TagName
  panelElement?: TagName
  className?: string
}>

/** Renders a headless disclosure component with accessible ARIA attributes and keyboard support. */
export const view = <Message>(config: ViewConfig<Message>): Html => {
  const {
    div,
    empty,
    AriaControls,
    AriaDisabled,
    AriaExpanded,
    Class,
    DataAttribute,
    Disabled,
    Hidden,
    Id,
    OnClick,
    OnKeyDownPreventDefault,
    Tabindex,
    Type,
    keyed,
  } = html<Message>()

  const {
    model: { id, isOpen },
    toMessage,
    buttonClassName,
    buttonContent,
    panelClassName,
    panelContent,
    isDisabled,
    persistPanel,
    buttonElement = 'button',
    panelElement = 'div',
    className,
  } = config

  const isNativeButton = buttonElement === 'button'

  const handleKeyDown = (key: string): Option.Option<Message> =>
    M.value(key).pipe(
      M.whenOr('Enter', ' ', () => Option.some(toMessage(Toggled()))),
      M.orElse(() => Option.none()),
    )

  const disabledAttributes = [
    Disabled(true),
    AriaDisabled(true),
    DataAttribute('disabled', ''),
  ]

  const interactionAttributes = isDisabled
    ? disabledAttributes
    : [
        OnClick(toMessage(Toggled())),
        ...(!isNativeButton ? [OnKeyDownPreventDefault(handleKeyDown)] : []),
      ]

  const buttonAttributes = [
    Class(buttonClassName),
    Id(buttonId(id)),
    AriaExpanded(isOpen),
    AriaControls(panelId(id)),
    ...(isNativeButton ? [Type('button')] : [Tabindex(0)]),
    ...(isOpen ? [DataAttribute('open', '')] : []),
    ...interactionAttributes,
  ]

  const panelAttributes = [
    Class(panelClassName),
    Id(panelId(id)),
    ...(isOpen ? [DataAttribute('open', '')] : []),
  ]

  const persistedPanel = keyed(panelElement)(
    panelId(id),
    [...panelAttributes, Hidden(!isOpen)],
    [panelContent],
  )

  const activePanel = isOpen
    ? keyed(panelElement)(panelId(id), panelAttributes, [panelContent])
    : empty

  const panel = persistPanel ? persistedPanel : activePanel

  const wrapperAttributes = className ? [Class(className)] : []

  return div(wrapperAttributes, [
    keyed(buttonElement)(buttonId(id), buttonAttributes, [buttonContent]),
    panel,
  ])
}

/** Creates a memoized disclosure view. Static config is captured in a closure;
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
