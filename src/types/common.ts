/**
 * 通用工具类型
 */

/**
 * 深度只读类型
 */
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P]
}

/**
 * 可选的深度部分类型
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

/**
 * 数组元素类型提取
 */
export type ArrayElement<ArrayType extends readonly unknown[]> = ArrayType extends readonly (infer ElementType)[] ? ElementType : never

/**
 * 函数参数类型提取
 */
export type Parameters<T extends (...args: any) => any> = T extends (...args: infer P) => any ? P : never

/**
 * 函数返回值类型提取
 */
export type ReturnType<T extends (...args: any) => any> = T extends (...args: any) => infer R ? R : any

/**
 * 非空类型
 */
export type NonNullable<T> = T extends null | undefined ? never : T

/**
 * 组件Props类型
 */
export interface ComponentProps {
  class?: string
  style?: string | Record<string, string>
}

/**
 * 事件处理器类型
 */
export type EventHandler<T = Event> = (event: T) => void

/**
 * 异步函数类型
 */
export type AsyncFunction<T = any, R = any> = (...args: T[]) => Promise<R>

/**
 * 错误处理类型
 */
export interface ErrorInfo {
  message: string
  code?: string | number
  stack?: string
  timestamp: number
}

/**
 * API响应类型
 */
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: ErrorInfo
  timestamp: number
}

/**
 * 分页数据类型
 */
export interface PaginatedData<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  hasNext: boolean
  hasPrev: boolean
}

/**
 * 键值对类型
 */
export type KeyValuePair<K = string, V = any> = {
  key: K
  value: V
}

/**
 * 状态更新器类型
 */
export type StateUpdater<T> = (prevState: T) => T

/**
 * 事件监听器类型
 */
export type EventListener<T = any> = (event: T) => void

/**
 * 配置选项类型
 */
export interface ConfigOptions {
  [key: string]: any
}

/**
 * 时间戳类型
 */
export type Timestamp = number

/**
 * ID类型
 */
export type ID = string | number

/**
 * 坐标类型
 */
export interface Coordinates {
  x: number
  y: number
}

/**
 * 尺寸类型
 */
export interface Dimensions {
  width: number
  height: number
}

/**
 * 矩形区域类型
 */
export interface Rectangle extends Coordinates, Dimensions {}

/**
 * 颜色类型
 */
export type Color = string

/**
 * CSS类名类型
 */
export type ClassName = string | string[] | Record<string, boolean>

/**
 * 样式对象类型
 */
export type StyleObject = Record<string, string | number>

export default {}