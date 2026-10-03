const fs = require('node:fs')
const ts = require('../desktop/node_modules/typescript/lib/typescript.js')
const { createHash } = require('node:crypto')
const inventory = JSON.parse(fs.readFileSync('.tmp-menu-inventory.json', 'utf8'))
const dictionary = require('../src/utils/i18n/menuText.ts').menuTranslations
const decodeEntities = text => text.replace(/&(middot|apos|quot|lt|gt|amp);/g, (_, name) => ({ middot: '·', apos: "'", quot: '"', lt: '<', gt: '>', amp: '&' })[name])
const changes = new Map()
for (const entry of inventory) {
  const translated = dictionary[entry.text]
  if (!translated) continue
  for (const occurrence of entry.locations) {
    // These fields also serve as internal identifiers; translate at their display boundary.
    if (occurrence.kind === 'review' || ['name', 'action'].includes(occurrence.property) || occurrence.tag === 'Tab' && occurrence.attribute === 'title') continue
    const edits = changes.get(occurrence.file) || []
    edits.push({ ...occurrence, translated: decodeEntities(translated) })
    changes.set(occurrence.file, edits)
  }
}
let replacements = 0
for (const [file, edits] of changes) {
  const source = fs.readFileSync(file, 'utf8')
  if (createHash('sha256').update(source).digest('hex') !== edits[0].sourceHash) {
    throw new Error(`Source changed since audit: ${file}. Run the audit again before applying translations.`)
  }
  const topLevel = edits.filter(edit => !edits.some(other => other !== edit && other.start < edit.start && other.end >= edit.end))
  function replaceRange(start, end) {
    let text = source.slice(start, end)
    const contained = edits.filter(edit => edit.start >= start && edit.end <= end)
      .filter(edit => !edits.some(other => other.start >= start && other.end <= end && other.start < edit.start && other.end >= edit.end))
      .sort((a, b) => b.start - a.start)
    for (const edit of contained) text = text.slice(0, edit.start - start) + replacement(edit) + text.slice(edit.end - start)
    return text
  }
  function replacement(edit) {
    if (edit.nodeType === 'TemplateExpression') {
      const placeholders = [...edit.translated.matchAll(/\{(\d+)\}/g)].map(match => Number(match[1]))
      for (let n = 0; n < edit.expressions.length; n++) {
        if (!placeholders.includes(n)) throw new Error(`Missing interpolation ${n} in ${file}:${edit.line}`)
      }
      let output = '`'
      let last = 0
      for (const match of edit.translated.matchAll(/\{(\d+)\}/g)) {
        output += edit.translated.slice(last, match.index).replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${')
        const expression = edit.expressions[Number(match[1])]
        if (!expression) throw new Error(`Unknown interpolation in ${file}:${edit.line}`)
        output += '${' + replaceRange(expression.start, expression.end) + '}'
        last = match.index + match[0].length
      }
      return output + edit.translated.slice(last).replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${') + '`'
    }
    if (edit.nodeType === 'JsxText') {
      const raw = source.slice(edit.start, edit.end)
      const leading = raw.match(/^\s*/)[0]
      const trailing = raw.match(/\s*$/)[0]
      return leading + '{' + JSON.stringify(edit.translated) + '}' + trailing
    }
    return JSON.stringify(edit.translated)
  }
  let updated = source
  for (const edit of topLevel.sort((a, b) => b.start - a.start)) {
    const value = replacement(edit)
    // A string-valued JSX attribute remains an attribute, rather than a JSX child.
    updated = updated.slice(0, edit.start) + value + updated.slice(edit.end)
    replacements++
  }
  const parsed = ts.createSourceFile(file, updated, ts.ScriptTarget.Latest, true, file.endsWith('tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS)
  if (parsed.parseDiagnostics.length) throw new Error(`Syntax error in localized file: ${file}`)
  fs.writeFileSync(file, updated)
}
console.log(JSON.stringify({ files: changes.size, replacements, translations: Object.keys(dictionary).length }))
