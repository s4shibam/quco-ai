import * as fs from 'node:fs'
import { confirm } from '@inquirer/prompts'
import chalk from 'chalk'
import { getCurrentShellType, getShellRcPath } from '../config'
import {
  AUTOFILL_COMMENT_END,
  AUTOFILL_COMMENT_START,
  BASH_AUTOFILL,
  ZSH_AUTOFILL
} from '../constants'
import { cleanupOldBackups } from '../utils'

export const autofillOnCommand = async (): Promise<void> => {
  const shellType = getCurrentShellType()

  if (shellType === 'unknown') {
    console.log(chalk.yellow('Warning: Could not detect shell type (zsh or bash).'))
    console.log(chalk.yellow('Autofill is only supported for zsh and bash.\n'))
    process.exit(1)
  }

  console.log(chalk.bold('\n🔧 Autofill Setup\n'))
  console.log(
    'This will add a shell function to your shell configuration that allows generated commands to be loaded directly into your shell buffer.\n'
  )

  const rcPath = getShellRcPath()
  console.log(`Target file: ${chalk.cyan(rcPath)}\n`)

  // Check if autofill already exists
  if (fs.existsSync(rcPath)) {
    const content = fs.readFileSync(rcPath, 'utf-8')
    if (content.includes(AUTOFILL_COMMENT_START)) {
      console.log(chalk.yellow('Autofill is already enabled.\n'))

      const reinstall = await confirm({
        message: 'Do you want to reinstall it?',
        default: false
      })
      if (!reinstall) {
        console.log(chalk.dim('✗ Cancelled.'))
        process.exit(0)
      }

      // Remove existing autofill
      removeAutofill({ rcPath, content })
    }
  }

  const shouldEnable = await confirm({
    message: `Enable autofill in ${rcPath}?`,
    default: true
  })

  if (!shouldEnable) {
    console.log(chalk.dim('✗ Cancelled.'))
    process.exit(0)
  }

  try {
    // Backup
    if (fs.existsSync(rcPath)) {
      const backupPath = `${rcPath}.quco-backup-${Date.now()}`
      fs.copyFileSync(rcPath, backupPath)
      cleanupOldBackups({ rcPath })
      console.log(chalk.dim(`Backup created: ${backupPath}`))
    }

    // Add autofill
    const autofill = shellType === 'zsh' ? ZSH_AUTOFILL : BASH_AUTOFILL
    fs.appendFileSync(rcPath, `\n${autofill}\n`, 'utf-8')

    console.log(chalk.green('\n✓ Autofill enabled successfully!\n'))
    console.log(
      chalk.yellow(`Please restart your terminal or run: ${chalk.bold(`source ${rcPath}`)}\n`)
    )
  } catch (error) {
    console.error(chalk.red('\n✗ Failed to enable autofill:'))
    console.error(chalk.red((error as Error).message))
    process.exit(1)
  }
}

export const autofillOffCommand = async (): Promise<void> => {
  const shellType = getCurrentShellType()

  if (shellType === 'unknown') {
    console.log(chalk.yellow('Warning: Could not detect shell type (zsh or bash).'))
    console.log(chalk.yellow('Autofill is only supported for zsh and bash.\n'))
    process.exit(1)
  }

  console.log(chalk.bold('\n🔧 Autofill Removal\n'))

  const rcPath = getShellRcPath()
  console.log(`Target file: ${chalk.cyan(rcPath)}\n`)

  // Check if autofill exists
  if (!fs.existsSync(rcPath)) {
    console.log(chalk.yellow('Shell configuration file not found.\n'))
    process.exit(1)
  }

  const content = fs.readFileSync(rcPath, 'utf-8')
  if (!content.includes(AUTOFILL_COMMENT_START)) {
    console.log(chalk.yellow('Autofill is not currently enabled.\n'))
    process.exit(0)
  }

  const shouldDisable = await confirm({
    message: `Disable autofill in ${rcPath}?`,
    default: true
  })

  if (!shouldDisable) {
    console.log(chalk.dim('✗ Cancelled.'))
    process.exit(0)
  }

  try {
    // Backup
    const backupPath = `${rcPath}.quco-backup-${Date.now()}`
    fs.copyFileSync(rcPath, backupPath)
    cleanupOldBackups({ rcPath })
    console.log(chalk.dim(`Backup created: ${backupPath}`))

    // Remove autofill
    removeAutofill({ rcPath, content })

    console.log(chalk.green('\n✓ Autofill disabled successfully!\n'))
    console.log(
      chalk.yellow(`Please restart your terminal or run: ${chalk.bold(`source ${rcPath}`)}\n`)
    )
  } catch (error) {
    console.error(chalk.red('\n✗ Failed to disable autofill:'))
    console.error(chalk.red((error as Error).message))
    process.exit(1)
  }
}

const removeAllAutofillBlocks = (
  content: string,
  startMarker: string,
  endMarker: string
): string => {
  let result = content
  let modified = true

  // Keep removing blocks until none are found
  while (modified) {
    modified = false
    const startIndex = result.indexOf(startMarker)
    const endIndex = result.indexOf(endMarker)

    // Handle complete blocks (both markers present)
    if (startIndex !== -1 && endIndex !== -1 && startIndex < endIndex) {
      const endLineEnd = result.indexOf('\n', endIndex)
      result =
        result.substring(0, startIndex) +
        result.substring(endLineEnd !== -1 ? endLineEnd + 1 : endIndex + endMarker.length)
      modified = true
    }
    // Handle orphaned start marker
    else if (startIndex !== -1 && (endIndex === -1 || startIndex > endIndex)) {
      const nextLineEnd = result.indexOf('\n', startIndex)
      result =
        result.substring(0, startIndex) +
        result.substring(nextLineEnd !== -1 ? nextLineEnd + 1 : startIndex + startMarker.length)
      modified = true
    }
    // Handle orphaned end marker
    else if (endIndex !== -1 && startIndex === -1) {
      const nextLineEnd = result.indexOf('\n', endIndex)
      result =
        result.substring(0, endIndex) +
        result.substring(nextLineEnd !== -1 ? nextLineEnd + 1 : endIndex + endMarker.length)
      modified = true
    }
  }

  return result
}

const removeAutofill = ({ rcPath, content }: { rcPath: string; content: string }): void => {
  const newContent = removeAllAutofillBlocks(content, AUTOFILL_COMMENT_START, AUTOFILL_COMMENT_END)
  fs.writeFileSync(rcPath, `${newContent.trimEnd()}\n`, 'utf-8')
}
