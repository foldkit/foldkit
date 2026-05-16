import {
  Array,
  Duration,
  Effect,
  Match as M,
  Schema as S,
  Stream,
  pipe,
} from 'effect'
import * as Ansi from 'effect-boxes/Ansi'
import * as Box from 'effect-boxes/Box'
import * as Command from 'foldkit/command'
import { m } from 'foldkit/message'
import { evo } from 'foldkit/struct'
import * as Subscription from 'foldkit/subscription'
import {
  type KeyPress,
  type TerminalView,
  keyPressStream,
  makeTerminalProgram,
  runTerminal,
} from 'foldkit/terminal'

import { GAME, GAME_SPEED } from './constants'
import { Apple, Direction, Position, Snake } from './domain'

// MODEL

const GameState = S.Literals(['NotStarted', 'Playing', 'Paused', 'GameOver'])
type GameState = typeof GameState.Type

const Model = S.Struct({
  snake: Snake.Snake,
  apple: Position.Position,
  direction: Direction.Direction,
  nextDirection: Direction.Direction,
  gameState: GameState,
  points: S.Number,
  highScore: S.Number,
})
type Model = typeof Model.Type

// MESSAGE

const TickedClock = m('TickedClock')
const PressedKey = m('PressedKey', { key: S.String })
const GeneratedApplePosition = m('GeneratedApplePosition', {
  position: Position.Position,
})

const Message = S.Union([TickedClock, PressedKey, GeneratedApplePosition])
type Message = typeof Message.Type

// COMMAND

const GenerateApplePosition = Command.define(
  'GenerateApplePosition',
  { snake: Snake.Snake },
  GeneratedApplePosition,
)(({ snake }) =>
  Apple.generatePosition(snake).pipe(
    Effect.map(position => GeneratedApplePosition({ position })),
  ),
)

// INIT

const init = (): readonly [Model, ReadonlyArray<Command.Command<Message>>] => {
  const snake = Snake.create(GAME.INITIAL_POSITION)
  return [
    {
      snake,
      apple: { x: 15, y: 15 },
      direction: GAME.INITIAL_DIRECTION,
      nextDirection: GAME.INITIAL_DIRECTION,
      gameState: 'NotStarted',
      points: 0,
      highScore: 0,
    },
    [GenerateApplePosition({ snake })],
  ]
}

// UPDATE

const update = (
  model: Model,
  message: Message,
): readonly [Model, ReadonlyArray<Command.Command<Message>>] =>
  M.value(message).pipe(
    M.withReturnType<
      readonly [Model, ReadonlyArray<Command.Command<Message>>]
    >(),
    M.tagsExhaustive({
      PressedKey: ({ key }) =>
        M.value(key).pipe(
          M.withReturnType<
            readonly [Model, ReadonlyArray<Command.Command<Message>>]
          >(),
          M.whenOr(
            'ArrowUp',
            'ArrowDown',
            'ArrowLeft',
            'ArrowRight',
            'w',
            'a',
            's',
            'd',
            moveKey => {
              const nextDirection = M.value(moveKey).pipe(
                M.withReturnType<Direction.Direction>(),
                M.whenOr('ArrowUp', 'w', () => 'Up'),
                M.whenOr('ArrowDown', 's', () => 'Down'),
                M.whenOr('ArrowLeft', 'a', () => 'Left'),
                M.whenOr('ArrowRight', 'd', () => 'Right'),
                M.exhaustive,
              )

              if (model.gameState === 'Playing') {
                return [evo(model, { nextDirection: () => nextDirection }), []]
              }
              return [model, []]
            },
          ),
          M.when(' ', () => {
            const nextGameState = M.value(model.gameState).pipe(
              M.withReturnType<GameState>(),
              M.when('NotStarted', () => 'Playing'),
              M.when('Playing', () => 'Paused'),
              M.when('Paused', () => 'Playing'),
              M.when('GameOver', () => 'GameOver'),
              M.exhaustive,
            )
            return [evo(model, { gameState: () => nextGameState }), []]
          }),
          M.when('r', () => {
            const nextSnake = Snake.create(GAME.INITIAL_POSITION)
            return [
              evo(model, {
                snake: () => nextSnake,
                direction: () => GAME.INITIAL_DIRECTION,
                nextDirection: () => GAME.INITIAL_DIRECTION,
                gameState: () => 'NotStarted',
                points: () => 0,
              }),
              [GenerateApplePosition({ snake: nextSnake })],
            ]
          }),
          M.orElse(() => [model, []]),
        ),

      TickedClock: () => {
        if (model.gameState !== 'Playing') {
          return [model, []]
        }

        const currentDirection = Direction.isOpposite(
          model.direction,
          model.nextDirection,
        )
          ? model.direction
          : model.nextDirection

        const newHead = Position.move(model.snake[0], currentDirection)
        const willEatApple = Position.equivalence(newHead, model.apple)

        const nextSnake = willEatApple
          ? Snake.grow(model.snake, currentDirection)
          : Snake.move(model.snake, currentDirection)

        if (Snake.hasCollision(nextSnake)) {
          return [
            evo(model, {
              gameState: () => 'GameOver',
              highScore: highScore => Math.max(model.points, highScore),
            }),
            [],
          ]
        }

        const commands = willEatApple
          ? [GenerateApplePosition({ snake: nextSnake })]
          : []

        return [
          evo(model, {
            snake: () => nextSnake,
            direction: () => currentDirection,
            points: points =>
              willEatApple ? points + GAME.POINTS_PER_APPLE : points,
          }),
          commands,
        ]
      },

      GeneratedApplePosition: ({ position }) => [
        evo(model, { apple: () => position }),
        [],
      ],
    }),
  )

