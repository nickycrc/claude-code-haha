import { expect, test } from 'bun:test'
import React from 'react'
import { translateMenuText } from './menuText.js'
import { localizeMenuOptions } from './menuOptions.js'
import { MenuText } from '../../components/design-system/MenuText.js'

test('translates menu labels, descriptions, status values and shortcut actions', () => {
  expect(translateMenuText('Default view')).toBe('默认视图')
  expect(translateMenuText('Where should this rule be saved?')).toBe('将此规则保存在哪里？')
  expect(translateMenuText('User settings')).toBe('用户设置')
  expect(translateMenuText('confirm')).toBe('确认')
  expect(translateMenuText('Search…')).toBe('搜索…')
  expect(translateMenuText('  No results ')).toBe('  没有结果 ')
})

test('dynamic descriptions preserve interpolated model IDs, paths and shortcuts', () => {
  expect(translateMenuText('Teammate mode [overridden: in-process]')).toBe('队友模式［已覆盖：in-process］')
  expect(translateMenuText('Syntax highlighting disabled (ctrl+t to enable)')).toBe('已禁用语法高亮（ctrl+t 启用）')
  expect(translateMenuText('Connected to VS Code extension version 1.2 (server version: 1.3)')).toBe('已连接 VS Code extension，版本 1.2（服务器版本：1.3）')
  for (const text of ['cn:deepseek-v4-pro', 'Qwen/Main', '/model', 'chat:externalEditor', 'https://api.example/v1', '已经是中文']) {
    expect(translateMenuText(text)).toBe(text)
  }
})

test('localizes selection presentation while preserving values and callbacks', () => {
  const onChange = () => {}
  const value = { id: 'opaque-option' }
  const original = [{ value, label: 'Default view', description: 'No results', type: 'input',
    placeholder: 'Search…', initialValue: 'User typed text', onChange },
    { value: 'cn:deepseek-v4-pro', label: 'cn:deepseek-v4-pro', description: undefined }]
  const localized = localizeMenuOptions(original)
  expect(localized[0]!.label).toBe('默认视图')
  expect(localized[0]!.description).toBe('没有结果')
  expect(localized[0]!.placeholder).toBe('搜索…')
  expect(localized[0]!.value).toBe(value)
  expect(localized[0]!.onChange).toBe(onChange)
  expect(localized[0]!.initialValue).toBe('User typed text')
  expect(localized[1]!.label).toBe('cn:deepseek-v4-pro')
  expect(original[0]!.label).toBe('Default view')
})

test('menu rendering translates fragments without rewriting nested user content', () => {
  const userContent = <span>User</span>
  const rendered = MenuText({ bold: true, children: ['Default view', <React.Fragment>confirm</React.Fragment>, userContent] }) as React.ReactElement<{ bold: boolean, children: React.ReactNode[] }>
  expect(rendered.props.bold).toBe(true)
  expect(rendered.props.children[0]).toBe('默认视图')
  expect((rendered.props.children[1] as React.ReactElement<{ children: string }>).props.children).toBe('确认')
  expect(rendered.props.children[2]).toBe(userContent)
})
