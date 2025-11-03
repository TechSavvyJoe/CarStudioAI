/**
 * Sanitizes error messages to prevent leaking internal system details
 */

export function getSafeErrorMessage(error: unknown): string {
  if (!error) {
    return 'An unexpected error occurred. Please try again.';
  }

  const errorMessage =
    error instanceof Error
      ? error.message
      : String(error);

  // Check for specific error patterns and return user-friendly messages
  if (/invalid api key/i.test(errorMessage)) {
    return 'Authentication failed. Please check your credentials.';
  }

  if (/network|fetch|cors/i.test(errorMessage)) {
    return 'Network error. Please check your connection and try again.';
  }

  if (/timeout/i.test(errorMessage)) {
    return 'The request took too long. Please try again.';
  }

  if (/unauthorized|403|401/i.test(errorMessage)) {
    return 'You do not have permission to perform this action.';
  }

  if (/not found|404/i.test(errorMessage)) {
    return 'The requested resource was not found.';
  }

  if (/already exists|duplicate/i.test(errorMessage)) {
    return 'This resource already exists.';
  }

  if (/quota|rate limit|429/i.test(errorMessage)) {
    return 'Too many requests. Please wait a moment and try again.';
  }

  if (/database|sql|query/i.test(errorMessage)) {
    return 'A database error occurred. Please try again later.';
  }

  // Default safe message for unknown errors
  return 'An unexpected error occurred. Please try again.';
}
