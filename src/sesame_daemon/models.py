from typing import Annotated, Any, Literal

from pydantic import BaseModel, ConfigDict, StringConstraints, field_validator

from sesame_daemon.enums import ActionType, BackendCodesError, OnErrorType

NonEmptyStr = Annotated[str, StringConstraints(min_length=1)]

_ACTION_TYPES = {action.value for action in ActionType}


class BackendConfigAction(BaseModel):
    model_config = ConfigDict(extra="ignore")

    script: NonEmptyStr
    onError: OnErrorType = OnErrorType.CONTINUE


class BackendConfigV1(BaseModel):
    model_config = ConfigDict(extra="ignore")

    name: NonEmptyStr
    description: str | None = None
    path: NonEmptyStr
    active: bool
    actions: dict[ActionType, BackendConfigAction]

    @field_validator("actions", mode="before")
    @classmethod
    def filter_unknown_actions(cls, value: Any) -> Any:
        # Les clés qui ne sont pas des ActionType sont ignorées (comme le @Transform côté NestJS)
        if isinstance(value, dict):
            return {key: val for key, val in value.items() if key in _ACTION_TYPES}
        return value


class BackendResultInfo(BaseModel):
    model_config = ConfigDict(extra="allow")

    message: str | None = None
    data: dict[str, Any] | None = None


class BackendResultInfoSuccess(BackendResultInfo):
    status: Literal[0]


class BackendResultInfoError(BackendResultInfo):
    status: int

    @field_validator("status")
    @classmethod
    def check_status(cls, value: int) -> int:
        allowed = [code.value for code in BackendCodesError]
        if value not in allowed:
            raise ValueError(f"status must be one of the following values: {', '.join(map(str, allowed))}")
        return value
