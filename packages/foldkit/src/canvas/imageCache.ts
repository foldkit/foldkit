import { Match, Option } from 'effect'

type ImageLoad =
  | Readonly<{ _tag: 'Loading'; onLoadCallbacks: Set<() => void> }>
  | Readonly<{ _tag: 'Loaded'; element: HTMLImageElement }>
  | Readonly<{ _tag: 'Failed' }>

/**
 * Decoded images keyed by `src`, shared by every canvas on the page. An entry
 * is never evicted, so a `src` loads at most once and a sprite that leaves the
 * scene for a frame draws immediately when it returns.
 */
const imageLoadsBySrc = new Map<string, ImageLoad>()

const startLoading = (src: string): ImageLoad => {
  const element = document.createElement('img')
  const onLoadCallbacks = new Set<() => void>()
  const loading: ImageLoad = { _tag: 'Loading', onLoadCallbacks }

  imageLoadsBySrc.set(src, loading)

  element.addEventListener(
    'load',
    () => {
      imageLoadsBySrc.set(src, { _tag: 'Loaded', element })
      onLoadCallbacks.forEach(onLoad => onLoad())
    },
    { once: true },
  )
  element.addEventListener(
    'error',
    () => {
      imageLoadsBySrc.set(src, { _tag: 'Failed' })
    },
    { once: true },
  )

  element.src = src

  // NOTE: browsers fire `load` in a later task, but happy-dom, which app
  // tests run in, fires it synchronously while a data URL `src` is assigned.
  // That happens before the caller can register its callback, so the caller
  // reads the entry again here and draws the image at once.
  return imageLoadsBySrc.get(src) ?? loading
}

/**
 * Return the decoded image for `src` when it has loaded. Otherwise start
 * loading it if no load has started, and register `onLoad` to be called once
 * when it loads. Passing the same `onLoad` for many shapes registers it once.
 */
export const requestImage = (
  src: string,
  onLoad: () => void,
): Option.Option<HTMLImageElement> =>
  Match.value(imageLoadsBySrc.get(src) ?? startLoading(src)).pipe(
    Match.tagsExhaustive({
      Loading: ({ onLoadCallbacks }) => {
        onLoadCallbacks.add(onLoad)
        return Option.none()
      },
      Loaded: ({ element }) => Option.some(element),
      Failed: () => Option.none(),
    }),
  )
