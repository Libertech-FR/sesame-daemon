import logging

from sesame_daemon.logger import VERBOSE, get_log_level


def test_default_is_info():
    assert get_log_level() == logging.INFO


def test_mapping():
    assert get_log_level("fatal") == logging.CRITICAL
    assert get_log_level("error") == logging.ERROR
    assert get_log_level("warn") == logging.WARNING
    assert get_log_level("debug") == logging.DEBUG
    assert get_log_level("verbose") == VERBOSE


def test_case_insensitive():
    assert get_log_level("INFO") == logging.INFO


def test_unknown_defaults_to_info():
    assert get_log_level("unknown") == get_log_level("info")
