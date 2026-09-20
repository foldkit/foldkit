const entry = await import('./dist/server/fetch.js')
const paths = ['/', '/about']

for (const path of paths) {
  const response = await entry.default.fetch(
    new Request(`https://example.com${path}`),
  )

  if (
    response.status !== 200 ||
    !response.headers.get('content-type')?.startsWith('text/html')
  ) {
    throw new Error(`Cannot write the response for ${path} as static HTML`)
  }

  await writeRoute(path, await response.text())
}
