import { MenuText as Text } from 'src/components/design-system/MenuText.js'
import React, { type ReactNode, useMemo, useState } from 'react'
import { Box } from "../../../ink.js";
import { getProjectRoot } from '../../../bootstrap/state.js'
import { useKeybinding } from '../../../hooks/useKeybinding.js'
import TextInput from '../../TextInput.js'
import { Select } from '../../CustomSelect/select.js'
import { WizardDialogLayout } from '../../wizard/index.js'
import { useWizard } from '../../wizard/useWizard.js'
import type { ScheduledTaskWizardData } from '../types.js'

/** Reject paths that escape the filesystem root or contain dangerous patterns. */
function isSafePath(path: string): boolean {
  const normalized = path.trim()
  // Reject empty paths, absolute paths outside root, or traversal attempts.
  if (!normalized) return false
  if (normalized.startsWith('/')) return true // absolute paths are allowed
  if (normalized.startsWith('~')) return true // home directory is allowed
  // Disallow traversal patterns.
  if (normalized.includes('..')) return false
  return true
}

export function FolderStep(): ReactNode {
  const { goNext, goBack, updateWizardData, wizardData } =
    useWizard<ScheduledTaskWizardData>()
  const [customPath, setCustomPath] = useState(false)
  const [pathValue, setPathValue] = useState(wizardData.folder ?? '')
  const [pathError, setPathError] = useState<string | null>(null)

  const currentProject = getProjectRoot()

  useKeybinding('confirm:no', () => {
    if (customPath) {
      setCustomPath(false)
    } else {
      goBack()
    }
  }, { context: 'Settings' })

  const folderOptions = useMemo(() => {
    const options: { label: string; value: string; description?: string }[] = []

    // Current project is always first
    options.push({
      label: currentProject.split('/').pop() ?? currentProject,
      value: currentProject,
      description: currentProject,
    })

    return options
  }, [currentProject])

  // Custom path input mode — uses TextInput instead of Select input type
  if (customPath) {
    return (
      <WizardDialogLayout subtitle="工作目录">
        <Box flexDirection="column">
          <Box marginBottom={1}>
            <Text dimColor>{"输入工作目录的完整路径："}</Text>
          </Box>
          <TextInput
            value={pathValue}
            onChange={(v) => {
              setPathValue(v)
              setPathError(null)
            }}
            onSubmit={() => {
              const trimmed = pathValue.trim()
              if (!trimmed) {
                setPathError('Path cannot be empty')
                return
              }
              if (!isSafePath(trimmed)) {
                setPathError('Invalid path')
                return
              }
              setPathError(null)
              updateWizardData({ folder: trimmed })
              goNext()
            }}
            placeholder="/path/to/project"
          />
          {pathError && (
            <Box marginTop={1}>
              <Text color="red">{pathError}</Text>
            </Box>
          )}
        </Box>
      </WizardDialogLayout>
    )
  }

  return (
    <WizardDialogLayout subtitle="工作目录">
      <Box flexDirection="column">
        <Box marginBottom={1}>
          <Text dimColor>
            {"选择此任务的运行文件夹。"}
          </Text>
        </Box>
        <Select
          options={[
            ...folderOptions,
            {
              label: "+ 选择其他文件夹",
              value: '__custom__',
              description: "输入自定义路径",
            },
          ]}
          defaultValue={wizardData.folder ?? currentProject}
          onChange={(value) => {
            if (value === '__custom__') {
              setCustomPath(true)
              return
            }
            updateWizardData({ folder: value })
            goNext()
          }}
          onCancel={goBack}
        />
      </Box>
    </WizardDialogLayout>
  )
}
