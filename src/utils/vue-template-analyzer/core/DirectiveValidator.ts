import { 
  ErrorInfo, 
  ErrorType, 
  ErrorSeverity, 
  DirectiveInfo, 
  AttributeInfo,
  FixSuggestion,
  FixType,
  RiskLevel,
  Position 
} from '../types'

/**
 * Vue指令语法验证器
 * 专门用于检查Vue指令的语法正确性和最佳实践
 */
export class DirectiveValidator {
  private filePath: string = ''
  private fileContent: string = ''

  /**
   * 验证Vue指令语法
   */
  public validateDirectives(
    directives: DirectiveInfo[], 
    attributes: AttributeInfo[],
    filePath: string, 
    fileContent: string
  ): ErrorInfo[] {
    this.filePath = filePath
    this.fileContent = fileContent
    
    const errors: ErrorInfo[] = []

    // 验证指令语法
    directives.forEach(directive => {
      errors.push(...this.validateDirective(directive))
    })

    // 验证属性中的指令语法
    attributes.forEach(attr => {
      if (attr.isVueDirective) {
        errors.push(...this.validateDirectiveAttribute(attr))
      }
    })

    // 检查指令冲突
    errors.push(...this.checkDirectiveConflicts(directives))

    // 检查最佳实践
    errors.push(...this.checkDirectiveBestPractices(directives))

    return errors
  }

  /**
   * 验证单个指令
   */
  private validateDirective(directive: DirectiveInfo): ErrorInfo[] {
    const errors: ErrorInfo[] = []

    // 验证指令名称
    if (!this.isValidDirectiveName(directive.name)) {
      errors.push(this.createInvalidDirectiveNameError(directive))
    }

    // 验证特定指令的语法
    switch (directive.name) {
      case 'v-if':
      case 'v-else-if':
      case 'v-show':
        errors.push(...this.validateConditionalDirective(directive))
        break
      case 'v-for':
        errors.push(...this.validateForDirective(directive))
        break
      case 'v-model':
        errors.push(...this.validateModelDirective(directive))
        break
      case 'v-bind':
        errors.push(...this.validateBindDirective(directive))
        break
      case 'v-on':
        errors.push(...this.validateOnDirective(directive))
        break
      case 'v-slot':
        errors.push(...this.validateSlotDirective(directive))
        break
      default:
        if (directive.name.startsWith('v-')) {
          errors.push(...this.validateCustomDirective(directive))
        }
    }

    return errors
  }

  /**
   * 验证指令属性
   */
  private validateDirectiveAttribute(attr: AttributeInfo): ErrorInfo[] {
    const errors: ErrorInfo[] = []

    // 解析指令语法
    const directive = this.parseDirectiveFromAttribute(attr)
    if (!directive) {
      errors.push(this.createInvalidDirectiveSyntaxError(attr))
      return errors
    }

    // 验证解析后的指令
    errors.push(...this.validateDirective(directive))

    return errors
  }

  /**
   * 从属性解析指令信息
   */
  private parseDirectiveFromAttribute(attr: AttributeInfo): DirectiveInfo | null {
    let directiveName = attr.name
    let argument: string | undefined
    let modifiers: string[] = []

    // 处理简写语法
    if (attr.name.startsWith('@')) {
      directiveName = 'v-on'
      argument = attr.name.slice(1)
    } else if (attr.name.startsWith(':')) {
      directiveName = 'v-bind'
      argument = attr.name.slice(1)
    } else if (attr.name.startsWith('#')) {
      directiveName = 'v-slot'
      argument = attr.name.slice(1)
    }

    // 解析修饰符
    if (argument && argument.includes('.')) {
      const parts = argument.split('.')
      argument = parts[0]
      modifiers = parts.slice(1)
    }

    // 解析完整指令语法 v-directive:argument.modifier
    const directiveMatch = directiveName.match(/^v-([^:]+)(?::(.+))?$/)
    if (directiveMatch) {
      const [, name, arg] = directiveMatch
      directiveName = `v-${name}`
      if (arg) {
        const argParts = arg.split('.')
        argument = argParts[0]
        modifiers = argParts.slice(1)
      }
    }

    return {
      name: directiveName,
      argument,
      modifiers,
      value: attr.value,
      position: attr.position,
      range: attr.range
    }
  }

