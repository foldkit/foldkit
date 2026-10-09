import type { VNode } from '../vdom.js'

declare const HtmlNodeTypeId: unique symbol

/** A rendered view node produced by an Html builder. Opaque: its
 *  representation is not part of the API, so code outside Foldkit can create,
 *  compose, pass, and return it, but cannot read or construct its fields. */
export interface HtmlNode {
  readonly [HtmlNodeTypeId]: typeof HtmlNodeTypeId
}

/** What a view returns. Constructed synchronously by the element factories on
 *  {@link HtmlBuilder}. `null` renders nothing. */
export type Html = HtmlNode | null

/** Views a renderer node as Html.
 *
 * @internal */
export const toHtml = (vnode: VNode | null): Html =>
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  vnode as unknown as Html

/** Views Html as the renderer node it is.
 *
 * @internal */
export const fromHtml = (html: Html): VNode | null =>
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  html as unknown as VNode | null
