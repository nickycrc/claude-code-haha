import { MenuText as Text } from 'src/components/design-system/MenuText.js'
import React, { type ReactNode, useState } from 'react'
import { Box } from "../../../ink.js";
import { useKeybinding } from '../../../hooks/useKeybinding.js'
import TextInput from '../../TextInput.js'
import { WizardDialogLayout } from '../../wizard/index.js'
import { useWizard } from '../../wizard/useWizard.js'
import type { ScheduledTaskWizardData } from '../types.js'

export function TaskDescriptionStep(): ReactNode {
  const { goNext, goBack, updateWizardData, wizardData } =
    useWizard<ScheduledTaskWizardData>()
  const [value, setValue] = useState(wizardData.description ?? '')
  const [error, setError] = useState<string | null>(null)

  useKeybinding('confirm:no', goBack, { context: 'Settings' })

  const handleSubmit = () => {
    const trimmed = value.trim()
    if (!trimmed) {
      setError('Description is required')
      return
    }
    setError(null)
    updateWizardData({ description: trimmed })
    goNext()
  }

  return (
    <WizardDialogLayout subtitle="描述">
      <Box flexDirection="column">
        <Box marginBottom={1}>
          <Text dimColor>
            {"简要描述此定时任务的用途。"}
          </Text>
        </Box>
        <TextInput
          value={value}
          onChange={setValue}
          onSubmit={handleSubmit}
          placeholder="例如：审查昨天的提交并标出需要关注的问题"
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
