export interface IScheduledJob {
  id: string;
  name: string;
  cronExpr: string;
  payload?: unknown;
  status: string;
  lastRunAt?: Date | null;
  nextRunAt?: Date | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
