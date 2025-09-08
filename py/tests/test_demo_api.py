import os
import sys
import json
import requests
import pytest
from unittest.mock import Mock, patch
from requests.exceptions import RequestException, Timeout, ConnectionError
from urllib.parse import quote

# Ensure the 'py' directory is importable as a module location
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import demo


def make_mock_resp(status=200, text='', json_data=None, headers=None):
    """Create a mock response object"""
    class Resp:
        def __init__(self):
            self.status_code = status
            self.text = text
            self.headers = headers or {}
        def raise_for_status(self):
            if self.status_code >= 400:
                raise requests.HTTPError(f"Status {self.status_code}")
        def json(self):
            return json_data
    return Resp()


class TestReaderAPI:
    """Comprehensive test suite for ReaderAPI"""

    def setup_method(self):
        """Set up test fixtures"""
        self.api = demo.ReaderAPI(base_url='http://localhost:3000')
        self.test_url = 'https://example.com/test-page'

    def test_init_default_url(self):
        """Test default URL initialization"""
        api = demo.ReaderAPI()
        assert api.base_url == 'http://127.0.0.1:3000'

    def test_init_custom_url(self):
        """Test custom URL initialization"""
        api = demo.ReaderAPI('http://custom:8080')
        assert api.base_url == 'http://custom:8080'

    def test_init_env_url(self, monkeypatch):
        """Test environment variable URL"""
        monkeypatch.setattr(os, 'getenv', lambda key: 'http://env:9090' if key == 'READER_BASE_URL' else None)
        api = demo.ReaderAPI()
        assert api.base_url == 'http://env:9090'

    def test_url_encoding(self):
        """Test URL encoding for special characters"""
        url_with_spaces = 'https://example.com/path with spaces?query=value&other=test'
        encoded = quote(url_with_spaces, safe='')
        assert ' ' not in encoded
        assert '%' in encoded

    @patch('requests.get')
    def test_get_json_success(self, mock_get):
        """Test successful JSON response"""
        expected_data = {
            'data': {
                'title': 'Test Page',
                'content': 'Test content',
                'links': ['https://example.com/link1'],
                'images': []
            },
            'status': 'success'
        }
    
        mock_response = make_mock_resp(200, json_data=expected_data)
        mock_get.return_value = mock_response
    
        result = self.api.get_json(self.test_url)
    
        assert result == expected_data
        mock_get.assert_called_once()
        call_args = mock_get.call_args
        assert call_args[0][0] == f"{self.api.base_url}/{quote(self.test_url, safe='')}"
        assert call_args[1]['headers']['Accept'] == 'application/json'

    @patch('requests.get')
    def test_get_markdown_success(self, mock_get):
        """Test successful markdown response"""
        markdown_content = "# Hello World\n\nThis is a test page."
    
        mock_response = make_mock_resp(200, text=markdown_content)
        mock_get.return_value = mock_response
    
        result = self.api.get_markdown(self.test_url)
    
        assert result == markdown_content
        mock_get.assert_called_once()
        call_args = mock_get.call_args
        assert call_args[1]['headers']['Accept'] == 'text/plain'

    @patch('requests.get')
    def test_get_html_success(self, mock_get):
        """Test successful HTML response"""
        html_content = "<html><body><h1>Test</h1></body></html>"
    
        mock_response = make_mock_resp(200, text=html_content)
        mock_get.return_value = mock_response
    
        result = self.api.get_html(self.test_url)
    
        assert result == html_content
        mock_get.assert_called_once()
        call_args = mock_get.call_args
        assert call_args[1]['headers']['Accept'] == 'text/html'

    @patch('requests.get')
    def test_request_with_params(self, mock_get):
        """Test requests with additional parameters"""
        mock_response = make_mock_resp(200, json_data={'test': 'data'})
        mock_get.return_value = mock_response
    
        result = self.api.get_json(self.test_url, timeout=30, format='clean')
    
        mock_get.assert_called_once()
        call_args = mock_get.call_args
        assert call_args[1]['params'] == {'timeout': 30, 'format': 'clean'}

    @patch('requests.get')
    def test_http_error_handling(self, mock_get):
        """Test HTTP error handling"""
        mock_response = make_mock_resp(404, text='Not Found')
        mock_get.return_value = mock_response
    
        with pytest.raises(requests.HTTPError):
            self.api.get_json(self.test_url)

    @patch('requests.get')
    def test_connection_error_handling(self, mock_get):
        """Test connection error handling"""
        mock_get.side_effect = ConnectionError("Connection failed")

        with pytest.raises(ConnectionError):
            self.api.get_json(self.test_url)

    @patch('requests.get')
    def test_timeout_error_handling(self, mock_get):
        """Test timeout error handling"""
        mock_get.side_effect = Timeout("Request timed out")

        with pytest.raises(Timeout):
            self.api.get_json(self.test_url)

    @patch('requests.get')
    def test_invalid_json_response(self, mock_get):
        """Test handling of invalid JSON responses"""
        mock_response = make_mock_resp(200, text='invalid json')
        mock_get.return_value = mock_response
    
        with pytest.raises(ValueError):  # json() will raise ValueError for invalid JSON
            self.api.get_json(self.test_url)

    def test_url_validation(self):
        """Test URL validation"""
        # Valid URLs should work
        valid_urls = [
            'https://example.com',
            'http://test.com/path',
            'https://sub.domain.com/path?query=value'
        ]

        for url in valid_urls:
            # Should not raise an exception during URL encoding
            try:
                quote(url, safe='')
            except Exception as e:
                pytest.fail(f"Valid URL {url} raised an exception: {e}")

    def test_special_characters_in_url(self):
        """Test URLs with special characters"""
        special_urls = [
            'https://example.com/path with spaces',
            'https://example.com/path?query=value&other=test#fragment',
            'https://example.com/path(with)brackets',
            'https://example.com/path[with]brackets'
        ]

        for url in special_urls:
            encoded = quote(url, safe='')
            # Should be properly encoded
            assert isinstance(encoded, str)
            assert len(encoded) > 0


