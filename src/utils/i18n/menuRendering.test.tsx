import { expect, test } from 'bun:test'
import React from 'react'
import { PassThrough } from 'node:stream'
import stripAnsi from 'strip-ansi'
import { render } from '../../ink.js'
import { Select } from '../../components/CustomSelect/select.js'
import { Tabs, Tab } from '../../components/design-system/Tabs.js'
import { KeyboardShortcutHint } from '../../components/design-system/KeyboardShortcutHint.js'
import { KeybindingProvider } from '../../keybindings/KeybindingContext.js'

function terminal() {
  const stdout = Object.assign(new PassThrough(), { columns: 120, rows: 40, isTTY: false })
  const stdin = Object.assign(new PassThrough(), { isTTY: true, setRawMode: () => {}, ref: () => {}, unref: () => {} })
  let output = ''
  stdout.on('data', data => { output += data.toString() })
  return { options: { stdout: stdout as unknown as NodeJS.WriteStream, stdin: stdin as unknown as NodeJS.ReadStream,
    stderr: stdout as unknown as NodeJS.WriteStream, patchConsole: false, exitOnCtrlC: false },
    text: () => stripAnsi(output) }
}

async function until(predicate: () => boolean) {
  for (let n = 0; n < 50; n++) {
    if (predicate()) return
    await new Promise(resolve => setTimeout(resolve, 20))
  }
  expect(predicate()).toBe(true)
}

test('terminal menus display Chinese and submit the original selected model ID', async () => {
  const term = terminal()
  const registry = { current: new Map<string, Set<{ handler: () => void }>>() }
  let selected: unknown
  const instance = await render(<KeybindingProvider bindings={[]} pendingChordRef={{ current: null }} pendingChord={null}
    setPendingChord={() => {}} activeContexts={new Set(['Select'])} registerActiveContext={() => {}}
    unregisterActiveContext={() => {}} handlerRegistryRef={registry}>
    <Select options={[
      { value: 'cn:balanced-model', label: 'cn:balanced-model', description: 'Default view' },
      { value: 'cn:fast-model', label: 'cn:fast-model', description: 'No results' },
    ]} defaultValue="cn:balanced-model" onChange={value => { selected = value }} />
    <KeyboardShortcutHint shortcut="Enter" action="confirm" />
  </KeybindingProvider>, term.options)
  try {
    await until(() => term.text().includes('默认视图') && registry.current.has('select:next'))
    expect(term.text()).toContain('cn:balanced-model')
    expect(term.text()).toContain('cn:fast-model')
    expect(term.text()).toContain('没有结果')
    expect(term.text()).toContain('Enter 确认')
    registry.current.get('select:next')!.values().next().value!.handler()
    await new Promise(resolve => setTimeout(resolve, 40))
    registry.current.get('select:accept')!.values().next().value!.handler()
    expect(selected).toBe('cn:fast-model')
  } finally { instance.unmount(); instance.cleanup() }
})

test('Chinese tab titles retain English IDs used to select their content', async () => {
  const term = terminal()
  const instance = await render(<Tabs selectedTab="Config" disableNavigation>
    <Tab title="Status"><KeyboardShortcutHint shortcut="Esc" action="cancel" /></Tab>
    <Tab title="Config"><KeyboardShortcutHint shortcut="Enter" action="confirm" /></Tab>
  </Tabs>, term.options)
  try {
    await until(() => term.text().includes('Enter 确认'))
    expect(term.text()).toContain('状态')
    expect(term.text()).toContain('配置')
    expect(term.text()).not.toContain('Esc 取消')
    expect(term.text()).not.toContain('Status')
  } finally { instance.unmount(); instance.cleanup() }
})
