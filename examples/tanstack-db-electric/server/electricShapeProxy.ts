import type { ServerResponse } from 'node:http'
import { pipeline } from 'node:stream/promises'
import type { Connect } from 'vite'

import { ELECTRIC_PROTOCOL_QUERY_PARAMS } from '@electric-sql/client'

import { electricUrl } from './config.ts'

export const proxyItemsShape = async (
  request: Connect.IncomingMessage,
  requestUrl: URL,
  response: ServerResponse,
): Promise<void> => {
  const originUrl = new URL('/v1/shape', electricUrl())
  for (const [name, value] of requestUrl.searchParams) {
    if (ELECTRIC_PROTOCOL_QUERY_PARAMS.includes(name)) {
      originUrl.searchParams.set(name, value)
    }
  }
  originUrl.searchParams.set('table', 'items')

  const abortController = new AbortController()
  const abort = () => abortController.abort()
  request.once('aborted', abort)
  response.once('close', abort)

  try {
    const originResponse = await fetch(originUrl, {
      signal: abortController.signal,
    })
    response.statusCode = originResponse.status
    for (const [name, value] of originResponse.headers) {
      if (name !== 'content-encoding' && name !== 'content-length') {
        response.setHeader(name, value)
      }
    }

    if (originResponse.body === null) {
      response.end()
      return
    }

    response.flushHeaders()
    await pipeline(originResponse.body, response)
  } finally {
    request.off('aborted', abort)
    response.off('close', abort)
  }
}
