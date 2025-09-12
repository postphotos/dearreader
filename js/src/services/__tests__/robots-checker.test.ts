
import { expect } from 'chai';
import { RobotsChecker } from '../robots-checker.js';
import axios from 'axios';
import { before } from 'mocha';

describe('RobotsChecker', () => {
    let checker: RobotsChecker;

    before(() => {
        checker = new RobotsChecker();
    });

    it('should allow access when no robots.txt is present', async () => {
        const originalAxiosGet = axios.get;
        (axios.get as any) = async () => Promise.reject({ response: { status: 404 } });
        const result = await checker.checkAccess('http://example.com/page');
        expect(result.allowed).to.be.true;
        axios.get = originalAxiosGet;
    });

    it('should allow access when robots.txt is empty', async () => {
        const originalAxiosGet = axios.get;
        (axios.get as any) = async () => Promise.resolve({ data: '' });
        const result = await checker.checkAccess('http://example.com/page');
        expect(result.allowed).to.be.true;
        axios.get = originalAxiosGet;
    });

    it('should disallow access to a disallowed path', async () => {
        const originalAxiosGet = axios.get;
        const robotsTxt = 'User-agent: *\nDisallow: /private';
        (axios.get as any) = async () => Promise.resolve({ data: robotsTxt });
        const result = await checker.checkAccess('http://example.com/private', '*', '/private');
        expect(result.allowed).to.be.false;
        axios.get = originalAxiosGet;
    });

    it('should allow access to an allowed path', async () => {
        const originalAxiosGet = axios.get;
        const robotsTxt = 'User-agent: *\nAllow: /public';
        (axios.get as any) = async () => Promise.resolve({ data: robotsTxt });
        const result = await checker.checkAccess('http://example.com/public', '*', '/public');
        expect(result.allowed).to.be.true;
        axios.get = originalAxiosGet;
    });

    it('should use the correct rules for a specific user agent', async () => {
        const originalAxiosGet = axios.get;
        const robotsTxt = 'User-agent: MyBot\nDisallow: /secret\nUser-agent: *\nAllow: /';
        (axios.get as any) = async () => Promise.resolve({ data: robotsTxt });
        const result = await checker.checkAccess('http://example.com/secret', 'MyBot', '/secret');
        expect(result.allowed).to.be.false;
        axios.get = originalAxiosGet;
    });

    it('should return true from isAllowed when access is allowed', async () => {
        const originalAxiosGet = axios.get;
        const robotsTxt = 'User-agent: *\nAllow: /';
        (axios.get as any) = async () => Promise.resolve({ data: robotsTxt });
        const allowed = await checker.isAllowed('http://example.com/any');
        expect(allowed).to.be.true;
        axios.get = originalAxiosGet;
    });

    it('should return a default crawl delay', async () => {
        const originalAxiosGet = axios.get;
        (axios.get as any) = async () => Promise.resolve({ data: '' });
        const delay = await checker.getCrawlDelay('http://example.com');
        expect(delay).to.equal(1);
        axios.get = originalAxiosGet;
    });
});
