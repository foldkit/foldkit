// @vitest-environment node
import { Cause, Context, Deferred, Effect, Exit, Fiber, Schema } from 'effect'
import type { Scope } from 'effect'
import { expect } from 'vitest'

import { describe, it } from '@effect/vitest'

import * as Block from '../../block/public.js'
import { Url } from '../../url/index.js'
import * as Server from './public.js'

const Flags = Schema.Struct({ language: Schema.String })
type Flags = typeof Flags.Type

const Model = Schema.Struct({
  content: Schema.String,
  language: Schema.String,
  pathname: Schema.String,
})
type Model = typeof Model.Type

class Request extends Context.Service<
  Request,
  Readonly<{
    content: string
    construction: Effect.Effect<void, Error, Scope.Scope>
  }>
>()('ServerLayerIsolation/Request') {}

const RequestKey = Symbol('ServerLayerIsolation')
const RequestBlock = Block.make('Request', {
  key: RequestKey,
  Model,
  Message: Schema.Never,
  isMessageFree: true,
  InitArgs: Schema.Tuple([Flags, Url]),
  view: { kind: 'Document' },
})
const RequestComposition = RequestBlock.makeComposition()
const view = RequestComposition.makeView((model, h) => ({
  title: model.content,
  body: h.main([], [`${model.content}:${model.language}:${model.pathname}`]),
}))

const makeLayer = (requestView = view) =>
  RequestBlock.makeLayer(
    Effect.gen(function* () {
      const request = yield* Request
      yield* request.construction

      const init = RequestComposition.makeInit((flags, url) => ({
        model: Model.make({
          content: request.content,
          language: flags.language,
          pathname: url.pathname,
        }),
      }))

      return {
        children: [],
        init,
        update: RequestComposition.makeUpdate({}),
        view: requestView,
      }
    }),
  )

const makeRequest = (content: string) =>
  Effect.gen(function* () {
    const started = yield* Deferred.make<void>()
    const continueConstruction = yield* Deferred.make<void>()
    const events: Array<string> = []
    const construction = Effect.gen(function* () {
      yield* Effect.acquireRelease(
        Effect.sync(() => {
          events.push('acquired')
        }),
        () =>
          Effect.sync(() => {
            events.push('released')
          }),
      )
      yield* Deferred.succeed(started, undefined)
      yield* Deferred.await(continueConstruction)
    })

    return {
      service: Request.of({ content, construction }),
      started,
      continueConstruction,
      events,
    }
  })

