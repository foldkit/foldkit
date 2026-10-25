import {
  Array,
  Duration,
  Effect,
  Layer,
  Match,
  Option,
  Schema,
  Stream,
  pipe,
} from 'effect'
import { Block, Dom } from 'foldkit'
import { Html } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import { GAME, GAME_SPEED } from './constants'
import { Apple, Direction, Position, Snake } from './domain'

export const GameState = Schema.Literals([
  'NotStarted',
  'Playing',
  'Paused',
  'GameOver',
])

export const Model = Schema.Struct({
  snake: Snake.Snake,
  apple: Position.Position,
  direction: Direction.Direction,
  nextDirection: Direction.Direction,
  gameState: GameState,
  points: Schema.Number,
  highScore: Schema.Number,
})

export const Message = defineMessageUnion({
  TickedClock: {},
  PressedKey: { key: Schema.String },
  PausedGame: {},
  RestartedGame: {},
  CompletedGenerateApplePosition: { position: Position.Position },
})

export const ApplicationDefinition = Block.makeDefinition('Application', {
  Model,
  Message,
})

export const ApplicationComposition = ApplicationDefinition.makeComposition()
type ApplicationViewBuilder = Block.ViewBuilderFor<
  typeof ApplicationComposition
>

export const init = ApplicationComposition.makeInit(() => {
  const snake = Snake.create(GAME.INITIAL_POSITION)

  return {
    model: Model.make({
      snake,
      apple: { x: 15, y: 15 },
      direction: GAME.INITIAL_DIRECTION,
      nextDirection: GAME.INITIAL_DIRECTION,
      gameState: 'NotStarted',
      points: 0,
      highScore: 0,
    }),
    commands: [GenerateApplePosition({ snake })],
  }
})

export const update = ApplicationComposition.makeUpdate({
  PressedKey: (model, { key }) =>
    Match.value(key).pipe(
      Match.whenOr(
        'ArrowUp',
        'ArrowDown',
        'ArrowLeft',
        'ArrowRight',
        'w',
        'a',
        's',
        'd',
        moveKey => {
          const nextDirection = Match.value(moveKey).pipe(
            Match.withReturnType<typeof Direction.Direction.Type>(),
            Match.whenOr('ArrowUp', 'w', () => 'Up'),
            Match.whenOr('ArrowDown', 's', () => 'Down'),
            Match.whenOr('ArrowLeft', 'a', () => 'Left'),
            Match.whenOr('ArrowRight', 'd', () => 'Right'),
            Match.exhaustive,
          )

          if (model.gameState === 'Playing') {
            return {
              model: modifyFields(model, {
                nextDirection: () => nextDirection,
              }),
            }
          } else {
            return { model }
          }
        },
      ),
      Match.when(' ', () => {
        const nextGameState = Match.value(model.gameState).pipe(
          Match.withReturnType<typeof GameState.Type>(),
          Match.when('NotStarted', () => 'Playing'),
          Match.when('Playing', () => 'Paused'),
          Match.when('Paused', () => 'Playing'),
          Match.when('GameOver', () => 'GameOver'),
          Match.exhaustive,
        )
        return {
          model: modifyFields(model, {
            gameState: () => nextGameState,
          }),
        }
      }),
      Match.when('r', () => {
        const nextSnake = Snake.create(GAME.INITIAL_POSITION)

        return {
          model: modifyFields(model, {
            snake: () => nextSnake,
            direction: () => GAME.INITIAL_DIRECTION,
            nextDirection: () => GAME.INITIAL_DIRECTION,
            gameState: () => 'NotStarted',
            points: () => 0,
          }),
          commands: [GenerateApplePosition({ snake: nextSnake })],
        }
      }),
      Match.orElse(() => ({ model })),
    ),

  TickedClock: model => {
    if (model.gameState !== 'Playing') {
      return { model }
    }

    const currentDirection = Direction.isOpposite(
      model.direction,
      model.nextDirection,
    )
      ? model.direction
      : model.nextDirection

    const newHead = Position.move(
      Array.headNonEmpty(model.snake),
      currentDirection,
    )
    const willEatApple = Position.equivalence(newHead, model.apple)

    const nextSnake = willEatApple
      ? Snake.grow(model.snake, currentDirection)
      : Snake.move(model.snake, currentDirection)

    if (Snake.hasCollision(nextSnake)) {
      return {
        model: modifyFields(model, {
          gameState: () => 'GameOver',
          highScore: highScore => Math.max(model.points, highScore),
        }),
      }
    }

    const nextModel = modifyFields(model, {
      snake: () => nextSnake,
      direction: () => currentDirection,
      points: points =>
        willEatApple ? points + GAME.POINTS_PER_APPLE : points,
    })

    if (willEatApple) {
      return {
        model: nextModel,
        commands: [GenerateApplePosition({ snake: nextSnake })],
      }
    } else {
      return { model: nextModel }
    }
  },

  PausedGame: ApplicationDefinition.makeFieldsStep(() => ({
    gameState: gameState => (gameState === 'Playing' ? 'Paused' : 'Playing'),
  })),

  RestartedGame: model => {
    const startPosition: typeof Position.Position.Type = { x: 10, y: 10 }
    const nextSnake = Snake.create(startPosition)

    return {
      model: modifyFields(model, {
        snake: () => nextSnake,
        direction: () => 'Right',
        nextDirection: () => 'Right',
        gameState: () => 'NotStarted',
        points: () => 0,
      }),
      commands: [GenerateApplePosition({ snake: nextSnake })],
    }
  },

  CompletedGenerateApplePosition:
    ApplicationDefinition.makeFieldsStep.fromMessage(({ position }) => ({
      apple: () => position,
    })),
})

