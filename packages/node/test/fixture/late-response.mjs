const createHandler = () => {
  const started = Promise.withResolvers()
  const aborted = Promise.withResolvers()
  const released = Promise.withResolvers()
  const returned = Promise.withResolvers()
  const canceled = Promise.withResolvers()
  let cancelCount = 0

  return {
    async fetch(request) {
      const { pathname } = new URL(request.url)

      if (pathname === '/started') {
        await started.promise
        return new Response('started')
      }

      if (pathname === '/aborted') {
        await aborted.promise
        return new Response('aborted')
      }

      if (pathname === '/release') {
        released.resolve()
        return new Response('released')
      }

      if (pathname === '/returned') {
        await returned.promise
        return new Response('returned')
      }

      if (pathname === '/canceled') {
        await canceled.promise
        return new Response(String(cancelCount))
      }

      if (pathname === '/health') {
        return new Response('ready')
      }

      request.signal.addEventListener('abort', () => aborted.resolve(), {
        once: true,
      })
      started.resolve()
      await released.promise
      returned.resolve()

      if (pathname === '/reject-handler') {
        throw new Error('late handler rejection')
      }

      if (pathname === '/no-body') {
        return new Response(null, { status: 204 })
      }

      return new Response(
        new ReadableStream({
          cancel() {
            cancelCount += 1
            canceled.resolve()
            if (pathname === '/reject-cancel') {
              return Promise.reject(new Error('late cancellation rejection'))
            }
          },
        }),
      )
    },
  }
}

export default createHandler()
