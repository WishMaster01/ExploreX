import { AsyncLocalStorage } from "node:async_hooks";
import "server-only";

export type RequestLogContext = {
  requestId: string;
  traceId: string;
};

const requestContext = new AsyncLocalStorage<RequestLogContext>();

export function runWithRequestContext<T>(
  context: RequestLogContext,
  operation: () => T | Promise<T>,
) {
  return requestContext.run(context, operation);
}

export function currentRequestLogContext() {
  return requestContext.getStore();
}
