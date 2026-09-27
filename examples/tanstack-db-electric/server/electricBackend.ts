import { ManagedRuntime, Redacted } from 'effect'
import type { ServerResponse } from 'node:http'
import type { Connect, Plugin } from 'vite'

import { PgClient } from '@effect/sql-pg'

import { databaseUrl } from './config.ts'
import { proxyItemsShape } from './electricShapeProxy.ts'
import { writeJson } from './http.ts'
import { handleItemsApiRequest } from './itemsApi.ts'

const makeDatabaseRuntime = () =>
  ManagedRuntime.make(
    PgClient.layer({
      url: Redacted.make(databaseUrl()),
    }),
  )

type DatabaseRuntime = ReturnType<typeof makeDatabaseRuntime>

const handleApiRequest = async (
  runtime: DatabaseRuntime,
  request: Connect.IncomingMessage,
  response: ServerResponse,
): Promise<void> => {
  const requestUrl = new URL(request.url ?? '/', 'http://localhost')

  if (requestUrl.pathname === '/api/items/shape') {
    if (request.method !== 'GET') {
      writeJson(response, 405, { error: 'Method not allowed' })
      return
    }

    await proxyItemsShape(request, requestUrl, response)
    return
  }

  if (requestUrl.pathname === '/api/items') {
    await runtime.runPromise(handleItemsApiRequest(request, response))
    return
  }

  response.statusCode = 404
  response.end()
}

const installMiddleware = (
  middleware: Connect.Server,
  runtime: DatabaseRuntime,
): void => {
  middleware.use((request, response, next) => {
    if (!request.url?.startsWith('/api/items')) {
      next()
      return
    }

    handleApiRequest(runtime, request, response).catch(error => {
      if (response.destroyed) {
        return
      }

      if (response.headersSent) {
        response.destroy()
        return
      }

      console.error(error)
      writeJson(response, 500, { error: 'Something went wrong' })
    })
  })
}

export const electricBackend = (): Plugin => {
  const runtime = makeDatabaseRuntime()

  return {
    name: 'tanstack-db-electric:backend',
    configureServer: server => {
      installMiddleware(server.middlewares, runtime)
      server.httpServer?.once('close', () => {
        void runtime.dispose()
      })
    },
    configurePreviewServer: server => {
      installMiddleware(server.middlewares, runtime)
      server.httpServer.once('close', () => {
        void runtime.dispose()
      })
    },
  }
}
