import { expect } from 'chai';
import { RobotsChecker } from '../robots-checker.js';
import axios from 'axios';
import { before } from 'mocha';
import { RobotsParser } from 'robots';
describe('RobotsChecker', () => {
    let checker;
    before(() => {
        checker = new RobotsChecker();
    });
    it('should disallow access to a disallowed path', async () => {
        const originalAxiosGet = axios.get;
        const robotsTxt = 'User-agent: *\nDisallow: /private';
        axios.get = async () => Promise.resolve({ data: robotsTxt });
        const parser = new RobotsParser();
        const lines = robotsTxt.split('\n');
        parser.parse(lines);
        console.log('Robots parser canFetch /private:', parser.canFetchSync('*', '/private'));
        console.log('Robots parser canFetch /public:', parser.canFetchSync('*', '/public'));
        const result = await checker.checkAccess('http://example.com/private', '*', '/private');
        expect(result.allowed).to.be.false;
        axios.get = originalAxiosGet;
    });
    it('should allow access to allowed paths', async () => {
        const originalAxiosGet = axios.get;
        const robotsTxt = 'User-agent: *\nDisallow: /private';
        axios.get = async () => Promise.resolve({ data: robotsTxt });
        const result = await checker.checkAccess('http://example.com/public', '*', '/public');
        expect(result.allowed).to.be.true;
        axios.get = originalAxiosGet;
    });
    it('should handle missing robots.txt gracefully', async () => {
        const originalAxiosGet = axios.get;
        axios.get = async () => { throw new Error('Not found'); };
        const result = await checker.checkAccess('http://example.com/test', '*', '/test');
        expect(result.allowed).to.be.true;
        expect(result.reason).to.include('Failed to fetch');
        axios.get = originalAxiosGet;
    });
});
//# sourceMappingURL=robots-checker.test.js.map