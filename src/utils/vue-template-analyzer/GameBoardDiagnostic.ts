import { ErrorAnalyzer } from './core/ErrorAnalyzer'
import { TagMatcher } from './core/TagMatcher'
import { DirectiveValidator } from './core/DirectiveValidator'
import { ErrorLocator } from './core/ErrorLocator'
import { FixSuggestionGenerator } from './core/FixSuggestionGenerator'
import { DiagnosticReporter } from './core/DiagnosticReporter'
import { 
  DiagnosticConfig, 
  DiagnosticReport,
  ErrorInfo,
  ErrorType,
  ErrorSeverity,
  FixSuggestion,
  FixType,
  RiskLevel
} from './types'

/**
 * GameBoard.vue 特定问题诊断器
 * 专门用于诊断和修复Vue单文件组件中的模板错误
 */
export class GameBoardDiagnostic {
  private analyzer: ErrorAnalyzer
  private tagMatcher: TagMatcher
  private directiveValidator: DirectiveValidator
  private errorLocator: ErrorLocator
  private fixGenerator: FixSuggestionGenerator
  private reporter: DiagnosticReporter

  constructor() {
    const config: DiagnosticConfig = {
      enableStrictMode: true,
      checkVueDirectives: true,
      checkComponentTags: true,
      enableAutoFix: true,
      maxErrors: 50,
      ignoreErrors: []
    }

    this.analyzer = new ErrorAnalyzer(config)
    this.tagMatcher = new TagMatcher()
    this.directiveValidator = new DirectiveValidator()
    this.errorLocator = new ErrorLocator()
    this.fixGenerator = new FixSuggestionGenerator()
    this.reporter = new DiagnosticReporter({ format: 'text', verbose: true })
  }

  /**
   * 诊断GameBoard.vue文件
   */
  public async diagnoseGameBoard(filePath: string, fileContent: string): Promise<DiagnosticReport> {
    console.log('🔍 开始诊断 GameBoard.vue...\n')

    // 初始化组件
    this.errorLocator.initialize(fileContent)
    this.fixGenerator.initialize(fileContent, filePath)

    // 1. 基础模板分析
    console.log('📋 步骤1: 基础模板结构分析')
    const parseResult = await this.analyzer.analyzeVueFile(filePath, fileContent)
    
    // 2. 详细标签验证
    console.log('🏷️  步骤2: 标签匹配验证')
    const tagErrors = this.tagMatcher.validateTagMatching(parseResult.tags, filePath, fileContent)
    
    // 3. Vue指令检查
    console.log('⚡ 步骤3: Vue指令语法检查')
    const directiveErrors = this.directiveValidator.validateDirectives(
      parseResult.directives,
      [],
      filePath,
      fileContent
    )

    // 4. 特定问题检查
    console.log('🎯 步骤4: 特定问题检查')
    const specificErrors = this.checkSpecificIssues(fileContent, filePath)

    // 合并所有错误
    const allErrors = [
      ...parseResult.errors,
      ...tagErrors,
      ...directiveErrors,
      ...specificErrors
    ]

    const allWarnings = parseResult.warnings

    // 生成修复建议
    console.log('🔧 步骤5: 生成修复建议')
    const suggestions: FixSuggestion[] = []
    for (const error of allErrors) {
      const errorSuggestions = this.fixGenerator.generateSuggestions(error)
      suggestions.push(...errorSuggestions)
    }

    // 添加特定的修复建议
    suggestions.push(...this.generateGameBoardSpecificSuggestions(allErrors))

    // 生成诊断报告
    const report = this.reporter.generateReport(filePath, allErrors, allWarnings, suggestions)

    console.log('✅ 诊断完成!\n')
    
    return report
  }

  /**
   * 检查特定的Vue组件问题
   */
  private checkSpecificIssues(fileContent: string, filePath: string): ErrorInfo[] {
    const errors: ErrorInfo[] = []
    const lines = fileContent.split('\n')

    // 检查常见的Vue编译错误
    errors.push(...this.checkCommonVueErrors(lines, filePath))
    
    // 检查模板嵌套问题
    errors.push(...this.checkTemplateNesting(lines, filePath))
    
    // 检查特殊字符问题
    errors.push(...this.checkSpecialCharacters(lines, filePath))
    
    // 检查组件导入问题
    errors.push(...this.checkComponentImports(lines, filePath))

    return errors
  }

