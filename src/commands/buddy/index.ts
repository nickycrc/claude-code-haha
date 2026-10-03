import type { Command } from '../../commands.js'

const buddyCommand = {
  type: 'local-jsx',
  name: 'buddy',
  description: "认识你的伙伴",
  argumentHint: '[hatch|pet|mute|unmute|info]',
  load: () => import('./buddy.js'),
} satisfies Command

export default buddyCommand
