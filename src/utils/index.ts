export function createSuccessResponse(status: number, data: any) {
  return { success: true, status, data };
}

export function createErrorResponse(status: number, message: string) {
  return { success: false, status, message };
}