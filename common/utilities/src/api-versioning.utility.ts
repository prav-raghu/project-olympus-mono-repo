export interface ApiVersion {
  version: string;
  isDeprecated: boolean;
  sunsetDate?: string;
  isCurrent: boolean;
}

export class ApiVersionManager {
  private readonly supportedVersions: Map<string, ApiVersion>;

  constructor() {
    this.supportedVersions = new Map([
      [
        'v1',
        {
          version: 'v1',
          isDeprecated: true,
          sunsetDate: '2026-12-31',
          isCurrent: false,
        },
      ],
      [
        'v2',
        {
          version: 'v2',
          isDeprecated: false,
          isCurrent: true,
        },
      ],
    ]);
  }

  public isVersionSupported(version: string): boolean {
    return this.supportedVersions.has(version);
  }

  public getVersionInfo(version: string): ApiVersion | undefined {
    return this.supportedVersions.get(version);
  }

  public getCurrentVersion(): string {
    const current = Array.from(this.supportedVersions.values()).find((v) => v.isCurrent);
    return current?.version || 'v1';
  }

  public getSupportedVersions(): string[] {
    return Array.from(this.supportedVersions.keys());
  }

  public getDeprecatedVersions(): ApiVersion[] {
    return Array.from(this.supportedVersions.values()).filter((v) => v.isDeprecated);
  }
}

export const apiVersionManager = new ApiVersionManager();
