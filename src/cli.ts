#!/usr/bin/env node

// Force color support
process.env.FORCE_COLOR = '1'

import { Command } from 'commander'
import { autofillOffCommand, autofillOnCommand } from './commands/autofill'
import { showConfig } from './commands/config'
import { generateCommandFromPrompt } from './commands/generate'
import { showHelp } from './commands/help'
import { setupCommand } from './commands/setup'
import { VERSION } from './constants'

const program = new Command()

program
  .name('quco')
  .description('Turn natural language into shell commands using AI')
  .version(VERSION, '-v, --version', 'Output the current version')
  .helpOption(false)

// Add options
program.option('--setup', 'Interactive setup and configuration')
program.option('--config', 'Show current configuration')
program.option('--autofill-on', 'Enable autofill (Commands will be loaded into shell buffer)')
program.option('--autofill-off', 'Disable autofill (Commands will be copied to clipboard)')

// Handle natural language prompts (default behavior)
program.arguments('[prompt...]').action(async (prompt: string[], options) => {
  // Handle --setup flag
  if (options.setup) {
    await setupCommand()
    return
  }

  // Handle --autofill-on flag
  if (options.autofillOn) {
    await autofillOnCommand()
    return
  }

  // Handle --autofill-off flag
  if (options.autofillOff) {
    await autofillOffCommand()
    return
  }

  // Handle --config flag
  if (options.config) {
    showConfig()
    return
  }

  // If no arguments and no flags, show help
  if (prompt.length === 0) {
    showHelp()
    return
  }

  // Generate command from prompt
  const promptText = prompt.join(' ')
  await generateCommandFromPrompt({ prompt: promptText })
})

// Parse arguments
program.parse(process.argv)
