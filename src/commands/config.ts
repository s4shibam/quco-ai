import chalk from 'chalk'
import { getConfigFromEnv, getShellRcPath } from '../config'
import { HISTORY_FILE, SUPPORTED_MODELS } from '../constants'

export const showConfig = (): void => {
  const config = getConfigFromEnv()

  if (!config) {
    console.log(chalk.yellow('Quco is not configured yet.'))
    console.log(chalk.yellow('Run: quco --setup'))
    process.exit(0)
  }

  const model = SUPPORTED_MODELS.find((m) => m.id === config.modelId)
  const rcPath = getShellRcPath()

  console.log(chalk.bold('\nQuco Configuration:\n'))
  console.log(`${chalk.cyan('Model:')} ${model?.name || config.modelId}`)
  console.log(`${chalk.cyan('Provider:')} ${model?.provider || 'unknown'}`)
  console.log(`${chalk.cyan('API Key:')} ${maskApiKey({ apiKey: config.apiKey })}`)
  console.log(`${chalk.cyan('Config File:')} ${rcPath}`)
  console.log(`${chalk.cyan('History File:')} ${HISTORY_FILE}\n`)
}

const maskApiKey = ({ apiKey }: { apiKey: string }): string => {
  if (apiKey.length <= 8) {
    return '***'
  }
  return `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}`
}
