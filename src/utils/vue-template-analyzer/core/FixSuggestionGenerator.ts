import { 
  ErrorInfo, 
  ErrorType, 
  FixSuggestion, 
  FixType, 
  RiskLevel,
  TagInfo,
  DirectiveInfo,
  Position,
  Range
} from '../types'

/**
 * 修复建议生成器
 * 基于错误类型和上下文信息生成具体的修复方案
 */
export class FixSuggestionGenerator {
  private fileContent: string = ''
  private filePath: string = ''

  /**
   * 初始化生成器
   */
  public initialize(fileContent: string, filePath: string): void {
    this.fileContent = fileContent
    this.filePath = filePath
  }

  /**
   * 为错误生成修复建议
   */
  public generateSuggestions(error: ErrorInfo): FixSuggestion[] {
    switch (error.errorType) {
      case ErrorType.UNCLOSED_TAG:
        return this.generateUnclosedTagSuggestions(error)
      case ErrorType.TAG_MISMATCH:
        return this.generateTagMismatchSuggestions(error)
      case ErrorType.INVALID_SELF_CLOSING:
        return this.generateInvalidSelfClosingSuggestions(error)
      case ErrorType.DIRECTIVE_SYNTAX_ERROR:
        return this.generateDirectiveSuggestions(error)
      case ErrorType.INVALID_COMMENT:
        return this.generateCommentSuggestions(error)
      case ErrorType.COMPONENT_TAG_ERROR:
        return this.generateComponentTagSuggestions(error)
      case ErrorType.TEMPLATE_SYNTAX_ERROR:
        return this.generateTemplateSyntaxSuggestions(error)
      default:
        return this.generateGenericSuggestions(error)
    }
  }

  /**
   * 生成未闭合标签的修复建议
   */
  private generateUnclosedTagSuggestions(error: ErrorInfo): FixSuggestion[] {
    const suggestions: FixSuggestion[] = []
    const tagName = this.extractTagNameFromError(error)
    
    if (!tagName) return suggestions

    // 获取错误位置的代码行
    const errorLine = this.getLineContent(error.position.line)
    const isVoidElement = this.isVoidElement(tagName)
    const isCustomComponent = this.isCustomComponent(tagName)

    if (isVoidElement) {
      // void元素应该自闭合
      suggestions.push({
        type: FixType.AUTO_FIX,
        description: `将 <${tagName}> 改为自闭合格式`,
        originalCode: `<${tagName}>`,
        fixedCode: `<${tagName} />`,
        confidence: 0.95,
        riskLevel: RiskLevel.LOW,
        explanation: `${tagName} 是HTML void元素，应该使用自闭合语法`,
        examples: [`<${tagName} />`, `<${tagName}>`]
      })
    } else {
      // 1. 在合适位置添加闭合标签
      const closingPosition = this.findBestClosingPosition(error.position, tagName)
      suggestions.push({
        type: FixType.MANUAL_FIX,
        description: `在第${closingPosition.line}行添加闭合标签 </${tagName}>`,
        originalCode: this.getLineContent(closingPosition.line),
        fixedCode: this.getLineContent(closingPosition.line) + `\n</${tagName}>`,
        confidence: 0.8,
        riskLevel: RiskLevel.MEDIUM,
        explanation: '在推测的最佳位置添加闭合标签'
      })

      // 2. 如果是组件，可以改为自闭合
      if (isCustomComponent) {
        suggestions.push({
          type: FixType.AUTO_FIX,
          description: `将组件改为自闭合格式`,
          originalCode: `<${tagName}>`,
          fixedCode: `<${tagName} />`,
          confidence: 0.7,
          riskLevel: RiskLevel.LOW,
          explanation: 'Vue组件可以使用自闭合语法，如果不需要插槽内容'
        })
      }

      // 3. 在当前行添加闭合标签
      suggestions.push({
        type: FixType.MANUAL_FIX,
        description: `在当前行末尾添加闭合标签`,
        originalCode: errorLine,
        fixedCode: errorLine + `</${tagName}>`,
        confidence: 0.5,
        riskLevel: RiskLevel.HIGH,
        explanation: '快速修复：在当前行直接添加闭合标签'
      })
    }

    return suggestions
  }

