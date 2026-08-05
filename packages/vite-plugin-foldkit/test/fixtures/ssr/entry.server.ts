import * as Server from 'foldkit/experimental/server'

const renderedHeaders = new Headers({ 'x-rendered': 'yes' })
renderedHeaders.append('set-cookie', 'first=1; Path=/')
renderedHeaders.append('set-cookie', 'second=2; Path=/')

export const renderPage = async (
  request: Request,
): Promise<Server.ServerEntryResult> => {
  const url = new URL(request.url)

  if (url.pathname === '/echo') {
    return Server.Responded(
      new Response(`${request.method}:${await request.text()}`, {
        status: 202,
        headers: { 'x-response': 'echo' },
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
      html: `<main data-foldkit-app="app">${url.pathname}</main>`,
      title: 'Rendered fixture',
    },
    { status: 203, headers: renderedHeaders },
  )
}
