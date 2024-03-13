/**
 * BackendCodesEnum
 *
 * @description Enum for backend codes
 * @see https://tldp.org/LDP/abs/html/exitcodes.html
 * @see https://www.linuxdoc.org/LDP/abs/html/exitcodes.html
 * @see https://www.gnu.org/software/libc/manual/html_node/Exit-Status.html
 */
export enum BackendCodesEnum {
  OK = 0,
  GENERIC_ERROR = 1 << 0,
  GENERIC_STOPPED = 1 << 1,
  CONNECTION_ERROR = 1 << 2,
  INVALID_LOGIN = 1 << 3,
  INVALID_CREDENTIALS = 1 << 4,
}
