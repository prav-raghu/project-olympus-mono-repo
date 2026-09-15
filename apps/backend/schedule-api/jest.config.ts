import type { Config } from "jest";

const config: Config = {
    moduleFileExtensions: ["js", "json", "ts"],
    rootDir: ".",
    testRegex: ".*\.spec\.ts$",
    transform: {
        "^.+\.(t|j)s$": "ts-jest",
    },
    collectCoverageFrom: ["src/**/*.(t|j)s"],
    coverageDirectory: "./coverage",
    coverageThreshold: {
        global: {
            branches: 75,
            functions: 80,
            lines: 80,
            statements: 80,
        },
    },
    testEnvironment: "node",
    roots: ["<rootDir>/tests/"],
    setupFiles: ["<rootDir>/tests/setup.ts"],
};

export default config;
