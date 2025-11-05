import chalk from 'chalk'
import { getConfigFromEnv, validateModelId } from '../config'
import { generateCommand } from '../llm'
import {
  copyToClipboard,
  formatError,
  isNetworkError,
  isShellAutofillActive,
  validateCommand
} from '../utils'

export const generateCommandFromPrompt = async ({ prompt }: { prompt: string }): Promise<void> => {
  // Get config from environment
  const config = getConfigFromEnv()

  if (!config) {
    console.error(chalk.red('Error: Quco is not configured.'))
    console.error(chalk.yellow('Please run: quco --setup'))
    process.exit(1)
  }

  // Validate model ID
  if (!validateModelId({ modelId: config.modelId })) {
    console.error(chalk.red(`Error: Invalid model ID '${config.modelId}'.`))
    console.error(chalk.yellow('Please run: quco --setup to reconfigure'))
    process.exit(1)
  }

  try {
    // Call LLM to generate command
    const response = await generateCommand({
      prompt,
      modelId: config.modelId,
      apiKey: config.apiKey
    })

    // Validate the generated command
    const validation = validateCommand({ rawOutput: response.command })

    if (!validation.valid || !validation.command) {
      console.error(chalk.red(`Error: ${validation.error || 'Invalid command'}`))
      process.exit(1)
    }

    // Output the validated command
    await outputCommand({ command: validation.command })
  } catch (error) {
    if (isNetworkError({ error })) {
      console.error(chalk.red('Error: Network request failed.'))
      console.error(chalk.yellow('Please check your internet connection and API key.'))
    } else {
      console.error(chalk.red(`Error: ${formatError({ error })}`))
    }
    process.exit(1)
  }
}

const outputCommand = async ({ command }: { command: string }): Promise<void> => {
  // Only copy to clipboard if autofill is not active
  // When autofill is active, the command is loaded directly into the shell buffer
  if (isShellAutofillActive()) {
    console.log(command)
  } else {
    console.log(`$ ${command}`)
    const copied = await copyToClipboard({ text: command })
    if (copied) {
      console.log(chalk.green('✓ Copied to clipboard'))
    }
  }
}
