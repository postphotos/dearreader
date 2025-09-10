import pytest
import app


def test_run_cmd_type_validation():
    # run_cmd should require a list for the cmd argument
    with pytest.raises(TypeError):
        app.run_cmd('ls')  # Should fail with string instead of list


def test_ensure_port_available_delegates(monkeypatch):
    # If check_port_available returns True, ensure_port_available returns True
    monkeypatch.setattr(app, 'check_port_available', lambda p: True)
    assert app.ensure_port_available(12345, 'svc') is True

    # If check_port_available returns False, ensure_port_available calls handle_port_conflict
    monkeypatch.setattr(app, 'check_port_available', lambda p: False)
    called = {'v': False}

    def fake_handle(port, svc):
        called['v'] = True
        return True

    monkeypatch.setattr(app, 'handle_port_conflict', fake_handle)
    assert app.ensure_port_available(12345, 'svc') is True
    assert called['v']
