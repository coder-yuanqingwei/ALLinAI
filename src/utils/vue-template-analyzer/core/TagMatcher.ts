import { 
  ErrorInfo, 
  ErrorType, 
  ErrorSeverity, 
  TagInfo, 
  Position, 
  Range,
  FixSuggestion,
  FixType,
  RiskLevel
} from '../types'

/**
 * 标签匹配验证器
 * 使用栈结构验证HTML/Vue标签的正确配对和嵌套
 */
export class TagMatcher {
  private filePath: string = ''
  private fileContent: string = ''

  /**
   * 验证标签匹配
   */
  public validateTagMatching(
    tags: TagInfo[], 
    filePath: string, 
    fileContent: string
  ): ErrorInfo[] {
    this.filePath = filePath
    this.fileContent = fileContent
    
    const errors: ErrorInfo[] = []
    const tagStack: TagStackItem[] = []
    const processedTags = this.preprocessTags(tags)

    for (let i = 0; i < processedTags.length; i++) {
      const tag = processedTags[i]
      
      if (tag.isClosing) {
        this.handleClosingTag(tag, tagStack, errors)
      } else if (tag.isSelfClosing) {
        this.handleSelfClosingTag(tag, errors)
      } else {
        this.handleOpeningTag(tag, tagStack)
      }
    }

    // 检查未闭合的标签
    this.checkUnclosedTags(tagStack, errors)

    return errors
  }

  /**
   * 预处理标签列表，添加额外信息
   */
  private preprocessTags(tags: TagInfo[]): EnhancedTagInfo[] {
    return tags.map((tag, index) => ({
      ...tag,
      index,
      isVoidElement: this.isVoidElement(tag.name),
      isCustomComponent: this.isCustomComponent(tag.name),
      normalizedName: tag.name.toLowerCase()
    }))
  }

  /**
   * 处理闭合标签
   */
  private handleClosingTag(
    tag: EnhancedTagInfo, 
    tagStack: TagStackItem[], 
    errors: ErrorInfo[]
  ): void {
    if (tagStack.length === 0) {
      // 没有对应的开始标签
      errors.push(this.createUnmatchedClosingTagError(tag))
      return
    }

    // 查找匹配的开始标签
    const matchIndex = this.findMatchingOpenTag(tag, tagStack)
    
    if (matchIndex === -1) {
      // 没有找到匹配的开始标签
      errors.push(this.createMismatchedTagError(tag, tagStack[tagStack.length - 1]))
      return
    }

    if (matchIndex === tagStack.length - 1) {
      // 正确匹配，弹出栈顶
      tagStack.pop()
    } else {
      // 跳跃匹配，可能有标签未正确闭合
      const unclosedTags = tagStack.splice(matchIndex + 1)
      tagStack.pop() // 移除匹配的标签
      
      // 为未闭合的标签生成错误
      unclosedTags.forEach(unclosedTag => {
        errors.push(this.createImplicitlyClosedTagError(unclosedTag.tag, tag))
      })
    }
  }

  /**
   * 处理自闭合标签
   */
  private handleSelfClosingTag(tag: EnhancedTagInfo, errors: ErrorInfo[]): void {
    // 检查HTML void元素的自闭合语法
    if (!tag.isVoidElement && !tag.isCustomComponent && 
        this.isHTMLElement(tag.name)) {
      errors.push(this.createInvalidSelfClosingError(tag))
    }

    // 检查Vue组件的自闭合语法
    if (tag.isCustomComponent && !tag.name.includes('-') && 
        tag.name === tag.name.toLowerCase()) {
      errors.push(this.createComponentSelfClosingWarning(tag))
    }
  }

  /**
   * 处理开始标签
   */
  private handleOpeningTag(tag: EnhancedTagInfo, tagStack: TagStackItem[]): void {
    // 检查void元素是否错误地使用了开始标签
    if (tag.isVoidElement) {
      // void元素不应该有闭合标签，应该自闭合或省略闭合
      // 这里可以添加警告，但不一定是错误
    }

    tagStack.push({
      tag,
      depth: tagStack.length
    })
  }

