import { Server } from 'foldkit/experimental'

export const prerenderPaths = ['/', '/about']

export const renderPage = async (
  request: Request,
): Promise<Server.EntryResult> => {
  const url = new URL(request.url)

  if (url.pathname === '/redirect') {
    return Server.Responded(
      Response.redirect(new URL('/', request.url).href, 307),
    )
  }

  return Server.Rendered({
    html: `<main data-foldkit-app="app" data-foldkit-build="${import.meta.env.FOLDKIT_BUILD_ID}">${url.pathname}</main>`,
    title: `Fixture ${url.pathname}`,
  })
}
