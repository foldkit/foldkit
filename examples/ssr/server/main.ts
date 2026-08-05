import { Effect, Layer, String as String_ } from 'effect'
import { FileSystem } from 'effect'
import {
  HttpServer,
  HttpServerError,
  HttpServerRequest,
  HttpServerResponse,
  HttpStaticServer,
} from 'effect/unstable/http'
import { toResponse } from 'foldkit/experimental/server'
import { createServer } from 'node:http'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  NodeHttpPlatform,
  NodeHttpServer,
  NodeRuntime,
  NodeServices,
} from '@effect/platform-node'

import { renderPage } from '../src/entry.server'

const EXAMPLE_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const CLIENT_DIR = resolve(EXAMPLE_DIR, 'dist/client')
const PORT = Number(process.env['PORT'] ?? 3000)

const acceptsHtml = (request: HttpServerRequest.HttpServerRequest): boolean =>
  String_.includes('text/html')(request.headers['accept'] ?? '')

const renderRequest = (
  request: HttpServerRequest.HttpServerRequest,
  template: string,
) =>
  Effect.gen(function* () {
    const webRequest = yield* HttpServerRequest.toWeb(request)
    const result = yield* Effect.promise(() => renderPage(webRequest))
    return HttpServerResponse.fromWeb(toResponse(template, result))
  })

const isRouteNotFound = (error: HttpServerError.HttpServerError): boolean =>
  error.reason._tag === 'RouteNotFound'

const makeHandler = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem
  const template = yield* fs.readFileString(resolve(CLIENT_DIR, 'index.html'))
  const staticFiles = yield* HttpStaticServer.make({
    root: CLIENT_DIR,
    index: undefined,
  })

  return HttpServerRequest.HttpServerRequest.use(request => {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return renderRequest(request, template)
    }

    return staticFiles.pipe(
      Effect.catchIf(
        error => isRouteNotFound(error) && acceptsHtml(request),
        () => renderRequest(request, template),
      ),
    )
  })
})

const Main = Layer.unwrap(
  Effect.map(makeHandler, handler => HttpServer.serve(handler)),
).pipe(
  HttpServer.withLogAddress,
  Layer.provide(NodeHttpServer.layer(createServer, { port: PORT })),
  Layer.provide(NodeHttpPlatform.layer),
  Layer.provide(NodeServices.layer),
)

NodeRuntime.runMain(Layer.launch(Main))
