import { describe, it, expect, beforeEach } from 'vitest'
import { ErrorAnalyzer } from '../core/ErrorAnalyzer'
import { TagMatcher } from '../core/TagMatcher'
import { DirectiveValidator } from '../core/DirectiveValidator'
import { ErrorLocator } from '../core/ErrorLocator'
import { FixSuggestionGenerator } from '../core/FixSuggestionGenerator'
import { DiagnosticReporter } from '../core/DiagnosticReporter'
import { 
  ErrorType, 
  ErrorSeverity, 
  FixType, 
  RiskLevel,
  DiagnosticConfig
} from '../types'

describe('Vue Template Analyzer - ErrorAnalyzer', () => {
  let analyzer: ErrorAnalyzer

  beforeEach(() => {
    const config: DiagnosticConfig = {
      enableStrictMode: true,
      checkVueDirectives: true,
      checkComponentTags: true,
      enableAutoFix: true,
      maxErrors: 50,
      ignoreErrors: []
    }
    analyzer = new ErrorAnalyzer(config)
  })

  describe('基本模板解析', () => {
    it('应该解析简单的Vue模板', async () => {
      const vueContent = `
<template>
  <div class="container">
    <h1>Hello World</h1>
  </div>
</template>

<script setup>
// script content
</script>
`
      const result = await analyzer.analyzeVueFile('test.vue', vueContent)
      
      expect(result.errors).toHaveLength(0)
      expect(result.warnings).toHaveLength(0)
      expect(result.tags).toBeDefined()
    })

    it('应该检测缺失的template标签', async () => {
      const vueContent = `
<script setup>
// script content
</script>
`
      const result = await analyzer.analyzeVueFile('test.vue', vueContent)
      
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].errorType).toBe(ErrorType.TEMPLATE_SYNTAX_ERROR)
      expect(result.errors[0].message).toContain('未找到有效的template标签')
    })

    it('应该处理空的template内容', async () => {
      const vueContent = `
<template>
</template>

<script setup>
// script content
</script>
`
      const result = await analyzer.analyzeVueFile('test.vue', vueContent)
      
      expect(result.errors).toHaveLength(0)
    })
  })

  describe('标签解析', () => {
    it('应该正确解析嵌套标签', async () => {
      const vueContent = `
<template>
  <div>
    <span>Content</span>
    <p>Paragraph</p>
  </div>
</template>
`
      const result = await analyzer.analyzeVueFile('test.vue', vueContent)
      
      expect(result.errors).toHaveLength(0)
      expect(result.tags.length).toBeGreaterThan(0)
    })

    it('应该处理自闭合标签', async () => {
      const vueContent = `
<template>
  <div>
    <img src="test.jpg" />
    <br />
  </div>
</template>
`
      const result = await analyzer.analyzeVueFile('test.vue', vueContent)
      
      expect(result.errors).toHaveLength(0)
    })
  })

  describe('Vue指令解析', () => {
    it('应该识别Vue指令', async () => {
      const vueContent = `
<template>
  <div>
    <p v-if="show">Conditional content</p>
    <ul>
      <li v-for="item in items" :key="item.id">{{ item.name }}</li>
    </ul>
    <input v-model="inputValue" />
    <button @click="handleClick">Click</button>
  </div>
</template>
`
      const result = await analyzer.analyzeVueFile('test.vue', vueContent)
      
      expect(result.directives.length).toBeGreaterThan(0)
      expect(result.errors).toHaveLength(0)
    })
  })
})

