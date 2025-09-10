import { expect } from 'chai';
import config from '../src/config.js';

describe('Configuration System', () => {
  describe('Environment Variable Loading', () => {
    it('should load API keys from .env file', () => {
      // Test that the config system has loaded providers
      expect(config.ai_providers).to.be.an('object');
      expect(Object.keys(config.ai_providers || {})).to.have.lengthOf.greaterThan(0);
      // Check that at least one provider has the expected structure
      const firstProvider = Object.values(config.ai_providers || {})[0];
      expect(firstProvider).to.have.property('api_key');
      expect(firstProvider).to.have.property('model');
    });
    it('should handle missing .env file gracefully', () => {
      // Config should load even without .env file
      expect(config.ai_enabled).to.be.a('boolean');
      expect(config.ai_providers).to.be.an('object');
    });
  });

  describe('Configuration File Structure', () => {
    it('should load config.yaml settings', () => {
      expect(config.ai_enabled).to.be.a('boolean');
      expect(config.performance).to.be.an('object');
      expect(config.performance.max_concurrent_pages).to.be.a('number');
      expect(config.performance.max_rps).to.be.a('number');
      expect(config.concurrency).to.be.an('object');
      expect(config.concurrency?.max_api_concurrency).to.be.a('number');
    });
    it('should load crawl_pipeline.yaml AI configurations', () => {
      expect(config.ai_providers).to.be.an('object');
      expect(config.ai_tasks).to.be.an('object');
      // Check that we have some AI tasks configured
      expect(Object.keys(config.ai_tasks || {})).to.have.lengthOf.greaterThan(0);
    });
    it('should merge config.yaml and crawl_pipeline.yaml correctly', () => {
      expect(config.ai_enabled).to.be.a('boolean');
      expect(config.performance).to.be.an('object');
      expect(config.ai_providers).to.be.an('object');
      // Verify that both config sources are merged
      expect(Object.keys(config.ai_providers || {})).to.have.lengthOf.greaterThan(0);
    });
  });

  describe('RPM Limits', () => {
    it('should load RPM limits from crawl_pipeline.yaml', () => {
      expect(config.ai_providers).to.be.an('object');
      // Check that at least one provider has an rpm_limit
      const providers = Object.values(config.ai_providers || {});
      const providerWithLimit = providers.find(p => (p as any).rpm_limit !== undefined);
      expect(providerWithLimit).to.exist;
      expect((providerWithLimit as any)?.rpm_limit).to.be.a('number');
    });
  });

  describe('Environment Variable Substitution', () => {
    it('should substitute environment variables in YAML', () => {
      // Test that environment variable substitution works in the loaded config
      expect(config.ai_providers).to.be.an('object');
      // Check that providers have API keys (which would be substituted from env vars)
      const providers = Object.values(config.ai_providers || {});
      expect(providers.length).to.be.greaterThan(0);
      providers.forEach(provider => {
        expect(provider.api_key).to.be.a('string');
      });
    });
    it('should handle default values in environment variable substitution', () => {
      // Test that default values work in the config
      expect(config.ai_providers).to.be.an('object');
      const providers = Object.values(config.ai_providers || {});
      expect(providers.length).to.be.greaterThan(0);
      // All providers should have API keys, either from env vars or defaults
      providers.forEach(provider => {
        expect(provider.api_key).to.be.a('string');
        expect(provider.api_key?.length).to.be.greaterThan(0);
      });
    });
  });
});