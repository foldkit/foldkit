for (const path of prerenderPaths) {
  const request = new Request(`https://example.com${path}`)
  const result = await serverEntry.renderPage(request)

  if (result._tag === 'Responded') {
    throw new Error(`Cannot write a Response for ${path} as static HTML`)
  }

  const html = Server.injectIntoTemplate(template, result.application)
  await writeRoute(path, html)
}
