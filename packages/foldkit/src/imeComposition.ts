// NOTE: some browsers report the keydown that confirms an IME conversion
// with keyCode 229 and isComposing false. That keydown belongs to the
// input method, the same as one with isComposing set.
const IME_COMPOSITION_KEY_CODE = 229

/** Whether a keydown belongs to an input method composition. */
export const isImeCompositionKeydown = (event: KeyboardEvent): boolean =>
  event.isComposing || event.keyCode === IME_COMPOSITION_KEY_CODE

const composingTargets = new WeakSet<EventTarget>()
const observedDocuments = new WeakSet<Document>()

const compositionTarget = (event: Event): EventTarget | null =>
  event.composedPath()[0] ?? event.target

/** Starts recording which elements of a document have an input method
 *  composition open. An element does not expose that itself, so the
 *  composition events are the only record. They are observed in the capture
 *  phase so that a handler stopping propagation cannot hide one. Observing a
 *  document again does nothing. */
export const observeCompositions = (ownerDocument: Document): void => {
  if (observedDocuments.has(ownerDocument)) {
    return
  }
  observedDocuments.add(ownerDocument)
  ownerDocument.addEventListener(
    'compositionstart',
    event => {
      const target = compositionTarget(event)
      if (target !== null) {
        composingTargets.add(target)
      }
    },
    true,
  )
  ownerDocument.addEventListener(
    'compositionend',
    event => {
      const target = compositionTarget(event)
      if (target !== null) {
        composingTargets.delete(target)
      }
    },
    true,
  )
}

/** Whether an input method composition is open on the element, as recorded
 *  since {@link observeCompositions} began observing its document. */
export const isComposingText = (element: Element): boolean =>
  composingTargets.has(element)
