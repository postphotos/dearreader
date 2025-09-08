import os
import sys
import json
import requests

# Ensure the 'py' directory is importable as a module location
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import demo


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
