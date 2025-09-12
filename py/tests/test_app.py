import pytest
from unittest.mock import patch, MagicMock
import app

@patch('app.run_cmd')
def test_step_npm_success(mock_run_cmd):
    """Test the npm step succeeds when npm commands are successful."""
    # Arrange: Mock successful npm install and test commands
    mock_run_cmd.side_effect = [
        (0, 'npm install output', ''),  # Success for npm install
        (0, 'npm test output', '')      # Success for npm test
    ]

    # Act
    result = app.step_npm()

    # Assert
    assert result == 0
    assert mock_run_cmd.call_count == 2
    mock_run_cmd.assert_any_call(['npm', 'install'], cwd='js', timeout=300, live=False)
    mock_run_cmd.assert_any_call(['npm', 'test'], cwd='js', timeout=45, live=False)

@patch('app.run_cmd')
def test_step_npm_install_fails(mock_run_cmd):
    """Test the npm step fails when npm install fails."""
    # Arrange: Mock failed npm install
    mock_run_cmd.return_value = (1, '', 'npm install error')

    # Act
    result = app.step_npm()

    # Assert
    assert result == 1
    mock_run_cmd.assert_called_once_with(['npm', 'install'], cwd='js', timeout=300, live=False)

@patch('app.run_cmd')
def test_step_npm_test_fails(mock_run_cmd):
    """Test the npm step fails when npm test fails."""
    # Arrange: Mock successful npm install and failed npm test
    mock_run_cmd.side_effect = [
        (0, 'npm install output', ''),
        (1, '', 'npm test error')
    ]

    # Act
    result = app.step_npm()

    # Assert
    assert result == 1
    assert mock_run_cmd.call_count == 2

@patch('app.run_cmd')
def test_step_docker_success(mock_run_cmd):
    """Test the docker step succeeds."""
    mock_run_cmd.return_value = (0, '', '')
    with patch('app.ensure_port_available', return_value=True):
        result = app.step_docker()
        assert result == 0

@patch('app.run_cmd')
def test_step_pyright_success(mock_run_cmd):
    """Test the pyright step succeeds."""
    mock_run_cmd.return_value = (0, '', '')
    with patch('shutil.which', return_value=True):
        result = app.step_pyright()
        assert result == 0

@patch('app.run_cmd')
def test_step_demo_success(mock_run_cmd):
    """Test the demo step succeeds."""
    mock_run_cmd.return_value = (0, '', '')
    with patch('os.path.exists', return_value=True):
        result = app.step_demo()
        assert result == 0

@patch('app.run_cmd')
def test_step_speedtest_success(mock_run_cmd):
    """Test the speedtest step succeeds."""
    mock_run_cmd.return_value = (0, '', '')
    with patch('os.path.exists', return_value=True):
        result = app.step_speedtest()
        assert result == 0

@patch('app.run_cmd')
def test_step_stop_success(mock_run_cmd):
    """Test the stop step succeeds."""
    mock_run_cmd.return_value = (0, '', '')
    result = app.step_stop()
    assert result == 0

@patch('argparse.ArgumentParser.parse_args')
@patch('app.step_npm')
@patch('app.step_pyright')
@patch('app.step_demo')
def test_main_start_command(mock_step_demo, mock_step_pyright, mock_step_npm, mock_parse_args):
    """Test the main function with the 'start' command."""
    # Arrange
    mock_parse_args.return_value = MagicMock(command='start', verbose=False, debug=False, force=False, no_cache=False, url='http://localhost:3000')
    mock_step_npm.return_value = 0
    mock_step_pyright.return_value = 0
    mock_step_demo.return_value = 0

    with patch('shutil.which', return_value=True):
        # Act
        result = app.main()

        # Assert
        assert result == 0
        mock_step_npm.assert_called_once()
        mock_step_pyright.assert_called_once()
        mock_step_demo.assert_called_once()

