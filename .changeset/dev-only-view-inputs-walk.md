---
'foldkit': patch
---

Production builds no longer walk `h.submodel` `viewInputs` on every render. That walk looks for functions nested below the top level, and with large `viewInputs`, such as a list of thousands of entries, it took most of each keystroke's render time. Development builds still run the check and still throw when a nested function is found. Production builds no longer throw for a nested function.
