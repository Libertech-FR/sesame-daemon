/**
 * BackendCodesEnum
 *
 * @description Enum for backend codes
 * @see https://tldp.org/LDP/abs/html/exitcodes.html
 * @see https://www.linuxdoc.org/LDP/abs/html/exitcodes.html
 * @see https://www.gnu.org/software/libc/manual/html_node/Exit-Status.html
 */
export enum BackendCodesEnumError {
  GENERIC_ERROR = 1 << 0, // 1
  GENERIC_STOPPED = 1 << 1, // 2
  CONNECTION_ERROR = 1 << 2, // 4
  INVALID_LOGIN = 1 << 3, // 8
  INVALID_CREDENTIALS = 1 << 4, // 16
  INVALID_JSON_RESPONSE = 1 << 5, // 32
}

export enum BackendCodesEnumSuccess {
  OK = 0,
}
