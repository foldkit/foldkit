import type { AnyAuthoredView } from '../html/block.js'

/** @internal Retains the exact default renderer without exposing it as an operation. */
export declare const DefaultViewTypeId: unique symbol

/** @internal Reads the renderer contract supplied during Block completion. */
export type DefaultViewOf<BlockValue> =
  BlockValue extends Readonly<{
    [DefaultViewTypeId]: infer View
  }>
    ? View
    : never

const defaultViews = new WeakMap<object, AnyAuthoredView>()

/** @internal Associates a completed Block with its optional default renderer. */
export const registerDefaultView = (
  block: object,
  view: AnyAuthoredView | undefined,
): void => {
  if (view !== undefined) {
    defaultViews.set(block, view)
  }
}

/** @internal Returns the default renderer retained during Block completion. */
export const defaultViewOf = (block: object): AnyAuthoredView | undefined =>
  defaultViews.get(block)

/** @internal Requires a default renderer for a page-owning application. */
export const requireDefaultView = (block: object): AnyAuthoredView => {
  const view = defaultViewOf(block)

  if (view === undefined) {
    throw new Error('[foldkit] This Block has no default view.')
  }

  return view
}
