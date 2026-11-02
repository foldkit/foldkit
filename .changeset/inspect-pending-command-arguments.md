---
'foldkit': minor
---

Add `Story.Command.argsOf(Definition)` and `Scene.Command.argsOf(Definition)`. Each returns a function that reads the captured args of a pending Command created from that Definition, from any Block instance, as `Some(args)`, or `Some(undefined)` for a Definition without args. A pending Command from another Definition returns `None`. The function does not decode args or choose among several matching Commands.
