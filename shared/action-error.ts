export function actionErrorMessage(error: { body: unknown; message: string } | null | undefined) {
  if (!error) return '';
  const body = error.body;
  if (typeof body === 'string' && body.trim()) return body;
  if (typeof body === 'object' && body !== null && 'message' in body && typeof body.message === 'string') return body.message;
  return error.message;
}
