import {
  type HydrationConfig,
  containRefusedPage,
  findDocumentHydration,
  hasServerRenderedMarkup,
} from './hydrationHandoff.js'

/** @internal Resolves the existing page container and its untouched hydration handoff. */
export const resolveApplicationContainer = (
  container: HTMLElement | null,
  isFlagsRequired: boolean,
): Readonly<{
  container: HTMLElement
  hydration: HydrationConfig | undefined
}> => {
  const hydration = findDocumentHydration(container, isFlagsRequired)
  const resolvedContainer = hydration?.root ?? container

  if (resolvedContainer === null) {
    if (hasServerRenderedMarkup(document)) {
      containRefusedPage(document)
    }

    throw new Error(
      '[foldkit] Container is null. Make sure the element exists in the DOM ' +
        'before calling makeApplication (e.g. that your <div id="root"></div> has ' +
        'rendered, and your script runs after it). On a server-rendered page ' +
        'the runtime instead finds the root by its `data-foldkit-app` stamp.',
    )
  }

  return { container: resolvedContainer, hydration }
}

/** @internal Requires the existing container for a scoped Element host. */
export const resolveElementContainer = (
  container: HTMLElement | null,
): HTMLElement => {
  if (container === null) {
    throw new Error(
      '[foldkit] Container is null. Make sure the element exists in the DOM ' +
        'before calling makeElement (e.g. that your <div id="root"></div> has ' +
        'rendered, and your script runs after it).',
    )
  }

  return container
}

/** @internal Validates the host identity before acquiring graph or handler resources. */
export const assertRuntimeId = (runtimeId: string): void => {
  if (runtimeId === '') {
    throw new Error(
      '[foldkit] Runtime container must have an `id` for Model preservation across reloads. ' +
        'Set `container.id = "app"` (or any unique string) before passing it to makeApplication or makeElement. ' +
        'On a server-rendered page the id comes from the `data-foldkit-app` root stamp instead.',
    )
  }
}
