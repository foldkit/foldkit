---
'@foldkit/ui': minor
---

Slider now supports vertical layouts and opt-in edge-aligned thumbs. Set `orientation` to `Vertical` to place `min` at the bottom and `max` at the top, update `aria-orientation`, and map pointer movement along the vertical axis. Existing Sliders remain horizontal and center-aligned by default. Set `thumbAlignment` to `Edge` and provide the rendered `thumbSize` to keep the thumb inside the track and align pointer input with its inset travel.
