import { Server } from 'foldkit/experimental'

const renderedHeaders = new Headers({ 'x-rendered': 'yes', vary: 'cookie' })
renderedHeaders.append('set-cookie', 'first=1; Path=/')
renderedHeaders.append('set-cookie', 'second=2; Path=/')

export const renderPage = async (
  request: Request,
): Promise<Server.EntryResult> => {
  const url = new URL(request.url)

  if (request.method === 'OPTIONS') {
    return Server.Responded(
      new Response(null, {
        status: 204,
        headers: {
          allow: Server.HOST_METHOD_ANSWERS.allow,
          'x-preflight': url.pathname,
        },
      }),
    )
  }

  if (url.pathname === '/echo') {
    return Server.Responded(
      new Response(`${request.method}:${await request.text()}`, {
        status: 202,
        headers: { 'x-response': 'echo' },
      }),
    )
  }

  if (url.pathname === '/entry-cors') {
    return Server.Responded(
      new Response('entry cors', {
        status: 200,
        headers: {
          'access-control-allow-credentials': 'true',
          'access-control-allow-origin': 'https://entry.example',
          vary: 'Origin',
          'x-cors-owner': 'entry',
        },
      }),
    )
  }

  if (
    url.pathname === '/request-info' ||
    url.pathname === '/app/request-info'
  ) {
    return Server.Responded(
      new Response(request.url, {
        status: 200,
        headers: { 'content-type': 'text/plain' },
      }),
    )
  }

  if (url.pathname === '/redirect') {
    return Server.Responded(
      Response.redirect(new URL('/rendered', request.url), 307),
    )
  }

  return Server.Rendered(
    {
      html: `<main data-foldkit-app="app" data-foldkit-build="${import.meta.env.FOLDKIT_BUILD_ID}">${url.pathname}</main>`,
      title: 'Rendered fixture',
    },
    { status: 203, headers: renderedHeaders },
  )
}
