import { 
  Position, 
  Range, 
  ErrorInfo, 
  ErrorType,
  ParseContext
} from '../types'

/**
 * 错误定位引擎
 * 提供精确的错误位置定位和上下文信息提取功能
 */
export class ErrorLocator {
  private sourceLines: string[] = []
  private lineOffsets: number[] = []
  private context: ParseContext | null = null

  /**
   * 初始化错误定位器
   */
  public initialize(fileContent: string, context?: ParseContext): void {
    this.sourceLines = fileContent.split('\n')
    this.context = context || null
    this.buildLineOffsets(fileContent)
  }

  /**
   * 构建行偏移量映射
   */
  private buildLineOffsets(content: string): void {
    this.lineOffsets = [0]
    for (let i = 0; i < content.length; i++) {
      if (content[i] === '\n') {
        this.lineOffsets.push(i + 1)
      }
    }
  }

  /**
   * 从字符偏移量获取位置信息
   */
  public getPositionFromOffset(offset: number): Position {
    if (offset < 0) {
      return { line: 1, column: 1, offset: 0 }
    }

    // 二分查找确定行号
    let line = 1
    for (let i = 0; i < this.lineOffsets.length - 1; i++) {
      if (offset >= this.lineOffsets[i] && offset < this.lineOffsets[i + 1]) {
        line = i + 1
        break
      }
    }

    // 如果超出最后一行
    if (offset >= this.lineOffsets[this.lineOffsets.length - 1]) {
      line = this.lineOffsets.length
    }

    const lineStartOffset = this.lineOffsets[line - 1]
    const column = offset - lineStartOffset + 1

    return { line, column, offset }
  }

  /**
   * 从位置信息获取字符偏移量
   */
  public getOffsetFromPosition(position: Position): number {
    if (position.line < 1 || position.line > this.lineOffsets.length) {
      return 0
    }

    const lineStartOffset = this.lineOffsets[position.line - 1]
    return lineStartOffset + Math.max(0, position.column - 1)
  }

  /**
   * 获取位置范围对应的文本内容
   */
  public getTextInRange(range: Range): string {
    const startOffset = this.getOffsetFromPosition(range.start)
    const endOffset = this.getOffsetFromPosition(range.end)
    
    if (this.context?.fileContent) {
      return this.context.fileContent.slice(startOffset, endOffset)
    }
    
    return ''
  }

  /**
   * 获取指定位置的上下文代码
   */
  public getContextLines(
    position: Position, 
    beforeLines = 3, 
    afterLines = 3
  ): ContextInfo {
    const startLine = Math.max(1, position.line - beforeLines)
    const endLine = Math.min(this.sourceLines.length, position.line + afterLines)
    
    const lines: ContextLine[] = []
    
    for (let i = startLine; i <= endLine; i++) {
      const lineContent = this.sourceLines[i - 1] || ''
      lines.push({
        number: i,
        content: lineContent,
        isErrorLine: i === position.line,
        hasError: i === position.line,
        errorColumn: i === position.line ? position.column : undefined
      })
    }

    return {
      lines,
      errorLine: position.line,
      errorColumn: position.column,
      totalLines: this.sourceLines.length
    }
  }

  /**
   * 获取增强的上下文信息
   */
  public getEnhancedContext(
    position: Position, 
    contextSize = 5
  ): EnhancedContextInfo {
    const basicContext = this.getContextLines(position, contextSize, contextSize)
    
    // 分析代码结构
    const codeStructure = this.analyzeCodeStructure(position)
    
    // 查找相关错误
    const relatedPositions = this.findRelatedPositions(position)
    
    // 生成可视化指示器
    const visualIndicator = this.generateVisualIndicator(position)

    return {
      ...basicContext,
      codeStructure,
      relatedPositions,
      visualIndicator,
      suggestions: this.generateContextSuggestions(position)
    }
  }

  /**
   * 分析代码结构上下文
   */
  private analyzeCodeStructure(position: Position): CodeStructureInfo {
    const currentLine = this.sourceLines[position.line - 1] || ''
    
    // 分析当前行的代码类型
    const lineType = this.detectLineType(currentLine)
    
    // 查找包含的标签
    const containingTags = this.findContainingTags(position)
    
    // 查找同级元素
    const siblingElements = this.findSiblingElements(position)
    
    // 计算缩进级别
    const indentLevel = this.calculateIndentLevel(currentLine)

    return {
      lineType,
      containingTags,
      siblingElements,
      indentLevel,
      isInsideComponent: containingTags.some(tag => this.isComponentTag(tag)),
      isInsideTemplate: containingTags.some(tag => tag === 'template')
    }
  }

