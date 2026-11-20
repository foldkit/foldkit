---
'foldkit': patch
---

Make `toMermaid()` in `foldkit/experimental/machine` emit a valid Mermaid state diagram for any state or Message tag. Before, the tags went into the definition as written, so a tag with a space, pipe, colon, semicolon, newline, or `#`, or a state named after a Mermaid keyword such as `Note` or `Default`, broke the diagram or changed how Mermaid read it.

A state tag that is a plain identifier Mermaid cannot mistake for its own syntax is still its own state identifier, so most diagrams do not change. Any other state tag gets a generated identifier that starts with `state_` and shows its tag as the display label. A few plain tags also get one. For example: tags that look like generated identifiers, such as `state_1`, tags that start with an underscore, and tags that start with `TB`, `BT`, `RL`, or `LR` in any case, such as `TBD` or `LRU`. State and Message labels escape every character other than letters and digits as a Mermaid entity code, so Mermaid shows each tag as text instead of reading it as diagram syntax or Markdown.
