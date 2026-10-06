import { readFile, writeFile } from 'node:fs/promises'

const paths = JSON.parse(
  await readFile(new URL('./handler.config.json', import.meta.url), 'utf8'),
)

export default {
  fetch(request) {
    const requestUrl = new URL(request.url)
    const { pathname } = requestUrl

    if (pathname === '/abort-pending') {
      const aborted = new Promise(resolveAbort => {
        request.signal.addEventListener(
          'abort',
          () => {
            void writeFile(paths.abortedPath, 'aborted').then(resolveAbort)
          },
          { once: true },
        )
      })
      return writeFile(paths.abortStartedPath, 'started')
        .then(() => aborted)
        .then(() => new Response('aborted'))
    }
    if (pathname === '/abort-stream') {
      return writeFile(paths.abortStartedPath, 'started').then(
        () =>
          new Response(
            new ReadableStream({
              start(controller) {
                const interval = setInterval(
                  () => controller.enqueue(new Uint8Array([120])),
                  10,
                )
                request.signal.addEventListener(
                  'abort',
                  () => {
                    clearInterval(interval)
                    void writeFile(paths.abortedPath, 'aborted').then(
                      () => undefined,
                    )
                  },
                  { once: true },
                )
              },
            }),
          ),
      )
    }
    if (pathname === '/head-stream') {
      return Promise.resolve(
        new Response(
          new ReadableStream({
            cancel() {
              return writeFile(paths.abortedPath, 'canceled')
            },
          }),
        ),
      )
    }
    if (pathname === '/cancel-stream') {
      return Promise.resolve(
        new Response(
          new ReadableStream({
            start(controller) {
              controller.enqueue(new TextEncoder().encode('STREAM-CHUNK'))
            },
            cancel() {
              return writeFile(paths.canceledPath, 'canceled')
            },
          }),
        ),
      )
    }
    if (pathname === '/cookies') {
      return Promise.resolve(
        new Response('cookies', {
          headers: [
            ['set-cookie', 'sid=app; Path=/app; HttpOnly'],
            ['set-cookie', 'sid=gone; Path=/; Max-Age=0; HttpOnly'],
          ],
        }),
      )
    }
    return Promise.resolve(
      new Response(requestUrl.toString(), {
        headers: { 'set-cookie': 'visitor=foldkit' },
      }),
    )
  },
}
