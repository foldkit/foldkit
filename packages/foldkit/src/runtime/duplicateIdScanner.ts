import { Array } from 'effect'

/** Dev-only scan for duplicate DOM ids within the Foldkit-rendered root.
 *
 *  Duplicate ids are invalid HTML but browsers do not report them, so
 *  `getElementById` / `querySelector` silently resolve to the first match and
 *  focus or ARIA labelling can target the wrong element with no error. The
 *  scan is scoped to `root` (not the whole document) so unrelated page ids do
 *  not trigger it, warns rather than throws, and dedupes through `warnedIds`
 *  so the same collision is reported at most once instead of every render. */
const warnDuplicateIds = (
  root: Node | undefined,
  warnedIds: Set<string>,
): void => {
  if (!(root instanceof Element)) {
    return
  }

  const seenIds = new Set<string>()
  const duplicateIds = new Set<string>()

  const elementsWithId = Array.fromIterable(root.querySelectorAll('[id]'))
  if (root.id !== '') {
    elementsWithId.unshift(root)
  }

  for (const element of elementsWithId) {
    const { id } = element
    if (seenIds.has(id)) {
      duplicateIds.add(id)
    } else {
      seenIds.add(id)
    }
  }

  for (const id of duplicateIds) {
    if (!warnedIds.has(id)) {
      warnedIds.add(id)
      console.warn(
        `[foldkit] Duplicate DOM id "${id}" in the rendered tree. Ids must be ` +
          'unique within the document; otherwise focus and ARIA labelling can ' +
          'silently target the wrong element. Give each element a unique id.',
      )
    }
  }
}

const DUPLICATE_ID_SCAN_INTERVAL_MS = 1000

/** The coalescing scanner: `schedule` queues a scan of a root, `cancel` drops it. */
export type DuplicateIdScanner = Readonly<{
  schedule: (root: Node | undefined) => void
  cancel: () => void
}>

/** Coalesces `warnDuplicateIds` scans so rapid successive renders trigger at
 *  most one full-tree scan per `DUPLICATE_ID_SCAN_INTERVAL_MS`, bounding the
 *  cost under high-frequency dev rendering such as animationFrame subscriptions
 *  or per-keystroke input. A real duplicate id persists across renders, so
 *  scanning the latest tree on a trailing timer never misses a genuine
 *  collision, and the retained `warnedIds` keeps each id to a single warning.
 *  Dev-only: the runtime both creates the scanner and calls `schedule` behind
 *  `import.meta.hot`, so the scanner and its DOM scan tree-shake out of
 *  production builds. */
export const createDuplicateIdScanner = (): DuplicateIdScanner => {
  const warnedIds = new Set<string>()
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined
  let latestRoot: Node | undefined

  const schedule = (root: Node | undefined): void => {
    latestRoot = root
    if (timeoutHandle !== undefined) {
      return
    }
    timeoutHandle = setTimeout(() => {
      timeoutHandle = undefined
      warnDuplicateIds(latestRoot, warnedIds)
    }, DUPLICATE_ID_SCAN_INTERVAL_MS)
  }

  const cancel = (): void => {
    if (timeoutHandle !== undefined) {
      clearTimeout(timeoutHandle)
      timeoutHandle = undefined
    }
    latestRoot = undefined
  }

  return { schedule, cancel }
}
