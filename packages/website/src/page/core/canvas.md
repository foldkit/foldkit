# Canvas

## Overview

The `Canvas` module makes 2D canvas rendering declarative. `Canvas.view` returns a `<canvas>` VNode whose dimensions, scene, styling, and pointer Messages come from one config object.

The scene is a `ReadonlyArray<Shape>`. Foldkit clears and repaints the canvas when the VNode is inserted and after every patch, so the pixels contain no hidden application state. The same shapes produce the same pixels, and DevTools time-travel can reproduce an earlier frame by rendering its Model again.

Use Canvas for interfaces whose natural representation is a 2D scene. For example: pixel art, board games, generative art, charts, and data visualization. The [canvas-art example](/example-apps/canvas-art) shows the full update loop with a click-to-spawn bouncing-ball scene.

## Shapes

Canvas has five `Shape` variants: `Rect`, `Circle`, `Path`, `Text`, and `Group`. Each is a Schema-backed constructor.

`Group` applies translation, rotation, scale, or opacity to child shapes. Groups can nest, so transforms compose into a scene graph. `Path` draws a sequence of `MoveTo`, `LineTo`, `QuadTo`, `BezierTo`, and `Close` instructions. Fill, stroke, and line styles stay on the shape that uses them.

## Animation and Input

For continuous animation, pair `Canvas.view` with [`Subscription.animationFrame`](/core/subscriptions#animation-frames). The Subscription emits a Message on each `requestAnimationFrame` tick with the inter-frame delta in milliseconds. The update function advances the Model, view derives the next shapes, and Foldkit batches the resulting patches to one per frame.

`Canvas.view` accepts `onPointerDown`, `onPointerMove`, and `onPointerUp` callbacks. Each receives a `Point` translated into the internal coordinate space set by `width` and `height`, regardless of the canvas's CSS size. Passing the current view builder as the second argument binds the callbacks to that view's Message type.

::Snippet{name="canvasBasic" label="Canvas example"}

## Full API Surface

The [Canvas API reference](/api-reference/canvas) lists every shape constructor, every `PathInstruction` variant, and the full `Canvas.view` config.
