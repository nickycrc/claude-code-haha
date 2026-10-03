const fs = require('node:fs')
const path = require('node:path')
const ts = require('../desktop/node_modules/typescript/lib/typescript.js')
const { createHash } = require('node:crypto')

const roots = ['src/components', 'src/commands', 'src/screens']
const extra = ['src/utils/model/modelOptions.ts', 'src/utils/model/model.ts', 'src/utils/status.tsx', 'src/utils/hooks/hooksConfigManager.ts', 'src/utils/settings/constants.ts']
function files(dir) {
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const target = path.join(dir, entry.name)
    return entry.isDirectory() ? files(target) : /\.tsx?$/.test(target) && !/\.test\./.test(target) ? [target] : []
  })
}
const inventory = new Map()
const displayKeys = new Set(['label', 'description', 'summary', 'title', 'placeholder', 'subtitle', 'headerText', 'emptyMessage', 'selectAction', 'action', 'helpText', 'message', 'text', 'name', 'argumentHint'])
for (const file of [...roots.flatMap(files), ...extra]) {
  const original = fs.readFileSync(file, 'utf8')
  const sourceHash = createHash('sha256').update(original).digest('hex')
  const source = original.replace(/^\/\/# sourceMappingURL=.*$/gm, '')
  const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, file.endsWith('tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS)
  function record(node, value, kind) {
    value = value.replace(/\s+/g, ' ').trim()
    if (/[\u3400-\u9fff]/.test(value) || !/[A-Za-z]{2}/.test(value)) return
    if (!process.argv.includes('--expanded') && /^[-\w./:@+]+$/.test(value) && !/^[A-Z][a-z]/.test(value)) return
    if (value.length > 600 || value.includes('http') && !value.includes(' ')) return
    const key = value
    const entry = inventory.get(key) || { text: key, locations: [] }
    const line = tree.getLineAndCharacterOfPosition(node.getStart(tree)).line + 1
    let attribute, property, tag
    for (let parent = node.parent, n = 0; parent && n < 6; parent = parent.parent, n++) {
      if (ts.isJsxAttribute(parent)) { attribute = parent.name.text; tag = parent.parent.parent.tagName.getText(tree); break }
      if (ts.isPropertyAssignment(parent)) { property = parent.name.getText(tree).replace(/['"]/g, ''); break }
    }
    entry.locations.push({ file: file.replaceAll('\\', '/'), sourceHash, line, kind, start: node.getStart(tree), end: node.end, nodeType: ts.SyntaxKind[node.kind], attribute, property, tag,
      expressions: ts.isTemplateExpression(node) ? node.templateSpans.map(span => ({ start: span.expression.getStart(tree), end: span.expression.end })) : undefined })
    inventory.set(key, entry)
  }
  function visit(node) {
    if (ts.isJsxText(node)) record(node, node.text, 'jsx')
    else if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isTemplateExpression(node)) {
      let current = node.parent
      let display = false
      for (let i = 0; current && i < 5; i++, current = current.parent) {
        if (ts.isJsxExpression(current) && (ts.isJsxElement(current.parent) || ts.isJsxFragment(current.parent))) { display = true; break }
        if (ts.isJsxAttribute(current)) { display = displayKeys.has(current.name.text); break }
        if (ts.isPropertyAssignment(current)) { display = displayKeys.has(current.name.getText(tree).replace(/['"]/g, '')); break }
        if (ts.isCallExpression(current) || ts.isBinaryExpression(current) && [ts.SyntaxKind.EqualsEqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsEqualsToken].includes(current.operatorToken.kind)) break
      }
      if (display || process.argv.includes('--expanded') && !ts.isImportDeclaration(node.parent) && !ts.isLiteralTypeNode(node.parent)) {
        const value = ts.isTemplateExpression(node) ? node.head.text + node.templateSpans.map((span, i) => `{${i}}` + span.literal.text).join('') : node.text
        if (display || /[A-Za-z]{2} [A-Za-z]{2}/.test(value) && value.length < 600 && !value.startsWith('[')) record(node, value, display ? 'literal' : 'review')
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(tree)
}
const entries = [...inventory.values()]
fs.writeFileSync('.tmp-menu-inventory.json', JSON.stringify(entries, null, 2))
console.log(JSON.stringify({ strings: entries.length, occurrences: entries.reduce((n, item) => n + item.locations.length, 0), files: new Set(entries.flatMap(entry => entry.locations.map(item => item.file))).size }))
if (process.argv.includes('--list')) entries.forEach((entry, index) => console.log(`${index}\t${entry.text}`))
