import memoize from 'lodash-es/memoize.js'
import type { HookEvent } from 'src/entrypoints/agentSdkTypes.js'
import { getRegisteredHooks } from '../../bootstrap/state.js'
import type { AppState } from '../../state/AppState.js'
import {
  getAllHooks,
  type IndividualHookConfig,
  sortMatchersByPriority,
} from './hooksSettings.js'

export type MatcherMetadata = {
  fieldToMatch: string
  values: string[]
}

export type HookEventMetadata = {
  summary: string
  description: string
  matcherMetadata?: MatcherMetadata
}

// Hook event metadata configuration.
// Resolver uses sorted-joined string key so that callers passing a fresh
// toolNames array each render (e.g. HooksConfigMenu) hit the cache instead
// of leaking a new entry per call.
export const getHookEventMetadata = memoize(
  function (toolNames: string[]): Record<HookEvent, HookEventMetadata> {
    return {
      PreToolUse: {
        summary: "工具执行前",
        description:
          "命令输入为工具调用参数的 JSON。\n退出码 0：不显示标准输出或错误输出\n退出码 2：向模型显示错误输出并阻止工具调用\n其他退出码：仅向用户显示错误输出，继续工具调用",
        matcherMetadata: {
          fieldToMatch: 'tool_name',
          values: toolNames,
        },
      },
      PostToolUse: {
        summary: "工具执行后",
        description:
          "命令输入为 JSON，含 inputs（调用参数）和 response（调用结果）。\n退出码 0：标准输出显示在记录模式（Ctrl+O）\n退出码 2：立即向模型显示错误输出\n其他退出码：仅向用户显示错误输出",
        matcherMetadata: {
          fieldToMatch: 'tool_name',
          values: toolNames,
        },
      },
      PostToolUseFailure: {
        summary: "工具执行失败后",
        description:
          "命令输入为 JSON，含 tool_name、tool_input、tool_use_id、error、error_type、is_interrupt 和 is_timeout。\n退出码 0：标准输出显示在记录模式（Ctrl+O）\n退出码 2：立即向模型显示错误输出\n其他退出码：仅向用户显示错误输出",
        matcherMetadata: {
          fieldToMatch: 'tool_name',
          values: toolNames,
        },
      },
      PermissionDenied: {
        summary: "自动模式分类器拒绝工具调用后",
        description:
          "命令输入为 JSON，含 tool_name、tool_input、tool_use_id 和 reason。\n返回 {\"hookSpecificOutput\":{\"hookEventName\":\"PermissionDenied\",\"retry\":true}} 允许模型重试。\n退出码 0：标准输出显示在记录模式（Ctrl+O）\n其他退出码：仅向用户显示错误输出",
        matcherMetadata: {
          fieldToMatch: 'tool_name',
          values: toolNames,
        },
      },
      Notification: {
        summary: "发送通知时",
        description:
          "命令输入为包含通知消息和类型的 JSON。\n退出码 0：不显示标准输出或错误输出\n其他退出码：仅向用户显示错误输出",
        matcherMetadata: {
          fieldToMatch: 'notification_type',
          values: [
            'permission_prompt',
            'idle_prompt',
            'auth_success',
            'elicitation_dialog',
            'elicitation_complete',
            'elicitation_response',
          ],
        },
      },
      UserPromptSubmit: {
        summary: "用户提交提示词时",
        description:
          "命令输入为包含用户原始提示词的 JSON。\n退出码 0：向 Claude 显示标准输出\n退出码 2：阻止处理，清除原始提示词，仅向用户显示错误输出\n其他退出码：仅向用户显示错误输出",
      },
      SessionStart: {
        summary: "新会话开始时",
        description:
          "命令输入为包含会话启动来源的 JSON。\n退出码 0：向 Claude 显示标准输出\n忽略阻止性错误\n其他退出码：仅向用户显示错误输出",
        matcherMetadata: {
          fieldToMatch: 'source',
          values: ['startup', 'resume', 'clear', 'compact'],
        },
      },
      Stop: {
        summary: "Claude 即将结束回复时",
        description:
          "退出码 0：不显示标准输出或错误输出\n退出码 2：向模型显示错误输出并继续对话\n其他退出码：仅向用户显示错误输出",
      },
      StopFailure: {
        summary: "回合因 API 错误结束时",
        description:
          "API 错误（如限流、认证失败）导致回合结束时触发，代替 Stop。无需等待结果，忽略钩子输出和退出码。",
        matcherMetadata: {
          fieldToMatch: 'error',
          values: [
            'rate_limit',
            'authentication_failed',
            'billing_error',
            'invalid_request',
            'server_error',
            'max_output_tokens',
            'unknown',
          ],
        },
      },
      SubagentStart: {
        summary: "子代理（Agent 工具调用）启动时",
        description:
          "命令输入为 JSON，含 agent_id 和 agent_type。\n退出码 0：向子代理显示标准输出\n忽略阻止性错误\n其他退出码：仅向用户显示错误输出",
        matcherMetadata: {
          fieldToMatch: 'agent_type',
          values: [], // Will be populated with available agent types
        },
      },
      SubagentStop: {
        summary:
          "子代理（Agent 工具调用）即将结束回复时",
        description:
          "命令输入为 JSON，含 agent_id、agent_type 和 agent_transcript_path。\n退出码 0：不显示标准输出或错误输出\n退出码 2：向子代理显示错误输出并继续运行\n其他退出码：仅向用户显示错误输出",
        matcherMetadata: {
          fieldToMatch: 'agent_type',
          values: [], // Will be populated with available agent types
        },
      },
      PreCompact: {
        summary: "对话压缩前",
        description:
          "命令输入为包含压缩详情的 JSON。\n退出码 0：将标准输出追加为自定义压缩指令\n退出码 2：阻止压缩\n其他退出码：仅向用户显示错误输出，继续压缩",
        matcherMetadata: {
          fieldToMatch: 'trigger',
          values: ['manual', 'auto'],
        },
      },
      PostCompact: {
        summary: "对话压缩后",
        description:
          "命令输入为包含压缩详情和摘要的 JSON。\n退出码 0：向用户显示标准输出\n其他退出码：仅向用户显示错误输出",
        matcherMetadata: {
          fieldToMatch: 'trigger',
          values: ['manual', 'auto'],
        },
      },
      SessionEnd: {
        summary: "会话结束时",
        description:
          "命令输入为包含会话结束原因的 JSON。\n退出码 0：命令成功完成\n其他退出码：仅向用户显示错误输出",
        matcherMetadata: {
          fieldToMatch: 'reason',
          values: ['clear', 'logout', 'prompt_input_exit', 'other'],
        },
      },
      PermissionRequest: {
        summary: "显示权限对话框时",
        description:
          "命令输入为 JSON，含 tool_name、tool_input 和 tool_use_id。\n输出 JSON 的 hookSpecificOutput 中填写允许或拒绝决定。\n退出码 0：使用提供的钩子决定\n其他退出码：仅向用户显示错误输出",
        matcherMetadata: {
          fieldToMatch: 'tool_name',
          values: toolNames,
        },
      },
      Setup: {
        summary: "仓库初始化和维护钩子",
        description:
          "命令输入为包含 trigger（init 或 maintenance）的 JSON。\n退出码 0：向 Claude 显示标准输出\n忽略阻止性错误\n其他退出码：仅向用户显示错误输出",
        matcherMetadata: {
          fieldToMatch: 'trigger',
          values: ['init', 'maintenance'],
        },
      },
      TeammateIdle: {
        summary: "队友即将进入空闲状态时",
        description:
          "命令输入为 JSON，含 teammate_name 和 team_name。\n退出码 0：不显示标准输出或错误输出\n退出码 2：向队友显示错误输出并阻止空闲（继续工作）\n其他退出码：仅向用户显示错误输出",
      },
      TaskCreated: {
        summary: "创建任务时",
        description:
          "命令输入为 JSON，含 task_id、task_subject、task_description、teammate_name 和 team_name。\n退出码 0：不显示标准输出或错误输出\n退出码 2：向模型显示错误输出并阻止创建任务\n其他退出码：仅向用户显示错误输出",
      },
      TaskCompleted: {
        summary: "任务即将标记为完成时",
        description:
          "命令输入为 JSON，含 task_id、task_subject、task_description、teammate_name 和 team_name。\n退出码 0：不显示标准输出或错误输出\n退出码 2：向模型显示错误输出并阻止完成任务\n其他退出码：仅向用户显示错误输出",
      },
      Elicitation: {
        summary: "MCP 服务器请求用户输入时",
        description:
          "命令输入为 JSON，含 mcp_server_name、message 和 requested_schema。\n输出 JSON 的 hookSpecificOutput 中填写 action（accept／decline／cancel）及可选 content。\n退出码 0：使用提供的钩子响应\n退出码 2：拒绝输入请求\n其他退出码：仅向用户显示错误输出",
        matcherMetadata: {
          fieldToMatch: 'mcp_server_name',
          values: [],
        },
      },
      ElicitationResult: {
        summary: "用户回答 MCP 输入请求后",
        description:
          "命令输入为 JSON，含 mcp_server_name、action、content、mode 和 elicitation_id。\n输出 JSON 的 hookSpecificOutput 可包含 action 和 content 以覆盖响应。\n退出码 0：使用提供的钩子响应\n退出码 2：阻止响应（action 变为 decline）\n其他退出码：仅向用户显示错误输出",
        matcherMetadata: {
          fieldToMatch: 'mcp_server_name',
          values: [],
        },
      },
      ConfigChange: {
        summary: "会话期间配置文件修改时",
        description:
          "命令输入为 JSON，含 source（user_settings／project_settings／local_settings／policy_settings／skills）和 file_path。\n退出码 0：允许修改\n退出码 2：阻止将修改应用到会话\n其他退出码：仅向用户显示错误输出",
        matcherMetadata: {
          fieldToMatch: 'source',
          values: [
            'user_settings',
            'project_settings',
            'local_settings',
            'policy_settings',
            'skills',
          ],
        },
      },
      InstructionsLoaded: {
        summary: "指令文件（CLAUDE.md 或规则）加载时",
        description:
          "命令输入为 JSON，含 file_path、memory_type（User／Project／Local／Managed）、load_reason（session_start／nested_traversal／path_glob_match／include／compact）、可选 globs（匹配的 paths 配置）、可选 trigger_file_path（触发加载的文件）和可选 parent_file_path（通过 @ 引用此文件的上级文件）。\n退出码 0：命令成功完成\n其他退出码：仅向用户显示错误输出\n此钩子仅用于观察，不支持阻止操作。",
        matcherMetadata: {
          fieldToMatch: 'load_reason',
          values: [
            'session_start',
            'nested_traversal',
            'path_glob_match',
            'include',
            'compact',
          ],
        },
      },
      WorktreeCreate: {
        summary: "创建隔离工作树（不限版本控制系统）",
        description:
          "命令输入为包含 name（建议的工作树名称）的 JSON。\n标准输出应为创建的工作树目录的绝对路径。\n退出码 0：工作树创建成功\n其他退出码：工作树创建失败",
      },
      WorktreeRemove: {
        summary: "删除已创建的工作树",
        description:
          "命令输入为包含 worktree_path（工作树绝对路径）的 JSON。\n退出码 0：工作树删除成功\n其他退出码：仅向用户显示错误输出",
      },
      CwdChanged: {
        summary: "工作目录修改后",
        description:
          "命令输入为 JSON，含 old_cwd 和 new_cwd。\nCLAUDE_ENV_FILE 已设置，可写入 Bash export 指令以应用到后续 BashTool 命令。\n钩子输出可包含 hookSpecificOutput.watchPaths（绝对路径数组），注册到 FileChanged 监视器。\n退出码 0：命令成功完成\n其他退出码：仅向用户显示错误输出",
      },
      FileChanged: {
        summary: "监视的文件修改时",
        description:
          "命令输入为 JSON，含 file_path 和 event（change／add／unlink）。\nCLAUDE_ENV_FILE 已设置，可写入 Bash export 指令以应用到后续 BashTool 命令。\n匹配器指定当前目录下需要监视的文件名（例如 .envrc|.env）。\n钩子输出可包含 hookSpecificOutput.watchPaths（绝对路径数组），动态更新监视列表。\n退出码 0：命令成功完成\n其他退出码：仅向用户显示错误输出",
      },
    }
  },
  toolNames => toolNames.slice().sort().join(','),
)

