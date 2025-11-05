import { exec } from 'node:child_process'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { promisify } from 'node:util'
import { DESTRUCTIVE_PATTERNS, MAX_SHELL_CONFIG_BACKUPS } from './constants'
import type { TValidationResult } from './types'

const execAsync = promisify(exec)

export const copyToClipboard = async ({ text }: { text: string }): Promise<boolean> => {
  try {
    // macOS specific
    await execAsync(`echo ${escapeForShell({ text })} | pbcopy`)
    return true
  } catch (_error) {
    return false
  }
}

export const escapeForShell = ({ text }: { text: string }): string => {
  // Escape single quotes and wrap in single quotes
  return `'${text.replace(/'/g, "'\\''")}'`
}

export const formatError = ({ error }: { error: unknown }): string => {
  if (error instanceof Error) {
    return error.message
  }
  return String(error)
}

export const isNetworkError = ({ error }: { error: unknown }): boolean => {
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    return (
      message.includes('network') ||
      message.includes('econnrefused') ||
      message.includes('enotfound') ||
      message.includes('timeout') ||
      message.includes('fetch failed')
    )
  }
  return false
}

export const isShellAutofillActive = (): boolean => {
  // Check if being called from within the shell autofill function
  // The shell autofill function sets a specific environment or calling pattern
  // This can be detected by checking if the parent process is a shell function
  // or by checking specific environment variables that might be set

  // For now, a simple heuristic: if QUCO_SHELL_AUTOFILL is set
  // This can be set by the shell autofill function
  return process.env.QUCO_SHELL_AUTOFILL === 'true'
}

export const cleanupOldBackups = ({ rcPath }: { rcPath: string }): void => {
  try {
    const dir = path.dirname(rcPath)
    const baseFilename = path.basename(rcPath)
    const backupPattern = `${baseFilename}.quco-backup-`

    // Get all backup files
    const files = fs.readdirSync(dir)
    const backupFiles = files
      .filter((file) => file.startsWith(backupPattern))
      .map((file) => {
        const timestampStr = file.replace(backupPattern, '')
        const timestamp = Number.parseInt(timestampStr, 10)
        return {
          filename: file,
          fullPath: path.join(dir, file),
          timestamp: Number.isNaN(timestamp) ? 0 : timestamp
        }
      })
      .sort((a, b) => b.timestamp - a.timestamp) // Sort newest first

    // Keep only the MAX_BACKUPS most recent, delete the rest
    if (backupFiles.length > MAX_SHELL_CONFIG_BACKUPS) {
      const filesToDelete = backupFiles.slice(MAX_SHELL_CONFIG_BACKUPS)
      for (const file of filesToDelete) {
        fs.unlinkSync(file.fullPath)
      }
    }
  } catch {
    // Silently fail - cleanup is not critical
  }
}

export const validateCommand = ({ rawOutput }: { rawOutput: string }): TValidationResult => {
  // Step 1: Trim whitespace
  const trimmed = rawOutput.trim()

  if (!trimmed) {
    return {
      valid: false,
      error: 'LLM returned empty output'
    }
  }

  // Step 2: Check for multiple lines
  const lines = trimmed.split('\n').filter((line) => line.trim().length > 0)
  if (lines.length > 1) {
    return {
      valid: false,
      error: 'LLM returned multiple lines. Expected exactly one command.'
    }
  }

  const command = lines[0].trim()

  // Step 3: Remove any markdown code block formatting if present
  const cleanCommand = command
  if (cleanCommand.startsWith('```') || cleanCommand.startsWith('`')) {
    return {
      valid: false,
      error: 'LLM returned command with markdown formatting. Expected plain command.'
    }
  }

  // Step 4: Check against destructive patterns
  for (const pattern of DESTRUCTIVE_PATTERNS) {
    if (pattern.test(cleanCommand)) {
      return {
        valid: false,
        error: 'Command matches destructive pattern and is not allowed for safety reasons'
      }
    }
  }

  // Step 5: Basic sanity checks
  if (cleanCommand.includes('\0')) {
    return {
      valid: false,
      error: 'Command contains null bytes'
    }
  }

  // Check for commands starting with invalid characters
  if (/^[|&;<>]/.test(cleanCommand)) {
    return {
      valid: false,
      error: 'Command cannot start with pipe, redirect, or control operators'
    }
  }

  // Check for suspicious sudo patterns (only highly dangerous combinations)
  // Allow legitimate sudo usage but block dangerous patterns like sudo rm -rf
  if (cleanCommand.match(/sudo\s+rm\s+-[rf]+.*\//)) {
    return {
      valid: false,
      error: 'Command contains dangerous sudo rm combination'
    }
  }

  if (cleanCommand.match(/sudo\s+(mkfs|dd|fdisk|parted)/)) {
    return {
      valid: false,
      error: 'Command contains dangerous sudo disk operation'
    }
  }

  return {
    valid: true,
    command: cleanCommand
  }
}
