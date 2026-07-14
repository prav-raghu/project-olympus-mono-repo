import { JobsService } from "../../../src/modules/jobs/jobs.service";
import { createMockPrisma } from "../../mocks/prisma.mock";

jest.mock("../../../src/jobs/webhook-processor.job", () => ({
    WebhookProcessorJob: jest.fn().mockImplementation(() => ({
        start: jest.fn(),
        stop: jest.fn(),
    })),
}));

describe("JobsService", () => {
    let service: JobsService;
    let mockPrisma: ReturnType<typeof createMockPrisma>;

    beforeEach(() => {
        mockPrisma = createMockPrisma();
        service = new JobsService(mockPrisma as never);
    });

    afterEach(() => jest.clearAllMocks());

    it("should be defined", () => {
        expect(service).toBeDefined();
    });

    describe("onApplicationBootstrap", () => {
        it("registers and starts the webhook processor job", () => {
            service.onApplicationBootstrap();

            const jobs = (service as unknown as Record<string, unknown>)["jobs"] as Map<string, { start: jest.Mock; stop: jest.Mock }>;
            const webhookJob = jobs.get("webhookProcessor");
            expect(webhookJob).toBeDefined();
            expect(webhookJob?.start).toHaveBeenCalled();
        });
    });

    describe("onApplicationShutdown", () => {
        it("stops all registered jobs", () => {
            service.onApplicationBootstrap();
            service.onApplicationShutdown();

            const jobs = (service as unknown as Record<string, unknown>)["jobs"] as Map<string, { start: jest.Mock; stop: jest.Mock }>;
            const webhookJob = jobs.get("webhookProcessor");
            expect(webhookJob?.stop).toHaveBeenCalled();
        });

        it("does not throw when no jobs were ever started", () => {
            expect(() => service.onApplicationShutdown()).not.toThrow();
        });
    });
});
