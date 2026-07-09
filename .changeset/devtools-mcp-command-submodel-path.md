---
'@foldkit/devtools-mcp': patch
---

The `foldkit_get_message` and `foldkit_get_init` tool descriptions now document that each Command carries a `submodelPath`, listing the `Got*Message` wrapper tags from outer to inner that attribute the Command to its destination Submodel (empty for a top-level Command).
