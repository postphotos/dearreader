
import pytest
from unittest.mock import patch, MagicMock
import demo
import unittest
import requests

@patch('demo.check_server_status', return_value=True)
@patch('demo.demo_json_api')
@patch('demo.demo_markdown_api')
@patch('demo.demo_screenshot_api')
@patch('demo.test_basic_api')
@patch('argparse.ArgumentParser.parse_args')
def test_main_no_args(mock_parse_args, mock_test_basic_api, mock_demo_screenshot_api, mock_demo_markdown_api, mock_demo_json_api, mock_check_server_status):
    """Test the main function with no arguments."""
    # Arrange
    mock_parse_args.return_value = MagicMock(url=None, format=None, test_all=False, server_only=False, base_url=None)

    # Act
    demo.main()

    # Assert
    mock_check_server_status.assert_called_once()
    mock_test_basic_api.assert_called_once()
    assert mock_demo_json_api.call_count == 2
    assert mock_demo_markdown_api.call_count == 2
    assert mock_demo_screenshot_api.call_count == 2

@patch('demo.check_server_status', return_value=True)
@patch('demo.demo_json_api')
@patch('argparse.ArgumentParser.parse_args')
def test_main_with_url(mock_parse_args, mock_demo_json_api, mock_check_server_status):
    """Test the main function with the --url argument."""
    mock_parse_args.return_value = MagicMock(url='http://example.com', format='json', test_all=False, server_only=False, base_url=None)

    demo.main()

    mock_check_server_status.assert_called_once()
    mock_demo_json_api.assert_called_once_with(unittest.mock.ANY, 'http://example.com')

@patch('demo.check_server_status', return_value=True)
@patch('demo.demo_markdown_api')
@patch('argparse.ArgumentParser.parse_args')
def test_main_with_format(mock_parse_args, mock_demo_markdown_api, mock_check_server_status):
    """Test the main function with the --format argument."""
    mock_parse_args.return_value = MagicMock(url='http://example.com', format='markdown', test_all=False, server_only=False, base_url=None)

    demo.main()

    mock_check_server_status.assert_called_once()
    mock_demo_markdown_api.assert_called_once_with(unittest.mock.ANY, 'http://example.com')

@patch('demo.check_server_status', return_value=True)
@patch('demo.demo_error_handling')
@patch('demo.demo_pdf_status')
@patch('argparse.ArgumentParser.parse_args')
def test_main_with_test_all(mock_parse_args, mock_demo_pdf_status, mock_demo_error_handling, mock_check_server_status):
    """Test the main function with the --test-all argument."""
    mock_parse_args.return_value = MagicMock(url=None, format=None, test_all=True, server_only=False, base_url=None)

    demo.main()

    mock_check_server_status.assert_called_once()
    mock_demo_error_handling.assert_called_once()
    mock_demo_pdf_status.assert_called_once()

@patch('demo.check_server_status', return_value=True)
@patch('demo.test_basic_api')
@patch('argparse.ArgumentParser.parse_args')
def test_main_with_server_only(mock_parse_args, mock_test_basic_api, mock_check_server_status):
    """Test the main function with the --server-only argument."""
    mock_parse_args.return_value = MagicMock(url=None, format=None, test_all=False, server_only=True, base_url=None)

    demo.main()

    mock_check_server_status.assert_called_once()
    mock_test_basic_api.assert_called_once()

@patch('demo.check_server_status', return_value=False)
@patch('argparse.ArgumentParser.parse_args')
def test_main_server_not_running(mock_parse_args, mock_check_server_status):
    """Test the main function when the server is not running."""
    mock_parse_args.return_value = MagicMock(url=None, format=None, test_all=False, server_only=False, base_url=None)

    with pytest.raises(SystemExit) as e:
        demo.main()

    assert e.type == SystemExit
    assert e.value.code == 1

@patch('requests.get')
def test_demo_json_api(mock_get):
    mock_get.return_value.status_code = 200
    mock_get.return_value.json.return_value = {'data': {'title': 'Test'}}
    reader = demo.ReaderAPI()
    demo.demo_json_api(reader, 'http://example.com')

@patch('requests.get')
def test_demo_markdown_api(mock_get):
    mock_get.return_value.status_code = 200
    mock_get.return_value.text = '# Test'
    reader = demo.ReaderAPI()
    demo.demo_markdown_api(reader, 'http://example.com')

@patch('requests.get')
def test_demo_screenshot_api(mock_get):
    mock_get.return_value.status_code = 200
    mock_get.return_value.text = 'http://example.com/screenshot.png'
    reader = demo.ReaderAPI()
    demo.demo_screenshot_api(reader, 'http://example.com')

@patch('requests.get')
def test_demo_error_handling(mock_get):
    mock_get.side_effect = requests.exceptions.RequestException('Test Error')
    reader = demo.ReaderAPI()
    demo.demo_error_handling(reader)

@patch('requests.get')
def test_demo_pdf_status(mock_get):
    mock_get.return_value.status_code = 200
    mock_get.return_value.json.return_value = {'data': {'title': 'Test'}}
    reader = demo.ReaderAPI()
    demo.demo_pdf_status(reader)
