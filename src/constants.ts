import * as os from 'node:os'
import * as path from 'node:path'
import { version } from '../package.json'
import type { TModelOption } from './types'

export const SUPPORTED_MODELS: TModelOption[] = [
  {
    id: 'anthropic/claude-4-5-sonnet',
    name: 'Anthropic Claude 4.5 Sonnet',
    provider: 'anthropic'
  },
  {
    id: 'google/gemini-2.5-flash',
    name: 'Google Gemini 2.5 Flash',
    provider: 'google'
  },
  {
    id: 'google/gemini-2.5-flash-lite',
    name: 'Google Gemini 2.5 Flash Lite',
    provider: 'google'
  },
  {
    id: 'openai/gpt-5',
    name: 'OpenAI GPT-5',
    provider: 'openai'
  }
]

export const SYSTEM_PROMPT = `You are a shell command generator. Your task is to convert natural language requests into a single, executable POSIX shell command.

CRITICAL RULES:
1. Return ONLY the shell command wrapped in triple backticks - no explanations before or after.
2. Output must be exactly ONE line inside the backticks.
3. The command must be valid for POSIX-compliant shells (bash, zsh, sh).
4. Never include destructive commands like: rm -rf /, dd to raw devices, mkfs, shutdown, reboot, format commands, or fork bombs.
5. Use standard Unix tools and common utilities.
6. Include pipes, re-directions, and sub-shells only when necessary.
7. If the request is unclear or unsafe, return a safe alternative or refuse.

Examples of correct output:

User: "kill 8000 and 8001 port"
Assistant:
\`\`\`
kill $(lsof -t -i :8000) $(lsof -t -i :8001)
\`\`\`

User: "find all log files modified in last 24 hours and show their size"
Assistant:
\`\`\`
find . -name "*.log" -type f -mtime -1 -exec ls -lh {} ; | awk '{print $5, $9}'
\`\`\`

Examples of INCORRECT output (never do this):
- ls -la
- Here's the command: \`\`\`ls -la\`\`\`
- You can use this command:
  \`\`\`bash
  ls -la
  \`\`\`

Remember: Always wrap the command in triple backticks with nothing else before or after.`

export const RETRY_PROMPT_REMINDER =
  'IMPORTANT: Return ONLY the command wrapped in triple backticks (```command here```) with no explanation, no extra text. Just the command in backticks.'

export const DESTRUCTIVE_PATTERNS = [
  /rm\s+(-[rf]+\s+)?\//, // rm -rf / or similar
  /dd\s+.*of=\/dev\/(sd|hd|disk)/, // dd to disk devices
  /mkfs/, // filesystem format
  /:\(\)\{.*:\|:.*&.*\};:/, // fork bomb
  /shutdown/,
  /reboot/,
  /halt\b/,
  /init\s+0/,
  /init\s+6/,
  /:(){ :|:& };:/, // fork bomb variant
  /mv\s+.*\s+\/dev\/null/, // moving to /dev/null
  /> \/dev\/(sd|hd|disk)/, // redirecting to disk devices
  /chmod\s+-R\s+000/, // recursive permission removal
  /chown\s+-R\s+.*\s+\// // recursive ownership change from root
]

export const CONFIG_COMMENT_START =
  '# The following lines have been added by Quco for configuration.'
export const CONFIG_COMMENT_END = '# End of Quco configuration - Do not modify this manually.'

export const AUTOFILL_COMMENT_START =
  '# The following function has been added by Quco to enable command autofill.'
export const AUTOFILL_COMMENT_DESCRIPTION =
  '# This allows generated commands to be loaded directly into your shell buffer.'
export const AUTOFILL_COMMENT_END = '# End of Quco autofill - Do not modify this manually.'

export const ZSH_AUTOFILL = `
${AUTOFILL_COMMENT_START}
${AUTOFILL_COMMENT_DESCRIPTION}
quco() {
  case "$1" in
    --*)
      command quco "$@"
      ;;
    "")
      command quco "$@"
      ;;
    *)
      local cmd
      cmd=$(QUCO_SHELL_AUTOFILL=true command quco "$@")
      if [ $? -eq 0 ] && [ -n "$cmd" ]; then
        print -z "$cmd"
      fi
      ;;
  esac
}
${AUTOFILL_COMMENT_END}
`

export const BASH_AUTOFILL = `
${AUTOFILL_COMMENT_START}
${AUTOFILL_COMMENT_DESCRIPTION}
quco() {
  case "$1" in
    --*)
      command quco "$@"
      ;;
    "")
      command quco "$@"
      ;;
    *)
      local cmd
      cmd=$(QUCO_SHELL_AUTOFILL=true command quco "$@")
      if [ $? -eq 0 ] && [ -n "$cmd" ]; then
        # Use readline to insert command into buffer
        bind '"e[0n": "'"$cmd"'"'
        printf 'e[0n'
        bind -r 'e[0n'
      fi
      ;;
  esac
}
${AUTOFILL_COMMENT_END}
`

export const HISTORY_DIR = path.join(os.homedir(), '.quco')
export const HISTORY_FILE = path.join(HISTORY_DIR, 'history.json')
export const MAX_HISTORY_ENTRIES = 100

export const MAX_SHELL_CONFIG_BACKUPS = 3

export const VERSION = version
