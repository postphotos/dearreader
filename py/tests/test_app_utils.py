import os
import tempfile
import json
import socket
import psutil

import app


def test_get_default_url_from_config(tmp_path, monkeypatch):
    # No config file -> default
    monkeypatch.chdir(tmp_path)
    assert app.get_default_url_from_config().startswith('http')

    # Write config.yaml
    cfg = tmp_path / 'config.yaml'
    cfg.write_text('url: http://example.local:3000')
    assert app.get_default_url_from_config() == 'http://example.local:3000'


def test_check_port_available_and_find_process(monkeypatch):
    # Find an available ephemeral port
    s = socket.socket()
    s.bind(('localhost', 0))
    port = s.getsockname()[1]
    s.close()

    # Port should be available now
    assert app.check_port_available(port)

    # Avoid calling psutil.net_connections on macOS CI where it may raise AccessDenied.
    # Monkeypatch net_connections to return an empty list for deterministic behavior.
    monkeypatch.setattr(psutil, 'net_connections', lambda: [])
    found = app.find_process_using_port(1)  # privileged port usually unavailable
    assert found is None