describe('Vue Template Analyzer - TagMatcher', () => {
  let tagMatcher: TagMatcher

  beforeEach(() => {
    tagMatcher = new TagMatcher()
  })

  describe('标签匹配验证', () => {
    it('应该检测未闭合的标签', () => {
      const tags = [
        {
          name: 'div',
          isClosing: false,
          isSelfClosing: false,
          position: { line: 1, column: 1 },
          range: { start: { line: 1, column: 1 }, end: { line: 1, column: 5 } }
        }
      ]
      
      const errors = tagMatcher.validateTagMatching(tags, 'test.vue', '<div>')
      
      expect(errors).toHaveLength(1)
      expect(errors[0].errorType).toBe(ErrorType.UNCLOSED_TAG)
    })

    it('应该检测多余的闭合标签', () => {
      const tags = [
        {
          name: 'div',
          isClosing: true,
          isSelfClosing: false,
          position: { line: 1, column: 1 },
          range: { start: { line: 1, column: 1 }, end: { line: 1, column: 6 } }
        }
      ]
      
      const errors = tagMatcher.validateTagMatching(tags, 'test.vue', '</div>')
      
      expect(errors).toHaveLength(1)
      expect(errors[0].errorType).toBe(ErrorType.TAG_MISMATCH)
    })

    it('应该验证正确匹配的标签', () => {
      const tags = [
        {
          name: 'div',
          isClosing: false,
          isSelfClosing: false,
          position: { line: 1, column: 1 },
          range: { start: { line: 1, column: 1 }, end: { line: 1, column: 5 } }
        },
        {
          name: 'div',
          isClosing: true,
          isSelfClosing: false,
          position: { line: 2, column: 1 },
          range: { start: { line: 2, column: 1 }, end: { line: 2, column: 6 } }
        }
      ]
      
      const errors = tagMatcher.validateTagMatching(tags, 'test.vue', '<div>\n</div>')
      
      expect(errors).toHaveLength(0)
    })

    it('应该检测标签不匹配', () => {
      const tags = [
        {
          name: 'div',
          isClosing: false,
          isSelfClosing: false,
          position: { line: 1, column: 1 },
          range: { start: { line: 1, column: 1 }, end: { line: 1, column: 5 } }
        },
        {
          name: 'span',
          isClosing: true,
          isSelfClosing: false,
          position: { line: 2, column: 1 },
          range: { start: { line: 2, column: 1 }, end: { line: 2, column: 7 } }
        }
      ]
      
      const errors = tagMatcher.validateTagMatching(tags, 'test.vue', '<div>\n</span>')
      
      expect(errors).toHaveLength(1)
      expect(errors[0].errorType).toBe(ErrorType.TAG_MISMATCH)
    })
  })

  describe('自闭合标签验证', () => {
    it('应该允许HTML void元素自闭合', () => {
      const tags = [
        {
          name: 'br',
          isClosing: false,
          isSelfClosing: true,
          position: { line: 1, column: 1 },
          range: { start: { line: 1, column: 1 }, end: { line: 1, column: 6 } }
        }
      ]
      
      const errors = tagMatcher.validateTagMatching(tags, 'test.vue', '<br />')
      
      expect(errors).toHaveLength(0)
    })

    it('应该警告HTML非void元素自闭合', () => {
      const tags = [
        {
          name: 'div',
          isClosing: false,
          isSelfClosing: true,
          position: { line: 1, column: 1 },
          range: { start: { line: 1, column: 1 }, end: { line: 1, column: 7 } }
        }
      ]
      
      const errors = tagMatcher.validateTagMatching(tags, 'test.vue', '<div />')
      
      expect(errors).toHaveLength(1)
      expect(errors[0].errorType).toBe(ErrorType.INVALID_SELF_CLOSING)
      expect(errors[0].severity).toBe(ErrorSeverity.WARNING)
    })
  })
})

