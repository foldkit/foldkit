Server.renderToString(config, {
  url: request.url,
  flags,
  buildId: import.meta.env.FOLDKIT_BUILD_ID,
})
