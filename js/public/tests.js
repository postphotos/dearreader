// Tests for DearReader public JavaScript files
// This file contains unit tests for main.js and app.js functionality

describe('Utils', () => {
  beforeEach(() => {
    // Setup DOM elements for testing
    document.body.innerHTML = `
      <div id="status" class="status" style="display: none;"></div>
    `;
  });

  afterEach(() => {
    // Clean up
    document.body.innerHTML = '';
    jest.clearAllTimers();
  });

  describe('copyToClipboard', () => {
    let mockClipboard;

    beforeEach(() => {
      mockClipboard = {
        writeText: jest.fn().mockResolvedValue()
      };
      Object.defineProperty(navigator, 'clipboard', {
        value: mockClipboard,
        writable: true
      });
    });

    test('should copy text using modern clipboard API', async () => {
      const result = await Utils.copyToClipboard('test text');
      expect(mockClipboard.writeText).toHaveBeenCalledWith('test text');
      expect(result).toBe(true);
    });

    test('should fallback to execCommand when clipboard API fails', async () => {
      mockClipboard.writeText.mockRejectedValue(new Error('Clipboard not available'));

      // Mock document.execCommand
      document.execCommand = jest.fn().mockReturnValue(true);

      const result = await Utils.copyToClipboard('test text');
      expect(document.execCommand).toHaveBeenCalledWith('copy');
      expect(result).toBe(true);
    });
  });

  describe('showStatus', () => {
    test('should show status message and hide after duration', () => {
      jest.useFakeTimers();

      Utils.showStatus('Test message', 'success', 1000);

      const statusElement = document.getElementById('status');
      expect(statusElement.textContent).toBe('Test message');
      expect(statusElement.className).toBe('status success');
      expect(statusElement.style.display).toBe('block');

      jest.advanceTimersByTime(1000);
      expect(statusElement.style.display).toBe('none');

      jest.useRealTimers();
    });

    test('should use default parameters', () => {
      Utils.showStatus('Test message');

      const statusElement = document.getElementById('status');
      expect(statusElement.className).toBe('status info');
    });
  });

  describe('formatFileSize', () => {
    test('should format bytes correctly', () => {
      expect(Utils.formatFileSize(0)).toBe('0 Bytes');
      expect(Utils.formatFileSize(1024)).toBe('1 KB');
      expect(Utils.formatFileSize(1024 * 1024)).toBe('1 MB');
      expect(Utils.formatFileSize(1024 * 1024 * 1024)).toBe('1 GB');
    });

    test('should handle decimal values', () => {
      expect(Utils.formatFileSize(1536)).toBe('1.5 KB');
    });
  });

  describe('debounce', () => {
    test('should debounce function calls', () => {
      jest.useFakeTimers();

      const mockFn = jest.fn();
      const debouncedFn = Utils.debounce(mockFn, 100);

      debouncedFn();
      debouncedFn();
      debouncedFn();

      expect(mockFn).not.toHaveBeenCalled();

      jest.advanceTimersByTime(100);
      expect(mockFn).toHaveBeenCalledTimes(1);

      jest.useRealTimers();
    });
  });

  describe('isInViewport', () => {
    test('should detect if element is in viewport', () => {
      const element = document.createElement('div');
      document.body.appendChild(element);

      // Mock getBoundingClientRect
      element.getBoundingClientRect = jest.fn().mockReturnValue({
        top: 100,
        left: 100,
        bottom: 200,
        right: 200
      });

      // Mock window dimensions
      Object.defineProperty(window, 'innerHeight', { value: 1000 });
      Object.defineProperty(window, 'innerWidth', { value: 1000 });

      expect(Utils.isInViewport(element)).toBe(true);

      // Test element outside viewport
      element.getBoundingClientRect.mockReturnValue({
        top: -100,
        left: 100,
        bottom: 0,
        right: 200
      });

      expect(Utils.isInViewport(element)).toBe(false);
    });
  });
});