describe('Vue Template Analyzer - DirectiveValidator', () => {
  let validator: DirectiveValidator

  beforeEach(() => {
    validator = new DirectiveValidator()
  })

  describe('Vue指令验证', () => {
    it('应该验证v-if指令', () => {
      const directives = [
        {
          name: 'v-if',
          value: 'condition',
          modifiers: [],
          position: { line: 1, column: 1 },
          range: { start: { line: 1, column: 1 }, end: { line: 1, column: 10 } }
        }
      ]
      
      const errors = validator.validateDirectives(directives, [], 'test.vue', '<div v-if="condition">')
      
      expect(errors).toHaveLength(0)
    })

    it('应该检测空的v-if指令', () => {
      const directives = [
        {
          name: 'v-if',
          value: '',
          modifiers: [],
          position: { line: 1, column: 1 },
          range: { start: { line: 1, column: 1 }, end: { line: 1, column: 6 } }
        }
      ]
      
      const errors = validator.validateDirectives(directives, [], 'test.vue', '<div v-if="">')
      
      expect(errors).toHaveLength(1)
      expect(errors[0].errorType).toBe(ErrorType.DIRECTIVE_SYNTAX_ERROR)
    })

    it('应该验证v-for指令语法', () => {
      const directives = [
        {
          name: 'v-for',
          value: 'item in items',
          modifiers: [],
          position: { line: 1, column: 1 },
          range: { start: { line: 1, column: 1 }, end: { line: 1, column: 15 } }
        }
      ]
      
      const errors = validator.validateDirectives(directives, [], 'test.vue', '<div v-for="item in items">')
      
      expect(errors).toHaveLength(0)
    })

    it('应该检测错误的v-for语法', () => {
      const directives = [
        {
          name: 'v-for',
          value: 'invalid syntax',
          modifiers: [],
          position: { line: 1, column: 1 },
          range: { start: { line: 1, column: 1 }, end: { line: 1, column: 15 } }
        }
      ]
      
      const errors = validator.validateDirectives(directives, [], 'test.vue', '<div v-for="invalid syntax">')
      
      expect(errors).toHaveLength(1)
      expect(errors[0].errorType).toBe(ErrorType.DIRECTIVE_SYNTAX_ERROR)
    })

    it('应该验证v-model修饰符', () => {
      const directives = [
        {
          name: 'v-model',
          value: 'inputValue',
          modifiers: ['trim', 'lazy'],
          position: { line: 1, column: 1 },
          range: { start: { line: 1, column: 1 }, end: { line: 1, column: 20 } }
        }
      ]
      
      const errors = validator.validateDirectives(directives, [], 'test.vue', '<input v-model.trim.lazy="inputValue">')
      
      expect(errors).toHaveLength(0)
    })

    it('应该检测无效的v-model修饰符', () => {
      const directives = [
        {
          name: 'v-model',
          value: 'inputValue',
          modifiers: ['invalid'],
          position: { line: 1, column: 1 },
          range: { start: { line: 1, column: 1 }, end: { line: 1, column: 20 } }
        }
      ]
      
      const errors = validator.validateDirectives(directives, [], 'test.vue', '<input v-model.invalid="inputValue">')
      
      expect(errors).toHaveLength(1)
      expect(errors[0].errorType).toBe(ErrorType.DIRECTIVE_SYNTAX_ERROR)
    })
  })

  describe('指令冲突检测', () => {
    it('应该警告v-if和v-show同时使用', () => {
      const directives = [
        {
          name: 'v-if',
          value: 'condition1',
          modifiers: [],
          position: { line: 1, column: 1 },
          range: { start: { line: 1, column: 1 }, end: { line: 1, column: 10 } }
        },
        {
          name: 'v-show',
          value: 'condition2',
          modifiers: [],
          position: { line: 1, column: 20 },
          range: { start: { line: 1, column: 20 }, end: { line: 1, column: 30 } }
        }
      ]
      
      const errors = validator.validateDirectives(directives, [], 'test.vue', '<div v-if="condition1" v-show="condition2">')
      
      expect(errors.length).toBeGreaterThan(0)
      expect(errors.some(e => e.errorType === ErrorType.DIRECTIVE_SYNTAX_ERROR)).toBe(true)
    })

    it('应该警告v-for和v-if同时使用', () => {
      const directives = [
        {
          name: 'v-for',
          value: 'item in items',
          modifiers: [],
          position: { line: 1, column: 1 },
          range: { start: { line: 1, column: 1 }, end: { line: 1, column: 15 } }
        },
        {
          name: 'v-if',
          value: 'condition',
          modifiers: [],
          position: { line: 1, column: 20 },
          range: { start: { line: 1, column: 20 }, end: { line: 1, column: 30 } }
        }
      ]
      
      const errors = validator.validateDirectives(directives, [], 'test.vue', '<div v-for="item in items" v-if="condition">')
      
      expect(errors.length).toBeGreaterThan(0)
      expect(errors.some(e => e.severity === ErrorSeverity.WARNING)).toBe(true)
    })
  })
})

