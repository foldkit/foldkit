import { Option, Stream } from 'effect'
import { Dom } from 'foldkit'

export const protectUnsavedChanges = ({
  isProtecting,
}: Readonly<{ isProtecting: boolean }>) =>
  isProtecting
    ? Dom.streamFromEventFilterMap({
        target: () => window,
        type: 'beforeunload',
        filterMapEvent: event => {
          event.preventDefault()

          // NOTE: Vite's baseline includes Chrome/Edge before 119,
          // which require this legacy fallback for the native warning.
          event.returnValue = true

          return Option.none()
        },
      })
    : Stream.empty