describe('DearReaderApp', () => {
  let app;

  beforeEach(() => {
    // Setup DOM elements
    document.body.innerHTML = `
      <input id="url" type="url">
      <div id="result" style="display: none;"></div>
      <div id="status" class="status" style="display: none;"></div>
    `;

    // Mock performance API
    Object.defineProperty(window, 'performance', {
      value: {
        getEntriesByType: jest.fn().mockReturnValue([{
          loadEventEnd: 1000,
          fetchStart: 0
        }])
      }
    });

    app = new DearReaderApp();
  });

  afterEach(() => {
    document.body.innerHTML = '';
    jest.clearAllMocks();
  });

  describe('setupKeyboardShortcuts', () => {
    test('should focus URL input on Ctrl+K', () => {
      const urlInput = document.getElementById('url');
      const focusSpy = jest.spyOn(urlInput, 'focus');
      const selectSpy = jest.spyOn(urlInput, 'select');

      const event = new KeyboardEvent('keydown', {
        ctrlKey: true,
        key: 'k'
      });

      document.dispatchEvent(event);

      expect(focusSpy).toHaveBeenCalled();
      expect(selectSpy).toHaveBeenCalled();
    });

    test('should hide result on Escape', () => {
      const result = document.getElementById('result');
      result.style.display = 'block';

      const event = new KeyboardEvent('keydown', { key: 'Escape' });
      document.dispatchEvent(event);

      expect(result.style.display).toBe('none');
    });
  });

  describe('setupErrorHandling', () => {
    test('should handle JavaScript errors', () => {
      const error = new Error('Test error');
      const errorEvent = new ErrorEvent('error', { error });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const showStatusSpy = jest.spyOn(window.Utils, 'showStatus');

      window.dispatchEvent(errorEvent);

      expect(consoleSpy).toHaveBeenCalledWith('Application error:', error);
      expect(showStatusSpy).toHaveBeenCalledWith('An error occurred. Please try again.', 'error');
    });

    test('should handle unhandled promise rejections', () => {
      const reason = 'Test rejection';
      const rejectionEvent = new PromiseRejectionEvent('unhandledrejection', { reason });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const showStatusSpy = jest.spyOn(window.Utils, 'showStatus');

      window.dispatchEvent(rejectionEvent);

      expect(consoleSpy).toHaveBeenCalledWith('Unhandled promise rejection:', reason);
      expect(showStatusSpy).toHaveBeenCalledWith('Network error occurred.', 'error');
    });
  });

  describe('setupPerformanceMonitoring', () => {
    test('should log page load time', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const loadEvent = new Event('load');
      window.dispatchEvent(loadEvent);

      expect(consoleSpy).toHaveBeenCalledWith('Page loaded in 1000ms');
    });
  });

  describe('getInstance', () => {
    test('should return singleton instance', () => {
      const instance1 = DearReaderApp.getInstance();
      const instance2 = DearReaderApp.getInstance();

      expect(instance1).toBe(instance2);
      expect(instance1).toBeInstanceOf(DearReaderApp);
    });
  });
});

// Integration tests for HTML functionality
describe('HTML Integration', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div class="container">
        <div class="hero">
          <h1>DearReader</h1>
          <div class="formats">
            <span class="format-badge">JSON</span>
          </div>
        </div>
        <div class="main-content">
          <div class="card">
            <h2>Test Card</h2>
            <form id="extractForm">
              <div class="form-group">
                <input id="url" type="url" required>
              </div>
              <button type="submit" class="btn" id="extractBtn">Extract</button>
            </form>
            <div id="loading" class="loading" style="display: none;"></div>
            <div id="result" class="result" style="display: none;"></div>
          </div>
        </div>
      </div>
      <div id="status" class="status" style="display: none;"></div>
    `;
  });

  test('should have proper semantic HTML structure', () => {
    expect(document.querySelector('h1')).toBeTruthy();
    expect(document.querySelector('form')).toBeTruthy();
    expect(document.querySelector('input[type="url"]')).toBeTruthy();
    expect(document.querySelector('button[type="submit"]')).toBeTruthy();
  });

  test('should have accessible form elements', () => {
    const urlInput = document.getElementById('url');
    expect(urlInput.hasAttribute('id')).toBe(true);
    expect(urlInput.hasAttribute('required')).toBe(true);
  });

  test('should have proper ARIA labels and structure', () => {
    // Test that buttons have appropriate text content
    const button = document.querySelector('.btn');
    expect(button.textContent.trim()).toBe('Extract');
  });
});

// CSS Integration tests
describe('CSS Integration', () => {
  test('should load main.css', () => {
    const link = document.querySelector('link[href="/main.css"]');
    expect(link).toBeTruthy();
    expect(link.getAttribute('rel')).toBe('stylesheet');
  });

  test('should have Font Awesome loaded', () => {
    const fontAwesome = document.querySelector('link[href*="font-awesome"]');
    expect(fontAwesome).toBeTruthy();
  });
});