// NOTE: some browsers report the keydown that confirms an IME conversion
// with keyCode 229 and isComposing false. That keydown belongs to the
// input method, the same as one with isComposing set.
const IME_COMPOSITION_KEY_CODE = 229

/** Whether a keydown belongs to an input method composition. */
export const isImeCompositionKeydown = (event: KeyboardEvent): boolean =>
  event.isComposing || event.keyCode === IME_COMPOSITION_KEY_CODE