  /**
   * 生成标签不匹配的修复建议
   */
  private generateTagMismatchSuggestions(error: ErrorInfo): FixSuggestion[] {
    const suggestions: FixSuggestion[] = []
    
    // 从错误消息中提取标签信息
    const mismatchInfo = this.parseTagMismatchError(error.message)
    if (!mismatchInfo) return suggestions

    const { expected, found } = mismatchInfo

    // 1. 修正闭合标签
    suggestions.push({
      type: FixType.AUTO_FIX,
      description: `将闭合标签改为 </${expected}>`,
      originalCode: `</${found}>`,
      fixedCode: `</${expected}>`,
      confidence: 0.9,
      riskLevel: RiskLevel.LOW,
      explanation: `根据最近的未闭合标签 <${expected}> 进行修正`
    })

    // 2. 添加缺失的开始标签
    const insertPosition = this.findInsertPositionForTag(error.position, found)
    suggestions.push({
      type: FixType.MANUAL_FIX,
      description: `在第${insertPosition.line}行添加开始标签 <${found}>`,
      originalCode: this.getLineContent(insertPosition.line),
      fixedCode: this.insertTagAtPosition(insertPosition, `<${found}>`),
      confidence: 0.6,
      riskLevel: RiskLevel.MEDIUM,
      explanation: `添加缺失的开始标签以匹配闭合标签 </${found}>`
    })

    // 3. 检查拼写错误
    const spellingSuggestions = this.generateSpellingSuggestions(found, expected)
    suggestions.push(...spellingSuggestions)

    return suggestions
  }

  /**
   * 生成无效自闭合标签的修复建议
   */
  private generateInvalidSelfClosingSuggestions(error: ErrorInfo): FixSuggestion[] {
    const suggestions: FixSuggestion[] = []
    const tagName = this.extractTagNameFromError(error)
    
    if (!tagName) return suggestions

    // HTML标签不应该自闭合
    suggestions.push({
      type: FixType.AUTO_FIX,
      description: `使用标准的开始和结束标签`,
      originalCode: `<${tagName} />`,
      fixedCode: `<${tagName}></${tagName}>`,
      confidence: 0.9,
      riskLevel: RiskLevel.LOW,
      explanation: 'HTML标准要求非void元素使用完整的开始和结束标签'
    })

    // 如果标签为空，可能可以改为void元素
    const voidAlternative = this.findVoidElementAlternative(tagName)
    if (voidAlternative) {
      suggestions.push({
        type: FixType.MANUAL_FIX,
        description: `考虑使用 <${voidAlternative} /> 替代`,
        originalCode: `<${tagName} />`,
        fixedCode: `<${voidAlternative} />`,
        confidence: 0.5,
        riskLevel: RiskLevel.MEDIUM,
        explanation: `如果需要换行或分隔，可以考虑使用 ${voidAlternative} 元素`
      })
    }

    return suggestions
  }

  /**
   * 生成指令语法错误的修复建议
   */
  private generateDirectiveSuggestions(error: ErrorInfo): FixSuggestion[] {
    const suggestions: FixSuggestion[] = []
    
    // 解析指令错误类型
    if (error.message.includes('v-for')) {
      suggestions.push(...this.generateVForSuggestions(error))
    } else if (error.message.includes('v-if')) {
      suggestions.push(...this.generateVIfSuggestions(error))
    } else if (error.message.includes('v-model')) {
      suggestions.push(...this.generateVModelSuggestions(error))
    } else if (error.message.includes('v-bind') || error.message.includes(':')) {
      suggestions.push(...this.generateVBindSuggestions(error))
    } else if (error.message.includes('v-on') || error.message.includes('@')) {
      suggestions.push(...this.generateVOnSuggestions(error))
    } else {
      suggestions.push(...this.generateGenericDirectiveSuggestions(error))
    }

    return suggestions
  }

