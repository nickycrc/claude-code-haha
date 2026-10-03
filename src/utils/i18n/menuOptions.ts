import type { ReactNode } from 'react'
import { translateMenuText } from './menuText.js'

/** Localize presentation fields while preserving values, callbacks and user input. */
export function localizeMenuOptions<T extends {
  value: unknown
  label: ReactNode
  description?: string
  placeholder?: string
}>(options: T[]): T[] {
  return options.map(option => ({
    ...option,
    label: typeof option.label === 'string' && option.label !== option.value
      ? translateMenuText(option.label) : option.label,
    description: option.description === undefined ? undefined : translateMenuText(option.description),
    ...(option.placeholder === undefined ? {} : { placeholder: translateMenuText(option.placeholder) }),
  }))
}
