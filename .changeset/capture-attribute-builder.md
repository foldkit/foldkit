---
'foldkit': minor
---

Add a named `h.Capture` attribute builder for the `capture` attribute on file
inputs. You can now write `h.Capture('environment')` instead of
`h.Attribute('capture', 'environment')` to hint that mobile browsers should
capture media directly from the camera or microphone rather than opening a
file picker. Pass `'user'` for the user-facing camera or microphone and
`'environment'` for the outward-facing camera.
