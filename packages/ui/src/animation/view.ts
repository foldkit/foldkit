import { Match } from 'effect'

import { AnimationComposition } from './composition.js'

/** Renders a headless animation wrapper that coordinates CSS transitions and
 *  CSS keyframe animations via data attributes.
 *
 *  Data attributes reflect the current lifecycle phase:
 *  - `data-closed`: element is in its hidden/initial state
 *  - `data-enter`: enter animation is active
 *  - `data-leave`: leave animation is active
 *  - `data-transition`: any animation is active
 */
export const view = AnimationComposition.makeView.withInputs(
  (model, viewInputs, h) => {
    const { id, isShowing, transitionState } = model
    const {
      toView,
      className,
      attributes = [],
      element = 'div',
      animateSize = false,
    } = viewInputs

    const isLeaving =
      transitionState === 'LeaveStart' || transitionState === 'LeaveAnimating'
    const isVisible = isShowing || isLeaving

    const transitionAttributes: ReadonlyArray<
      ReturnType<typeof h.DataAttribute>
    > = Match.value(transitionState).pipe(
      Match.when('EnterStart', () => [
        h.DataAttribute('closed', ''),
        h.DataAttribute('enter', ''),
        h.DataAttribute('transition', ''),
      ]),
      Match.when('EnterAnimating', () => [
        h.DataAttribute('enter', ''),
        h.DataAttribute('transition', ''),
      ]),
      Match.when('LeaveStart', () => [
        h.DataAttribute('leave', ''),
        h.DataAttribute('transition', ''),
      ]),
      Match.when('LeaveAnimating', () => [
        h.DataAttribute('closed', ''),
        h.DataAttribute('leave', ''),
        h.DataAttribute('transition', ''),
      ]),
      Match.orElse(() => []),
    )

    if (animateSize) {
      const isClosed =
        transitionState === 'EnterStart' ||
        transitionState === 'LeaveAnimating' ||
        !isVisible

      return h.div(
        [
          h.Style({
            display: 'grid',
            gridTemplateRows: isClosed ? '0fr' : '1fr',
            transition: 'grid-template-rows 200ms ease-out',
            overflow: 'hidden',
          }),
        ],
        [
          h.div(
            [
              h.Style({ minHeight: '0px', overflow: 'hidden' }),
              ...(!isVisible ? [h.AriaHidden(true)] : []),
            ],
            [
              h.keyed(element)(
                id,
                [
                  h.Id(id),
                  ...(isClosed && transitionState === 'Idle'
                    ? [h.DataAttribute('closed', '')]
                    : []),
                  ...transitionAttributes,
                  ...(className ? [h.Class(className)] : []),
                  ...attributes,
                ],
                [toView()],
              ),
            ],
          ),
        ],
      )
    }

    if (!isVisible) {
      return h.empty
    }

    return h.keyed(element)(
      id,
      [
        h.Id(id),
        ...transitionAttributes,
        ...(className ? [h.Class(className)] : []),
        ...attributes,
      ],
      [toView()],
    )
  },
)
