import { Context, Option, Predicate } from 'effect'

import {
  type Document,
  type Html,
  type HtmlBuilder,
  __htmlBuilder,
  textDirectionToAttribute,
} from '../../html/index.js'
import { clearRuntime, setRuntime } from '../../html/runtimeSingleton.js'
import { type VNode, __patchVNode } from '../../vdom.js'

/** A view attached to the current document for structural DOM assertions. */
export type RenderedView = Readonly<{
  /** The attached wrapper containing the rendered view. */
  container: HTMLElement
  /** Removes the view and restores document title, lang, and dir.
   *  Safe to call more than once. Dispose nested renders in reverse order. */
  dispose: () => void
}>

const snapshotVNode = ({
  sel,
  data,
  children,
  text,
  key,
  identity,
}: VNode): VNode => {
  const snapshotData = data === undefined ? undefined : { ...data }
  if (snapshotData !== undefined) {
    delete snapshotData.on
    if (snapshotData.hook !== undefined) {
      // NOTE: Submodel postdestroy hooks close over the source render's registry.
      snapshotData.hook = { ...snapshotData.hook }
      delete snapshotData.hook.postdestroy
    }
  }

  return {
    sel,
    data: snapshotData,
    children: children?.map(child =>
      Predicate.isString(child) ? child : snapshotVNode(child),
    ),
    text,
    key,
    ...(identity === undefined ? {} : { identity }),
    elm: undefined,
  }
}

const isDocument = (value: Html | Document): value is Document =>
  value !== null && 'body' in value

const restoreAttribute = (
  element: Element,
  name: string,
  value: string | null,
): void => {
  if (value === null) {
    element.removeAttribute(name)
  } else {
    element.setAttribute(name, value)
  }
}

/** Renders an Html or Document view into the current DOM using Foldkit's
 *  renderer. Requires a DOM environment such as happy-dom or a browser.
 *
 *  Mounts do not execute, and Foldkit event handlers are not installed.
 *  The helper does not run update, Commands, or Subscriptions. Use Scene for
 *  state transitions and a browser test for accessibility that depends on
 *  layout or Mount effects.
 *
 *  A Document sets title and any supplied lang and dir. Other head metadata
 *  is not applied. Call dispose in a finally block after DOM assertions.
 *  Renders share document metadata, so dispose them in reverse order and
 *  do not run Document assertions concurrently within one document. */
export const render = <Message = never>(
  view: (h: HtmlBuilder<Message>) => Html | Document,
): RenderedView => {
  const container = document.createElement('div')
  const placeholder = document.createElement('div')
  const previousTitle = document.title
  const { documentElement } = document
  const previousLang = documentElement.getAttribute('lang')
  const previousDir = documentElement.getAttribute('dir')

  setRuntime(() => {}, Context.empty(), undefined, 'Static')
  try {
    const result = view(__htmlBuilder<Message>())
    const page = isDocument(result) ? result : undefined
    const body = isDocument(result) ? result.body : result
    container.appendChild(placeholder)
    document.body.appendChild(container)
    const snapshot = body === null ? null : snapshotVNode(body)
    const mounted = __patchVNode(Option.none(), snapshot, placeholder)

    if (page !== undefined) {
      document.title = page.title
      if (page.lang !== undefined) {
        documentElement.lang = page.lang
      }
      if (page.dir !== undefined) {
        documentElement.dir = textDirectionToAttribute(page.dir)
      }
    }

    let isDisposed = false
    return {
      container,
      dispose: () => {
        if (isDisposed) {
          return
        }
        isDisposed = true
        setRuntime(() => {}, Context.empty(), undefined, 'Static')
        try {
          __patchVNode(Option.some(mounted), null, placeholder)
        } finally {
          clearRuntime()
          container.remove()
          if (page !== undefined) {
            document.title = previousTitle
            restoreAttribute(documentElement, 'lang', previousLang)
            restoreAttribute(documentElement, 'dir', previousDir)
          }
        }
      },
    }
  } catch (error) {
    container.remove()
    throw error
  } finally {
    clearRuntime()
  }
}