  /**
   * 生成v-for指令修复建议
   */
  private generateVForSuggestions(error: ErrorInfo): FixSuggestion[] {
    return [
      {
        type: FixType.MANUAL_FIX,
        description: '使用正确的v-for语法',
        originalCode: 'v-for=""',
        fixedCode: 'v-for="item in items"',
        confidence: 0.8,
        riskLevel: RiskLevel.LOW,
        explanation: 'v-for基本语法：变量 in 数组',
        examples: [
          'v-for="item in items"',
          'v-for="(item, index) in items"',
          'v-for="(value, key) in object"',
          'v-for="n in 10"'
        ]
      },
      {
        type: FixType.MANUAL_FIX,
        description: '添加key属性以优化渲染',
        originalCode: '<div v-for="item in items">',
        fixedCode: '<div v-for="item in items" :key="item.id">',
        confidence: 0.9,
        riskLevel: RiskLevel.LOW,
        explanation: '为v-for添加唯一的key可以提高渲染性能'
      }
    ]
  }

  /**
   * 生成v-if指令修复建议
   */
  private generateVIfSuggestions(error: ErrorInfo): FixSuggestion[] {
    return [
      {
        type: FixType.MANUAL_FIX,
        description: '提供条件表达式',
        originalCode: 'v-if=""',
        fixedCode: 'v-if="condition"',
        confidence: 0.6,
        riskLevel: RiskLevel.MEDIUM,
        explanation: 'v-if需要一个返回布尔值的表达式',
        examples: [
          'v-if="isVisible"',
          'v-if="count > 0"',
          'v-if="user && user.isAdmin"'
        ]
      }
    ]
  }

  /**
   * 生成v-model指令修复建议
   */
  private generateVModelSuggestions(error: ErrorInfo): FixSuggestion[] {
    return [
      {
        type: FixType.MANUAL_FIX,
        description: '绑定到响应式变量',
        originalCode: 'v-model=""',
        fixedCode: 'v-model="inputValue"',
        confidence: 0.7,
        riskLevel: RiskLevel.MEDIUM,
        explanation: 'v-model需要绑定到一个可变的响应式变量'
      },
      {
        type: FixType.MANUAL_FIX,
        description: '使用修饰符优化行为',
        originalCode: 'v-model="value"',
        fixedCode: 'v-model.trim="value"',
        confidence: 0.8,
        riskLevel: RiskLevel.LOW,
        explanation: '常用修饰符：.trim（去空格）、.number（转数字）、.lazy（懒更新）'
      }
    ]
  }

  /**
   * 生成v-bind指令修复建议
   */
  private generateVBindSuggestions(error: ErrorInfo): FixSuggestion[] {
    return [
      {
        type: FixType.MANUAL_FIX,
        description: '指定要绑定的属性',
        originalCode: 'v-bind',
        fixedCode: ':attribute="value"',
        confidence: 0.8,
        riskLevel: RiskLevel.LOW,
        explanation: 'v-bind需要指定要绑定的属性名',
        examples: [
          ':class="classObject"',
          ':style="styleObject"',
          ':href="url"',
          ':disabled="isDisabled"'
        ]
      }
    ]
  }

  /**
   * 生成v-on指令修复建议
   */
  private generateVOnSuggestions(error: ErrorInfo): FixSuggestion[] {
    return [
      {
        type: FixType.MANUAL_FIX,
        description: '指定事件名称',
        originalCode: 'v-on',
        fixedCode: '@event="handler"',
        confidence: 0.8,
        riskLevel: RiskLevel.LOW,
        explanation: 'v-on需要指定要监听的事件名',
        examples: [
          '@click="handleClick"',
          '@input="handleInput"',
          '@submit.prevent="handleSubmit"'
        ]
      }
    ]
  }

  /**
   * 生成通用指令修复建议
   */
  private generateGenericDirectiveSuggestions(error: ErrorInfo): FixSuggestion[] {
    return [
      {
        type: FixType.MANUAL_FIX,
        description: '检查指令语法和拼写',
        originalCode: '',
        fixedCode: '',
        confidence: 0.5,
        riskLevel: RiskLevel.LOW,
        explanation: '请检查指令名称拼写是否正确，或确认这是一个已注册的自定义指令'
      }
    ]
  }

  /**
   * 生成注释语法错误的修复建议
   */
  private generateCommentSuggestions(error: ErrorInfo): FixSuggestion[] {
    return [
      {
        type: FixType.AUTO_FIX,
        description: '正确闭合HTML注释',
        originalCode: '<!-- comment',
        fixedCode: '<!-- comment -->',
        confidence: 0.95,
        riskLevel: RiskLevel.LOW,
        explanation: 'HTML注释必须以 --> 结束'
      }
    ]
  }

