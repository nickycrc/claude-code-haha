const fs = require('node:fs')
const { execFileSync } = require('node:child_process')
const ts = require('../desktop/node_modules/typescript/lib/typescript.js')

const paths = execFileSync('git', ['-c', 'core.autocrlf=false', 'diff', '--name-only', '--', 'src/components', 'src/commands', 'src/screens'], { encoding: 'utf8' }).trim().split(/\r?\n/).filter(Boolean)
const protectedProperties = new Set(['value', 'id', 'key', 'name', 'type', 'action', 'command', 'initialValue', 'defaultValue', 'defaultTab', 'selectedTab'])
function identifiers(file, source) {
  const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, file.endsWith('tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS)
  if (tree.parseDiagnostics.length) throw new Error(`Syntax errors in ${file}`)
  const result = []
  function visit(node) {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      const parent = node.parent
      if (ts.isPropertyAssignment(parent) && protectedProperties.has(parent.name.getText(tree).replace(/['"]/g, '')) ||
        ts.isJsxAttribute(parent) && protectedProperties.has(parent.name.text) && !(parent.name.text === 'action' && parent.parent.parent.tagName.getText(tree) === 'KeyboardShortcutHint') ||
        ts.isBinaryExpression(parent) && [ts.SyntaxKind.EqualsEqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsEqualsToken].includes(parent.operatorToken.kind) ||
        ts.isLiteralTypeNode(parent)) result.push(node.text)
    }
    ts.forEachChild(node, visit)
  }
  visit(tree)
  return result
}
const failures = []
for (const file of paths) {
  const original = execFileSync('git', ['show', `HEAD:${file}`], { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 })
  const before = identifiers(file, original), after = identifiers(file, fs.readFileSync(file, 'utf8'))
  if (JSON.stringify(before) !== JSON.stringify(after)) failures.push({ file, removed: before.filter(x => !after.includes(x)), added: after.filter(x => !before.includes(x)) })
}
if (failures.length) {
  console.error(JSON.stringify(failures, null, 2))
  process.exitCode = 1
} else console.log(`Verified syntax and preserved option values, tab IDs, command names and comparisons in ${paths.length} CLI files`)