  /**
   * 检测代码行类型
   */
  private detectLineType(line: string): CodeLineType {
    const trimmed = line.trim()
    
    if (trimmed.startsWith('<!--')) return 'comment'
    if (trimmed.startsWith('<template')) return 'template-start'
    if (trimmed.startsWith('</template')) return 'template-end'
    if (trimmed.startsWith('<script')) return 'script-start'
    if (trimmed.startsWith('</script')) return 'script-end'
    if (trimmed.startsWith('<style')) return 'style-start'
    if (trimmed.startsWith('</style')) return 'style-end'
    if (trimmed.startsWith('<') && trimmed.endsWith('>')) return 'tag'
    if (trimmed.startsWith('<') && !trimmed.endsWith('>')) return 'tag-start'
    if (!trimmed.startsWith('<') && trimmed.endsWith('>')) return 'tag-end'
    if (trimmed.includes('v-') || trimmed.includes('@') || trimmed.includes(':')) return 'with-directives'
    if (trimmed === '') return 'empty'
    
    return 'content'
  }

  /**
   * 查找包含当前位置的标签
   */
  private findContainingTags(position: Position): string[] {
    const tags: string[] = []
    const tagStack: string[] = []
    
    // 从文件开始到当前位置，分析标签嵌套
    for (let i = 0; i < position.line - 1; i++) {
      const line = this.sourceLines[i]
      const tagMatches = line.match(/<\/?([a-zA-Z][\w-]*)[^>]*>/g) || []
      
      for (const match of tagMatches) {
        const isClosing = match.startsWith('</')
        const tagName = match.match(/<\/?([a-zA-Z][\w-]*)/)?.[1]
        
        if (tagName) {
          if (isClosing) {
            const lastIndex = tagStack.lastIndexOf(tagName)
            if (lastIndex !== -1) {
              tagStack.splice(lastIndex, 1)
            }
          } else if (!match.endsWith('/>')) {
            tagStack.push(tagName)
          }
        }
      }
    }
    
    return [...tagStack]
  }

  /**
   * 查找同级元素
   */
  private findSiblingElements(position: Position): string[] {
    // 简化实现：返回当前缩进级别的相邻元素
    const currentIndent = this.calculateIndentLevel(this.sourceLines[position.line - 1] || '')
    const siblings: string[] = []
    
    // 向上查找
    for (let i = position.line - 2; i >= 0; i--) {
      const line = this.sourceLines[i]
      const indent = this.calculateIndentLevel(line)
      
      if (indent < currentIndent) break
      if (indent === currentIndent && line.trim().startsWith('<')) {
        const tagMatch = line.match(/<([a-zA-Z][\w-]*)/)?.[1]
        if (tagMatch) siblings.unshift(tagMatch)
      }
    }
    
    // 向下查找
    for (let i = position.line; i < this.sourceLines.length; i++) {
      const line = this.sourceLines[i]
      const indent = this.calculateIndentLevel(line)
      
      if (indent < currentIndent) break
      if (indent === currentIndent && line.trim().startsWith('<')) {
        const tagMatch = line.match(/<([a-zA-Z][\w-]*)/)?.[1]
        if (tagMatch) siblings.push(tagMatch)
      }
    }
    
    return siblings
  }

  /**
   * 计算缩进级别
   */
  private calculateIndentLevel(line: string): number {
    const match = line.match(/^(\s*)/)
    return match ? match[1].length : 0
  }

  /**
   * 检查是否为组件标签
   */
  private isComponentTag(tagName: string): boolean {
    return /^[A-Z]/.test(tagName) || tagName.includes('-')
  }

  /**
   * 查找相关位置（如匹配的标签）
   */
  private findRelatedPositions(position: Position): RelatedPosition[] {
    const related: RelatedPosition[] = []
    
    // 查找匹配的开始/结束标签
    const currentLine = this.sourceLines[position.line - 1] || ''
    const tagMatch = currentLine.match(/<\/?([a-zA-Z][\w-]*)/)?.[1]
    
    if (tagMatch) {
      const isClosing = currentLine.includes('</')
      const searchPattern = isClosing ? `<${tagMatch}` : `</${tagMatch}`
      
      for (let i = 0; i < this.sourceLines.length; i++) {
        if (i === position.line - 1) continue
        
        const line = this.sourceLines[i]
        if (line.includes(searchPattern)) {
          related.push({
            position: { line: i + 1, column: line.indexOf(searchPattern) + 1 },
            type: isClosing ? 'opening-tag' : 'closing-tag',
            description: `匹配的${isClosing ? '开始' : '结束'}标签`
          })
        }
      }
    }
    
    return related
  }

  /**
   * 生成可视化错误指示器
   */
  private generateVisualIndicator(position: Position): VisualIndicator {
    const line = this.sourceLines[position.line - 1] || ''
    const beforeCursor = ' '.repeat(Math.max(0, position.column - 1))
    const cursor = '^'
    const afterCursor = '~'.repeat(Math.max(0, Math.min(10, line.length - position.column + 1)))
    
    return {
      pointer: beforeCursor + cursor + afterCursor,
      highlightedLine: this.highlightErrorInLine(line, position.column),
      columnMarker: position.column
    }
  }

