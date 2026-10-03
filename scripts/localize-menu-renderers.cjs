const fs = require('node:fs')
const path = require('node:path')
const ts = require('../desktop/node_modules/typescript/lib/typescript.js')
function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(dir, entry.name)
    return entry.isDirectory() ? walk(file) : file.endsWith('.tsx') && !file.includes('.test.') ? [file] : []
  })
}
let modified = 0
for (const file of [...walk('src/components'), ...walk('src/commands'), ...walk('src/screens')]) {
  if (file.includes('design-system') && !/Tabs|KeyboardShortcutHint|FuzzyPicker|Dialog|ListItem/.test(file)) continue
  if (/MenuText|ThemedText/.test(file)) continue
  const source = fs.readFileSync(file, 'utf8')
  const isMenu = /(?:Menu|Picker|Dialog|Selector|Wizard|Settings|[\\/]hooks[\\/]|[\\/]permissions[\\/]|[\\/]plugin[\\/]|[\\/]scheduled-tasks[\\/]|[\\/]agents[\\/]|[\\/]CustomSelect[\\/]|[\\/]onboarding[\\/]|[\\/]Help)/.test(file)
    || /CustomSelect|FuzzyPicker|TreeSelect|<Select\b|<Dialog\b|<Pane\b/.test(source)
  if (!isMenu) continue
  const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const edits = []
  let usesMenuText = false
  for (const statement of tree.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) continue
    const module = statement.moduleSpecifier.text
    const clause = statement.importClause
    if (/(?:^|\/)ink\.js$/.test(module) && clause?.namedBindings && ts.isNamedImports(clause.namedBindings)) {
      const imports = clause.namedBindings.elements
      if (!imports.some(item => item.name.text === 'Text')) continue
      const remaining = imports.filter(item => item.name.text !== 'Text')
      const importText = remaining.length ? 'import { ' + remaining.map(item => item.getText(tree)).join(', ') + ' } from ' + JSON.stringify(module) + ';' : ''
      edits.push({ start: statement.getStart(tree), end: statement.end, text: importText })
      usesMenuText = true
    } else if (module.endsWith('/ink/components/Text.js') && clause?.name?.text === 'Text') {
      edits.push({ start: statement.moduleSpecifier.getStart(tree), end: statement.moduleSpecifier.end, text: JSON.stringify('src/components/design-system/MenuText.js') })
    }
  }
  if (!edits.length) continue
  let updated = source
  for (const edit of edits.sort((a, b) => b.start - a.start)) updated = updated.slice(0, edit.start) + edit.text + updated.slice(edit.end)
  if (usesMenuText) updated = "import { MenuText as Text } from 'src/components/design-system/MenuText.js'\n" + updated
  const parsed = ts.createSourceFile(file, updated, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  if (parsed.parseDiagnostics.length) throw new Error(`Syntax error in ${file}`)
  fs.writeFileSync(file, updated)
  modified++
}
console.log(JSON.stringify({ menuRenderers: modified }))
