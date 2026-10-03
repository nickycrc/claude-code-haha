import { MenuText as Text } from 'src/components/design-system/MenuText.js'
import React, { type ReactNode, useState } from 'react'
import { Box } from "../../../ink.js";
import { useKeybinding } from '../../../hooks/useKeybinding.js'
import TextInput from '../../TextInput.js'
import { WizardDialogLayout } from '../../wizard/index.js'
import { useWizard } from '../../wizard/useWizard.js'
import type { ScheduledTaskWizardData } from '../types.js'

export function TaskPromptStep(): ReactNode {
  const { goNext, goBack, updateWizardData, wizardData } =
    useWizard<ScheduledTaskWizardData>()
  const [value, setValue] = useState(wizardData.prompt ?? '')
  const [error, setError] = useState<string | null>(null)

  useKeybinding('confirm:no', goBack, { context: 'Settings' })

  const handleSubmit = () => {
    const trimmed = value.trim()
    if (!trimmed) {
      setError('Prompt is required')
      return
    }
    setError(null)
    updateWizardData({ prompt: trimmed })
    goNext()
  }

  return (
    <WizardDialogLayout subtitle="提示词">
      <Box flexDirection="column">
        <Box marginBottom={1}>
          <Text dimColor>
            {"输入运行此任务时发送给 Claude 的提示词。"}
          </Text>
        </Box>
        <TextInput
          value={value}
          onChange={setValue}
          onSubmit={handleSubmit}
          placeholder="例如：查看过去 24 小时内的提交……"
        />
        {error && (
          <Box marginTop={1}>
            <Text color="red">{error}</Text>
          </Box>
        )}
      </Box>
    </WizardDialogLayout>
  )
}