  /**
   * 检查常见的Vue编译错误
   */
  private checkCommonVueErrors(lines: string[], filePath: string): ErrorInfo[] {
    const errors: ErrorInfo[] = []

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const lineNumber = i + 1

      // 检查第12行（根据错误信息）
      if (lineNumber === 12) {
        // 仔细检查第12行的内容
        if (line.includes('<div') && !line.includes('</div>')) {
          // 检查是否有未闭合的div标签
          const divCount = (line.match(/<div/g) || []).length
          const closingDivCount = (line.match(/<\/div>/g) || []).length
          
          if (divCount > closingDivCount) {
            errors.push({
              errorType: ErrorType.UNCLOSED_TAG,
              severity: ErrorSeverity.ERROR,
              message: '第12行的div标签可能未正确闭合',
              file: filePath,
              position: { line: lineNumber, column: line.indexOf('<div') + 1 },
              context: this.getContextLines(lines, lineNumber),
              suggestions: []
            })
          }
        }

        // 检查特殊字符
        if (/[^\x00-\x7F]/.test(line) && !line.includes('<!--')) {
          const nonAsciiMatch = line.match(/[^\x00-\x7F]/)
          if (nonAsciiMatch) {
            errors.push({
              errorType: ErrorType.ENCODING_ERROR,
              severity: ErrorSeverity.WARNING,
              message: '发现非ASCII字符，可能导致解析错误',
              file: filePath,
              position: { 
                line: lineNumber, 
                column: line.indexOf(nonAsciiMatch[0]) + 1 
              },
              context: this.getContextLines(lines, lineNumber),
              suggestions: []
            })
          }
        }
      }

      // 检查常见的语法错误模式
      if (line.includes('<<') || line.includes('>>')) {
        errors.push({
          errorType: ErrorType.TEMPLATE_SYNTAX_ERROR,
          severity: ErrorSeverity.ERROR,
          message: '发现可能的双重标签符号',
          file: filePath,
          position: { line: lineNumber, column: line.search(/<<|>>/) + 1 },
          context: this.getContextLines(lines, lineNumber),
          suggestions: []
        })
      }

      // 检查不匹配的引号
      const quotePattern = /['"][^'"]*$/
      if (quotePattern.test(line.trim()) && !line.includes('<!--')) {
        errors.push({
          errorType: ErrorType.TEMPLATE_SYNTAX_ERROR,
          severity: ErrorSeverity.ERROR,
          message: '可能存在未闭合的引号',
          file: filePath,
          position: { line: lineNumber, column: line.search(quotePattern) + 1 },
          context: this.getContextLines(lines, lineNumber),
          suggestions: []
        })
      }
    }

    return errors
  }

  /**
   * 检查模板嵌套问题
   */
  private checkTemplateNesting(lines: string[], filePath: string): ErrorInfo[] {
    const errors: ErrorInfo[] = []
    let templateDepth = 0
    let inTemplate = false

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const lineNumber = i + 1

      if (line.includes('<template')) {
        if (inTemplate) {
          errors.push({
            errorType: ErrorType.TEMPLATE_SYNTAX_ERROR,
            severity: ErrorSeverity.ERROR,
            message: '不应该嵌套多个template标签',
            file: filePath,
            position: { line: lineNumber, column: line.indexOf('<template') + 1 },
            context: this.getContextLines(lines, lineNumber),
            suggestions: []
          })
        }
        inTemplate = true
      }

      if (line.includes('</template>')) {
        inTemplate = false
      }

      // 检查标签深度
      const openTags = (line.match(/<[^\/][^>]*>/g) || []).filter(tag => !tag.endsWith('/>')).length
      const closeTags = (line.match(/<\/[^>]*>/g) || []).length
      templateDepth += openTags - closeTags

      if (templateDepth > 20) {
        errors.push({
          errorType: ErrorType.TEMPLATE_SYNTAX_ERROR,
          severity: ErrorSeverity.WARNING,
          message: '模板嵌套层级过深，可能影响性能',
          file: filePath,
          position: { line: lineNumber, column: 1 },
          context: this.getContextLines(lines, lineNumber),
          suggestions: []
        })
      }
    }

