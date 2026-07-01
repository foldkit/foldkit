import { Array, Schema as S, pipe } from 'effect'
import { describe, expect, it } from 'vitest'

import { m, ts } from '../../schema/index.js'
import { defineMachine, to, when } from '../statechart.js'

const DRAG_THRESHOLD_PIXELS = 8

// STATE

const Idle = ts('Idle')
const Pressed = ts('Pressed', {
  pointerId: S.Number,
  startX: S.Number,
  startY: S.Number,
})
const Dragging = ts('Dragging', {
  pointerId: S.Number,
  startX: S.Number,
  startY: S.Number,
  currentX: S.Number,
  currentY: S.Number,
})
const Settling = ts('Settling', { endX: S.Number, endY: S.Number })

const GestureState = S.Union([Idle, Pressed, Dragging, Settling])
type GestureState = typeof GestureState.Type

// MESSAGE

const PressedPointer = m('PressedPointer', {
  pointerId: S.Number,
  x: S.Number,
  y: S.Number,
})
const MovedPointer = m('MovedPointer', {
  pointerId: S.Number,
  x: S.Number,
  y: S.Number,
})
const ReleasedPointer = m('ReleasedPointer', { pointerId: S.Number })
const CancelledPointer = m('CancelledPointer', { pointerId: S.Number })
const CompletedSettle = m('CompletedSettle')

const GestureMessage = S.Union([
  PressedPointer,
  MovedPointer,
  ReleasedPointer,
  CancelledPointer,
  CompletedSettle,
])
type GestureMessage = typeof GestureMessage.Type

// MACHINE

const gestureMachine = defineMachine({
  state: GestureState,
  message: GestureMessage,
})({
  initial: Idle(),
  states: {
    Idle: {
      on: {
        PressedPointer: to('Pressed', (_state, message) =>
          Pressed({
            pointerId: message.pointerId,
            startX: message.x,
            startY: message.y,
          }),
        ),
      },
    },
    Pressed: {
      on: {
        MovedPointer: [
          when(
            (state, message) =>
              message.pointerId === state.pointerId &&
              Math.hypot(message.x - state.startX, message.y - state.startY) >=
                DRAG_THRESHOLD_PIXELS,
            to('Dragging', (state, message) =>
              Dragging({
                pointerId: state.pointerId,
                startX: state.startX,
                startY: state.startY,
                currentX: message.x,
                currentY: message.y,
              }),
            ),
          ),
          when(
            (state, message) => message.pointerId === state.pointerId,
            to('Pressed', state => state),
          ),
        ],
        ReleasedPointer: [
          when(
            (state, message) => message.pointerId === state.pointerId,
            to('Idle', () => Idle()),
          ),
        ],
        CancelledPointer: [
          when(
            (state, message) => message.pointerId === state.pointerId,
            to('Idle', () => Idle()),
          ),
        ],
      },
    },
    Dragging: {
      on: {
        MovedPointer: [
          when(
            (state, message) => message.pointerId === state.pointerId,
            to('Dragging', (state, message) =>
              Dragging({
                pointerId: state.pointerId,
                startX: state.startX,
                startY: state.startY,
                currentX: message.x,
                currentY: message.y,
              }),
            ),
          ),
        ],
        ReleasedPointer: [
          when(
            (state, message) => message.pointerId === state.pointerId,
            to('Settling', state =>
              Settling({ endX: state.currentX, endY: state.currentY }),
            ),
          ),
        ],
        CancelledPointer: [
          when(
            (state, message) => message.pointerId === state.pointerId,
            to('Settling', state =>
              Settling({ endX: state.startX, endY: state.startY }),
            ),
          ),
        ],
      },
    },
    Settling: {
      on: {
        CompletedSettle: to('Idle', () => Idle()),
        PressedPointer: to('Pressed', (_state, message) =>
          Pressed({
            pointerId: message.pointerId,
            startX: message.x,
            startY: message.y,
          }),
        ),
      },
    },
  },
})

// TESTS