// Group hooks by event and matcher
export function groupHooksByEventAndMatcher(
  appState: AppState,
  toolNames: string[],
): Record<HookEvent, Record<string, IndividualHookConfig[]>> {
  const grouped: Record<HookEvent, Record<string, IndividualHookConfig[]>> = {
    PreToolUse: {},
    PostToolUse: {},
    PostToolUseFailure: {},
    PermissionDenied: {},
    Notification: {},
    UserPromptSubmit: {},
    SessionStart: {},
    SessionEnd: {},
    Stop: {},
    StopFailure: {},
    SubagentStart: {},
    SubagentStop: {},
    PreCompact: {},
    PostCompact: {},
    PermissionRequest: {},
    Setup: {},
    TeammateIdle: {},
    TaskCreated: {},
    TaskCompleted: {},
    Elicitation: {},
    ElicitationResult: {},
    ConfigChange: {},
    WorktreeCreate: {},
    WorktreeRemove: {},
    InstructionsLoaded: {},
    CwdChanged: {},
    FileChanged: {},
  }

  const metadata = getHookEventMetadata(toolNames)

  // Include hooks from settings files
  getAllHooks(appState).forEach(hook => {
    const eventGroup = grouped[hook.event]
    if (eventGroup) {
      // For events without matchers, use empty string as key
      const matcherKey =
        metadata[hook.event].matcherMetadata !== undefined
          ? hook.matcher || ''
          : ''
      if (!eventGroup[matcherKey]) {
        eventGroup[matcherKey] = []
      }
      eventGroup[matcherKey].push(hook)
    }
  })

  // Include registered hooks (e.g., plugin hooks)
  const registeredHooks = getRegisteredHooks()
  if (registeredHooks) {
    for (const [event, matchers] of Object.entries(registeredHooks)) {
      const hookEvent = event as HookEvent
      const eventGroup = grouped[hookEvent]
      if (!eventGroup) continue

      for (const matcher of matchers) {
        const matcherKey = matcher.matcher || ''

        // Only PluginHookMatcher has pluginRoot; HookCallbackMatcher (internal
        // callbacks like attributionHooks, sessionFileAccessHooks) does not.
        if ('pluginRoot' in matcher) {
          eventGroup[matcherKey] ??= []
          for (const hook of matcher.hooks) {
            eventGroup[matcherKey].push({
              event: hookEvent,
              config: hook,
              matcher: matcher.matcher,
              source: 'pluginHook',
              pluginName: matcher.pluginId,
            })
          }
        } else if (process.env.USER_TYPE === 'ant') {
          eventGroup[matcherKey] ??= []
          for (const _hook of matcher.hooks) {
            eventGroup[matcherKey].push({
              event: hookEvent,
              config: {
                type: 'command',
                command: '[ANT-ONLY] Built-in Hook',
              },
              matcher: matcher.matcher,
              source: 'builtinHook',
            })
          }
        }
      }
    }
  }

  return grouped
}

// Get sorted matchers for a specific event
export function getSortedMatchersForEvent(
  hooksByEventAndMatcher: Record<
    HookEvent,
    Record<string, IndividualHookConfig[]>
  >,
  event: HookEvent,
): string[] {
  const matchers = Object.keys(hooksByEventAndMatcher[event] || {})
  return sortMatchersByPriority(matchers, hooksByEventAndMatcher, event)
}

// Get hooks for a specific event and matcher
export function getHooksForMatcher(
  hooksByEventAndMatcher: Record<
    HookEvent,
    Record<string, IndividualHookConfig[]>
  >,
  event: HookEvent,
  matcher: string | null,
): IndividualHookConfig[] {
  // For events without matchers, hooks are stored with empty string as key
  // because the record keys must be strings.
  const matcherKey = matcher ?? ''
  return hooksByEventAndMatcher[event]?.[matcherKey] ?? []
}

// Get metadata for a specific event's matcher
export function getMatcherMetadata(
  event: HookEvent,
  toolNames: string[],
): MatcherMetadata | undefined {
  return getHookEventMetadata(toolNames)[event].matcherMetadata
}
