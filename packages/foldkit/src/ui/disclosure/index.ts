import { Effect, Match as M, Option, Schema as S } from 'effect'

import * as Command from '../../command'
import {
  type Attribute,
  type Html,
  type TagName,
  createLazy,
  html,
} from '../../html'
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
export const CompletedFocusButton = m('CompletedFocusButton')

/** Union of all messages the disclosure component can produce. */
export const Message: S.Union<
  [typeof Toggled, typeof Closed, typeof CompletedFocusButton]
> = S.Union(Toggled, Closed, CompletedFocusButton)

export type Toggled = typeof Toggled.Type
export type Closed = typeof Closed.Type
export type CompletedFocusButton = typeof CompletedFocusButton.Type

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

/** Moves focus to the disclosure's toggle button. */
export const FocusButton = Command.define('FocusButton', CompletedFocusButton)

/** Processes a disclosure message and returns the next model and commands. */
export const update = (
  model: Model,
  message: Message,
): readonly [Model, ReadonlyArray<Command.Command<Message>>] =>
  M.value(message).pipe(
    M.withReturnType<
      readonly [Model, ReadonlyArray<Command.Command<Message>>]
    >(),
    M.tagsExhaustive({
      Toggled: () => {
        const maybeFocus = Option.liftPredicate(
          FocusButton(
            Task.focus(buttonSelector(model.id)).pipe(
              Effect.ignore,
              Effect.as(CompletedFocusButton()),
            ),
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
          FocusButton(
            Task.focus(buttonSelector(model.id)).pipe(
              Effect.ignore,
              Effect.as(CompletedFocusButton()),
            ),
          ),
          () => model.isOpen,
        )

        return [evo(model, { isOpen: () => false }), Option.toArray(maybeFocus)]
      },
      CompletedFocusButton: () => [model, []],
    }),
  )

// VIEW

/** Configuration for rendering a disclosure with `view`. */
export type ViewConfig<Message> = Readonly<{
  model: Model
  toParentMessage: (message: Toggled | Closed | CompletedFocusButton) => Message
  buttonClassName?: string
  buttonAttributes?: ReadonlyArray<Attribute<Message>>
  buttonContent: Html
  panelClassName?: string
  panelAttributes?: ReadonlyArray<Attribute<Message>>
  panelContent: Html
  isDisabled?: boolean
  persistPanel?: boolean
  buttonElement?: TagName
  panelElement?: TagName
  className?: string
  attributes?: ReadonlyArray<Attribute<Message>>
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
    toParentMessage,
    buttonClassName,
    buttonAttributes = [],
    buttonContent,
    panelClassName,
    panelAttributes = [],
    panelContent,
    isDisabled,
    persistPanel,
    buttonElement = 'button',
    panelElement = 'div',
    className,
    attributes = [],
  } = config

  const isNativeButton = buttonElement === 'button'

  const handleKeyDown = (key: string): Option.Option<Message> =>
    M.value(key).pipe(
      M.whenOr('Enter', ' ', () => Option.some(toParentMessage(Toggled()))),
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
        OnClick(toParentMessage(Toggled())),
        ...(!isNativeButton ? [OnKeyDownPreventDefault(handleKeyDown)] : []),
      ]

  const resolvedButtonAttributes = [
    Id(buttonId(id)),
    AriaExpanded(isOpen),
    AriaControls(panelId(id)),
    ...(isNativeButton ? [Type('button')] : [Tabindex(0)]),
    ...(isOpen ? [DataAttribute('open', '')] : []),
    ...interactionAttributes,
    ...(buttonClassName ? [Class(buttonClassName)] : []),
    ...buttonAttributes,
  ]

  const resolvedPanelAttributes = [
    Id(panelId(id)),
    ...(isOpen ? [DataAttribute('open', '')] : []),
    ...(panelClassName ? [Class(panelClassName)] : []),
    ...panelAttributes,
  ]

  const persistedPanel = keyed(panelElement)(
    panelId(id),
    [...resolvedPanelAttributes, Hidden(!isOpen)],
    [panelContent],
  )

  const activePanel = isOpen
    ? keyed(panelElement)(panelId(id), resolvedPanelAttributes, [panelContent])
    : empty

  const panel = persistPanel ? persistedPanel : activePanel

  return div(
    [...(className ? [Class(className)] : []), ...attributes],
    [
      keyed(buttonElement)(buttonId(id), resolvedButtonAttributes, [
        buttonContent,
      ]),
      panel,
    ],
  )
}

/** Creates a memoized disclosure view. Static config is captured in a closure;
 *  only `model` and `toParentMessage` are compared per render via `createLazy`. */
export const lazy = <Message>(
  staticConfig: Omit<ViewConfig<Message>, 'model' | 'toParentMessage'>,
): ((
  model: Model,
  toParentMessage: ViewConfig<Message>['toParentMessage'],
) => Html) => {
  const lazyView = createLazy()

  return (model, toParentMessage) =>
    lazyView(
      (
        currentModel: Model,
        currentToMessage: ViewConfig<Message>['toParentMessage'],
      ) =>
        view({
          ...staticConfig,
          model: currentModel,
          toParentMessage: currentToMessage,
        }),
      [model, toParentMessage],
    )
}
