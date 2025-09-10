#!/usr/bin/env node

// Debug script to trace what keeps the process alive after tests complete
import { execSync } from 'child_process';

console.log('🔍 Starting debug trace for test hanging issue...');

// Function to check active handles and timers
function logActiveHandles() {
  console.log('\n📊 Active handles and timers:');

  // Log active timers
  const timers = process._getActiveHandles().filter(h => h.constructor.name === 'Timeout');
  console.log(`⏲️  Active timers: ${timers.length}`);
  timers.forEach((timer, i) => {
    console.log(`   Timer ${i + 1}: ${timer._idleTimeout}ms`);
  });

  // Log active handles
  const handles = process._getActiveHandles();
  console.log(`🔗 Active handles: ${handles.length}`);
  handles.forEach((handle, i) => {
    console.log(`   Handle ${i + 1}: ${handle.constructor.name}`);
  });

  // Log active requests
  const requests = process._getActiveRequests();
  console.log(`📤 Active requests: ${requests.length}`);
}

// Monitor process state before tests
console.log('\n🏁 Initial process state:');
logActiveHandles();

// Simulate what the test environment does
console.log('\n🧪 Loading test dependencies...');

// Check if there are any lingering processes
console.log('\n🔍 Checking for lingering processes...');
try {
  const processes = execSync('ps aux | grep -E "(chromium|node)" | grep -v grep', { encoding: 'utf8' });
  console.log('Found processes:', processes);
} catch (error) {
  console.log('No matching processes found or error:', error.message);
}

console.log('\n📊 Process state after initial check:');
logActiveHandles();

// Set up a forced exit timer
console.log('\n⏰ Setting up forced exit in 5 seconds...');
setTimeout(() => {
  console.log('\n🚪 Forcing process exit due to hanging resources');
  console.log('📊 Final process state:');
  logActiveHandles();
  process.exit(0);
}, 5000);

console.log('\n✅ Debug trace setup complete. Waiting for natural exit or timeout...');
