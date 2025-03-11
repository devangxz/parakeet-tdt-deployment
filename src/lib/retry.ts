import logger from "./logger";

interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffFactor: number;
  retryErrors?: string[];
}

interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  attempts: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  config: RetryConfig = {
    maxRetries: 3,
    initialDelayMs: 1000,
    maxDelayMs: 32000,
    backoffFactor: 2
  }
): Promise<RetryResult<T>> {
  let attempts = 0;
  let delay = config.initialDelayMs;

  while (attempts < config.maxRetries) {
    try {
      attempts++;
      const result = await operation();
      return {
        success: true,
        data: result,
        attempts
      };
    } catch (error: unknown) {
      if (
        config.retryErrors &&
        !config.retryErrors.some((errMsg) => {
          const errorStr = (error as Error)?.message?.toLowerCase() || (error as Error)?.toString().toLowerCase();
          return new RegExp(errMsg, "i").test(errorStr);
        })
      ) {
        return {
          success: false,
          error: error as Error,
          attempts
        };
      }

      if (attempts === config.maxRetries) {
        return {
          success: false,
          error: error as Error,
          attempts
        };
      }

      logger.info(`Attempt ${attempts} failed. Retrying in ${delay}ms`);
      logger.error('Error:', (error as Error).stack ?? (error as Error).toString());

      await sleep(delay);
      delay = Math.min(delay * config.backoffFactor, config.maxDelayMs);
    }
  }
  throw new Error('Unexpected end of retry loop');
}