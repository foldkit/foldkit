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

  if (url.pathname === '/live-stream') {
    const cancelReportUrl = url.searchParams.get('cancelReportUrl')
    const isSilent = url.searchParams.has('silent')

    return Server.Responded(
      new Response(
        new ReadableStream({
          start: controller => {
            if (!isSilent) {
              controller.enqueue(new TextEncoder().encode('first\n'))
            }
          },
          cancel: () => {
            if (cancelReportUrl !== null) {
              void fetch(cancelReportUrl, {
                method: 'POST',
                body: 'canceled',
              }).catch(() => undefined)
            }
          },
        }),
        { status: 200, headers: { 'content-type': 'application/x-ndjson' } },
      ),
    )
  }

  if (url.pathname === '/failing-stream') {
    return Server.Responded(
      new Response(
        new ReadableStream({
          start: controller => {
            controller.enqueue(new TextEncoder().encode('first\n'))
          },
          pull: controller => {
            controller.error(new Error('upstream failed'))
          },
        }),
        { status: 200, headers: { 'content-type': 'application/x-ndjson' } },
      ),
    )
  }

  if (url.pathname === '/failing-before-first-chunk') {
    return Server.Responded(
      new Response(
        new ReadableStream({
          pull: controller => {
            controller.error(new Error('failed before first chunk'))
          },
        }),
        { status: 200, headers: { 'content-type': 'application/x-ndjson' } },
      ),
    )
  }

  if (url.pathname === '/empty-stream') {
    return Server.Responded(
      new Response(
        new ReadableStream({
          start: controller => {
            controller.close()
          },
        }),
        { status: 201, headers: { 'x-response': 'empty-stream' } },
      ),
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
