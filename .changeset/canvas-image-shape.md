---
'foldkit': minor
---

Add `Canvas.Image`, a shape that draws a bitmap with one `drawImage` call. Canvas scenes had no way to draw a prepared image, so sprites, icons, tiles, and photos had to be rebuilt from many `Rect` shapes, one per pixel run, or drawn outside the declarative scene.

`Image` takes a `src` string (a path, an imported asset URL, or a data URL) and the `x`, `y`, `width`, and `height` of the box to draw into. The optional `crop` field selects a region of the source in the source's own pixels, for drawing one frame of a sprite sheet. The optional `rendering` field is `'Smooth'` or `'Pixelated'`; `'Pixelated'` turns off image smoothing so scaled-up pixel art keeps hard edges. `Image` nests in `Group` and takes its transforms and opacity like any other shape.

```ts
Canvas.Image({
  src: heroSheetUrl,
  x: 120,
  y: 80,
  width: 64,
  height: 64,
  crop: { x: 32, y: 0, width: 16, height: 16 },
  rendering: 'Pixelated',
})
```

The scene holds only the URL, so it stays serializable and the Model never holds an image element. Foldkit loads each `src` the first time a scene uses it and keeps the decoded image for the life of the page, shared by every canvas. The shape draws nothing until its image has loaded. When the image loads, each canvas that drew it repaints its latest scene, with no Message dispatched. An image that fails to load draws nothing and is not requested again.

Decoded images are never released, so a sprite that leaves the scene draws at once when it returns. Keep the set of `src` values fixed, such as your app's sprite sheets: a view that builds a new data URL on every frame keeps every one of those images in memory.

The Canvas module also exports `ImageCrop` and `ImageRendering`, the Schemas for those two fields. Existing shapes and `Canvas.view` configs are unchanged.