export const GenerateApplePosition = ApplicationDefinition.makeCommand(
  'GenerateApplePosition',
  {
    args: { snake: Snake.Snake },
    messages: [Message.CompletedGenerateApplePosition],
    handler: function* () {
      return ({ snake }) =>
        Apple.generatePosition(snake).pipe(
          Effect.map(position =>
            Message.CompletedGenerateApplePosition({ position }),
          ),
        )
    },
  },
)

export const subscriptions = ApplicationDefinition.makeSubscriptions(entry => ({
  gameClockTicks: entry(
    'GameClockTicks',
    {
      isPlaying: Schema.Boolean,
      interval: Schema.Number,
    },
    {
      messages: [Message.TickedClock],
      modelToDependencies: model => ({
        isPlaying: model.gameState === 'Playing',
        interval: Math.max(
          GAME_SPEED.MIN_INTERVAL,
          GAME_SPEED.BASE_INTERVAL - model.points,
        ),
      }),
      handler: function* () {
        return ({ isPlaying, interval }) =>
          Stream.when(
            Stream.tick(Duration.millis(interval)).pipe(
              Stream.drop(1),
              Stream.map(Message.TickedClock),
            ),
            Effect.sync(() => isPlaying),
          )
      },
    },
  ),

  keyboardPresses: entry('KeyboardPresses', {
    messages: [Message.PressedKey],
    handler: function* () {
      return () =>
        Dom.streamFromEventFilterMapPreventDefault({
          target: document,
          type: 'keydown',
          filterMapEvent: keyboardEvent =>
            Option.some(Message.PressedKey({ key: keyboardEvent.key })),
        })
    },
  }),
}))

export const EffectsLayer = Layer.mergeAll(
  GenerateApplePosition.layer,
  subscriptions.layer,
)

const cellClass = (x: number, y: number, model: typeof Model.Type): string => {
  const isSnakeHead = Position.equivalence(
    { x, y },
    Array.headNonEmpty(model.snake),
  )
  const isSnakeTail = pipe(
    model.snake,
    Array.tailNonEmpty,
    Array.some(segment => Position.equivalence({ x, y }, segment)),
  )
  const isApple = Position.equivalence({ x, y }, model.apple)

  return Match.value({ isSnakeHead, isSnakeTail, isApple }).pipe(
    Match.when({ isSnakeHead: true }, () => 'bg-green-700'),
    Match.when({ isSnakeTail: true }, () => 'bg-green-500'),
    Match.when({ isApple: true }, () => 'bg-red-500'),
    Match.orElse(() => 'bg-gray-800'),
  )
}

const gridView = (model: typeof Model.Type, h: ApplicationViewBuilder): Html =>
  h.div(
    [h.Class('inline-block border-2 border-gray-600')],
    Array.makeBy(GAME.GRID_SIZE, y =>
      h.div(
        [h.Class('flex')],
        Array.makeBy(GAME.GRID_SIZE, x =>
          h.div([h.Class(`w-6 h-6 ${cellClass(x, y, model)}`)]),
        ),
      ),
    ),
  )

const gameStateView = (gameState: typeof GameState.Type): string =>
  Match.value(gameState).pipe(
    Match.when('NotStarted', () => 'Press SPACE to start'),
    Match.when('Playing', () => 'Playing - SPACE to pause'),
    Match.when('Paused', () => 'Paused - SPACE to continue'),
    Match.when('GameOver', () => 'Game Over - Press R to restart'),
    Match.exhaustive,
  )

const instructionsView = (h: ApplicationViewBuilder): Html =>
  h.div(
    [h.Class('mt-4 text-sm text-gray-400')],
    [
      h.p([], ['Use ARROW KEYS or WASD to move']),
      h.p([], ['SPACE to pause/start']),
      h.p([], ['R to restart']),
    ],
  )

export const view = ApplicationComposition.makeView((model, h) => ({
  title: `Snake | ${model.points} pts`,
  body: h.div(
    [
      h.Class(
        'flex flex-col items-center justify-center min-h-screen bg-black text-white p-8',
      ),
    ],
    [
      h.h1([h.Class('text-4xl font-bold mb-4')], ['Snake Game']),
      h.div(
        [h.Class('flex gap-8 mb-4')],
        [
          h.p([h.Class('text-xl')], [`Score: ${model.points}`]),
          h.p([h.Class('text-xl')], [`High Score: ${model.highScore}`]),
        ],
      ),
      h.p([h.Class('text-lg mb-4')], [gameStateView(model.gameState)]),
      gridView(model, h),
      instructionsView(h),
    ],
  ),
}))

const prepare = () =>
  ApplicationComposition.prepareBlock({
    init,
    update,
    view,
    subscriptions,
    EffectsLayer,
  })
export const ApplicationBlock: Block.FromAssemblyWithView<
  typeof Model,
  typeof prepare
> = Block.assemble(prepare)
