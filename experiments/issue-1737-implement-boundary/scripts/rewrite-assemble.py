"""Rewrite `X.assembleBlock(args)` calls to `X.implement(args).assembleBlock()`.

Line structure is preserved: the opening and closing replacements stay on their
original lines. Prints a JSON list of rewritten call spans (1-based start and end
lines) per file so diagnostics can be attributed to calls.

Usage: rewrite-assemble.py ROOT [--dry-run] FILE...
"""
import json
import sys

OPEN = '.assembleBlock('


def find_close(text, index):
    """Return the index of the ')' matching the '(' at text[index]."""
    depth = 0
    i = index
    stack = []
    n = len(text)
    while i < n:
        c = text[i]
        if c in '([{':
            stack.append(c)
        elif c in ')]}':
            stack.pop()
            if not stack:
                return i
        elif c in '\'"':
            q = c
            i += 1
            while text[i] != q:
                if text[i] == '\\':
                    i += 1
                i += 1
        elif c == '`':
            i = skip_template(text, i)
        elif text.startswith('//', i):
            i = text.index('\n', i)
            continue
        elif text.startswith('/*', i):
            i = text.index('*/', i) + 1
        i += 1
    raise ValueError('unbalanced call at %d' % index)


def skip_template(text, i):
    """i points at the opening backtick; return index of the closing backtick."""
    i += 1
    while text[i] != '`':
        if text[i] == '\\':
            i += 2
            continue
        if text.startswith('${', i):
            close = find_close(text, i + 1)
            i = close + 1
            continue
        i += 1
    return i


def in_comment_or_string(text, index):
    line_start = text.rfind('\n', 0, index) + 1
    prefix = text[line_start:index]
    stripped = prefix.lstrip()
    return stripped.startswith('//') or stripped.startswith('*') or stripped.startswith('/*')


def rewrite(text):
    spans = []
    out = []
    pos = 0
    search = 0
    while True:
        index = text.find(OPEN, search)
        if index < 0:
            break
        if in_comment_or_string(text, index):
            search = index + len(OPEN)
            continue
        open_paren = index + len(OPEN) - 1
        close = find_close(text, open_paren)
        start_line = text.count('\n', 0, index) + 1
        end_line = text.count('\n', 0, close) + 1
        spans.append({'startLine': start_line, 'endLine': end_line})
        out.append(text[pos:index])
        out.append('.implement(')
        inner = text[open_paren + 1:close]
        # Nested assembleBlock calls inside the arguments are rewritten too.
        inner_rewritten, inner_spans = rewrite(inner)
        base_line = text.count('\n', 0, open_paren + 1)
        for span in inner_spans:
            spans.append({'startLine': span['startLine'] + base_line, 'endLine': span['endLine'] + base_line})
        out.append(inner_rewritten)
        out.append(').assembleBlock()')
        pos = close + 1
        search = close + 1
    out.append(text[pos:])
    return ''.join(out), spans


def main():
    args = sys.argv[1:]
    dry = '--dry-run' in args
    files = [a for a in args if a != '--dry-run']
    report = {}
    for path in files:
        text = open(path).read()
        if OPEN not in text:
            continue
        new_text, spans = rewrite(text)
        assert new_text.count('\n') == text.count('\n'), path
        report[path] = sorted(spans, key=lambda s: (s['startLine'], s['endLine']))
        if not dry:
            open(path, 'w').write(new_text)
    print(json.dumps(report, indent=1))


if __name__ == '__main__':
    main()
