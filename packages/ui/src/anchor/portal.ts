import { Option, pipe } from 'effect'

const PORTAL_ROOT_ID = 'foldkit-portal-root'
const DIALOG_PORTAL_ROOT_ATTRIBUTE = 'data-foldkit-portal-root'

const getOrCreateContainingRootPortalRoot = (element: Element): HTMLElement => {
  // NOTE: portal into the element's containing root, the shadow root when the
  // app is mounted inside one (e.g. the DevTools overlay) or `document.body`
  // otherwise, so the panel keeps that root's scoped styles while still
  // escaping ancestor clipping. `getRootNode()` must be read here, before the
  // element is relocated out of the mounting tree.
  const root = element.getRootNode()
  const inShadow = root instanceof ShadowRoot
  const owner: Document | ShadowRoot = inShadow ? root : document
  const parent: ParentNode = inShadow ? root : document.body

  const existing = owner.getElementById(PORTAL_ROOT_ID)

  if (existing) {
    return existing
  }

  const portalRoot = document.createElement('div')
  portalRoot.id = PORTAL_ROOT_ID

  // NOTE: prepended (not appended) so portaled overlays sit BEFORE the app's
  // listbox/popover/menu wrappers in tree order. Those wrappers are
  // `position: relative; z-index: auto` and paint at CSS step 8 in tree order;
  // a backdrop appended after them would paint on top of every button,
  // breaking click-outside detection. Prepending makes wrappers paint
  // above the backdrop, while panels (z-10) still win via step 9.
  parent.prepend(portalRoot)
  return portalRoot
}

const getOrCreateDialogPortalRoot = (
  dialog: HTMLDialogElement,
): HTMLElement => {
  const existing = dialog.querySelector(
    `:scope > [${DIALOG_PORTAL_ROOT_ATTRIBUTE}]`,
  )

  if (existing instanceof HTMLElement) {
    return existing
  }

  const portalRoot = document.createElement('div')
  portalRoot.setAttribute(DIALOG_PORTAL_ROOT_ATTRIBUTE, '')

  // NOTE: appended, unlike the containing root's portal root. A dialog's
  // content is usually one positioned panel, and an element prepended before
  // it paints under that panel unless it has its own z-index. Backdrops do not
  // come here: `portalBackdrop` places them next to their wrapper instead.
  dialog.append(portalRoot)
  return portalRoot
}

const isDialogPortalRoot = (element: Element): boolean =>
  element.hasAttribute(DIALOG_PORTAL_ROOT_ATTRIBUTE)

// NOTE: a dialog is its own stacking level (`Dom.showDialog` gives it a
// near-maximal z-index, `showModal()` puts it in the top layer) and the only
// subtree a modal dialog leaves interactive. An element portaled out of it is
// painted behind the dialog and made inert, so an element inside a dialog is
// portaled into that dialog instead. `closest` must be read here, before the
// element is relocated out of the mounting tree.
const getOrCreatePortalRoot = (element: Element): HTMLElement =>
  Option.match(Option.fromNullishOr(element.closest('dialog')), {
    onNone: () => getOrCreateContainingRootPortalRoot(element),
    onSome: getOrCreateDialogPortalRoot,
  })

/** Relocates an element into a portal root and returns a cleanup function
 *  that removes it again. Inside a `<dialog>`, the portal root is a div
 *  appended to that dialog, so the element stays above the dialog's content
 *  and interactive while a modal dialog makes everything outside it inert.
 *  The cleanup removes that div once it is empty. Otherwise the portal root
 *  is the shared `foldkit-portal-root` div within the element's containing
 *  root: the shadow root when mounted inside one, otherwise `document.body`.
 *  Either way the element escapes the clipping and stacking contexts of the
 *  ancestors it leaves, and keeps its root's scoped styles. Use
 *  `portalBackdrop` for a click-outside backdrop. Designed to be called from
 *  inside an `OnMount` action: the consumer wraps the call in `Effect.sync`
 *  and stashes the returned cleanup in the `Mount` result. */
export const portalToContainingRoot = (element: Element): (() => void) => {
  const portalRoot = getOrCreatePortalRoot(element)
  portalRoot.appendChild(element)

  return () => {
    try {
      element.remove()
    } catch {
      // NOTE: a re-render may unmount the element before this cleanup fires,
      // so the remove() call can throw on a node that's already been removed.
      // Swallow the error.
    }

    // NOTE: a dialog's children are usually rendered only while it is open,
    // so after a close an empty portal root would be the dialog's only child,
    // and on the next open the dialog's content would be inserted after it.
    // Removing it lets the next element portaled into this dialog append a
    // fresh root after the content.
    if (isDialogPortalRoot(portalRoot) && !portalRoot.hasChildNodes()) {
      portalRoot.remove()
    }
  }
}

const findWrapperInsideDialog = (element: Element): Option.Option<Element> => {
  const dialog = element.closest('dialog')

  return pipe(
    Option.fromNullishOr(element.parentElement),
    Option.filter(parent => dialog !== null && parent !== dialog),
  )
}

/** Relocates a click-outside backdrop and returns a cleanup function that
 *  removes it again. Outside a `<dialog>`, it does what
 *  `portalToContainingRoot` does. Inside a `<dialog>`, the backdrop moves to
 *  directly before the element it was rendered in, which is the component
 *  wrapper that holds the trigger. The backdrop then covers the dialog's
 *  content, and the wrapper stays above it, so a click on a Combobox input
 *  reaches the input while a click anywhere else in the dialog reaches the
 *  backdrop. The wrapper must be positioned, for example `position:
 *  relative`, which is also what keeps it above a backdrop in the containing
 *  root. While the backdrop is there, it is a sibling of the wrapper, so
 *  sibling-based selectors such as `:first-child` or Tailwind's `divide-y`
 *  count it. Some CSS on an ancestor between the wrapper and the dialog
 *  confines the backdrop to that ancestor: anything that makes the ancestor
 *  the containing block for fixed-position elements, for example
 *  `transform`, `scale`, `filter`, `backdrop-filter`, or `container-type`.
 *  A click outside that ancestor then leaves the overlay open, and if it
 *  also lands outside the dialog panel, it closes the whole dialog. A
 *  backdrop rendered directly in the dialog goes into the dialog's portal
 *  root instead. Designed to be called from inside an `OnMount` action,
 *  like `portalToContainingRoot`. */
export const portalBackdrop = (element: Element): (() => void) =>
  Option.match(findWrapperInsideDialog(element), {
    onNone: () => portalToContainingRoot(element),
    onSome: wrapper => {
      // NOTE: positioned elements without a z-index paint in tree order, and
      // every non-positioned element paints before them. Placed directly
      // before the positioned wrapper, the backdrop paints over the dialog
      // panel and its content but under the wrapper and the trigger inside it.
      // The dialog portal root cannot give both: appended, the backdrop would
      // cover the trigger too, and prepended, the dialog panel would cover the
      // backdrop. `closest` and `parentElement` must be read before the move.
      wrapper.before(element)
      return () => element.remove()
    },
  })
