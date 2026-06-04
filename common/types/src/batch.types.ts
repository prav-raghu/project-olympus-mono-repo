export interface BatchOperationItem<T = unknown> {
  id: string;
  data: T;
}

export interface BatchOperationResult<T = unknown> {
  id: string;
  success: boolean;
  data?: T;
  error?: string;
}

export interface BatchOperationSummary {
  total: number;
  successful: number;
  failed: number;
  results: BatchOperationResult[];
}

export interface BatchOperationOptions {
  continueOnError?: boolean;
  validateBeforeExecute?: boolean;
  maxBatchSize?: number;
}

export enum BatchOperationType {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  CUSTOM = 'CUSTOM',
}

export interface BatchOperation<T = unknown> {
  type: BatchOperationType;
  items: BatchOperationItem<T>[];
  options?: BatchOperationOptions;
}
