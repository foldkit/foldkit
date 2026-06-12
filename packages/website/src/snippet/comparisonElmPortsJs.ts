// The JavaScript side, in index.html. This code is invisible to the
// Elm compiler. If it throws, drifts out of sync with the encoder, or
// forgets to call send(), Elm cannot know.

app.ports.saveCanvas.subscribe(function (data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch (error) {
    // Silently fail on storage errors
  }
})

app.ports.requestExportPng.subscribe(function (request) {
  try {
    var canvas = document.createElement('canvas')
    var context = canvas.getContext('2d')
    if (context === null) {
      throw new Error('Canvas 2D context not available')
    }
    // ... paint request.pixels onto the canvas, then download ...
    link.click()
  } catch (error) {
    app.ports.exportPngFailed.send(
      error instanceof Error ? error.message : 'Failed to export image',
    )
  }
})