  /**
   * 验证条件指令 (v-if, v-else-if, v-show)
   */
  private validateConditionalDirective(directive: DirectiveInfo): ErrorInfo[] {
    const errors: ErrorInfo[] = []

    if (!directive.value || directive.value.trim() === '') {
      errors.push({
        errorType: ErrorType.DIRECTIVE_SYNTAX_ERROR,
        severity: ErrorSeverity.ERROR,
        message: `${directive.name} 指令需要一个表达式`,
        file: this.filePath,
        position: directive.position,
        context: this.getContextLines(directive.position),
        suggestions: [
          {
            type: FixType.MANUAL_FIX,
            description: '添加条件表达式',
            originalCode: `${directive.name}=""`,
            fixedCode: `${directive.name}="condition"`,
            confidence: 0.5,
            riskLevel: RiskLevel.HIGH,
            explanation: '需要手动提供有效的条件表达式'
          }
        ]
      })
    }

    // 检查表达式语法
    if (directive.value) {
      errors.push(...this.validateJavaScriptExpression(directive.value, directive))
    }

    return errors
  }

  /**
   * 验证v-for指令
   */
  private validateForDirective(directive: DirectiveInfo): ErrorInfo[] {
    const errors: ErrorInfo[] = []

    if (!directive.value || directive.value.trim() === '') {
      errors.push({
        errorType: ErrorType.DIRECTIVE_SYNTAX_ERROR,
        severity: ErrorSeverity.ERROR,
        message: 'v-for 指令需要一个迭代表达式',
        file: this.filePath,
        position: directive.position,
        context: this.getContextLines(directive.position),
        suggestions: [
          {
            type: FixType.MANUAL_FIX,
            description: '添加迭代表达式',
            originalCode: 'v-for=""',
            fixedCode: 'v-for="item in items"',
            confidence: 0.5,
            riskLevel: RiskLevel.HIGH,
            explanation: '需要手动提供有效的迭代表达式'
          }
        ]
      })
      return errors
    }

    // 验证v-for语法格式
    const forPattern = /^(\w+)(?:\s*,\s*(\w+))?(?:\s*,\s*(\w+))?\s+in\s+(.+)$/
    const ofPattern = /^(\w+)(?:\s*,\s*(\w+))?(?:\s*,\s*(\w+))?\s+of\s+(.+)$/
    
    if (!forPattern.test(directive.value) && !ofPattern.test(directive.value)) {
      errors.push({
        errorType: ErrorType.DIRECTIVE_SYNTAX_ERROR,
        severity: ErrorSeverity.ERROR,
        message: 'v-for 指令语法错误',
        file: this.filePath,
        position: directive.position,
        context: this.getContextLines(directive.position),
        suggestions: [
          {
            type: FixType.MANUAL_FIX,
            description: '使用正确的v-for语法',
            originalCode: directive.value,
            fixedCode: 'item in items',
            confidence: 0.6,
            riskLevel: RiskLevel.MEDIUM,
            explanation: '正确格式: "item in items" 或 "(item, index) in items"',
            examples: [
              'item in items',
              '(item, index) in items',
              '(value, key) in object',
              '(value, key, index) in object'
            ]
          }
        ]
      })
    }

    return errors
  }

  /**
   * 验证v-model指令
   */
  private validateModelDirective(directive: DirectiveInfo): ErrorInfo[] {
    const errors: ErrorInfo[] = []

    if (!directive.value || directive.value.trim() === '') {
      errors.push({
        errorType: ErrorType.DIRECTIVE_SYNTAX_ERROR,
        severity: ErrorSeverity.ERROR,
        message: 'v-model 指令需要绑定到一个变量',
        file: this.filePath,
        position: directive.position,
        context: this.getContextLines(directive.position),
        suggestions: [
          {
            type: FixType.MANUAL_FIX,
            description: '绑定到一个响应式变量',
            originalCode: 'v-model=""',
            fixedCode: 'v-model="variableName"',
            confidence: 0.5,
            riskLevel: RiskLevel.HIGH,
            explanation: '需要手动提供有效的变量名'
          }
        ]
      })
    }

    // 验证修饰符
    const validModifiers = ['lazy', 'number', 'trim']
    const invalidModifiers = directive.modifiers.filter(mod => !validModifiers.includes(mod))
    
    if (invalidModifiers.length > 0) {
      errors.push({
        errorType: ErrorType.DIRECTIVE_SYNTAX_ERROR,
        severity: ErrorSeverity.ERROR,
        message: `v-model 的无效修饰符: ${invalidModifiers.join(', ')}`,
        file: this.filePath,
        position: directive.position,
        context: this.getContextLines(directive.position),
        suggestions: [
          {
            type: FixType.AUTO_FIX,
            description: '删除无效的修饰符',
            originalCode: `v-model.${directive.modifiers.join('.')}`,
            fixedCode: `v-model.${directive.modifiers.filter(mod => validModifiers.includes(mod)).join('.')}`,
            confidence: 0.9,
            riskLevel: RiskLevel.LOW,
            explanation: `有效的v-model修饰符: ${validModifiers.join(', ')}`
          }
        ]
      })
    }

    return errors
  }

