// Application-specific JavaScript for DearReader
// This file contains app-specific functionality

class DearReaderApp {
  constructor() {
    this.init();
  }

  init() {
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setup());
    } else {
      this.setup();
    }
  }

  setup() {
    // Add any app-specific initialization here
    this.setupKeyboardShortcuts();
    this.setupErrorHandling();
    this.setupPerformanceMonitoring();
  }

  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Ctrl/Cmd + K to focus search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const urlInput = document.getElementById('url');
        if (urlInput) {
          urlInput.focus();
          urlInput.select();
        }
      }

      // Escape to clear results
      if (e.key === 'Escape') {
        const result = document.getElementById('result');
        if (result && result.style.display !== 'none') {
          result.style.display = 'none';
        }
      }
    });
  }

  setupErrorHandling() {
    // Global error handler
    window.addEventListener('error', (e) => {
      console.error('Application error:', e.error);
      if (window.Utils) {
        window.Utils.showStatus('An error occurred. Please try again.', 'error');
      }
    });

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (e) => {
      console.error('Unhandled promise rejection:', e.reason);
      if (window.Utils) {
        window.Utils.showStatus('Network error occurred.', 'error');
      }
    });
  }

  setupPerformanceMonitoring() {
    // Monitor page load performance
    window.addEventListener('load', () => {
      if ('performance' in window) {
        const perfData = performance.getEntriesByType('navigation')[0];
        const loadTime = perfData.loadEventEnd - perfData.fetchStart;
        console.log(`Page loaded in ${loadTime}ms`);
      }
    });
  }

  // Static method to get app instance
  static getInstance() {
    if (!DearReaderApp.instance) {
      DearReaderApp.instance = new DearReaderApp();
    }
    return DearReaderApp.instance;
  }
}

// Initialize the app
const app = DearReaderApp.getInstance();

// Export for use in other scripts
window.DearReaderApp = DearReaderApp;