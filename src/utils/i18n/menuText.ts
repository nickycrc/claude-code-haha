import translations from './menuZh.json'
import extraTranslations from './menuExtraZh.json'
import statusTranslations from './menuStatusZh.json'

const common: Record<string, string> = {
  navigate: '导航', select: '选择', confirm: '确认', cancel: '取消', close: '关闭',
  exit: '退出', save: '保存', submit: '提交', continue: '继续', back: '返回',
  expand: '展开', collapse: '折叠', toggle: '切换', copy: '复制', remove: '移除',
  retry: '重试', edit: '编辑', view: '查看', open: '打开', search: '搜索',
  mention: '引用', stop: '停止', interrupt: '中断', next: '下一项', prev: '上一项',
  previous: '上一项', nav: '导航', tab: '标签', tabs: '标签',
  on: '开启', off: '关闭', true: '是', false: '否', auto: '自动',
  enabled: '已启用', disabled: '已禁用', low: '低', medium: '中', high: '高', max: '最高',
  Low: '低', Medium: '中', High: '高', Max: '最高', Normal: '普通',
  latest: '最新', stable: '稳定', recommended: '推荐', effort: '推理强度',
  user: '用户', project: '项目', local: '本地', managed: '托管', policy: '策略',
  plugin: '插件', builtIn: '内置', 'built-in': '内置', scope: '范围',
  'Plugin skills': '插件技能', 'MCP skills': 'MCP 技能',
  'User skills': '用户技能', 'Project skills': '项目技能', 'Managed skills': '托管技能',
  'Built-in (always available):': '内置（始终可用）：',
  'Built-in agents': '内置代理', 'Plugin agents': '插件代理',
  'No results': '没有结果', 'All tools selected': '已选择所有工具',
  'Confirm and save': '确认并保存', 'Uncommitted changes': '未提交的修改',
  'Working tree is clean': '工作树没有修改',
  'Press Enter or Esc to go back': '按 Enter 或 Esc 返回',
  'Press ↑↓ to navigate · Enter to select · Esc to go back': '↑↓ 导航 · Enter 选择 · Esc 返回',
  'Press ↑↓ to navigate, Enter to select, Esc to cancel': '↑↓ 导航 · Enter 选择 · Esc 取消',
  clear: '清空', skip: '跳过', preview: '预览', rename: '重命名', switch: '切换',
  hide: '隐藏', show: '显示', explain: '查看说明', complete: '完成', add: '添加',
  change: '修改', details: '详情', dismiss: '关闭', disable: '禁用', enable: '启用',
  resolve: '处理', manage: '管理', cycle: '切换', stash: '暂存', connect: '连接',
  disconnect: '断开连接', type: '类型', description: '描述',
  'agent-only': '仅代理可用', general: '概览', commands: '命令',
  tool: '工具', tools: '工具', agent: '代理', agents: '代理', hook: '钩子', hooks: '钩子',
  skill: '技能', skills: '技能', memory: '记忆', memories: '记忆',
  'Agent settings': '代理设置', 'All tools': '所有工具',
  'Search…': '搜索…', 'Search...': '搜索…', 'Type to search…': '输入内容搜索…',
  'Read-only tools': '只读工具', 'Edit tools': '编辑工具',
  'Execution tools': '执行工具', 'MCP tools': 'MCP 工具', 'Other tools': '其他工具',
  'User': '用户', 'Project': '项目', 'Local': '本地', 'Flag': '启动参数',
  'Managed': '托管', 'Plugin': '插件', 'Built-in': '内置',
  'user settings': '用户设置', 'shared project settings': '共享项目设置',
  'project local settings': '项目本地设置', 'command line arguments': '命令行参数',
  'enterprise managed settings': '企业托管设置', 'CLI argument': '命令行参数',
  'command configuration': '命令配置', 'current session': '当前会话',
  'Enabled': '已启用', 'Disabled': '已禁用', 'Connected': '已连接',
  'pending': '等待中', 'failed': '失败', 'running': '运行中', 'completed': '已完成',
  'in-process': '当前进程', 'split-panes': '分屏', 'notifications': '通知',
  'verbose': '详细', 'compact': '精简', 'normal': '普通', 'custom': '自定义',
  'ON': '开启', 'OFF': '关闭', 'default': '默认', 'yes': '是', 'no': '否',
  'and': '和', 'or': '或', 'in': '位于', 'to': '以', 'of': '／', 'for': '用于',
  'from': '来自', 'by': '由', 'at': '位于', 'using': '使用', 'that': '，',
  'use': '次调用', 'uses': '次调用', 'calls': '次调用', 'tokens': '令牌',
  'messages': '条消息', 'line': '行', 'lines': '行', 'files': '个文件',
  'file': '文件', 'directory': '目录', 'directories': '目录',
  'time': '次', 'times': '次', 'day': '天', 'days': '天',
  'configured': '已配置', 'selected': '已选择', 'authenticated': '已验证',
  'connected': '已连接', 'unknown': '未知', 'unset': '未设置',
  'available': '可用', 'relevant': '相关', 'changed': '已修改', 'untracked': '未跟踪',
  'found': '已找到', 'installed': '已安装', 'total': '总计', 'ask': '询问',
  'background': '后台', 'foreground': '前台', 'hold': '按住', 'left': '剩余',
  'resume': '恢复', 'return': '返回', 'touched': '涉及', 'earlier': '之前',
  'error': '错误', 'done': '完成', 'stopped': '已停止', 'removed': '已移除',
  'update': '更新', 'installs': '次安装', 'copied': '已复制', 'source': '来源',
  'has': '有', 'other': '其他', '1-shot': '一次完成', 'ran': '已运行',
  'main': '主代理', 'team': '团队', 'team-lead': '团队负责人',
  'path': '路径', 'command': '命令', 'pattern': '模式', 'patterns': '模式',
  'url': '地址', 'URL': '地址', 'URL:': '地址：', 'query': '查询', 'prompt': '提示词',
}

export const menuTranslations: Record<string, string> = { ...translations, ...extraTranslations, ...statusTranslations, ...common }
const dictionary = menuTranslations
const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const patterns = Object.entries(dictionary).filter(([key]) => /\{\d+\}/.test(key)).map(([key, value]) => {
  const parts = key.split(/\{\d+\}/)
  const indexes = [...key.matchAll(/\{(\d+)\}/g)].map(match => Number(match[1]))
  return { expression: new RegExp('^' + parts.map(escapeRegex).join('([\\s\\S]*?)') + '$'), indexes, value }
})

/** Translate display text only; callers keep command names and option values intact. */
export function translateMenuText(text: string): string {
  if (!text || /[\u3400-\u9fff]/.test(text)) return text
  const leading = text.match(/^\s*/)?.[0] ?? ''
  const trailing = text.match(/\s*$/)?.[0] ?? ''
  const normalized = text.trim().replace(/\s+/g, ' ')
  const exact = dictionary[normalized]
  if (exact) return leading + exact + trailing
  for (const pattern of patterns) {
    const match = pattern.expression.exec(normalized)
    if (!match) continue
    return leading + pattern.value.replace(/\{(\d+)\}/g, (_, index: string) => {
      const position = pattern.indexes.indexOf(Number(index))
      return position < 0 ? `{${index}}` : match[position + 1]!
    }) + trailing
  }
  return text
}