  /**
   * 检查未闭合的标签
   */
  private checkUnclosedTags(tagStack: TagStackItem[], errors: ErrorInfo[]): void {
    // 从栈顶开始，所有剩余的标签都是未闭合的
    tagStack.reverse().forEach(item => {
      errors.push(this.createUnclosedTagError(item.tag))
    })
  }

  /**
   * 查找匹配的开始标签
   */
  private findMatchingOpenTag(closingTag: EnhancedTagInfo, tagStack: TagStackItem[]): number {
    // 从栈顶开始向下查找
    for (let i = tagStack.length - 1; i >= 0; i--) {
      const stackItem = tagStack[i]
      if (this.tagsMatch(stackItem.tag, closingTag)) {
        return i
      }
    }
    return -1
  }

  /**
   * 检查两个标签是否匹配
   */
  private tagsMatch(openTag: EnhancedTagInfo, closeTag: EnhancedTagInfo): boolean {
    // 精确匹配标签名称
    if (openTag.name === closeTag.name) {
      return true
    }

    // 大小写不敏感匹配（HTML标签）
    if (openTag.normalizedName === closeTag.normalizedName && 
        this.isHTMLElement(openTag.name)) {
      return true
    }

    return false
  }

  /**
   * 检查是否为void元素
   */
  private isVoidElement(tagName: string): boolean {
    const voidElements = new Set([
      'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
      'keygen', 'link', 'meta', 'param', 'source', 'track', 'wbr'
    ])
    return voidElements.has(tagName.toLowerCase())
  }

  /**
   * 检查是否为自定义组件
   */
  private isCustomComponent(tagName: string): boolean {
    // Vue组件通常使用PascalCase或包含连字符
    return /^[A-Z]/.test(tagName) || tagName.includes('-')
  }

  /**
   * 检查是否为HTML元素
   */
  private isHTMLElement(tagName: string): boolean {
    const htmlElements = new Set([
      'a', 'abbr', 'address', 'area', 'article', 'aside', 'audio',
      'b', 'base', 'bdi', 'bdo', 'blockquote', 'body', 'br', 'button',
      'canvas', 'caption', 'cite', 'code', 'col', 'colgroup',
      'data', 'datalist', 'dd', 'del', 'details', 'dfn', 'dialog', 'div', 'dl', 'dt',
      'em', 'embed', 'fieldset', 'figcaption', 'figure', 'footer', 'form',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'head', 'header', 'hr', 'html',
      'i', 'iframe', 'img', 'input', 'ins', 'kbd', 'label', 'legend', 'li', 'link',
      'main', 'map', 'mark', 'meta', 'meter', 'nav', 'noscript',
      'object', 'ol', 'optgroup', 'option', 'output',
      'p', 'param', 'picture', 'pre', 'progress',
      'q', 'rp', 'rt', 'ruby', 's', 'samp', 'script', 'section', 'select',
      'small', 'source', 'span', 'strong', 'style', 'sub', 'summary', 'sup',
      'table', 'tbody', 'td', 'template', 'textarea', 'tfoot', 'th', 'thead',
      'time', 'title', 'tr', 'track', 'u', 'ul', 'var', 'video', 'wbr'
    ])
    return htmlElements.has(tagName.toLowerCase())
  }

  /**
   * 创建未匹配闭合标签错误
   */
  private createUnmatchedClosingTagError(tag: EnhancedTagInfo): ErrorInfo {
    return {
      errorType: ErrorType.TAG_MISMATCH,
      severity: ErrorSeverity.ERROR,
      message: `多余的闭合标签: </${tag.name}>`,
      file: this.filePath,
      position: tag.position,
      context: this.getContextLines(tag.position),
      suggestions: [
        {
          type: FixType.AUTO_FIX,
          description: `删除多余的闭合标签 </${tag.name}>`,
          originalCode: `</${tag.name}>`,
          fixedCode: '',
          confidence: 0.9,
          riskLevel: RiskLevel.LOW,
          explanation: '此闭合标签没有对应的开始标签，可以安全删除'
        }
      ]
    }
  }