describe('Server Layer request isolation', () => {
  it.live(
    'isolates overlapping request Services, Flags and URLs with the same Block and Layer',
    () =>
      Effect.scoped(
        Effect.gen(function* () {
          const layer = makeLayer()
          const first = yield* makeRequest('first')
          const second = yield* makeRequest('second')
          const firstFiber = yield* Server.renderToString(
            { block: RequestBlock, layer },
            { Flags, routing: {} },
            {
              flags: { language: 'en' },
              url: 'https://example.com/first',
              isHydratable: false,
            },
          ).pipe(
            Effect.provideService(Request, first.service),
            Effect.forkScoped,
          )

          yield* Deferred.await(first.started)

          const secondFiber = yield* Server.renderToString(
            { block: RequestBlock, layer },
            { Flags, routing: {} },
            {
              flags: { language: 'fr' },
              url: 'https://example.com/second',
              isHydratable: false,
            },
          ).pipe(
            Effect.provideService(Request, second.service),
            Effect.forkScoped,
          )

          yield* Deferred.await(second.started)
          expect([...first.events]).toEqual(['acquired'])
          expect([...second.events]).toEqual(['acquired'])

          yield* Deferred.succeed(second.continueConstruction, undefined)
          const secondDocument = yield* Fiber.join(secondFiber)

          expect(secondDocument.title).toBe('second')
          expect(secondDocument.html).toContain(
            '<main>second:fr:/second</main>',
          )
          expect(secondDocument.html).not.toContain('first')
          expect([...second.events]).toEqual(['acquired', 'released'])
          expect([...first.events]).toEqual(['acquired'])

          yield* Deferred.succeed(first.continueConstruction, undefined)
          const firstDocument = yield* Fiber.join(firstFiber)

          expect(firstDocument.title).toBe('first')
          expect(firstDocument.html).toContain('<main>first:en:/first</main>')
          expect(firstDocument.html).not.toContain('second')
          expect([...first.events]).toEqual(['acquired', 'released'])
          expect([...second.events]).toEqual(['acquired', 'released'])
        }).pipe(Effect.timeout('2 seconds')),
      ),
  )

  it.live(
    'reexecutes the same render Effect with fresh request construction and cleanup',
    () =>
      Effect.scoped(
        Effect.gen(function* () {
          const layer = makeLayer()
          const render = Server.renderToString(
            { block: RequestBlock, layer },
            { Flags, routing: {} },
            {
              flags: { language: 'en' },
              url: 'https://example.com/reused',
              isHydratable: false,
            },
          )
          const first = yield* makeRequest('first')
          const second = yield* makeRequest('second')

          yield* Deferred.succeed(first.continueConstruction, undefined)
          const firstDocument = yield* render.pipe(
            Effect.provideService(Request, first.service),
          )

          expect(firstDocument.title).toBe('first')
          expect(firstDocument.html).toContain('<main>first:en:/reused</main>')
          expect([...first.events]).toEqual(['acquired', 'released'])

          yield* Deferred.succeed(second.continueConstruction, undefined)
          const secondDocument = yield* render.pipe(
            Effect.provideService(Request, second.service),
          )

          expect(secondDocument.title).toBe('second')
          expect(secondDocument.html).toContain(
            '<main>second:en:/reused</main>',
          )
          expect([...second.events]).toEqual(['acquired', 'released'])
          expect([...first.events]).toEqual(['acquired', 'released'])
        }).pipe(Effect.timeout('2 seconds')),
      ),
  )

  it.live(
    'releases resources after a constructor error and permits another request',
    () =>
      Effect.scoped(
        Effect.gen(function* () {
          const layer = makeLayer()
          const render = Server.renderToString(
            { block: RequestBlock, layer },
            { Flags, routing: {} },
            {
              flags: { language: 'en' },
              url: 'https://example.com/constructor',
              isHydratable: false,
            },
          )
          const failed = yield* makeRequest('failed')
          const failure = new Error('Request construction failed')

          yield* Deferred.succeed(failed.continueConstruction, undefined)
          const exit = yield* render.pipe(
            Effect.provideService(Request, {
              ...failed.service,
              construction: failed.service.construction.pipe(
                Effect.andThen(Effect.fail(failure)),
              ),
            }),
            Effect.exit,
          )

          expect(exit).toEqual(Exit.fail(failure))
          expect([...failed.events]).toEqual(['acquired', 'released'])

          const recovery = yield* makeRequest('recovery')
          yield* Deferred.succeed(recovery.continueConstruction, undefined)
          const document = yield* render.pipe(
            Effect.provideService(Request, recovery.service),
          )

          expect(document.title).toBe('recovery')
          expect(document.html).toContain(
            '<main>recovery:en:/constructor</main>',
          )
          expect([...recovery.events]).toEqual(['acquired', 'released'])
          expect([...failed.events]).toEqual(['acquired', 'released'])
        }).pipe(Effect.timeout('2 seconds')),
      ),
  )

  it.live(
    'releases resources after a view defect and permits another request',
    () =>
      Effect.scoped(
        Effect.gen(function* () {
          const defect = new Error('Request view failed')
          const layer = makeLayer(
            RequestComposition.makeView((model, h) => {
              if (model.content === 'failed') {
                throw defect
              }

              return {
                title: model.content,
                body: h.main([], [model.content]),
              }
            }),
          )
          const render = Server.renderToString(
            { block: RequestBlock, layer },
            { Flags, routing: {} },
            {
              flags: { language: 'en' },
              url: 'https://example.com/view',
              isHydratable: false,
            },
          )
          const failed = yield* makeRequest('failed')

          yield* Deferred.succeed(failed.continueConstruction, undefined)
          const exit = yield* render.pipe(
            Effect.provideService(Request, failed.service),
            Effect.exit,
          )

          expect(exit).toEqual(Exit.die(defect))
          expect([...failed.events]).toEqual(['acquired', 'released'])

          const recovery = yield* makeRequest('recovery')
          yield* Deferred.succeed(recovery.continueConstruction, undefined)
          const document = yield* render.pipe(
            Effect.provideService(Request, recovery.service),
          )

          expect(document.title).toBe('recovery')
          expect(document.html).toContain('<main>recovery</main>')
          expect([...recovery.events]).toEqual(['acquired', 'released'])
          expect([...failed.events]).toEqual(['acquired', 'released'])
        }).pipe(Effect.timeout('2 seconds')),
      ),
  )

  it.live(
    'interrupts construction without releasing a live sibling and permits another request',
    () =>
      Effect.scoped(
        Effect.gen(function* () {
          const layer = makeLayer()
          const render = Server.renderToString(
            { block: RequestBlock, layer },
            { Flags, routing: {} },
            {
              flags: { language: 'en' },
              url: 'https://example.com/interrupted',
              isHydratable: false,
            },
          )
          const interrupted = yield* makeRequest('interrupted')
          const sibling = yield* makeRequest('sibling')
          const interruptedFiber = yield* render.pipe(
            Effect.provideService(Request, interrupted.service),
            Effect.forkScoped,
          )

          yield* Deferred.await(interrupted.started)

          const siblingFiber = yield* render.pipe(
            Effect.provideService(Request, sibling.service),
            Effect.forkScoped,
          )

          yield* Deferred.await(sibling.started)
          expect([...interrupted.events]).toEqual(['acquired'])
          expect([...sibling.events]).toEqual(['acquired'])

          yield* Fiber.interrupt(interruptedFiber)
          const interruptedExit = yield* Fiber.await(interruptedFiber)

          expect(Exit.isFailure(interruptedExit)).toBe(true)
          if (Exit.isFailure(interruptedExit)) {
            expect(Cause.hasInterrupts(interruptedExit.cause)).toBe(true)
          }
          expect([...interrupted.events]).toEqual(['acquired', 'released'])
          expect([...sibling.events]).toEqual(['acquired'])

          yield* Deferred.succeed(sibling.continueConstruction, undefined)
          const siblingDocument = yield* Fiber.join(siblingFiber)

          expect(siblingDocument.title).toBe('sibling')
          expect(siblingDocument.html).toContain(
            '<main>sibling:en:/interrupted</main>',
          )
          expect([...sibling.events]).toEqual(['acquired', 'released'])
          expect([...interrupted.events]).toEqual(['acquired', 'released'])

          const recovery = yield* makeRequest('recovery')
          yield* Deferred.succeed(recovery.continueConstruction, undefined)
          const recoveryDocument = yield* render.pipe(
            Effect.provideService(Request, recovery.service),
          )

          expect(recoveryDocument.title).toBe('recovery')
          expect(recoveryDocument.html).toContain(
            '<main>recovery:en:/interrupted</main>',
          )
          expect([...recovery.events]).toEqual(['acquired', 'released'])
          expect([...interrupted.events]).toEqual(['acquired', 'released'])
          expect([...sibling.events]).toEqual(['acquired', 'released'])
        }).pipe(Effect.timeout('2 seconds')),
      ),
  )
})