  /**
   * 验证v-bind指令
   */
  private validateBindDirective(directive: DirectiveInfo): ErrorInfo[] {
    const errors: ErrorInfo[] = []

    if (!directive.argument) {
      errors.push({
        errorType: ErrorType.DIRECTIVE_SYNTAX_ERROR,
        severity: ErrorSeverity.ERROR,
        message: 'v-bind 指令需要指定要绑定的属性',
        file: this.filePath,
        position: directive.position,
        context: this.getContextLines(directive.position),
        suggestions: [
          {
            type: FixType.MANUAL_FIX,
            description: '指定要绑定的属性',
            originalCode: 'v-bind',
            fixedCode: 'v-bind:attribute 或 :attribute',
            confidence: 0.5,
            riskLevel: RiskLevel.HIGH,
            explanation: '需要指定要绑定的属性名，如 :class, :style, :href 等'
          }
        ]
      })
    }

    // 验证修饰符
    const validModifiers = ['camel', 'kebab', 'sync']
    const invalidModifiers = directive.modifiers.filter(mod => !validModifiers.includes(mod))
    
    if (invalidModifiers.length > 0) {
      errors.push({
        errorType: ErrorType.DIRECTIVE_SYNTAX_ERROR,
        severity: ErrorSeverity.WARNING,
        message: `v-bind 的可能无效修饰符: ${invalidModifiers.join(', ')}`,
        file: this.filePath,
        position: directive.position,
        context: this.getContextLines(directive.position),
        suggestions: [
          {
            type: FixType.MANUAL_FIX,
            description: '检查修饰符是否正确',
            originalCode: `v-bind:${directive.argument}.${directive.modifiers.join('.')}`,
            fixedCode: `v-bind:${directive.argument}`,
            confidence: 0.6,
            riskLevel: RiskLevel.LOW,
            explanation: `常用的v-bind修饰符: ${validModifiers.join(', ')}`
          }
        ]
      })
    }

    return errors
  }

  /**
   * 验证v-on指令
   */
  private validateOnDirective(directive: DirectiveInfo): ErrorInfo[] {
    const errors: ErrorInfo[] = []

    if (!directive.argument) {
      errors.push({
        errorType: ErrorType.DIRECTIVE_SYNTAX_ERROR,
        severity: ErrorSeverity.ERROR,
        message: 'v-on 指令需要指定事件名称',
        file: this.filePath,
        position: directive.position,
        context: this.getContextLines(directive.position),
        suggestions: [
          {
            type: FixType.MANUAL_FIX,
            description: '指定事件名称',
            originalCode: 'v-on',
            fixedCode: 'v-on:click 或 @click',
            confidence: 0.5,
            riskLevel: RiskLevel.HIGH,
            explanation: '需要指定要监听的事件名，如 @click, @input, @change 等'
          }
        ]
      })
    }

    // 验证修饰符
    const validModifiers = [
      'stop', 'prevent', 'capture', 'self', 'once', 'passive',
      'native', 'left', 'right', 'middle', 'exact',
      // 键盘修饰符
      'enter', 'tab', 'delete', 'esc', 'space', 'up', 'down', 'left', 'right',
      'ctrl', 'alt', 'shift', 'meta'
    ]
    
    const unknownModifiers = directive.modifiers.filter(mod => 
      !validModifiers.includes(mod) && !/^[a-z]+$/.test(mod)
    )
    
    if (unknownModifiers.length > 0) {
      errors.push({
        errorType: ErrorType.DIRECTIVE_SYNTAX_ERROR,
        severity: ErrorSeverity.WARNING,
        message: `v-on 的未知修饰符: ${unknownModifiers.join(', ')}`,
        file: this.filePath,
        position: directive.position,
        context: this.getContextLines(directive.position),
        suggestions: [
          {
            type: FixType.MANUAL_FIX,
            description: '检查修饰符拼写是否正确',
            originalCode: `@${directive.argument}.${directive.modifiers.join('.')}`,
            fixedCode: `@${directive.argument}`,
            confidence: 0.5,
            riskLevel: RiskLevel.LOW,
            explanation: '请检查修饰符拼写，或查阅Vue文档确认修饰符有效性'
          }
        ]
      })
    }

    return errors
  }