// SUBSCRIPTION

const SubscriptionDeps = S.Struct({
  gameClock: S.Struct({
    isPlaying: S.Boolean,
    interval: S.Number,
  }),
  keyboard: S.Null,
})

const subscriptions = Subscription.makeSubscriptions(SubscriptionDeps)<
  Model,
  Message
>({
  gameClock: {
    modelToDependencies: model => ({
      isPlaying: model.gameState === 'Playing',
      interval: Math.max(
        GAME_SPEED.MIN_INTERVAL,
        GAME_SPEED.BASE_INTERVAL - model.points,
      ),
    }),
    dependenciesToStream: deps =>
      Stream.when(
        Stream.tick(Duration.millis(deps.interval)).pipe(
          Stream.map(TickedClock),
        ),
        Effect.sync(() => deps.isPlaying),
      ),
  },

  keyboard: {
    modelToDependencies: () => null,
    dependenciesToStream: () =>
      keyPressStream().pipe(
        Stream.map((keyPress: KeyPress) => PressedKey({ key: keyPress.key })),
      ),
  },
})

// VIEW

const CELL = '  '
const emptyCellStyle = Ansi.bgBlack
const snakeHeadStyle = Ansi.bgGreen
const snakeBodyStyle = Ansi.bgBrightGreen
const appleStyle = Ansi.bgRed

const cellStyle = (x: number, y: number, model: Model): Ansi.AnsiAnnotation => {
  if (Position.equivalence({ x, y }, model.snake[0])) {
    return snakeHeadStyle
  }
  const isBody = pipe(
    model.snake,
    Array.tailNonEmpty,
    Array.some(segment => Position.equivalence({ x, y }, segment)),
  )
  if (isBody) {
    return snakeBodyStyle
  }
  if (Position.equivalence({ x, y }, model.apple)) {
    return appleStyle
  }
  return emptyCellStyle
}

const cellView = (x: number, y: number, model: Model): TerminalView =>
  Box.annotate(Box.text(CELL), cellStyle(x, y, model))

const gridView = (model: Model): TerminalView =>
  pipe(
    Array.makeBy(GAME.GRID_SIZE, y =>
      Box.hcat(
        Array.makeBy(GAME.GRID_SIZE, x => cellView(x, y, model)),
        Box.top,
      ),
    ),
    rows => Box.vcat(rows, Box.left),
    Box.border<never>('rounded'),
  )

const gameStateText = (gameState: GameState): string =>
  M.value(gameState).pipe(
    M.when('NotStarted', () => 'Press SPACE to start'),
    M.when('Playing', () => 'Playing. SPACE to pause'),
    M.when('Paused', () => 'Paused. SPACE to continue'),
    M.when('GameOver', () => 'Game Over. R to restart'),
    M.exhaustive,
  )

const headerView = (model: Model): TerminalView =>
  Box.vcat(
    [
      Box.annotate(
        Box.text(' Snake Game'),
        Ansi.combine(Ansi.bold, Ansi.green),
      ),
      Box.emptyBox(1, 0),
      Box.hcat(
        [
          Box.annotate(Box.text(` Score: ${model.points}`), Ansi.yellow),
          Box.text('   '),
          Box.annotate(Box.text(`High Score: ${model.highScore}`), Ansi.cyan),
        ],
        Box.top,
      ),
      Box.annotate(
        Box.text(` ${gameStateText(model.gameState)}`),
        Ansi.brightBlack,
      ),
      Box.emptyBox(1, 0),
    ],
    Box.left,
  )

const footerView = (): TerminalView =>
  Box.vcat(
    [
      Box.annotate(Box.text(' Arrow keys or WASD to move'), Ansi.brightBlack),
      Box.annotate(Box.text(' SPACE to pause / start'), Ansi.brightBlack),
      Box.annotate(
        Box.text(' R to restart    Ctrl+C to quit'),
        Ansi.brightBlack,
      ),
    ],
    Box.left,
  )

const view = (model: Model): TerminalView =>
  Box.vcat(
    [headerView(model), gridView(model), Box.emptyBox(1, 0), footerView()],
    Box.left,
  )

// RUN

const program = makeTerminalProgram({
  Model,
  init,
  update,
  view,
  subscriptions,
  title: model => `Snake (${model.points} pts)`,
})

runTerminal(program)
