"""Generate the ImplementBlock interface from the original AssembleBlock text.

Every signature keeps its type parameters and its parameter type verbatim, except
that ValidateAssembleBlockComposition<O, M, Msg, Out, Mounts, Children, Impl> is
replaced by ValidateAssembleBlockOperations<...same arguments...>. The return type R
becomes ImplementedBlock<R, Impl, () => ValidateAssembleBlockGraph<O, Mounts, Children, Impl>>.
"""
import sys


def balanced(text, start, open_char='<', close_char='>'):
    """Return index just past the bracket that closes text[start] == open_char."""
    depth = 0
    i = start
    while i < len(text):
        c = text[i]
        if c == open_char:
            depth += 1
        elif c == close_char:
            depth -= 1
            if depth == 0:
                return i + 1
        elif c == '=' and text[i + 1] == '>' and open_char == '<':
            i += 2
            continue
        i += 1
    raise ValueError('unbalanced')


def split_top(text):
    parts, depth, cur = [], 0, []
    i = 0
    while i < len(text):
        c = text[i]
        if c == '=' and i + 1 < len(text) and text[i + 1] == '>':
            cur.append('=>')
            i += 2
            continue
        if c in '<([{':
            depth += 1
        elif c in '>)]}':
            depth -= 1
        if c == ',' and depth == 0:
            parts.append(''.join(cur).strip())
            cur = []
        else:
            cur.append(c)
        i += 1
    if ''.join(cur).strip():
        parts.append(''.join(cur).strip())
    return parts


def main():
    source = open(sys.argv[1]).read()
    head = 'export interface AssembleBlock<'
    start = source.index(head)
    body_open = source.index('> {\n', start) + 3
    end = source.index('\n}\n', body_open)
    params_text = source[start + len('export interface AssembleBlock'):body_open - 3]
    body = source[body_open + 1:end]

    # Split the body into call signatures: each begins at a line '  <' and ends at
    # the line that closes its return type at indentation two.
    signatures = []
    lines = body.split('\n')
    current = []
    for line in lines:
        if line.startswith('  <') and current:
            signatures.append('\n'.join(current))
            current = []
        current.append(line)
    if current:
        signatures.append('\n'.join(current))

    out = []
    for signature in signatures:
        ret_index = signature.rindex('\n  ): ')
        param_part = signature[:ret_index]
        ret_type = signature[ret_index + len('\n  ): '):].strip()
        marker = 'ValidateAssembleBlockComposition<'
        if marker in param_part:
            m = param_part.index(marker)
            args_open = m + len(marker) - 1
            args_close = balanced(param_part, args_open)
            args = split_top(param_part[args_open + 1:args_close - 1])
            assert len(args) == 7, args
            owner, _model, _message, _out, mounts, children, implementation = args
            assert param_part.count(marker) == 1
            param_part = param_part.replace(marker, 'ValidateAssembleBlockOperations<', 1)
            graph = 'ValidateAssembleBlockGraph<%s, %s, %s, %s>' % (owner, mounts, children, implementation)
            new_ret = 'ImplementedBlock<\n    %s,\n    %s,\n    () => %s\n  >' % (ret_type, implementation, graph)
        else:
            # The erased-implementation signature returns never and has no graph check.
            assert ret_type == 'never', ret_type
            type_param = param_part.split('const ', 1)[1].split(' ', 1)[0]
            new_ret = 'ImplementedBlock<never, %s, () => unknown>' % type_param
        out.append(param_part + '\n  ): ' + new_ret)

    interface = 'export interface ImplementBlock' + params_text + '> {\n' + '\n'.join(out) + '\n}'
    print(interface)


if __name__ == '__main__':
    main()