    return errors
  }

  /**
   * 检查特殊字符问题
   */
  private checkSpecialCharacters(lines: string[], filePath: string): ErrorInfo[] {
    const errors: ErrorInfo[] = []

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const lineNumber = i + 1

      // 检查零宽度字符
      if (/[\u200B-\u200D\uFEFF]/.test(line)) {
        errors.push({
          errorType: ErrorType.ENCODING_ERROR,
          severity: ErrorSeverity.ERROR,
          message: '发现零宽度字符，可能导致解析错误',
          file: filePath,
          position: { line: lineNumber, column: 1 },
          context: this.getContextLines(lines, lineNumber),
          suggestions: []
        })
      }

      // 检查BOM字符
      if (lineNumber === 1 && line.charCodeAt(0) === 0xFEFF) {
        errors.push({
          errorType: ErrorType.ENCODING_ERROR,
          severity: ErrorSeverity.WARNING,
          message: '文件开头发现BOM字符',
          file: filePath,
          position: { line: lineNumber, column: 1 },
          context: this.getContextLines(lines, lineNumber),
          suggestions: []
        })
      }
    }

    return errors
  }

  /**
   * 检查组件导入问题
   */
  private checkComponentImports(lines: string[], filePath: string): ErrorInfo[] {
    const errors: ErrorInfo[] = []
    const usedComponents = new Set<string>()
    const importedComponents = new Set<string>()

    // 收集模板中使用的组件
    for (const line of lines) {
      const componentMatches = line.match(/<([A-Z][a-zA-Z0-9]*)/g)
      if (componentMatches) {
        componentMatches.forEach(match => {
          const componentName = match.slice(1)
          usedComponents.add(componentName)
        })
      }
    }

    // 收集导入的组件
    let inScript = false
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      
      if (line.includes('<script')) {
        inScript = true
        continue
      }
      
      if (line.includes('</script>')) {
        inScript = false
        continue
      }

      if (inScript) {
        const importMatch = line.match(/import\s+(\w+)\s+from/)
        if (importMatch) {
          importedComponents.add(importMatch[1])
        }
      }
    }

    // 检查未导入的组件
    for (const component of usedComponents) {
      if (!importedComponents.has(component)) {
        errors.push({
          errorType: ErrorType.COMPONENT_TAG_ERROR,
          severity: ErrorSeverity.ERROR,
          message: `组件 ${component} 在模板中使用但未导入`,
          file: filePath,
          position: { line: 1, column: 1 },
          context: '',
          suggestions: []
        })
      }
    }

    return errors
  }

  /**
   * 生成GameBoard特定的修复建议
   */
  private generateGameBoardSpecificSuggestions(errors: ErrorInfo[]): FixSuggestion[] {
    const suggestions: FixSuggestion[] = []

    // 如果发现第12行有问题，提供具体建议
    const line12Errors = errors.filter(e => e.position.line === 12)
    if (line12Errors.length > 0) {
      suggestions.push({
        type: FixType.MANUAL_FIX,
        description: '检查第12行div标签的结构',
        originalCode: '',
        fixedCode: '',
        confidence: 0.8,
        riskLevel: RiskLevel.MEDIUM,
        explanation: '根据Vue编译器错误，第12行第5列的div标签存在问题，建议检查标签嵌套和闭合',
        examples: [
          '确保每个<div>都有对应的</div>',
          '检查标签属性是否正确闭合',
          '验证嵌套结构是否合理'
        ]
      })
    }

    // 如果发现编码问题
    const encodingErrors = errors.filter(e => e.errorType === ErrorType.ENCODING_ERROR)
    if (encodingErrors.length > 0) {
      suggestions.push({
        type: FixType.AUTO_FIX,
        description: '清理文件编码问题',
        originalCode: '',
        fixedCode: '',
        confidence: 0.9,
        riskLevel: RiskLevel.LOW,
        explanation: '移除零宽度字符和BOM标记，使用UTF-8编码保存文件'
      })
    }

    // 通用的Vue组件最佳实践建议
    suggestions.push({
      type: FixType.REFACTOR_SUGGESTION,
      description: 'Vue组件模板最佳实践',
      originalCode: '',
      fixedCode: '',
      confidence: 0.7,
      riskLevel: RiskLevel.LOW,
      explanation: '遵循Vue官方推荐的组件开发规范',
      examples: [
        '使用单一根元素（Vue 2）或明确的根元素结构',
        '避免过深的标签嵌套',
        '正确使用Vue指令和组件',
        '确保所有标签正确闭合'
      ]
    })

    return suggestions
  }

  /**
   * 获取上下文行
   */
  private getContextLines(lines: string[], lineNumber: number, contextSize = 3): string {
    const start = Math.max(0, lineNumber - contextSize - 1)
    const end = Math.min(lines.length, lineNumber + contextSize)
    
    return lines.slice(start, end)
      .map((line, index) => {
        const num = start + index + 1
        const prefix = num === lineNumber ? '>>> ' : '    '
        return `${prefix}${num.toString().padStart(3)}: ${line}`
      })
      .join('\n')
  }

  /**
   * 生成修复后的文件内容
   */
  public generateFixedContent(originalContent: string, suggestions: FixSuggestion[]): string {
    let fixedContent = originalContent

    // 应用自动修复建议
    const autoFixSuggestions = suggestions.filter(s => 
      s.type === FixType.AUTO_FIX && s.confidence > 0.8 && s.originalCode && s.fixedCode
    )

    autoFixSuggestions.forEach(suggestion => {
      if (suggestion.originalCode && suggestion.fixedCode) {
        fixedContent = fixedContent.replace(suggestion.originalCode, suggestion.fixedCode)
      }
    })

    return fixedContent
  }

  /**
   * 验证修复效果
   */
  public async validateFix(filePath: string, fixedContent: string): Promise<boolean> {
    try {
      const report = await this.diagnoseGameBoard(filePath, fixedContent)
      return report.totalErrors === 0
    } catch (error) {
      return false
    }
  }
}