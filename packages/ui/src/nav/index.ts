import { Array, Option } from 'effect'
import {
  type ChildAttribute,
  type Html,
  childAttributes,
  html,
} from 'foldkit/html'

// MODEL

/** Per-item render info passed to the consumer's `toView`. Generic over
 *  `Value extends string`: the item value is typed as the consumer's union
 *  (typically a route tag) so `toView` can switch on it without casting. */
export type ItemInfo<Value extends string = string> = Readonly<{
  value: Value
  index: number
  isCurrent: boolean
  link: ReadonlyArray<ChildAttribute>
}>

/** Render-time payload published to the consumer's `toView`.
 *
 *  - `nav`: ARIA attributes for the wrapping navigation landmark. Carries
 *    `aria-label` only; the `<nav>` element already supplies the navigation
 *    role, so spread this onto an `h.nav`.
 *  - `items`: one entry per `viewInputs.items`, in the same order, each with
 *    the anchor's attribute bundle and derived current state. */
export type RenderInfo<Value extends string = string> = Readonly<{
  nav: ReadonlyArray<ChildAttribute>
  items: ReadonlyArray<ItemInfo<Value>>
}>

/** View inputs for `Nav.view`. Generic over `Value extends string` so the
 *  consumer's section/route union flows into `toView`, `toHref`, and
 *  `isItemCurrent` without casting. */
export type ViewInputs<Value extends string = string> = Readonly<{
  items: ReadonlyArray<Value>
  ariaLabel: string
  toHref: (value: Value, index: number) => string
  isItemCurrent: (value: Value, index: number) => boolean
  toView: (render: RenderInfo<Value>) => Html
}>

// VIEW

const ARIA_CURRENT_PAGE = 'page'

/** Renders a navigation landmark whose items are links, marking the current
 *  destination with `aria-current="page"`. Stateless: the current item is
 *  derived from `isItemCurrent`, which the consumer drives from the URL, the
 *  single source of truth for which page is showing.
 *
 *  Use this for URL-driven navigation where each section is a separate
 *  route with its own URL, deep-linking, and browser-history behavior.
 *  Reach for `Tabs` instead when switching content within a single page;
 *  `Tabs` carries the `tablist`/`tab`/`tabpanel` semantics, which are
 *  wrong for URL-driven navigation.
 *
 *  Headless: `toView` owns all markup, spreading the `nav` bundle onto an
 *  `h.nav` and each `item.link` bundle onto an `h.a`. Keyboard support is the
 *  browser's native link handling (Tab to move, Enter to follow); no roving
 *  tabindex is imposed, since that is a composite-widget pattern, not a
 *  navigation-landmark one. */
export const view = <Value extends string = string>(
  viewInputs: ViewInputs<Value>,
): Html => {
  const h = html<never>()

  const { items, ariaLabel, toHref, isItemCurrent, toView } = viewInputs

  const itemInfos: ReadonlyArray<ItemInfo<Value>> = Array.map(
    items,
    (value, index) => {
      const isCurrent = isItemCurrent(value, index)

      const maybeCurrentAttributes = Option.liftPredicate(
        [h.AriaCurrent(ARIA_CURRENT_PAGE), h.DataAttribute('current', '')],
        () => isCurrent,
      )

      const linkAttributes = [
        h.Href(toHref(value, index)),
        ...Option.getOrElse(maybeCurrentAttributes, () => []),
      ]

      return {
        value,
        index,
        isCurrent,
        link: childAttributes(linkAttributes),
      }
    },
  )

  const navAttributes = [h.AriaLabel(ariaLabel)]

  return toView({
    nav: childAttributes(navAttributes),
    items: itemInfos,
  })
}
