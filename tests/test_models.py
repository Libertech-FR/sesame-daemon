import pytest
from pydantic import ValidationError

from sesame_daemon.enums import ActionType, OnErrorType
from sesame_daemon.models import BackendConfigV1, BackendResultInfoError, BackendResultInfoSuccess

BASE = {"name": "dummy", "path": "/tmp", "active": True}


def test_valid_actions():
    cfg = BackendConfigV1.model_validate({**BASE, "actions": {"LIST_BACKENDS": {"script": "echo", "onError": "stop"}}})
    assert cfg.actions[ActionType.LIST_BACKENDS].onError == OnErrorType.STOP


def test_unknown_action_keys_are_dropped():
    cfg = BackendConfigV1.model_validate({**BASE, "actions": {"NOT_A_REAL_ACTION": {"script": "echo"}}})
    assert cfg.actions == {}


def test_on_error_defaults_to_continue():
    cfg = BackendConfigV1.model_validate({**BASE, "actions": {"PING_TARGET": {"script": "echo"}}})
    assert cfg.actions[ActionType.PING_TARGET].onError == OnErrorType.CONTINUE


def test_rejects_empty_script():
    with pytest.raises(ValidationError):
        BackendConfigV1.model_validate({**BASE, "actions": {"LIST_BACKENDS": {"script": ""}}})


def test_rejects_invalid_on_error():
    with pytest.raises(ValidationError):
        BackendConfigV1.model_validate({**BASE, "actions": {"LIST_BACKENDS": {"script": "x", "onError": "boom"}}})


def test_rejects_missing_active():
    with pytest.raises(ValidationError):
        BackendConfigV1.model_validate({"name": "dummy", "path": "/tmp", "actions": {}})


def test_result_success_requires_status_zero():
    BackendResultInfoSuccess.model_validate({"status": 0, "message": "ok"})
    with pytest.raises(ValidationError):
        BackendResultInfoSuccess.model_validate({"status": 1})


def test_result_error_requires_known_code():
    BackendResultInfoError.model_validate({"status": 16})
    with pytest.raises(ValidationError):
        BackendResultInfoError.model_validate({"status": 3})


def test_result_data_must_be_object():
    with pytest.raises(ValidationError):
        BackendResultInfoSuccess.model_validate({"status": 0, "data": "nope"})
