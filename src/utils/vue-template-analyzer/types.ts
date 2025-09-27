/**
 * Vue模板错误解析器的类型定义
 */

// 错误类型枚举
export enum ErrorType {
  UNCLOSED_TAG = 'UNCLOSED_TAG',
  TAG_MISMATCH = 'TAG_MISMATCH',
  INVALID_SELF_CLOSING = 'INVALID_SELF_CLOSING',
  DIRECTIVE_SYNTAX_ERROR = 'DIRECTIVE_SYNTAX_ERROR',
  INVALID_COMMENT = 'INVALID_COMMENT',
  ENCODING_ERROR = 'ENCODING_ERROR',
  TEMPLATE_SYNTAX_ERROR = 'TEMPLATE_SYNTAX_ERROR',
  COMPONENT_TAG_ERROR = 'COMPONENT_TAG_ERROR'
}

// 错误严重程度
export enum ErrorSeverity {
  ERROR = 'ERROR',
  WARNING = 'WARNING',
  INFO = 'INFO'
}

// 修复建议类型
export enum FixType {
  AUTO_FIX = 'AUTO_FIX',
  MANUAL_FIX = 'MANUAL_FIX',
  REFACTOR_SUGGESTION = 'REFACTOR_SUGGESTION'
}

// 风险等级
export enum RiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH'
}

// 位置信息
export interface Position {
  line: number
  column: number
  offset?: number
}

// 位置范围
export interface Range {
  start: Position
  end: Position
}

// 错误信息模型
export interface ErrorInfo {
  errorType: ErrorType
  severity: ErrorSeverity
  message: string
  file: string
  position: Position
  range?: Range
  context: string
  suggestions: FixSuggestion[]
  relatedErrors?: ErrorInfo[]
}

// 修复建议模型
export interface FixSuggestion {
  type: FixType
  description: string
  originalCode: string
  fixedCode: string
  confidence: number
  riskLevel: RiskLevel
  explanation?: string
  examples?: string[]
}

// 标签信息
export interface TagInfo {
  name: string
  isClosing: boolean
  isSelfClosing: boolean
  position: Position
  range: Range
  attributes?: AttributeInfo[]
  parent?: TagInfo
  children?: TagInfo[]
}

// 属性信息
export interface AttributeInfo {
  name: string
  value?: string
  position: Position
  range: Range
  isVueDirective: boolean
  directiveType?: string
}

// Vue指令信息
export interface DirectiveInfo {
  name: string
  argument?: string
  modifiers: string[]
  value?: string
  position: Position
  range: Range
}

// 语法树节点
export interface ASTNode {
  type: string
  position: Position
  range: Range
  children?: ASTNode[]
  attributes?: AttributeInfo[]
  content?: string
}

// 模板解析结果
export interface ParseResult {
  ast?: ASTNode
  errors: ErrorInfo[]
  warnings: ErrorInfo[]
  tags: TagInfo[]
  directives: DirectiveInfo[]
}

// 诊断配置
export interface DiagnosticConfig {
  enableStrictMode: boolean
  checkVueDirectives: boolean
  checkComponentTags: boolean
  enableAutoFix: boolean
  maxErrors: number
  ignoreErrors: ErrorType[]
  customRules?: CustomRule[]
}

// 自定义规则
export interface CustomRule {
  name: string
  description: string
  severity: ErrorSeverity
  check: (node: ASTNode, context: ParseContext) => ErrorInfo | null
}

// 解析上下文
export interface ParseContext {
  filePath: string
  fileContent: string
  config: DiagnosticConfig
  sourceMap: SourceMap
}

// 源码映射
export interface SourceMap {
  getOriginalPosition(line: number, column: number): Position
  getGeneratedPosition(line: number, column: number): Position
  getSourceLines(start: number, end: number): string[]
}

// 诊断报告
export interface DiagnosticReport {
  filePath: string
  totalErrors: number
  totalWarnings: number
  errors: ErrorInfo[]
  warnings: ErrorInfo[]
  suggestions: FixSuggestion[]
  summary: DiagnosticSummary
  timestamp: string
}

// 诊断摘要
export interface DiagnosticSummary {
  criticalIssues: number
  fixableIssues: number
  codeQualityScore: number
  recommendations: string[]
}

// 批量诊断结果
export interface BatchDiagnosticResult {
  totalFiles: number
  processedFiles: number
  errorFiles: number
  reports: DiagnosticReport[]
  overallSummary: DiagnosticSummary
}

// CLI选项
export interface CLIOptions {
  files: string[]
  config?: string
  output?: string
  format?: 'json' | 'xml' | 'html' | 'text'
  fix?: boolean
  strict?: boolean
  watch?: boolean
  verbose?: boolean
}