def make_resp(status=200, text='', json_data=None):
    class Resp:
        def __init__(self):
            self.status_code = status
            self.text = text
        def raise_for_status(self):
            if self.status_code >= 400:
                raise requests.HTTPError(f"Status {self.status_code}")
        def json(self):
            return json_data
    return Resp()


def test_get_json_and_markdown_and_html(monkeypatch):
    expected = {'data': {'title': 'Test Title'}}

    def fake_get(url, headers=None, params=None, timeout=None):
        # Return JSON for Accept: application/json
        if headers and headers.get('Accept') == 'application/json':
            r = make_resp(200, text=json.dumps(expected), json_data=expected)
            return r
        # Return markdown/plain for others
        return make_resp(200, text='## Hello World')

    monkeypatch.setattr(requests, 'get', fake_get)

    reader = demo.ReaderAPI(base_url='http://example.com')

    j = reader.get_json('https://example.org')
    assert isinstance(j, dict)
    assert j['data']['title'] == 'Test Title'

    md = reader.get_markdown('https://example.org')
    assert 'Hello World' in md

    html = reader.get_html('https://example.org')
    assert isinstance(html, str)


def test_get_text_and_screenshot(monkeypatch):
    def fake_get_text(url, headers=None, params=None, timeout=None):
        return make_resp(200, text='plain text')

    monkeypatch.setattr(requests, 'get', fake_get_text)

    reader = demo.ReaderAPI(base_url='http://example.com')
    txt = reader.get_text('https://example.org')
    assert txt == 'plain text'

    shot = reader.get_screenshot('https://example.org', full_page=False)
    assert shot == 'plain text'


def test_get_queue_and_check_ui(monkeypatch):
    def fake_get_queue(url, headers=None, params=None, timeout=None):
        if url.endswith('/queue'):
            return make_resp(200, text=json.dumps({'status': 'ok', 'max_concurrent': 3}), json_data={'status': 'ok', 'max_concurrent': 3})
        if url.endswith('/queue-ui'):
            return make_resp(200, text='queue ui')
        return make_resp(404, text='not found')

    monkeypatch.setattr(requests, 'get', fake_get_queue)

    reader = demo.ReaderAPI(base_url='http://example.com')
    q = reader.get_queue_status()
    assert q['status'] == 'ok'
    assert reader.check_queue_ui() is True


def test_check_server_status_down(monkeypatch):
    # Simulate connection error
    def fake_get(url, timeout=None):
        raise requests.exceptions.ConnectionError()

    monkeypatch.setattr(requests, 'get', fake_get)
    reader = demo.ReaderAPI(base_url='http://example.com')
    assert demo.check_server_status(reader) is False


def test_print_separator(capsys):
    demo.print_separator('TEST SECTION')
    captured = capsys.readouterr()
    assert 'TEST SECTION' in captured.out