describe('Vue Template Analyzer - ErrorLocator', () => {
  let locator: ErrorLocator

  beforeEach(() => {
    locator = new ErrorLocator()
  })

  describe('位置计算', () => {
    it('应该正确计算字符偏移量到位置', () => {
      const content = 'Hello\nWorld\nTest'
      locator.initialize(content)
      
      const position = locator.getPositionFromOffset(6) // 'W' in 'World'
      
      expect(position.line).toBe(2)
      expect(position.column).toBe(1)
    })

    it('应该正确计算位置到字符偏移量', () => {
      const content = 'Hello\nWorld\nTest'
      locator.initialize(content)
      
      const offset = locator.getOffsetFromPosition({ line: 2, column: 1 })
      
      expect(offset).toBe(6)
    })

    it('应该处理边界情况', () => {
      const content = 'Hello\nWorld\nTest'
      locator.initialize(content)
      
      const position1 = locator.getPositionFromOffset(0)
      expect(position1.line).toBe(1)
      expect(position1.column).toBe(1)
      
      const position2 = locator.getPositionFromOffset(content.length)
      expect(position2.line).toBe(3)
      expect(position2.column).toBe(5)
    })
  })

  describe('上下文提取', () => {
    it('应该提取正确的上下文行', () => {
      const content = 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5'
      locator.initialize(content)
      
      const context = locator.getContextLines({ line: 3, column: 1 }, 1, 1)
      
      expect(context.lines).toHaveLength(3)
      expect(context.lines[1].isErrorLine).toBe(true)
      expect(context.errorLine).toBe(3)
    })
  })

  describe('编译器错误解析', () => {
    it('应该解析Vue编译器错误信息', () => {
      const content = 'Line 1\nLine 2\nLine 3'
      locator.initialize(content)
      
      const errorMessage = 'Error at 2:3'
      const location = locator.locateFromCompilerError(errorMessage)
      
      expect(location).toBeDefined()
      expect(location!.position.line).toBe(2)
      expect(location!.position.column).toBe(3)
    })

    it('应该处理无法解析的错误信息', () => {
      const content = 'Line 1\nLine 2\nLine 3'
      locator.initialize(content)
      
      const errorMessage = 'Generic error message'
      const location = locator.locateFromCompilerError(errorMessage)
      
      expect(location).toBeNull()
    })
  })

  describe('位置验证', () => {
    it('应该验证有效位置', () => {
      const content = 'Hello\nWorld'
      locator.initialize(content)
      
      const isValid1 = locator.isValidPosition({ line: 1, column: 3 })
      const isValid2 = locator.isValidPosition({ line: 2, column: 5 })
      
      expect(isValid1).toBe(true)
      expect(isValid2).toBe(true)
    })

    it('应该识别无效位置', () => {
      const content = 'Hello\nWorld'
      locator.initialize(content)
      
      const isValid1 = locator.isValidPosition({ line: 0, column: 1 })
      const isValid2 = locator.isValidPosition({ line: 3, column: 1 })
      const isValid3 = locator.isValidPosition({ line: 1, column: 10 })
      
      expect(isValid1).toBe(false)
      expect(isValid2).toBe(false)
      expect(isValid3).toBe(false)
    })

    it('应该修正无效位置', () => {
      const content = 'Hello\nWorld'
      locator.initialize(content)
      
      const normalized1 = locator.normalizePosition({ line: 0, column: 1 })
      const normalized2 = locator.normalizePosition({ line: 3, column: 1 })
      const normalized3 = locator.normalizePosition({ line: 1, column: 10 })
      
      expect(normalized1.line).toBe(1)
      expect(normalized2.line).toBe(2)
      expect(normalized3.column).toBeLessThanOrEqual(6)
    })
  })
})

