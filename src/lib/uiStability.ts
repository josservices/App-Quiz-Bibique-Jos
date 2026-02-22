export const UI_ERROR_STABILIZATION_MS = 300;

export function isLatestRequest(currentToken: number, candidateToken: number): boolean {
  return currentToken === candidateToken;
}

interface DeferredErrorGateInput {
  isLatest: boolean;
  isLoading: boolean;
  isPreparing: boolean;
}

export function canDisplayDeferredError(input: DeferredErrorGateInput): boolean {
  const { isLatest, isLoading, isPreparing } = input;
  return isLatest && !isLoading && !isPreparing;
}
