import { Server } from 'foldkit/experimental'
import { appendFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

// Evaluation observer: importing this module is a privileged act — it runs in
// the build process — so the test asserts on this side effect rather than on
// the bundle existing, which it does whether or not anything imported it. The
// marker lands beside the bundle that was evaluated, so concurrent builds
// observe their own evaluation and nothing shared is mutated.
writeFileSync(
  fileURLToPath(new URL('./evaluation-marker.txt', import.meta.url)),
  'evaluated',
)

export const prerenderPaths = ['/']

export const renderPage = async (
  request: Request,
): Promise<Server.EntryResult> => {
  const url = new URL(request.url)
  // Render observer, beside the bundle like the marker above: the test for the
  // validation boundary asserts an invalid path never produced a line here.
  appendFileSync(
    fileURLToPath(new URL('./render-log.txt', import.meta.url)),
    `${request.url}\n`,
  )
  return Server.Rendered({
    html: `<main data-foldkit-app="app" data-foldkit-build="${import.meta.env.FOLDKIT_BUILD_ID}">${url.pathname}</main>`,
    title: `Fixture ${url.pathname}`,
  })
}
