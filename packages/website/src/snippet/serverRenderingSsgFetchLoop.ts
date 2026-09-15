const entry = await import('./dist/server/fetch.js')

for (const path of entry.prerenderPaths) {
  const response = await entry.default.fetch(
    new Request(`https://example.com${path}`),
  )

  if (response.status !== 200) {
    throw new Error(
      `Cannot write a ${response.status} for ${path} as static HTML`,
    )
  }

  await writeRoute(path, await response.text())
}
