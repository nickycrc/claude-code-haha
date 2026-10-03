import { MenuText as Text } from 'src/components/design-system/MenuText.js'
import React, { type ReactNode } from 'react'
import { Box } from "../../../ink.js";
import { Select } from '../../CustomSelect/select.js'
import { WizardDialogLayout } from '../../wizard/index.js'
import { useWizard } from '../../wizard/useWizard.js'
import type { ScheduledTaskWizardData } from '../types.js'

const PERMISSION_OPTIONS = [
  {
    label: "询问权限",
    value: 'ask',
    description: "修改前始终询问",
  },
  {
    label: "自动接受编辑",
    value: 'auto-accept',
    description: "自动接受所有文件编辑",
  },
  {
    label: "计划模式",
    value: 'plan',
    description: "修改前先制定计划",
  },
  {
    label: "跳过权限确认",
    value: 'bypass',
    description: "接受所有权限请求",
  },
]

export function PermissionStep(): ReactNode {
  const { goNext, goBack, updateWizardData, wizardData } =
    useWizard<ScheduledTaskWizardData>()

  return (
    <WizardDialogLayout subtitle="权限模式">
      <Box flexDirection="column">
        <Box marginBottom={1}>
          <Text dimColor>
            {"选择此定时任务的权限模式。"}
          </Text>
        </Box>
        <Select
          options={PERMISSION_OPTIONS}
          defaultValue={wizardData.permissionMode ?? 'ask'}
          onChange={(value) => {
            updateWizardData({ permissionMode: value })
            goNext()
          }}
          onCancel={goBack}
        />
      </Box>
    </WizardDialogLayout>
  )
}
