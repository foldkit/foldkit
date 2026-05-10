import { Effect, Match as M, Option, Schema as S } from 'effect'

import * as Command from '../../command/index.js'
import * as Dom from '../../dom/index.js'
import {
  type Attribute,
  type Html,
  type TagName,
  createLazy,
  html,
} from '../../html/index.js'
import { m } from '../../message/index.js'
import { evo } from '../../struct/index.js'

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
> = S.Union([Toggled, Closed, CompletedFocusButton])

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
export const FocusButton = Command.define(
  'FocusButton',
  { id: S.String },
  CompletedFocusButton,
)(({ id }) =>
  Dom.focus(buttonSelector(id)).pipe(
    Effect.ignore,
    Effect.as(CompletedFocusButton()),
  ),
)

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
          FocusButton({ id: model.id }),
          () => model.isOpen,
        )

        return [
          evo(model, { isOpen: () => !model.isOpen }),
          Option.toArray(maybeFocus),
        ]
      },
      Closed: () => {
        const maybeFocus = Option.liftPredicate(
          FocusButton({ id: model.id }),
          () => model.isOpen,
        )

        return [evo(model, { isOpen: () => false }), Option.toArray(maybeFocus)]
      },
      CompletedFocusButton: () => [model, []],
    }),
  )

// VIEW

/** Configuration for rendering a disclosure with `view`. */
export type ViewConfig<ParentMessage> = Readonly<{
  model: Model
  toParentMessage: (
    message: Toggled | Closed | CompletedFocusButton,
  ) => ParentMessage
  onToggled?: () => ParentMessage
  buttonClassName?: string
  buttonAttributes?: ReadonlyArray<Attribute<ParentMessage>>
  buttonContent: Html
  panelClassName?: string
  panelAttributes?: ReadonlyArray<Attribute<ParentMessage>>
  panelContent: Html
  isDisabled?: boolean
  persistPanel?: boolean
  buttonElement?: TagName
  panelElement?: TagName
  className?: string
  attributes?: ReadonlyArray<Attribute<ParentMessage>>
}>

/** Programmatically toggles the disclosure, updating the model and returning
 *  focus commands. Use this in domain-event handlers when the disclosure uses `onToggled`. */
export const toggle = (
  model: Model,
): readonly [Model, ReadonlyArray<Command.Command<Message>>] =>
  update(model, Toggled())

/** Programmatically closes the disclosure, updating the model and returning
 *  focus commands. Use this in domain-event handlers to close the disclosure. */
export const close = (
  model: Model,
): readonly [Model, ReadonlyArray<Command.Command<Message>>] =>
  update(model, Closed())

/** Renders a headless disclosure component with accessible ARIA attributes and keyboard support. */
export const view = <ParentMessage>(
  config: ViewConfig<ParentMessage>,
): Html => {
  const h = html<ParentMessage>()

  const {
    model: { id, isOpen },
    toParentMessage,
    onToggled,
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

  const dispatchToggled = (): ParentMessage =>
    onToggled ? onToggled() : toParentMessage(Toggled())

  const isNativeButton = buttonElement === 'button'

  const handleKeyDown = (key: string): Option.Option<ParentMessage> =>
    M.value(key).pipe(
      M.whenOr('Enter', ' ', () => Option.some(dispatchToggled())),
      M.orElse(() => Option.none()),
    )

  const disabledAttributes = [
    h.Disabled(true),
    h.AriaDisabled(true),
    h.DataAttribute('disabled', ''),
  ]

  const interactionAttributes = isDisabled
    ? disabledAttributes
    : [
        h.OnClick(dispatchToggled()),
        ...(!isNativeButton ? [h.OnKeyDownPreventDefault(handleKeyDown)] : []),
      ]

  const resolvedButtonAttributes = [
    h.Id(buttonId(id)),
    h.AriaExpanded(isOpen),
    h.AriaControls(panelId(id)),
    ...(isNativeButton ? [h.Type('button')] : [h.Tabindex(0)]),
    ...(isOpen ? [h.DataAttribute('open', '')] : []),
    ...interactionAttributes,
    ...(buttonClassName ? [h.Class(buttonClassName)] : []),
    ...buttonAttributes,
  ]

  const resolvedPanelAttributes = [
    h.Id(panelId(id)),
    ...(isOpen ? [h.DataAttribute('open', '')] : []),
    ...(panelClassName ? [h.Class(panelClassName)] : []),
    ...panelAttributes,
  ]

  const persistedPanel = h.keyed(panelElement)(
    panelId(id),
    [
      ...resolvedPanelAttributes,
      h.Hidden(!isOpen),
      ...(isOpen ? [] : [h.Style({ display: 'none' })]),
    ],
    [panelContent],
  )

  const activePanel = isOpen
    ? h.keyed(panelElement)(panelId(id), resolvedPanelAttributes, [
        panelContent,
      ])
    : h.empty

  const panel = persistPanel ? persistedPanel : activePanel

  return h.div(
    [...(className ? [h.Class(className)] : []), ...attributes],
    [
      h.keyed(buttonElement)(buttonId(id), resolvedButtonAttributes, [
        buttonContent,
      ]),
      panel,
    ],
  )
}

/** Creates a memoized disclosure view. Static config is captured in a closure;
 *  only `model` and `toParentMessage` are compared per render via `createLazy`. */
export const lazy = <ParentMessage>(
  staticConfig: Omit<
    ViewConfig<ParentMessage>,
    'model' | 'toParentMessage' | 'onToggled'
  >,
): ((
  model: Model,
  toParentMessage: ViewConfig<ParentMessage>['toParentMessage'],
) => Html) => {
  const lazyView = createLazy()

  return (model, toParentMessage) =>
    lazyView(
      (
        currentModel: Model,
        currentToParentMessage: ViewConfig<ParentMessage>['toParentMessage'],
      ) =>
        view({
          ...staticConfig,
          model: currentModel,
          toParentMessage: currentToParentMessage,
        }),
      [model, toParentMessage],
    )
}
