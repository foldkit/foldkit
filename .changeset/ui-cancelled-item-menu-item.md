---
'@foldkit/ui': minor
---

DragAndDrop's `Cancelled` OutMessage carries the dragged `itemId`. Menu adds a `RequestedSelectItem` Message whose `item` has the Menu's Item type, so a parent can select an item by sending it to the instance. `Slider.make(getTrackRoot)` replaces `Slider.subscriptionsForRoot`: it returns a Slider class, typed as `Slider.SliderClass` and declared with its implementation so the class is its own Layer, whose drag Subscriptions find the track through the given document or Shadow DOM root.
