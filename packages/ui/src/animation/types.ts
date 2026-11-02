import type { ChildAttribute, Html, TagName } from 'foldkit/html'

/** Per-render view inputs passed to `view` via `h.block`'s `viewInputs` field. */
export type ViewInputs = Readonly<{
  /** Renders content in the boundary that embeds Animation. */
  toView: () => Html
  className?: string
  attributes?: ReadonlyArray<ChildAttribute>
  element?: Exclude<TagName, 'textarea'>
  /** When true, wraps content in a CSS grid container that smoothly animates
   *  height via `grid-template-rows: 0fr → 1fr`. The element stays in the DOM
   *  when hidden (collapsed to zero height) instead of being removed. */
  animateSize?: boolean
}>