describe('drag gesture machine', () => {
  it('treats press then release with no movement as a tap', () => {
    const [pressed] = gestureMachine.transition(
      Idle(),
      PressedPointer({ pointerId: 1, x: 10, y: 10 }),
    )
    expect(pressed).toStrictEqual(
      Pressed({ pointerId: 1, startX: 10, startY: 10 }),
    )

    const [idle] = gestureMachine.transition(
      pressed,
      ReleasedPointer({ pointerId: 1 }),
    )
    expect(idle).toStrictEqual(Idle())
  })

  it('stays Pressed below the drag threshold', () => {
    const pressed = Pressed({ pointerId: 1, startX: 0, startY: 0 })
    const [stillPressed] = gestureMachine.transition(
      pressed,
      MovedPointer({ pointerId: 1, x: 3, y: 4 }),
    )
    expect(stillPressed).toBe(pressed)
  })

  it('starts dragging once the threshold is crossed', () => {
    const [dragging] = gestureMachine.transition(
      Pressed({ pointerId: 1, startX: 0, startY: 0 }),
      MovedPointer({ pointerId: 1, x: 8, y: 0 }),
    )
    expect(dragging).toStrictEqual(
      Dragging({
        pointerId: 1,
        startX: 0,
        startY: 0,
        currentX: 8,
        currentY: 0,
      }),
    )
  })

  it('settles at the origin when the drag is cancelled', () => {
    const [settling] = gestureMachine.transition(
      Dragging({
        pointerId: 1,
        startX: 5,
        startY: 5,
        currentX: 50,
        currentY: 50,
      }),
      CancelledPointer({ pointerId: 1 }),
    )
    expect(settling).toStrictEqual(Settling({ endX: 5, endY: 5 }))
  })

  it('lets a new press interrupt the settle animation', () => {
    const [pressed] = gestureMachine.transition(
      Settling({ endX: 5, endY: 5 }),
      PressedPointer({ pointerId: 2, x: 5, y: 5 }),
    )
    expect(pressed).toStrictEqual(
      Pressed({ pointerId: 2, startX: 5, startY: 5 }),
    )
  })

  it('ignores events from other pointers in every active state', () => {
    const otherPointerMessages: ReadonlyArray<GestureMessage> = [
      MovedPointer({ pointerId: 2, x: 100, y: 100 }),
      ReleasedPointer({ pointerId: 2 }),
      CancelledPointer({ pointerId: 2 }),
    ]
    const activeStates: ReadonlyArray<GestureState> = [
      Pressed({ pointerId: 1, startX: 0, startY: 0 }),
      Dragging({
        pointerId: 1,
        startX: 0,
        startY: 0,
        currentX: 10,
        currentY: 10,
      }),
    ]

    for (const state of activeStates) {
      for (const message of otherPointerMessages) {
        expect(gestureMachine.step(state, message)._tag).toBe('Ignored')
      }
    }
  })

  it('decides every cell of the state and message matrix explicitly', () => {
    const sampleMessages: ReadonlyArray<GestureMessage> = [
      PressedPointer({ pointerId: 1, x: 0, y: 0 }),
      MovedPointer({ pointerId: 1, x: 20, y: 0 }),
      ReleasedPointer({ pointerId: 1 }),
      CancelledPointer({ pointerId: 1 }),
      CompletedSettle(),
    ]

    const transitionedTags = (state: GestureState): ReadonlyArray<string> =>
      pipe(
        sampleMessages,
        Array.filter(
          message =>
            gestureMachine.step(state, message)._tag === 'Transitioned',
        ),
        Array.map(message => message._tag),
      )

    expect(transitionedTags(Idle())).toEqual(['PressedPointer'])
    expect(
      transitionedTags(Pressed({ pointerId: 1, startX: 0, startY: 0 })),
    ).toEqual(['MovedPointer', 'ReleasedPointer', 'CancelledPointer'])
    expect(
      transitionedTags(
        Dragging({
          pointerId: 1,
          startX: 0,
          startY: 0,
          currentX: 1,
          currentY: 1,
        }),
      ),
    ).toEqual(['MovedPointer', 'ReleasedPointer', 'CancelledPointer'])
    expect(transitionedTags(Settling({ endX: 0, endY: 0 }))).toEqual([
      'PressedPointer',
      'CompletedSettle',
    ])
  })

  it('ignores a release that arrives in Idle', () => {
    const result = gestureMachine.step(
      Idle(),
      ReleasedPointer({ pointerId: 1 }),
    )
    expect(result._tag).toBe('Ignored')
  })
})
