---
'foldkit': patch
---

A stored `Scene.Mount.expectEnded` step acknowledges the same unmount every time it runs. The step spliced the matcher list it closed over, because `Array.fromIterable` returns an existing array unchanged. The first scene consumed that list, and a later scene found the unmount unacknowledged even though the step was still there.

Calling `expectEnded` inline was unaffected, because each call builds a new matcher list. The same stored step can now be passed to as many scenes as you need.

Thanks @artile for the report and the diagnosis.
