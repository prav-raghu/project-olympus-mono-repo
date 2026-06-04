import { CronSchedulerService } from "../../../src/services/cron-scheduler.service";
import { createMockPrisma } from "../../mocks/prisma.mock";

jest.mock("../../../src/jobs/webhook-processor.job", () => ({
    WebhookProcessorJob: jest.fn().mockImplementation(() => ({
        start: jest.fn(),
        stop: jest.fn(),
    })),
}));

describe("CronSchedulerService", () => {
    let service: CronSchedulerService;
    let mockPrisma: ReturnType<typeof createMockPrisma>;
    let mockEmailService: { sendMail: jest.Mock };

    beforeEach(() => {
        mockPrisma = createMockPrisma();
        mockEmailService = { sendMail: jest.fn() };
        service = new CronSchedulerService(mockPrisma as never, mockEmailService as never);
    });

    describe("startAll", () => {
        it("should start all registered jobs", () => {
            service.startAll();

            const jobs = (service as unknown as Record<string, unknown>)["jobs"] as Map<string, { start: jest.Mock; stop: jest.Mock }>;
            for (const [, job] of jobs) {
                expect(job.start).toHaveBeenCalled();
            }
        });
    });

    describe("stopAll", () => {
        it("should stop all registered jobs", () => {
            service.stopAll();

            const jobs = (service as unknown as Record<string, unknown>)["jobs"] as Map<string, { start: jest.Mock; stop: jest.Mock }>;
            for (const [, job] of jobs) {
                expect(job.stop).toHaveBeenCalled();
            }
        });
    });

    describe("startJob", () => {
        it("should start a specific job by name", () => {
            service.startJob("webhookProcessor");

            const jobs = (service as unknown as Record<string, unknown>)["jobs"] as Map<string, { start: jest.Mock; stop: jest.Mock }>;
            const webhookJob = jobs.get("webhookProcessor");
            expect(webhookJob?.start).toHaveBeenCalled();
        });

        it("should throw when job not found", () => {
            expect(() => service.startJob("nonexistent")).toThrow("Job not found: nonexistent");
        });
    });

    describe("stopJob", () => {
        it("should stop a specific job by name", () => {
            service.stopJob("webhookProcessor");

            const jobs = (service as unknown as Record<string, unknown>)["jobs"] as Map<string, { start: jest.Mock; stop: jest.Mock }>;
            const webhookJob = jobs.get("webhookProcessor");
            expect(webhookJob?.stop).toHaveBeenCalled();
        });

        it("should throw when job not found", () => {
            expect(() => service.stopJob("nonexistent")).toThrow("Job not found: nonexistent");
        });
    });
});