  /**
   * 生成组件标签错误的修复建议
   */
  private generateComponentTagSuggestions(error: ErrorInfo): FixSuggestion[] {
    const suggestions: FixSuggestion[] = []
    const tagName = this.extractTagNameFromError(error)
    
    if (!tagName) return suggestions

    // 组件命名规范建议
    if (tagName && !this.isPascalCase(tagName) && !tagName.includes('-')) {
      suggestions.push({
        type: FixType.MANUAL_FIX,
        description: '使用PascalCase或kebab-case命名组件',
        originalCode: `<${tagName}>`,
        fixedCode: `<${this.toPascalCase(tagName)}>`,
        confidence: 0.7,
        riskLevel: RiskLevel.LOW,
        explanation: 'Vue组件推荐使用PascalCase（大驼峰）或kebab-case（短横线）命名'
      })
    }

    // 组件导入检查
    suggestions.push({
      type: FixType.MANUAL_FIX,
      description: '确认组件已正确导入和注册',
      originalCode: '',
      fixedCode: `import ${this.toPascalCase(tagName)} from './components/${this.toPascalCase(tagName)}.vue'`,
      confidence: 0.6,
      riskLevel: RiskLevel.MEDIUM,
      explanation: '请确保组件已在script部分导入并在components中注册'
    })

    return suggestions
  }

  /**
   * 生成模板语法错误的修复建议
   */
  private generateTemplateSyntaxSuggestions(error: ErrorInfo): FixSuggestion[] {
    return [
      {
        type: FixType.MANUAL_FIX,
        description: '检查模板语法和结构',
        originalCode: '',
        fixedCode: '',
        confidence: 0.5,
        riskLevel: RiskLevel.MEDIUM,
        explanation: '请检查模板的整体结构，确保所有标签正确闭合和嵌套'
      },
      {
        type: FixType.MANUAL_FIX,
        description: '验证Vue单文件组件格式',
        originalCode: '',
        fixedCode: '<template>\n  <!-- 模板内容 -->\n</template>',
        confidence: 0.8,
        riskLevel: RiskLevel.LOW,
        explanation: '确保文件包含正确的template标签'
      }
    ]
  }

  /**
   * 生成通用修复建议
   */
  private generateGenericSuggestions(error: ErrorInfo): FixSuggestion[] {
    return [
      {
        type: FixType.MANUAL_FIX,
        description: '检查代码语法和格式',
        originalCode: '',
        fixedCode: '',
        confidence: 0.4,
        riskLevel: RiskLevel.LOW,
        explanation: '请仔细检查错误位置附近的代码语法'
      }
    ]
  }

  /**
   * 生成拼写检查建议
   */
  private generateSpellingSuggestions(found: string, expected: string): FixSuggestion[] {
    const suggestions: FixSuggestion[] = []
    const distance = this.calculateLevenshteinDistance(found, expected)
    
    if (distance <= 2 && distance > 0) {
      suggestions.push({
        type: FixType.AUTO_FIX,
        description: `可能的拼写错误，建议改为 "${expected}"`,
        originalCode: found,
        fixedCode: expected,
        confidence: Math.max(0.5, 1 - distance / Math.max(found.length, expected.length)),
        riskLevel: RiskLevel.LOW,
        explanation: `"${found}" 和 "${expected}" 相似，可能是拼写错误`
      })
    }

    return suggestions
  }

  /**
   * 批量生成修复建议
   */
  public generateBatchSuggestions(errors: ErrorInfo[]): Map<string, FixSuggestion[]> {
    const suggestionMap = new Map<string, FixSuggestion[]>()
    
    errors.forEach((error, index) => {
      const key = `${error.errorType}_${index}`
      suggestionMap.set(key, this.generateSuggestions(error))
    })

    // 分析关联错误，提供组合修复建议
    const combinedSuggestions = this.generateCombinedSuggestions(errors)
    if (combinedSuggestions.length > 0) {
      suggestionMap.set('combined', combinedSuggestions)
    }

    return suggestionMap
  }

