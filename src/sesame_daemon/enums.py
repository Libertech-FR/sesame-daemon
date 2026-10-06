from enum import IntEnum, StrEnum


class ActionType(StrEnum):
    LIST_BACKENDS = "LIST_BACKENDS"
    DUMP_PACKAGE_CONFIG = "DUMP_PACKAGE_CONFIG"
    PING_TARGET = "PING_TARGET"
    IDENTITY_CREATE = "IDENTITY_CREATE"
    IDENTITY_UPDATE = "IDENTITY_UPDATE"
    IDENTITY_DELETE = "IDENTITY_DELETE"
    IDENTITY_PASSWORD_RESET = "IDENTITY_PASSWORD_RESET"
    IDENTITY_PASSWORD_CHANGE = "IDENTITY_PASSWORD_CHANGE"
    IDENTITY_DISABLE = "IDENTITY_DISABLE"
    IDENTITY_ENABLE = "IDENTITY_ENABLE"
    IDENTITY_LIFECYCLE_CHANGED = "IDENTITY_LIFECYCLE_CHANGED"


class OnErrorType(StrEnum):
    CONTINUE = "continue"
    STOP = "stop"


class BackendCodesError(IntEnum):
    """
    Codes d'erreur des backends.

    @see https://tldp.org/LDP/abs/html/exitcodes.html
    @see https://www.gnu.org/software/libc/manual/html_node/Exit-Status.html
    """

    GENERIC_ERROR = 1 << 0  # 1
    GENERIC_STOPPED = 1 << 1  # 2
    CONNECTION_ERROR = 1 << 2  # 4
    INVALID_LOGIN = 1 << 3  # 8
    INVALID_CREDENTIALS = 1 << 4  # 16
    INVALID_JSON_RESPONSE = 1 << 5  # 32


class BackendCodesSuccess(IntEnum):
    OK = 0