  /**
   * 验证v-slot指令
   */
  private validateSlotDirective(directive: DirectiveInfo): ErrorInfo[] {
    const errors: ErrorInfo[] = []

    // v-slot只能用在组件或template标签上
    // 这里需要从上下文获取标签信息，暂时跳过这个检查

    // 验证插槽名称
    if (directive.argument && !/^[a-zA-Z_][\w-]*$/.test(directive.argument)) {
      errors.push({
        errorType: ErrorType.DIRECTIVE_SYNTAX_ERROR,
        severity: ErrorSeverity.ERROR,
        message: `无效的插槽名称: ${directive.argument}`,
        file: this.filePath,
        position: directive.position,
        context: this.getContextLines(directive.position),
        suggestions: [
          {
            type: FixType.MANUAL_FIX,
            description: '使用有效的插槽名称',
            originalCode: `v-slot:${directive.argument}`,
            fixedCode: 'v-slot:validSlotName',
            confidence: 0.6,
            riskLevel: RiskLevel.MEDIUM,
            explanation: '插槽名称应该是有效的标识符'
          }
        ]
      })
    }

    return errors
  }

  /**
   * 验证自定义指令
   */
  private validateCustomDirective(directive: DirectiveInfo): ErrorInfo[] {
    const errors: ErrorInfo[] = []

    // 检查自定义指令命名规范
    if (!/^v-[a-z][a-z0-9-]*$/.test(directive.name)) {
      errors.push({
        errorType: ErrorType.DIRECTIVE_SYNTAX_ERROR,
        severity: ErrorSeverity.WARNING,
        message: `自定义指令命名不规范: ${directive.name}`,
        file: this.filePath,
        position: directive.position,
        context: this.getContextLines(directive.position),
        suggestions: [
          {
            type: FixType.MANUAL_FIX,
            description: '使用kebab-case命名',
            originalCode: directive.name,
            fixedCode: directive.name.toLowerCase(),
            confidence: 0.7,
            riskLevel: RiskLevel.LOW,
            explanation: '自定义指令应该使用小写字母和连字符'
          }
        ]
      })
    }

    return errors
  }

  /**
   * 检查指令冲突
   */
  private checkDirectiveConflicts(directives: DirectiveInfo[]): ErrorInfo[] {
    const errors: ErrorInfo[] = []

    // 检查互斥指令
    const conditionalDirectives = directives.filter(d => 
      ['v-if', 'v-else-if', 'v-else', 'v-show'].includes(d.name)
    )

    if (conditionalDirectives.length > 1) {
      const hasIfElse = conditionalDirectives.some(d => d.name.startsWith('v-if') || d.name === 'v-else')
      const hasShow = conditionalDirectives.some(d => d.name === 'v-show')

      if (hasIfElse && hasShow) {
        errors.push({
          errorType: ErrorType.DIRECTIVE_SYNTAX_ERROR,
          severity: ErrorSeverity.WARNING,
          message: '不建议同时使用 v-if 和 v-show',
          file: this.filePath,
          position: conditionalDirectives[0].position,
          context: this.getContextLines(conditionalDirectives[0].position),
          suggestions: [
            {
              type: FixType.REFACTOR_SUGGESTION,
              description: '选择使用 v-if 或 v-show 其中之一',
              originalCode: '',
              fixedCode: '',
              confidence: 0.8,
              riskLevel: RiskLevel.LOW,
              explanation: 'v-if 用于条件渲染，v-show 用于显示/隐藏'
            }
          ]
        })
      }
    }

    return errors
  }

  /**
   * 检查指令最佳实践
   */
  private checkDirectiveBestPractices(directives: DirectiveInfo[]): ErrorInfo[] {
    const errors: ErrorInfo[] = []

    // 检查v-for和v-if同时使用
    const hasFor = directives.some(d => d.name === 'v-for')
    const hasIf = directives.some(d => d.name === 'v-if')

    if (hasFor && hasIf) {
      errors.push({
        errorType: ErrorType.DIRECTIVE_SYNTAX_ERROR,
        severity: ErrorSeverity.WARNING,
        message: '避免在同一元素上同时使用 v-for 和 v-if',
        file: this.filePath,
        position: directives.find(d => d.name === 'v-for')!.position,
        context: this.getContextLines(directives.find(d => d.name === 'v-for')!.position),
        suggestions: [
          {
            type: FixType.REFACTOR_SUGGESTION,
            description: '使用 template 标签或计算属性优化',
            originalCode: '<div v-for="item in items" v-if="condition">',
            fixedCode: '<template v-for="item in items"><div v-if="condition">',
            confidence: 0.8,
            riskLevel: RiskLevel.LOW,
            explanation: '将v-if移到内层或使用计算属性过滤数据'
          }
        ]
      })
    }

    return errors
  }