  /**
   * 生成组合修复建议
   */
  private generateCombinedSuggestions(errors: ErrorInfo[]): FixSuggestion[] {
    const suggestions: FixSuggestion[] = []
    
    // 检查是否有多个未闭合标签错误
    const unclosedTagErrors = errors.filter(e => e.errorType === ErrorType.UNCLOSED_TAG)
    if (unclosedTagErrors.length > 1) {
      suggestions.push({
        type: FixType.MANUAL_FIX,
        description: `批量修复${unclosedTagErrors.length}个未闭合标签`,
        originalCode: '',
        fixedCode: '',
        confidence: 0.7,
        riskLevel: RiskLevel.MEDIUM,
        explanation: '建议逐一检查并修复所有未闭合的标签'
      })
    }

    // 检查是否有指令相关的错误
    const directiveErrors = errors.filter(e => e.errorType === ErrorType.DIRECTIVE_SYNTAX_ERROR)
    if (directiveErrors.length > 1) {
      suggestions.push({
        type: FixType.MANUAL_FIX,
        description: `检查Vue指令语法`,
        originalCode: '',
        fixedCode: '',
        confidence: 0.8,
        riskLevel: RiskLevel.LOW,
        explanation: '多个指令语法错误，建议参考Vue文档检查指令用法'
      })
    }

    return suggestions
  }

  // 辅助方法

  private extractTagNameFromError(error: ErrorInfo): string | null {
    const match = error.message.match(/<\/?([a-zA-Z][\w-]*)/)?.[1]
    return match || null
  }

  private parseTagMismatchError(message: string): { expected: string; found: string } | null {
    const match = message.match(/期望 <\/(.+?)>，但找到 <\/(.+?)>/)
    if (match) {
      return { expected: match[1], found: match[2] }
    }
    return null
  }

  private getLineContent(lineNumber: number): string {
    const lines = this.fileContent.split('\n')
    return lines[lineNumber - 1] || ''
  }

  private findBestClosingPosition(startPos: Position, tagName: string): Position {
    const lines = this.fileContent.split('\n')
    
    // 简单策略：在相同缩进级别或更少缩进的下一行
    const startIndent = this.calculateIndentLevel(lines[startPos.line - 1] || '')
    
    for (let i = startPos.line; i < lines.length; i++) {
      const line = lines[i]
      const indent = this.calculateIndentLevel(line)
      
      if (indent <= startIndent && line.trim() !== '') {
        return { line: i + 1, column: indent + 1 }
      }
    }
    
    return { line: lines.length, column: 1 }
  }

  private findInsertPositionForTag(errorPos: Position, tagName: string): Position {
    // 简单策略：在错误位置之前插入
    return { line: Math.max(1, errorPos.line - 1), column: 1 }
  }

  private insertTagAtPosition(position: Position, tagCode: string): string {
    const line = this.getLineContent(position.line)
    const indent = ' '.repeat(this.calculateIndentLevel(line))
    return `${indent}${tagCode}\n${line}`
  }

  private calculateIndentLevel(line: string): number {
    const match = line.match(/^(\s*)/)
    return match ? match[1].length : 0
  }

  private isVoidElement(tagName: string): boolean {
    const voidElements = new Set([
      'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
      'keygen', 'link', 'meta', 'param', 'source', 'track', 'wbr'
    ])
    return voidElements.has(tagName.toLowerCase())
  }

  private isCustomComponent(tagName: string): boolean {
    return /^[A-Z]/.test(tagName) || tagName.includes('-')
  }

  private findVoidElementAlternative(tagName: string): string | null {
    const alternatives: Record<string, string> = {
      'div': 'br',
      'span': 'br',
      'p': 'br'
    }
    return alternatives[tagName.toLowerCase()] || null
  }

  private isPascalCase(str: string): boolean {
    return /^[A-Z][a-zA-Z0-9]*$/.test(str)
  }

  private toPascalCase(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
  }

  private calculateLevenshteinDistance(a: string, b: string): number {
    const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null))

    for (let i = 0; i <= a.length; i++) {
      matrix[0][i] = i
    }

    for (let j = 0; j <= b.length; j++) {
      matrix[j][0] = j
    }

    for (let j = 1; j <= b.length; j++) {
      for (let i = 1; i <= a.length; i++) {
        const indicator = a[i - 1] === b[j - 1] ? 0 : 1
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        )
      }
    }

    return matrix[b.length][a.length]
  }
}