describe('Vue Template Analyzer - FixSuggestionGenerator', () => {
  let generator: FixSuggestionGenerator

  beforeEach(() => {
    generator = new FixSuggestionGenerator()
    generator.initialize('<div>Test</div>', 'test.vue')
  })

  describe('修复建议生成', () => {
    it('应该为未闭合标签生成修复建议', () => {
      const error = {
        errorType: ErrorType.UNCLOSED_TAG,
        severity: ErrorSeverity.ERROR,
        message: '标签未闭合: <div>',
        file: 'test.vue',
        position: { line: 1, column: 1 },
        context: '<div>',
        suggestions: []
      }
      
      const suggestions = generator.generateSuggestions(error)
      
      expect(suggestions.length).toBeGreaterThan(0)
      expect(suggestions.some(s => s.type === FixType.AUTO_FIX)).toBe(true)
    })

    it('应该为标签不匹配生成修复建议', () => {
      const error = {
        errorType: ErrorType.TAG_MISMATCH,
        severity: ErrorSeverity.ERROR,
        message: '标签不匹配: 期望 </div>，但找到 </span>',
        file: 'test.vue',
        position: { line: 1, column: 1 },
        context: '</span>',
        suggestions: []
      }
      
      const suggestions = generator.generateSuggestions(error)
      
      expect(suggestions.length).toBeGreaterThan(0)
      expect(suggestions.some(s => s.type === FixType.AUTO_FIX || s.type === FixType.MANUAL_FIX)).toBe(true)
    })

    it('应该为Vue指令错误生成修复建议', () => {
      const error = {
        errorType: ErrorType.DIRECTIVE_SYNTAX_ERROR,
        severity: ErrorSeverity.ERROR,
        message: 'v-for 指令语法错误',
        file: 'test.vue',
        position: { line: 1, column: 1 },
        context: 'v-for="invalid"',
        suggestions: []
      }
      
      const suggestions = generator.generateSuggestions(error)
      
      expect(suggestions.length).toBeGreaterThan(0)
      expect(suggestions.some(s => s.description.includes('v-for'))).toBe(true)
    })

    it('应该设置合适的可信度和风险级别', () => {
      const error = {
        errorType: ErrorType.UNCLOSED_TAG,
        severity: ErrorSeverity.ERROR,
        message: '标签未闭合: <br>',
        file: 'test.vue',
        position: { line: 1, column: 1 },
        context: '<br>',
        suggestions: []
      }
      
      const suggestions = generator.generateSuggestions(error)
      
      expect(suggestions.length).toBeGreaterThan(0)
      
      const autoFixSuggestion = suggestions.find(s => s.type === FixType.AUTO_FIX)
      expect(autoFixSuggestion).toBeDefined()
      expect(autoFixSuggestion!.confidence).toBeGreaterThan(0.8)
      expect(autoFixSuggestion!.riskLevel).toBe(RiskLevel.LOW)
    })
  })

  describe('批量修复建议', () => {
    it('应该生成批量修复建议', () => {
      const errors = [
        {
          errorType: ErrorType.UNCLOSED_TAG,
          severity: ErrorSeverity.ERROR,
          message: '标签未闭合: <div>',
          file: 'test.vue',
          position: { line: 1, column: 1 },
          context: '<div>',
          suggestions: []
        },
        {
          errorType: ErrorType.UNCLOSED_TAG,
          severity: ErrorSeverity.ERROR,
          message: '标签未闭合: <span>',
          file: 'test.vue',
          position: { line: 2, column: 1 },
          context: '<span>',
          suggestions: []
        }
      ]
      
      const suggestionMap = generator.generateBatchSuggestions(errors)
      
      expect(suggestionMap.size).toBeGreaterThan(0)
      expect(suggestionMap.has('combined')).toBe(true)
    })
  })
})

