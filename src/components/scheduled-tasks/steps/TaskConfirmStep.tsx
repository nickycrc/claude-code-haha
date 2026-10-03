import { MenuText as Text } from 'src/components/design-system/MenuText.js'
import React, { type ReactNode } from 'react'
import { Box } from "../../../ink.js";
import { useKeybinding } from '../../../hooks/useKeybinding.js'
import { cronToHuman } from '../../../utils/cron.js'
import { WizardDialogLayout } from '../../wizard/index.js'
import { useWizard } from '../../wizard/useWizard.js'
import type { ScheduledTaskWizardData } from '../types.js'

export function TaskConfirmStep(): ReactNode {
  const { goNext, goBack, wizardData } =
    useWizard<ScheduledTaskWizardData>()

  useKeybinding('confirm:no', goBack, { context: 'Settings' })

  const schedule = wizardData.cron
    ? cronToHuman(wizardData.cron)
    : wizardData.frequency === 'manual'
      ? 'Manual (on demand)'
      : 'Not set'

  return (
    <WizardDialogLayout subtitle="检查并确认">
      <Box flexDirection="column" gap={1}>
        <Box>
          <Text bold>{"名称："} </Text>
          <Text>{wizardData.name ?? '—'}</Text>
        </Box>
        <Box>
          <Text bold>{"描述："} </Text>
          <Text>{wizardData.description ?? '—'}</Text>
        </Box>
        <Box>
          <Text bold>{"提示词："} </Text>
          <Text>
            {wizardData.prompt
              ? wizardData.prompt.length > 60
                ? wizardData.prompt.slice(0, 57) + '...'
                : wizardData.prompt
              : '—'}
          </Text>
        </Box>
        <Box>
          <Text bold>{"模型："} </Text>
          <Text>{wizardData.model ?? "默认"}</Text>
        </Box>
        <Box>
          <Text bold>{"权限："} </Text>
          <Text>{wizardData.permissionMode ?? "询问"}</Text>
        </Box>
        <Box>
          <Text bold>{"文件夹："} </Text>
          <Text>{wizardData.folder ?? "当前项目"}</Text>
        </Box>
        <Box>
          <Text bold>{"工作树："} </Text>
          <Text>{wizardData.worktree ? "是" : "否"}</Text>
        </Box>
        <Box>
          <Text bold>{"计划："} </Text>
          <Text>{schedule}</Text>
        </Box>

        <Box marginTop={1}>
          <Text dimColor>{"按 Enter 确认，Esc 返回。"}</Text>
        </Box>
      </Box>
    </WizardDialogLayout>
  )
}
