import os
import pytest
import time
import requests

# Integration tests are skipped by default. Set RUN_INTEGRATION=1 to run them.
RUN_INTEGRATION = os.getenv('RUN_INTEGRATION', '0') == '1'

pytestmark = pytest.mark.skipif(not RUN_INTEGRATION, reason="Integration tests disabled. Set RUN_INTEGRATION=1 to enable.")


def test_root_and_queue_endpoints_live():
    base = os.getenv('READER_BASE_URL', 'http://127.0.0.1:3000').rstrip('/')

    # Basic root endpoint should return 200 and include the index text
    r = requests.get(f"{base}/", timeout=10)
    assert r.status_code == 200
    assert 'dearreader' in r.text.lower() or 'local web content' in r.text.lower()

    # Queue endpoint should return JSON with status key
    q = requests.get(f"{base}/queue", timeout=10)
    assert q.status_code == 200
    data = q.json()
    assert isinstance(data, dict)
    assert 'status' in data


def test_sample_crawl_json_live():
    base = os.getenv('READER_BASE_URL', 'http://127.0.0.1:3000').rstrip('/')
    # Use a fast, reliable site to keep test quick
    sample_url = 'https://example.com'

    j = requests.get(f"{base}/{requests.utils.requote_uri(sample_url)}", headers={'Accept': 'application/json'}, timeout=20)
    assert j.status_code == 200
    payload = j.json()
    assert 'data' in payload
    assert 'title' in payload['data']
