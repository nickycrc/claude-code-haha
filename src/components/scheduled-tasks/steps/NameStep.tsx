import { MenuText as Text } from 'src/components/design-system/MenuText.js'
import React, { type ReactNode, useState } from 'react'
import { Box } from "../../../ink.js";
import { useKeybinding } from '../../../hooks/useKeybinding.js'
import TextInput from '../../TextInput.js'
import { WizardDialogLayout } from '../../wizard/index.js'
import { useWizard } from '../../wizard/useWizard.js'
import type { ScheduledTaskWizardData } from '../types.js'

export function NameStep(): ReactNode {
  const { goNext, goBack, updateWizardData, wizardData } =
    useWizard<ScheduledTaskWizardData>()
  const [value, setValue] = useState(wizardData.name ?? '')
  const [error, setError] = useState<string | null>(null)

  useKeybinding('confirm:no', goBack, { context: 'Settings' })

  const handleSubmit = () => {
    const trimmed = value.trim()
    if (!trimmed) {
      setError('Name is required')
      return
    }
    setError(null)
    updateWizardData({ name: trimmed })
    goNext()
  }

  return (
    <WizardDialogLayout subtitle="任务名称">
      <Box flexDirection="column">
        <Box marginBottom={1}>
          <Text dimColor>
            {"为定时任务取一个简短且明确的名称（例如“daily-code-review”）。"}
          </Text>
        </Box>
        <TextInput
          value={value}
          onChange={setValue}
          onSubmit={handleSubmit}
          placeholder="例如 daily-code-review"
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
