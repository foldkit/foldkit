---
'@foldkit/ui': minor
---

Move Dialog and Popover open/close requests, and HoverIntent close requests, to their separate `InMessage` contracts. Bound `requestOpen()` and `requestClose()` calls keep their signatures and exact OutMessage channels. Real clicks, key presses, Command results, and lifecycle facts remain local Messages.

Slider likewise receives range notifications through `InMessage.InformedOfRangeChange`. Rename `SliderBinding.informRangeChanged({ min, max })` to the generated `SliderBinding.informRangeChange({ min, max })`; its payload and silent behavior are unchanged.

Direct component tests use `Story.inMessage(Dialog.InMessage.RequestedOpen())` or `Scene.inMessage(...)` with the component's Block. An acquired component handles those requests through `receive`, while ordinary Message facts still use update. Parent application code should keep using its registered Binding methods.
