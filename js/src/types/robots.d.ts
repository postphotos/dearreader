declare module 'robots' {
  export class RobotsParser {
    constructor(url?: string, options?: any, after_parse?: Function);
    setUrl(url: string, callback?: Function): void;
    parse(lines: string[]): this;
    canFetch(userAgent: string, url: string, callback?: Function): void;
    canFetchSync(userAgent: string, url: string): boolean;
    getCrawlDelay(userAgent: string): number;
    getSitemaps(callback?: Function): void;
    getDisallowedPaths(userAgent: string): string[];
    toString(): string;
    toStringLite(): string;
  }
}