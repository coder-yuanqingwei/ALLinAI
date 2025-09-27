/**
 * Vue组件模板错误解析器
 * 用于诊断和修复Vue单文件组件中的模板语法错误
 */

export * from './core/ErrorAnalyzer'
export * from './core/TagMatcher'
export * from './core/DirectiveValidator'
export * from './core/ErrorLocator'
export * from './core/FixSuggestionGenerator'
export * from './core/DiagnosticReporter'
export * from './types'
export * from './cli'