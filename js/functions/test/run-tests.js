// Simple test runner for Windows compatibility
// This runs our tests without the complex ts-node setup

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function runTest(testFile) {
  console.log(`🧪 Running test: ${testFile}`);

  // Set the mock environment variable
  process.env.USE_PUPPETEER_MOCK = 'true';

  const testPath = path.join(__dirname, testFile);

  return new Promise((resolve, reject) => {
    // Use ts-node to run the TypeScript test
    const tsNode = spawn('npx', ['ts-node', '--esm', testPath], {
      stdio: 'inherit',
      shell: true,
      env: { ...process.env, USE_PUPPETEER_MOCK: 'true' }
    });

    tsNode.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ Test passed: ${testFile}`);
        resolve();
      } else {
        console.log(`❌ Test failed: ${testFile} (exit code: ${code})`);
        reject(new Error(`Test failed with exit code ${code}`));
      }
    });

    tsNode.on('error', (error) => {
      console.error(`Error running test ${testFile}:`, error);
      reject(error);
    });
  });
}

async function runAllTests() {
  console.log('🚀 Starting test suite with Puppeteer mock...\n');

  const testFiles = [
    'src/services/__tests__/queue-manager.test.ts',
    'src/cloud-functions/__tests__/crawler.test.ts'
  ];

  for (const testFile of testFiles) {
    try {
      await runTest(testFile);
      console.log('');
    } catch (error) {
      console.error(`Failed to run ${testFile}:`, error);
      process.exit(1);
    }
  }

  console.log('🎉 All tests completed successfully!');
  console.log('✅ Puppeteer mock implementation is working correctly!');
  console.log('✅ No more hanging tests due to browser initialization timeouts!');
}

runAllTests().catch((error) => {
  console.error('Test suite failed:', error);
  process.exit(1);
});