  /**
   * 在行中高亮错误位置
   */
  private highlightErrorInLine(line: string, column: number): string {
    if (column < 1 || column > line.length) return line
    
    const before = line.slice(0, column - 1)
    const errorChar = line[column - 1]
    const after = line.slice(column)
    
    return `${before}[${errorChar}]${after}`
  }

  /**
   * 生成上下文相关的建议
   */
  private generateContextSuggestions(position: Position): string[] {
    const suggestions: string[] = []
    const structure = this.analyzeCodeStructure(position)
    
    if (structure.lineType === 'tag-start') {
      suggestions.push('检查标签是否正确闭合')
      suggestions.push('确认标签名称拼写正确')
    }
    
    if (structure.isInsideComponent) {
      suggestions.push('检查组件的props和事件绑定')
      suggestions.push('确认组件已正确导入和注册')
    }
    
    if (structure.containingTags.length === 0) {
      suggestions.push('确保代码在正确的template标签内')
    }
    
    return suggestions
  }

  /**
   * 基于编译器错误信息定位问题
   */
  public locateFromCompilerError(
    errorMessage: string, 
    stackTrace?: string
  ): ErrorLocation | null {
    // 解析常见的编译器错误格式
    const patterns = [
      // Vue编译器错误格式
      /at (\d+):(\d+)/,
      /line (\d+), column (\d+)/,
      /\((\d+):(\d+)\)/,
      // Webpack错误格式
      /Module build failed.*?:(\d+):(\d+)/,
      // TypeScript错误格式
      /\((\d+),(\d+)\)/
    ]

    for (const pattern of patterns) {
      const match = errorMessage.match(pattern)
      if (match) {
        const line = parseInt(match[1], 10)
        const column = parseInt(match[2], 10)
        
        if (line > 0 && column > 0) {
          const position = { line, column }
          return {
            position,
            confidence: 0.9,
            context: this.getEnhancedContext(position),
            errorPattern: pattern.source
          }
        }
      }
    }

    // 尝试从堆栈信息中提取位置
    if (stackTrace) {
      const stackLocation = this.parseStackTrace(stackTrace)
      if (stackLocation) {
        return stackLocation
      }
    }

    return null
  }

  /**
   * 解析堆栈跟踪信息
   */
  private parseStackTrace(stackTrace: string): ErrorLocation | null {
    const lines = stackTrace.split('\n')
    
    for (const line of lines) {
      // 查找包含文件路径和行号的行
      const match = line.match(/at.*?:(\d+):(\d+)/) || line.match(/\(.*?:(\d+):(\d+)\)/)
      
      if (match) {
        const lineNum = parseInt(match[1], 10)
        const column = parseInt(match[2], 10)
        
        const position = { line: lineNum, column }
        return {
          position,
          confidence: 0.7,
          context: this.getEnhancedContext(position),
          errorPattern: 'stack-trace'
        }
      }
    }

    return null
  }

  /**
   * 验证位置是否在有效范围内
   */
  public isValidPosition(position: Position): boolean {
    if (position.line < 1 || position.line > this.sourceLines.length) {
      return false
    }
    
    const line = this.sourceLines[position.line - 1]
    if (position.column < 1 || position.column > line.length + 1) {
      return false
    }
    
    return true
  }

  /**
   * 修正无效的位置信息
   */
  public normalizePosition(position: Position): Position {
    const line = Math.max(1, Math.min(position.line, this.sourceLines.length))
    const lineContent = this.sourceLines[line - 1] || ''
    const column = Math.max(1, Math.min(position.column, lineContent.length + 1))
    
    return { line, column, offset: position.offset }
  }
}

// 类型定义
interface ContextLine {
  number: number
  content: string
  isErrorLine: boolean
  hasError: boolean
  errorColumn?: number
}

interface ContextInfo {
  lines: ContextLine[]
  errorLine: number
  errorColumn: number
  totalLines: number
}

interface EnhancedContextInfo extends ContextInfo {
  codeStructure: CodeStructureInfo
  relatedPositions: RelatedPosition[]
  visualIndicator: VisualIndicator
  suggestions: string[]
}

interface CodeStructureInfo {
  lineType: CodeLineType
  containingTags: string[]
  siblingElements: string[]
  indentLevel: number
  isInsideComponent: boolean
  isInsideTemplate: boolean
}

type CodeLineType = 
  | 'comment' 
  | 'template-start' 
  | 'template-end' 
  | 'script-start' 
  | 'script-end'
  | 'style-start' 
  | 'style-end' 
  | 'tag' 
  | 'tag-start' 
  | 'tag-end' 
  | 'with-directives' 
  | 'content' 
  | 'empty'

interface RelatedPosition {
  position: Position
  type: string
  description: string
}

interface VisualIndicator {
  pointer: string
  highlightedLine: string
  columnMarker: number
}

interface ErrorLocation {
  position: Position
  confidence: number
  context: EnhancedContextInfo
  errorPattern: string
}