const SWIPE_EXCLUDED_TARGET_SELECTOR =
  'button, a, input, select, textarea, [contenteditable], [role="button"], [role="link"]'

/** Whether a pointerdown originated on a child that should not start a
 *  Toast swipe. Mouse and pen presses on explicitly marked text preserve
 *  selection, while touch can still swipe across that content. @internal */
export const isSwipeExcludedTarget = (
  pointerType: string,
  target: EventTarget | null,
): boolean => {
  const maybeElement = target instanceof Element ? target : null
  const element =
    maybeElement ?? (target instanceof Node ? target.parentElement : null)

  if (element === null) {
    return false
  }

  if (element.closest(SWIPE_EXCLUDED_TARGET_SELECTOR) !== null) {
    return true
  }

  return (
    pointerType !== 'touch' &&
    element.closest('[data-toast-swipe-ignore]') !== null
  )
}
