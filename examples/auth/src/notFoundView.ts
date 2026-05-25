import { Html, html } from 'foldkit/html'

export const notFoundView = (
  path: string,
  backLinkHref: string,
  backLinkText: string,
): Html => {
  const h = html()

  return h.div(
    [h.Class('max-w-4xl mx-auto px-4 text-center')],
    [
      h.h1(
        [h.Class('text-4xl font-bold text-red-600 mb-6')],
        ['404 - Page Not Found'],
      ),
      h.p(
        [h.Class('text-lg text-gray-600 mb-4')],
        [`The path "${path}" was not found.`],
      ),
      h.a(
        [h.Href(backLinkHref), h.Class('text-blue-500 hover:underline')],
        [backLinkText],
      ),
    ],
  )
}
