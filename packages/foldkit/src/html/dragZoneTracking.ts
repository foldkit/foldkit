/**
 * Per-element drag-zone state: tracks which event targets have had a
 * `dragenter` without a matching `dragleave`. The zone is considered
 * active while the target set is non-empty OR a pending microtask-empty-
 * check is in flight from a recent `dragleave` (see `processDragLeave`).
 *
 * The target-tracking pattern matches react-dropzone and @react-aria/dnd
 * — pruning stale targets self-heals cases where a `dragleave` failed to
 * fire, and the microtask-deferred empty-check prevents a transient
 * false "left" when the pointer crosses from the zone's padding onto a
 * child in synchronous-dispatch rendering.
 */
export type DragZoneState = {
  targets: Set<EventTarget>
  pendingEmptyCheck: boolean
}

const dragZoneStates = new WeakMap<Element, DragZoneState>()

export const getDragZoneState = (zone: Element): DragZoneState => {
  const existing = dragZoneStates.get(zone)
  if (existing !== undefined) {
    return existing
  }
  const created: DragZoneState = {
    targets: new Set(),
    pendingEmptyCheck: false,
  }
  dragZoneStates.set(zone, created)
  return created
}

const pruneStaleTargets = (zone: Element, targets: Set<EventTarget>) => {
  for (const target of targets) {
    if (!(target instanceof Node) || !zone.contains(target)) {
      targets.delete(target)
    }
  }
}

/**
 * Decides whether a dragenter should dispatch an "entered" Message.
 * Returns true when the zone transitions from inactive to active.
 *
 * A zone is considered "active" if either the target set is non-empty or
 * a leave-check microtask is pending. The pending-check guard is what
 * prevents a double-enter when the pointer crosses from one child of the
 * zone directly onto another: dragleave empties the set and schedules a
 * microtask, dragenter follows synchronously with the next target, and
 * we correctly treat the dragenter as a continuation of the existing
 * drag session rather than a new one.
 */
export const processDragEnter = (
  state: DragZoneState,
  zone: Element,
  target: EventTarget | null,
): boolean => {
  pruneStaleTargets(zone, state.targets)
  const wasActive = state.targets.size > 0 || state.pendingEmptyCheck
  state.targets.add(target ?? zone)
  return !wasActive
}

/**
 * Decides what to do on `dragleave`. Returns `'schedule'` when the caller
 * should schedule a microtask-deferred empty-check, `'done'` when no
 * further action is needed (either because other targets are still
 * pending or a check is already in flight).
 */
export const processDragLeave = (
  state: DragZoneState,
  zone: Element,
  target: EventTarget | null,
): 'schedule' | 'done' => {
  state.targets.delete(target ?? zone)
  pruneStaleTargets(zone, state.targets)
  if (state.targets.size > 0) {
    return 'done'
  }
  if (state.pendingEmptyCheck) {
    return 'done'
  }
  state.pendingEmptyCheck = true
  return 'schedule'
}

/**
 * The microtask body a scheduled `processDragLeave` caller should run.
 * Returns true when the caller should dispatch the "left" Message. A
 * `dragenter` that races in between the scheduling and the microtask
 * re-populates `targets`, so by the time this runs the set correctly
 * reflects whether the drag is genuinely gone.
 */
export const checkScheduledLeave = (state: DragZoneState): boolean => {
  state.pendingEmptyCheck = false
  return state.targets.size === 0
}

/** Clears the target set and any pending empty-check after a drop. */
export const clearDragZoneAfterDrop = (zone: Element): void => {
  const state = dragZoneStates.get(zone)
  if (state !== undefined) {
    state.targets.clear()
    state.pendingEmptyCheck = false
  }
}