describe('Vue Template Analyzer - DiagnosticReporter', () => {
  let reporter: DiagnosticReporter

  beforeEach(() => {
    reporter = new DiagnosticReporter({ format: 'json' })
  })

  describe('报告生成', () => {
    it('应该生成单文件诊断报告', () => {
      const errors = [
        {
          errorType: ErrorType.UNCLOSED_TAG,
          severity: ErrorSeverity.ERROR,
          message: '标签未闭合',
          file: 'test.vue',
          position: { line: 1, column: 1 },
          context: '',
          suggestions: []
        }
      ]
      
      const report = reporter.generateReport('test.vue', errors, [], [])
      
      expect(report.filePath).toBe('test.vue')
      expect(report.totalErrors).toBe(1)
      expect(report.totalWarnings).toBe(0)
      expect(report.summary).toBeDefined()
      expect(report.timestamp).toBeDefined()
    })

    it('应该计算正确的质量评分', () => {
      const errors = [
        {
          errorType: ErrorType.UNCLOSED_TAG,
          severity: ErrorSeverity.ERROR,
          message: '标签未闭合',
          file: 'test.vue',
          position: { line: 1, column: 1 },
          context: '',
          suggestions: []
        }
      ]
      
      const warnings = [
        {
          errorType: ErrorType.INVALID_SELF_CLOSING,
          severity: ErrorSeverity.WARNING,
          message: '自闭合标签警告',
          file: 'test.vue',
          position: { line: 2, column: 1 },
          context: '',
          suggestions: []
        }
      ]
      
      const report = reporter.generateReport('test.vue', errors, warnings, [])
      
      expect(report.summary.codeQualityScore).toBeLessThan(100)
      expect(report.summary.criticalIssues).toBe(1)
    })

    it('应该生成批量诊断结果', () => {
      const reports = [
        reporter.generateReport('test1.vue', [], [], []),
        reporter.generateReport('test2.vue', [
          {
            errorType: ErrorType.UNCLOSED_TAG,
            severity: ErrorSeverity.ERROR,
            message: '标签未闭合',
            file: 'test2.vue',
            position: { line: 1, column: 1 },
            context: '',
            suggestions: []
          }
        ], [], [])
      ]
      
      const batchResult = reporter.generateBatchResult(reports)
      
      expect(batchResult.totalFiles).toBe(2)
      expect(batchResult.errorFiles).toBe(1)
      expect(batchResult.overallSummary).toBeDefined()
    })
  })

  describe('格式化输出', () => {
    it('应该生成JSON格式报告', () => {
      const report = reporter.generateReport('test.vue', [], [], [])
      const formatted = reporter.formatReport(report)
      
      expect(() => JSON.parse(formatted)).not.toThrow()
    })

    it('应该生成文本格式报告', () => {
      const textReporter = new DiagnosticReporter({ format: 'text' })
      const report = textReporter.generateReport('test.vue', [], [], [])
      const formatted = textReporter.formatReport(report)
      
      expect(typeof formatted).toBe('string')
      expect(formatted).toContain('Vue模板诊断报告')
    })

    it('应该生成HTML格式报告', () => {
      const htmlReporter = new DiagnosticReporter({ format: 'html' })
      const report = htmlReporter.generateReport('test.vue', [], [], [])
      const formatted = htmlReporter.formatReport(report)
      
      expect(formatted).toContain('<!DOCTYPE html>')
      expect(formatted).toContain('<html>')
    })

    it('应该生成XML格式报告', () => {
      const xmlReporter = new DiagnosticReporter({ format: 'xml' })
      const report = xmlReporter.generateReport('test.vue', [], [], [])
      const formatted = xmlReporter.formatReport(report)
      
      expect(formatted).toContain('<?xml version="1.0"')
      expect(formatted).toContain('<diagnostic-report>')
    })
  })

  describe('控制台输出', () => {
    it('应该生成简洁的控制台输出', () => {
      const report = reporter.generateReport('test.vue', [], [], [])
      const output = reporter.generateConsoleOutput(report)
      
      expect(output).toContain('test.vue')
      expect(output).toContain('没有发现问题')
    })

    it('应该生成进度报告', () => {
      const progress = reporter.generateProgressReport(5, 10, 'current.vue')
      
      expect(progress).toContain('50%')
      expect(progress).toContain('5/10')
      expect(progress).toContain('current.vue')
    })
  })
})