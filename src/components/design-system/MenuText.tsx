import React, { type ReactNode } from 'react'
import ThemedText, { type Props as ThemedTextProps } from './ThemedText.js'
import BaseText, { type Props as BaseTextProps } from '../../ink/components/Text.js'
import { translateMenuText } from '../../utils/i18n/menuText.js'

function localizeChildren(children: ReactNode): ReactNode {
  if (typeof children === 'string') return translateMenuText(children)
  if (Array.isArray(children)) return children.map(localizeChildren)
  if (React.isValidElement<{ children?: ReactNode }>(children) && children.type === React.Fragment) {
    return React.cloneElement(children, undefined, localizeChildren(children.props.children))
  }
  return children
}

export function MenuText({ children, ...props }: ThemedTextProps): ReactNode {
  return <ThemedText {...props}>{localizeChildren(children)}</ThemedText>
}

export default function MenuBaseText({ children, ...props }: BaseTextProps): ReactNode {
  return <BaseText {...props}>{localizeChildren(children)}</BaseText>
}