  /**
   * 创建标签不匹配错误
   */
  private createMismatchedTagError(
    closingTag: EnhancedTagInfo, 
    lastOpenTag: TagStackItem
  ): ErrorInfo {
    const suggestions: FixSuggestion[] = [
      {
        type: FixType.MANUAL_FIX,
        description: `将闭合标签改为 </${lastOpenTag.tag.name}>`,
        originalCode: `</${closingTag.name}>`,
        fixedCode: `</${lastOpenTag.tag.name}>`,
        confidence: 0.7,
        riskLevel: RiskLevel.MEDIUM,
        explanation: '根据最近的未闭合标签推测的修复方案'
      },
      {
        type: FixType.MANUAL_FIX,
        description: `在 <${lastOpenTag.tag.name}> 标签前添加 <${closingTag.name}> 开始标签`,
        originalCode: `<${lastOpenTag.tag.name}>`,
        fixedCode: `<${closingTag.name}>\n<${lastOpenTag.tag.name}>`,
        confidence: 0.5,
        riskLevel: RiskLevel.HIGH,
        explanation: '添加缺失的开始标签，但可能改变HTML结构'
      }
    ]

    return {
      errorType: ErrorType.TAG_MISMATCH,
      severity: ErrorSeverity.ERROR,
      message: `标签不匹配: 期望 </${lastOpenTag.tag.name}>，但找到 </${closingTag.name}>`,
      file: this.filePath,
      position: closingTag.position,
      context: this.getContextLines(closingTag.position),
      suggestions
    }
  }

  /**
   * 创建未闭合标签错误
   */
  private createUnclosedTagError(tag: EnhancedTagInfo): ErrorInfo {
    const suggestions: FixSuggestion[] = []

    // 为不同类型的标签提供不同的修复建议
    if (tag.isVoidElement) {
      suggestions.push({
        type: FixType.AUTO_FIX,
        description: `将 <${tag.name}> 改为自闭合格式`,
        originalCode: `<${tag.name}>`,
        fixedCode: `<${tag.name} />`,
        confidence: 0.95,
        riskLevel: RiskLevel.LOW,
        explanation: 'void元素应该使用自闭合语法'
      })
    } else {
      // 尝试在合适的位置添加闭合标签
      suggestions.push({
        type: FixType.MANUAL_FIX,
        description: `在文件末尾添加 </${tag.name}> 闭合标签`,
        originalCode: '',
        fixedCode: `</${tag.name}>`,
        confidence: 0.6,
        riskLevel: RiskLevel.MEDIUM,
        explanation: '在模板末尾添加缺失的闭合标签'
      })

      if (tag.isCustomComponent) {
        suggestions.push({
          type: FixType.AUTO_FIX,
          description: `将组件标签改为自闭合格式`,
          originalCode: `<${tag.name}>`,
          fixedCode: `<${tag.name} />`,
          confidence: 0.8,
          riskLevel: RiskLevel.LOW,
          explanation: 'Vue组件可以使用自闭合语法'
        })
      }
    }

    return {
      errorType: ErrorType.UNCLOSED_TAG,
      severity: ErrorSeverity.ERROR,
      message: `标签未闭合: <${tag.name}>`,
      file: this.filePath,
      position: tag.position,
      context: this.getContextLines(tag.position),
      suggestions
    }
  }

  /**
   * 创建隐式闭合标签错误
   */
  private createImplicitlyClosedTagError(
    unclosedTag: EnhancedTagInfo, 
    closingTag: EnhancedTagInfo
  ): ErrorInfo {
    return {
      errorType: ErrorType.UNCLOSED_TAG,
      severity: ErrorSeverity.WARNING,
      message: `标签 <${unclosedTag.name}> 被 </${closingTag.name}> 隐式闭合`,
      file: this.filePath,
      position: unclosedTag.position,
      context: this.getContextLines(unclosedTag.position),
      suggestions: [
        {
          type: FixType.MANUAL_FIX,
          description: `在 </${closingTag.name}> 前添加 </${unclosedTag.name}>`,
          originalCode: `</${closingTag.name}>`,
          fixedCode: `</${unclosedTag.name}>\n</${closingTag.name}>`,
          confidence: 0.8,
          riskLevel: RiskLevel.MEDIUM,
          explanation: '显式闭合标签以改善代码清晰度'
        }
      ]
    }
  }

