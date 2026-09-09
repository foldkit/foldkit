/// <reference path="../../../examples/ssr/src/vite-env.d.ts" />
import { Server } from 'foldkit/experimental'

import { renderPage as renderExamplePage } from '../../../examples/ssr/src/entry.server'

const ECHO_PATH = '/echo'
const ENTRY_CORS_PATH = '/entry-cors'
const OPTIONS_OWNER_HEADER = 'x-host-parity-options'

const markOptionsResponse = (
  result: Server.EntryResult,
): Server.EntryResult => {
  if (result._tag !== 'Responded') {
    throw new Error('the public SSR entry did not answer OPTIONS directly')
  }
  const headers = new Headers(result.response.headers)
  headers.set(OPTIONS_OWNER_HEADER, 'entry')
  return Server.Responded(
    new Response(result.response.body, {
      status: result.response.status,
      statusText: result.response.statusText,
      headers,
    }),
  )
}

export const renderPage = async (
  request: Request,
): Promise<Server.EntryResult> => {
  if (request.method === 'OPTIONS') {
    return markOptionsResponse(await renderExamplePage(request))
  }
  const { pathname } = new URL(request.url)
  if (pathname === ECHO_PATH) {
    const body = await request.text()
    return Server.Responded(
      new Response(`${request.method}:${body}`, {
        status: 202,
        headers: { 'x-echo': 'entry' },
      }),
    )
  }
  if (pathname === ENTRY_CORS_PATH) {
    return Server.Responded(
      new Response('entry cors', {
        headers: {
          'access-control-allow-credentials': 'true',
          'access-control-allow-origin': 'https://entry.example',
          vary: 'Origin',
          'x-cors-owner': 'entry',
        },
      }),
    )
  }
  return renderExamplePage(request)
}
