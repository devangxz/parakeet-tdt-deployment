/* eslint-disable @typescript-eslint/no-unused-vars */
import path from 'path'

import winston, { format } from 'winston'

const CUSTOM_LEVELS = {
  crit: 0,
  error: 1,
  warn: 2,
  info: 3,
}

// Custom format to include the caller file
const callerInfoFormat = format((info) => {
  const getCallerInfo = (): string[] => {
    const originalFunc = Error.prepareStackTrace
    try {
      const err = new Error()
      Error.prepareStackTrace = (_, stack) => stack
      const stack = err.stack as unknown as NodeJS.CallSite[]
      Error.prepareStackTrace = originalFunc

      if (stack && stack.length > 9) {
        const allCallerInfo = []
        // 10th item in the stack has the applciation code
        const caller = stack[10]
        const fileName = caller.getFileName()
        const relativePath = path.relative(process.cwd(), fileName ?? '-')
        let relativePathWithoutSrcDist = relativePath.replace('src\\', '')
        relativePathWithoutSrcDist = relativePathWithoutSrcDist.replace(
          'dist\\',
          ''
        )
        allCallerInfo.push(relativePathWithoutSrcDist)
        const functionName = caller.getFunctionName() ?? '-'
        allCallerInfo.push(functionName)
        const lineNumber = caller.getLineNumber() ?? '-'
        allCallerInfo.push(String(lineNumber))
        return allCallerInfo
      }
    } catch (error) {
      return ['', '', '']
    } finally {
      Error.prepareStackTrace = originalFunc
    }
    return ['', '', '']
  }

  const callerInfo = getCallerInfo()
  info.callerFile = callerInfo[0]
  info.callerFunction = callerInfo[1]
  info.callerLine = callerInfo[2]
  return info
})

// <TIME_STAMP - 'YYYY-MM-DD HH:mm:ss'> <LEVEL> <FILE> <FUNCTION> <LINE> <MESSAGE>
// e.g. 2024-04-17 14:59:48 WARN testing logging

// Custom format to include the caller function and line number
const CUSTOM_FORMAT = winston.format.printf(
  ({ level, message, timestamp, callerFile, callerFunction, callerLine }) => {
    const formattedLevel = level.padEnd(5).slice(-5)
    const formattedCallerFile = callerFile?.padEnd(30).slice(-30)
    const formattedCallerFunction = callerFunction?.padEnd(20).slice(-20)
    const formattedCallerLine = callerLine?.toString().padStart(3, ' ')
    return `${timestamp} ${formattedLevel.toUpperCase()} ${formattedCallerFile} ${formattedCallerLine} : ${message}`
  }
)

const TIME_STAMP_FORMAT = 'YYYY-MM-DD HH:mm:ss'

const logger = winston.createLogger({
  levels: CUSTOM_LEVELS,
  format: winston.format.combine(
    callerInfoFormat(),
    winston.format.timestamp({ format: TIME_STAMP_FORMAT }),
    CUSTOM_FORMAT
  ),
  transports: [new winston.transports.Console()],
})

export default logger