  /**
   * 创建无效自闭合标签错误
   */
  private createInvalidSelfClosingError(tag: EnhancedTagInfo): ErrorInfo {
    return {
      errorType: ErrorType.INVALID_SELF_CLOSING,
      severity: ErrorSeverity.WARNING,
      message: `HTML标签 <${tag.name}> 不应该使用自闭合语法`,
      file: this.filePath,
      position: tag.position,
      context: this.getContextLines(tag.position),
      suggestions: [
        {
          type: FixType.AUTO_FIX,
          description: `使用标准的开始和结束标签`,
          originalCode: `<${tag.name} />`,
          fixedCode: `<${tag.name}></${tag.name}>`,
          confidence: 0.9,
          riskLevel: RiskLevel.LOW,
          explanation: 'HTML标准要求使用完整的开始和结束标签'
        }
      ]
    }
  }

  /**
   * 创建组件自闭合警告
   */
  private createComponentSelfClosingWarning(tag: EnhancedTagInfo): ErrorInfo {
    return {
      errorType: ErrorType.COMPONENT_TAG_ERROR,
      severity: ErrorSeverity.INFO,
      message: `组件 <${tag.name}> 使用了自闭合语法`,
      file: this.filePath,
      position: tag.position,
      context: this.getContextLines(tag.position),
      suggestions: [
        {
          type: FixType.REFACTOR_SUGGESTION,
          description: '考虑使用明确的开始和结束标签以提高可读性',
          originalCode: `<${tag.name} />`,
          fixedCode: `<${tag.name}></${tag.name}>`,
          confidence: 0.5,
          riskLevel: RiskLevel.LOW,
          explanation: '两种语法都有效，但明确的标签可能更清晰'
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

  /**
   * 获取详细的标签匹配分析
   */
  public getDetailedAnalysis(tags: TagInfo[]): TagMatchingAnalysis {
    const analysis: TagMatchingAnalysis = {
      totalTags: tags.length,
      openTags: 0,
      closeTags: 0,
      selfClosingTags: 0,
      voidElements: 0,
      customComponents: 0,
      htmlElements: 0,
      maxNestingDepth: 0,
      averageNestingDepth: 0,
      mostNestedTag: null
    }

    let currentDepth = 0
    let maxDepth = 0
    let depthSum = 0
    let depthCount = 0
    let mostNestedTag: TagInfo | null = null

    const processedTags = this.preprocessTags(tags)

    for (const tag of processedTags) {
      if (tag.isClosing) {
        analysis.closeTags++
        currentDepth--
      } else if (tag.isSelfClosing) {
        analysis.selfClosingTags++
      } else {
        analysis.openTags++
        currentDepth++
        depthSum += currentDepth
        depthCount++

        if (currentDepth > maxDepth) {
          maxDepth = currentDepth
          mostNestedTag = tag
        }
      }

      if (tag.isVoidElement) {
        analysis.voidElements++
      } else if (tag.isCustomComponent) {
        analysis.customComponents++
      } else if (this.isHTMLElement(tag.name)) {
        analysis.htmlElements++
      }
    }

    analysis.maxNestingDepth = maxDepth
    analysis.averageNestingDepth = depthCount > 0 ? depthSum / depthCount : 0
    analysis.mostNestedTag = mostNestedTag

    return analysis
  }
}

// 辅助类型定义
interface EnhancedTagInfo extends TagInfo {
  index: number
  isVoidElement: boolean
  isCustomComponent: boolean
  normalizedName: string
}

interface TagStackItem {
  tag: EnhancedTagInfo
  depth: number
}

interface TagMatchingAnalysis {
  totalTags: number
  openTags: number
  closeTags: number
  selfClosingTags: number
  voidElements: number
  customComponents: number
  htmlElements: number
  maxNestingDepth: number
  averageNestingDepth: number
  mostNestedTag: TagInfo | null
}