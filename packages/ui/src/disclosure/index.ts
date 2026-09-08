import { Match, Option, Predicate } from 'effect'
import type { Attribute, Html, HtmlBuilder } from 'foldkit/html'

// VIEW

/** Returns the bare DOM id of the disclosure toggle button, derived from the
 *  disclosure's base id. Use this to associate an external label with the
 *  button via a native `<label for={Disclosure.buttonId(id)}>` or an
 *  `aria-labelledby` reference. */
export const buttonId = (id: string): string => `${id}-button`

const panelId = (id: string): string => `${id}-panel`

const panelSizeTransition = 'grid-template-rows 200ms ease-out'

/** Attribute groups the disclosure provides to the consumer's `toView`
 *  callback. The consumer composes the button + panel layout themselves using
 *  these bundles. The `button` bundle carries the click and Enter/Space
 *  handlers that dispatch the configured `onToggle` Message.
 *
 *  The `button` bundle sets `type="button"` so that rendering the trigger as a
 *  `button` element inside a `form` element toggles without also submitting the
 *  form. Setting it is harmless on the other elements a trigger might use, such
 *  as a `div` or a `span`, because the builder assigns a DOM property rather
 *  than an HTML attribute. Spread a later `h.Type` to override it. */
export type DisclosureAttributes<Message> = Readonly<{
  button: ReadonlyArray<Attribute<Message>>
  panel: ReadonlyArray<Attribute<Message>>
  /** Wraps panel content in a CSS-grid container that smoothly animates
   *  height (`grid-template-rows: 0fr → 1fr` with `overflow: hidden`) as the
   *  disclosure opens and closes. The panel stays mounted while collapsed, so
   *  the transition has something to animate from and to. Spread the `panel`
   *  bundle onto the element you pass in, and render it unconditionally rather
   *  than gating on `isOpen`. The collapsed content is marked `aria-hidden`. */
  animatePanel: (content: Html) => Html
}>

/** Per-render view configuration for the stateless controlled {@link view}.
 *  Generic over `Message` (the message `onToggle` dispatches).
 *
 *  - `isOpen`: the current open state, read straight from the parent Model.
 *    `aria-expanded`, the `data-open` marker, and `animatePanel` derive from
 *    it.
 *  - `onToggle`: dispatched with the new open state when the user clicks the
 *    button or presses Enter/Space. Handle it in the parent's `update` by
 *    storing the value.
 *  - `toView`: receives the {@link DisclosureAttributes} and lays out the
 *    disclosure. */
export type ViewConfig<Message> = Readonly<{
  id: string
  isOpen: boolean
  onToggle: (isOpen: boolean) => Message
  toView: (attributes: DisclosureAttributes<Message>) => Html
  isDisabled?: boolean
  ariaLabel?: string
  ariaLabelledBy?: string
}>

/** Renders a headless disclosure as a stateless controlled component. The
 *  parent owns the open state (`isOpen`) and receives the new state via
 *  `onToggle` when the user toggles it. The consumer composes the layout
 *  through `toView`, spreading the `button` and `panel` bundles onto their own
 *  elements.
 *
 *  ```ts
 *  // In view:
 *  Disclosure.view(
 *    {
 *      id: 'details',
 *      isOpen: model.isDetailsOpen,
 *      onToggle: isOpen => ToggledDetails({ isOpen }),
 *      toView: ({ button, panel, animatePanel }) => ...,
 *    },
 *    h,
 *  )
 *
 *  // In update:
 *  ToggledDetails: ({ isOpen }) => ({
 *    model: evo(model, { isDetailsOpen: () => isOpen }),
 *  }),
 *  ``` */
export const view = <Message>(
  config: ViewConfig<Message>,
  h: HtmlBuilder<Message>,
): Html => {
  const {
    id,
    isOpen,
    onToggle,
    toView,
    isDisabled = false,
    ariaLabel,
    ariaLabelledBy,
  } = config

  const nextOpen = !isOpen

  const handleKeyDown = (key: string): Option.Option<Message> =>
    Match.value(key).pipe(
      Match.whenOr('Enter', ' ', () => Option.some(onToggle(nextOpen))),
      Match.orElse(() => Option.none()),
    )

  const disabledAttributes = isDisabled
    ? [h.AriaDisabled(true), h.DataAttribute('disabled', '')]
    : []

  const resolveButtonLabel = () => {
    if (Predicate.isNotUndefined(ariaLabel)) {
      return [h.AriaLabel(ariaLabel)]
    } else if (Predicate.isNotUndefined(ariaLabelledBy)) {
      return [h.AriaLabelledBy(ariaLabelledBy)]
    } else {
      return []
    }
  }

  const buttonAttributes = [
    h.Id(buttonId(id)),
    h.Type('button'),
    h.AriaExpanded(isOpen),
    h.AriaControls(panelId(id)),
    ...resolveButtonLabel(),
    h.Tabindex(0),
    ...(isOpen ? [h.DataAttribute('open', '')] : []),
    ...disabledAttributes,
    ...(isDisabled
      ? []
      : [
          h.OnClick(onToggle(nextOpen)),
          h.OnKeyDownPreventDefault(handleKeyDown),
        ]),
  ]

  const panelAttributes = [
    h.Id(panelId(id)),
    ...(isOpen ? [h.DataAttribute('open', '')] : []),
  ]

  const animatePanel = (content: Html): Html =>
    h.div(
      [
        h.Style({
          display: 'grid',
          gridTemplateRows: isOpen ? '1fr' : '0fr',
          transition: panelSizeTransition,
          overflow: 'hidden',
        }),
      ],
      [
        h.div(
          [
            h.Style({ minHeight: '0px', overflow: 'hidden' }),
            ...(isOpen ? [] : [h.AriaHidden(true)]),
          ],
          [content],
        ),
      ],
    )

  return toView({
    button: buttonAttributes,
    panel: panelAttributes,
    animatePanel,
  })
}
