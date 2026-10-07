import { Effect, Stream } from 'effect'

export const documentDragStyles = Stream.callback<never>(() =>
  Effect.acquireRelease(
    Effect.sync(() => {
      const styleElement = document.createElement('style')
      styleElement.textContent = `
          :root {
            user-select: none !important;
            -webkit-user-select: none !important;
          }
          * {
            cursor: grabbing !important;
          }
        `
      document.head.appendChild(styleElement)
      return styleElement
    }),
    styleElement => Effect.sync(() => styleElement.remove()),
  ).pipe(Effect.flatMap(() => Effect.never)),
)