@patch('argparse.ArgumentParser.parse_args')
@patch('app.step_npm')
@patch('app.step_docker')
@patch('app.step_pyright')
@patch('app.step_demo')
@patch('app.step_speedtest')
def test_main_all_command(mock_speedtest, mock_demo, mock_pyright, mock_docker, mock_npm, mock_parse_args):
    """Test the main function with the 'all' command."""
    mock_parse_args.return_value = MagicMock(command='all', verbose=False, debug=False, force=False, no_cache=False, url='http://localhost:3000')
    mock_npm.return_value = 0
    mock_docker.return_value = 0
    mock_pyright.return_value = 0
    mock_demo.return_value = 0
    mock_speedtest.return_value = 0
    with patch('shutil.which', return_value=True):
        with patch('webbrowser.open', return_value=True):
            result = app.main()
            assert result == 0

@patch('argparse.ArgumentParser.parse_args')
@patch('app.step_tests')
def test_main_tests_command(mock_step_tests, mock_parse_args):
    """Test the main function with the 'tests' command."""
    mock_parse_args.return_value = MagicMock(command='tests', verbose=False, debug=False, force=False, no_cache=False, url='http://localhost:3000')
    mock_step_tests.return_value = 0
    with patch('shutil.which', return_value=True):
        result = app.main()
        assert result == 0
        mock_step_tests.assert_called_once()

def test_run_pipeline():
    """Test the run_pipeline function."""
    # Arrange
    step1 = MagicMock(return_value=0)
    step2 = MagicMock(return_value=0)
    pipeline = {'step1': step1, 'step2': step2}

    # Act
    results = app.run_pipeline(pipeline, force=False)

    # Assert
    assert results == {'step1': 0, 'step2': 0}
    step1.assert_called_once()
    step2.assert_called_once()

def test_run_pipeline_force():
    """Test the run_pipeline function with force=True."""
    # Arrange
    step1 = MagicMock(return_value=1)
    step2 = MagicMock(return_value=0)
    pipeline = {'step1': step1, 'step2': step2}

    # Act
    results = app.run_pipeline(pipeline, force=True)

    # Assert
    assert results == {'step1': 1, 'step2': 0}
    step1.assert_called_once()
    step2.assert_called_once()

@patch('argparse.ArgumentParser.parse_args')
@patch('app.step_docker')
def test_main_docker_clear_command(mock_step_docker, mock_parse_args):
    mock_parse_args.return_value = MagicMock(command='docker-clear', verbose=False, debug=False, force=False, no_cache=True, url='http://localhost:3000')
    mock_step_docker.return_value = 0
    with patch('shutil.which', return_value=True):
        result = app.main()
        assert result == 0
        mock_step_docker.assert_called_once_with(verbose=False, clear_cache=True)

@patch('argparse.ArgumentParser.parse_args')
@patch('app.step_js_test')
def test_main_js_test_command(mock_step_js_test, mock_parse_args):
    mock_parse_args.return_value = MagicMock(command='js-test', verbose=False, debug=False, force=False, no_cache=False, url='http://localhost:3000')
    mock_step_js_test.return_value = 0
    with patch('shutil.which', return_value=True):
        result = app.main()
        assert result == 0
        mock_step_js_test.assert_called_once()

@patch('argparse.ArgumentParser.parse_args')
@patch('app.step_prod_up')
def test_main_prod_up_command(mock_step_prod_up, mock_parse_args):
    mock_parse_args.return_value = MagicMock(command='prod-up', verbose=False, debug=False, force=False, no_cache=False, url='http://localhost:3000')
    mock_step_prod_up.return_value = 0
    with patch('shutil.which', return_value=True):
        result = app.main()
        assert result == 0
        mock_step_prod_up.assert_called_once()

@patch('argparse.ArgumentParser.parse_args')
def test_main_missing_tools(mock_parse_args):
    mock_parse_args.return_value = MagicMock(command='start', verbose=False, debug=False, force=False, no_cache=False, url='http://localhost:3000')
    with patch('shutil.which', return_value=None):
        result = app.main()
        assert result == 2