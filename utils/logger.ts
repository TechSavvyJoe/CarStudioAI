/**
 * Conditional logger that only logs in development mode
 * Production builds will have logging stripped out
 */

const isDev = import.meta.env.DEV;

export const logger = {
  debug: (...args: unknown[]): void => {
    if (isDev) {
      console.debug(...args);
    }
  },

  info: (...args: unknown[]): void => {
    if (isDev) {
      console.info(...args);
    }
  },

  log: (...args: unknown[]): void => {
    if (isDev) {
      console.log(...args);
    }
  },

  warn: (...args: unknown[]): void => {
    // Always log warnings, even in production
    console.warn(...args);
  },

  error: (...args: unknown[]): void => {
    // Always log errors, even in production
    console.error(...args);
  },
};