  /**
   * 验证JavaScript表达式
   */
  private validateJavaScriptExpression(expression: string, directive: DirectiveInfo): ErrorInfo[] {
    const errors: ErrorInfo[] = []

    try {
      // 简单的语法检查
      new Function(`return (${expression})`)
    } catch (error) {
      errors.push({
        errorType: ErrorType.DIRECTIVE_SYNTAX_ERROR,
        severity: ErrorSeverity.ERROR,
        message: `表达式语法错误: ${error instanceof Error ? error.message : '未知错误'}`,
        file: this.filePath,
        position: directive.position,
        context: this.getContextLines(directive.position),
        suggestions: [
          {
            type: FixType.MANUAL_FIX,
            description: '修正表达式语法',
            originalCode: expression,
            fixedCode: '/* 请修正表达式语法 */',
            confidence: 0.3,
            riskLevel: RiskLevel.HIGH,
            explanation: '请检查表达式的JavaScript语法'
          }
        ]
      })
    }

    return errors
  }

  /**
   * 检查指令名称是否有效
   */
  private isValidDirectiveName(name: string): boolean {
    const builtInDirectives = [
      'v-if', 'v-else', 'v-else-if', 'v-for', 'v-show', 'v-bind', 'v-on',
      'v-model', 'v-slot', 'v-pre', 'v-cloak', 'v-once', 'v-html', 'v-text'
    ]

    // 内置指令
    if (builtInDirectives.includes(name)) {
      return true
    }

    // 简写语法
    if (name.startsWith('@') || name.startsWith(':') || name.startsWith('#')) {
      return true
    }

    // 自定义指令
    if (name.startsWith('v-') && name.length > 2) {
      return true
    }

    return false
  }

  /**
   * 创建无效指令名称错误
   */
  private createInvalidDirectiveNameError(directive: DirectiveInfo): ErrorInfo {
    return {
      errorType: ErrorType.DIRECTIVE_SYNTAX_ERROR,
      severity: ErrorSeverity.ERROR,
      message: `无效的Vue指令: ${directive.name}`,
      file: this.filePath,
      position: directive.position,
      context: this.getContextLines(directive.position),
      suggestions: [
        {
          type: FixType.MANUAL_FIX,
          description: '检查指令名称拼写',
          originalCode: directive.name,
          fixedCode: '/* 请检查指令名称 */',
          confidence: 0.5,
          riskLevel: RiskLevel.MEDIUM,
          explanation: '请确认指令名称拼写正确，或这是一个已注册的自定义指令'
        }
      ]
    }
  }

  /**
   * 创建无效指令语法错误
   */
  private createInvalidDirectiveSyntaxError(attr: AttributeInfo): ErrorInfo {
    return {
      errorType: ErrorType.DIRECTIVE_SYNTAX_ERROR,
      severity: ErrorSeverity.ERROR,
      message: `无法解析的指令语法: ${attr.name}`,
      file: this.filePath,
      position: attr.position,
      context: this.getContextLines(attr.position),
      suggestions: [
        {
          type: FixType.MANUAL_FIX,
          description: '检查指令语法格式',
          originalCode: attr.name,
          fixedCode: 'v-directive:argument.modifier',
          confidence: 0.5,
          riskLevel: RiskLevel.MEDIUM,
          explanation: '指令语法格式：v-directive:argument.modifier'
        }
      ]
    }
  }

  /**
   * 获取上下文代码行
   */
  private getContextLines(position: Position, contextSize = 3): string {
    const lines = this.fileContent.split('\n')
    const startLine = Math.max(0, position.line - contextSize - 1)
    const endLine = Math.min(lines.length, position.line + contextSize)
    
    return lines.slice(startLine, endLine)
      .map((line, index) => {
        const lineNumber = startLine + index + 1
        const prefix = lineNumber === position.line ? '>>> ' : '    '
        return `${prefix}${lineNumber.toString().padStart(3)}: ${line}`
      })
      .join('\n')
  }
}