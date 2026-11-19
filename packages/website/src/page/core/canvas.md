# Canvas

## Overview

### Declarative Scenes

The `Canvas` module makes 2D canvas rendering declarative. `Canvas.view` returns a `<canvas>` VNode whose dimensions, scene, styling, and pointer Messages come from one config object.

The scene is a `ReadonlyArray<Shape>`. Foldkit clears and repaints the canvas when the VNode is inserted and after every patch, so the pixels contain no hidden application state. The same shapes produce the same pixels, and DevTools time-travel can reproduce an earlier frame by rendering its Model again.

### When to Use Canvas

Use Canvas for interfaces whose natural representation is a 2D scene. For example: pixel art, board games, generative art, charts, and data visualization. The [canvas-art example](/example-apps/canvas-art) shows the full update loop with a click-to-spawn bouncing-ball scene.

## Shapes

Canvas has six `Shape` variants: `Rect`, `Circle`, `Path`, `Text`, `Image`, and `Group`. Each is a Schema-backed constructor.

`Group` applies translation, rotation, scale, or opacity to child shapes. Groups can nest, so transforms compose into a scene graph. `Path` draws a sequence of `MoveTo`, `LineTo`, `QuadTo`, `BezierTo`, and `Close` instructions. Fill, stroke, and line styles stay on the shape that uses them.

## Images

`Image` draws a bitmap, such as a sprite, an icon, a map tile, or a photo, with one `drawImage` call. The shape holds the image's URL as a string, not a loaded image element, so the scene stays plain data like every other shape, and a Model that stores a sprite's `src` stays serializable.

`src` takes anything an `<img>` element accepts: a path, an asset URL imported through Vite, or a data URL. `x`, `y`, `width`, and `height` set the box the image fills, and Foldkit stretches the source to fit it. `crop` selects a region of the source, measured in the source's own pixels, so one sprite sheet can hold every frame of an animation. Inside a `Group`, an `Image` takes the Group's translation, rotation, scale, and opacity like any other shape.

`rendering` controls how the source is sampled when it is drawn at a different size. The canvas default, `'Smooth'`, blends neighboring pixels, which blurs pixel art scaled up. Set `rendering: 'Pixelated'` to keep hard pixel edges. `rendering` applies only to drawing the image onto the canvas. If CSS also scales the `<canvas>` element, set `image-rendering: pixelated` on it too.

::Snippet{name="canvasImage" label="Sprite sheet frame drawn as an Image"}

### Image Loading

Foldkit loads each `src` the first time a scene uses it. Until the image has loaded, the `Image` shape draws nothing. When it finishes loading, every canvas that drew the shape repaints its latest scene, so the image appears without a Message or a Model change. An image that fails to load draws nothing, and Foldkit does not request it again.

Decoded images are shared by every canvas and kept for the life of the page, so a sprite that leaves the scene draws immediately when it comes back. Keep the set of `src` values fixed, such as your app's sprite sheets. A view that builds a new data URL on every frame keeps every one of those images in memory.

## Animation and Input

For continuous animation, pair `Canvas.view` with [`Subscription.animationFrameEntry`](/core/subscriptions#animation-frames). While active, the entry emits a Message on each `requestAnimationFrame` tick with the inter-frame delta in milliseconds. The update function advances the Model, view derives the next shapes, and Foldkit batches the resulting patches to one per frame.

`Canvas.view` accepts `onPointerDown`, `onPointerMove`, and `onPointerUp` callbacks. Each receives a `Point` translated into the internal coordinate space set by `width` and `height`, regardless of the canvas's CSS size. Passing the current view builder as the second argument binds the callbacks to that view's Message type.

::Snippet{name="canvasBasic" label="Canvas scene with animation and pointer input"}

## Full API Surface

The [Canvas API reference](/api-reference/canvas) lists every shape constructor, every `PathInstruction` variant, and the full `Canvas.view` config.
