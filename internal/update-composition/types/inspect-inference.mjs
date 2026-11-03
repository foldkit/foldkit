import path from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const directory = path.dirname(fileURLToPath(import.meta.url))
const configFile = ts.readConfigFile(
  path.join(directory, 'tsconfig.json'),
  ts.sys.readFile,
)
const config = ts.parseJsonConfigFileContent(
  configFile.config,
  ts.sys,
  directory,
)
const program = ts.createProgram(config.fileNames, config.options)
const checker = program.getTypeChecker()
const source = program.getSourceFile(path.join(directory, 'graph.ts'))
const visit = node => {
  if (
    ts.isCallExpression(node) &&
    node.expression.getText(source) === 'updates.each'
  ) {
    const signature = checker.getResolvedSignature(node)
    const argument = node.arguments[0]
    const argumentType = checker.getTypeAtLocation(argument)
    const argumentSignature = checker.getSignaturesOfType(
      argumentType,
      ts.SignatureKind.Call,
    )[0]
    const result =
      argumentSignature === undefined
        ? argumentType
        : checker.getReturnTypeOfSignature(argumentSignature)
    const row = {
      line: ts.getLineAndCharacterOfPosition(source, node.pos).line + 1,
      result: checker.typeToString(
        result,
        node,
        ts.TypeFormatFlags.NoTruncation,
      ),
      target:
        signature === undefined
          ? []
          : signature.parameters.map(parameter => ({
              name: parameter.name,
              type: checker.typeToString(
                checker.getTypeOfSymbolAtLocation(parameter, node),
                node,
                ts.TypeFormatFlags.NoTruncation,
              ),
            })),
    }
    process.stdout.write(`${JSON.stringify(row)}\n`)
  }

  ts.forEachChild(node, visit)
}
visit(source)
