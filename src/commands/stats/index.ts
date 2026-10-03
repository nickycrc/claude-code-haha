import type { Command } from '../../commands.js'

const stats = {
  type: 'local-jsx',
  name: 'stats',
  description: "显示 Claude Code 的用量统计和活动",
  load: () => import('./stats.js'),
} satisfies Command

export default stats
