import { 
  ErrorInfo, 
  ErrorType, 
  ErrorSeverity, 
  ParseResult, 
  DiagnosticConfig, 
  ParseContext,
  ASTNode,
  TagInfo,
  DirectiveInfo,
  Position,
  Range
} from '../types'

/**
 * Vue模板错误分析器核心类
 * 负责解析Vue单文件组件的template部分，检测各种语法错误
 */
export class ErrorAnalyzer {
  private config: DiagnosticConfig
  private context: ParseContext | null = null

  constructor(config: Partial<DiagnosticConfig> = {}) {
    this.config = {
      enableStrictMode: false,
      checkVueDirectives: true,
      checkComponentTags: true,
      enableAutoFix: true,
      maxErrors: 100,
      ignoreErrors: [],
      ...config
    }
  }

  /**
   * 分析Vue文件的template部分
   */
  public async analyzeVueFile(filePath: string, fileContent: string): Promise<ParseResult> {
    this.context = this.createParseContext(filePath, fileContent)
    
    try {
      // 提取template部分
      const templateContent = this.extractTemplateContent(fileContent)
      if (!templateContent) {
        return {
          errors: [{
            errorType: ErrorType.TEMPLATE_SYNTAX_ERROR,
            severity: ErrorSeverity.ERROR,
            message: '未找到有效的template标签',
            file: filePath,
            position: { line: 1, column: 1 },
            context: '',
            suggestions: []
          }],
          warnings: [],
          tags: [],
          directives: []
        }
      }

      // 解析template内容
      return this.parseTemplate(templateContent)
    } catch (error) {
      return {
        errors: [{
          errorType: ErrorType.TEMPLATE_SYNTAX_ERROR,
          severity: ErrorSeverity.ERROR,
          message: `解析失败: ${error instanceof Error ? error.message : '未知错误'}`,
          file: filePath,
          position: { line: 1, column: 1 },
          context: '',
          suggestions: []
        }],
        warnings: [],
        tags: [],
        directives: []
      }
    }
  }

  /**
   * 解析template内容
   */
  private parseTemplate(templateContent: string): ParseResult {
    const result: ParseResult = {
      errors: [],
      warnings: [],
      tags: [],
      directives: []
    }

    try {
      // 标记化处理
      const tokens = this.tokenize(templateContent)
      
      // 构建语法树
      const ast = this.buildAST(tokens)
      result.ast = ast

      // 提取标签和指令信息
      this.extractTagsAndDirectives(ast, result)

      // 执行各种检查
      this.performSyntaxChecks(result)
      this.performSemanticChecks(result)

      // 限制错误数量
      if (result.errors.length > this.config.maxErrors) {
        result.errors = result.errors.slice(0, this.config.maxErrors)
        result.warnings.push({
          errorType: ErrorType.TEMPLATE_SYNTAX_ERROR,
          severity: ErrorSeverity.WARNING,
          message: `错误数量超过限制(${this.config.maxErrors})，部分错误已省略`,
          file: this.context?.filePath || '',
          position: { line: 1, column: 1 },
          context: '',
          suggestions: []
        })
      }

    } catch (error) {
      result.errors.push({
        errorType: ErrorType.TEMPLATE_SYNTAX_ERROR,
        severity: ErrorSeverity.ERROR,
        message: `模板解析失败: ${error instanceof Error ? error.message : '未知错误'}`,
        file: this.context?.filePath || '',
        position: { line: 1, column: 1 },
        context: '',
        suggestions: []
      })
    }

    return result
  }

  /**
   * 提取Vue文件中的template内容
   */
  private extractTemplateContent(fileContent: string): string | null {
    const templateMatch = fileContent.match(/<template[^>]*>([\s\S]*?)<\/template>/i)
    return templateMatch ? templateMatch[1] : null
  }

  /**
   * 标记化处理
   */
  private tokenize(content: string): Token[] {
    const tokens: Token[] = []
    let position = 0
    let line = 1
    let column = 1

    while (position < content.length) {
      const char = content[position]
      
      if (char === '<') {
        // 处理标签
        const tagResult = this.parseTag(content, position, line, column)
        if (tagResult) {
          tokens.push(tagResult.token)
          position = tagResult.endPosition
          line = tagResult.endLine
          column = tagResult.endColumn
          continue
        }
      } else if (char === '\n') {
        line++
        column = 1
      } else {
        column++
      }

      position++
    }

    return tokens
  }

  /**
   * 解析标签
   */
  private parseTag(content: string, startPos: number, startLine: number, startCol: number): TagParseResult | null {
    const tagRegex = /<\/?([a-zA-Z][\w-]*)[^>]*>/
    const match = content.slice(startPos).match(tagRegex)
    
    if (!match) return null

    const fullMatch = match[0]
    const tagName = match[1]
    const isClosing = fullMatch.startsWith('</')
    const isSelfClosing = fullMatch.endsWith('/>')

    const endPos = startPos + fullMatch.length
    const endLine = startLine + (fullMatch.split('\n').length - 1)
    const endColumn = fullMatch.includes('\n') 
      ? fullMatch.split('\n').pop()!.length 
      : startCol + fullMatch.length

    return {
      token: {
        type: 'tag',
        content: fullMatch,
        tagName,
        isClosing,
        isSelfClosing,
        position: { line: startLine, column: startCol },
        range: {
          start: { line: startLine, column: startCol },
          end: { line: endLine, column: endColumn }
        }
      },
      endPosition: endPos,
      endLine,
      endColumn
    }
  }

  /**
   * 构建抽象语法树
   */
  private buildAST(tokens: Token[]): ASTNode {
    const root: ASTNode = {
      type: 'root',
      position: { line: 1, column: 1 },
      range: {
        start: { line: 1, column: 1 },
        end: { line: 1, column: 1 }
      },
      children: []
    }

    const stack: ASTNode[] = [root]
    
    for (const token of tokens) {
      if (token.type === 'tag') {
        const node: ASTNode = {
          type: token.isClosing ? 'closeTag' : 'openTag',
          position: token.position,
          range: token.range,
          content: token.tagName,
          children: []
        }

        if (token.isClosing) {
          // 处理闭合标签
          const parent = stack[stack.length - 1]
          if (parent && parent.content === token.tagName) {
            stack.pop()
          }
        } else if (token.isSelfClosing) {
          // 自闭合标签
          const parent = stack[stack.length - 1]
          parent.children?.push(node)
        } else {
          // 开始标签
          const parent = stack[stack.length - 1]
          parent.children?.push(node)
          stack.push(node)
        }
      }
    }

    return root
  }

  /**
   * 提取标签和指令信息
   */
  private extractTagsAndDirectives(ast: ASTNode, result: ParseResult): void {
    const traverse = (node: ASTNode): void => {
      if (node.type === 'openTag' || node.type === 'closeTag') {
        // 提取标签信息
        const tagInfo: TagInfo = {
          name: node.content || '',
          isClosing: node.type === 'closeTag',
          isSelfClosing: false,
          position: node.position,
          range: node.range
        }
        result.tags.push(tagInfo)

        // 提取Vue指令信息
        if (node.attributes) {
          for (const attr of node.attributes) {
            if (attr.isVueDirective) {
              const directive: DirectiveInfo = {
                name: attr.name,
                argument: attr.directiveType,
                modifiers: [],
                value: attr.value,
                position: attr.position,
                range: attr.range
              }
              result.directives.push(directive)
            }
          }
        }
      }

      if (node.children) {
        node.children.forEach(traverse)
      }
    }

    traverse(ast)
  }

  /**
   * 执行语法检查
   */
  private performSyntaxChecks(result: ParseResult): void {
    // 检查标签匹配
    this.checkTagMatching(result)
    
    // 检查自闭合标签语法
    this.checkSelfClosingTags(result)
    
    // 检查注释语法
    this.checkCommentSyntax(result)
  }

  /**
   * 执行语义检查
   */
  private performSemanticChecks(result: ParseResult): void {
    if (this.config.checkVueDirectives) {
      this.checkVueDirectives(result)
    }
    
    if (this.config.checkComponentTags) {
      this.checkComponentTags(result)
    }
  }

  /**
   * 检查标签匹配
   */
  private checkTagMatching(result: ParseResult): void {
    const tagStack: TagInfo[] = []
    
    for (const tag of result.tags) {
      if (tag.isClosing) {
        if (tagStack.length === 0) {
          result.errors.push({
            errorType: ErrorType.TAG_MISMATCH,
            severity: ErrorSeverity.ERROR,
            message: `多余的闭合标签: </${tag.name}>`,
            file: this.context?.filePath || '',
            position: tag.position,
            context: this.getContextLines(tag.position),
            suggestions: []
          })
        } else {
          const lastOpenTag = tagStack.pop()!
          if (lastOpenTag.name !== tag.name) {
            result.errors.push({
              errorType: ErrorType.TAG_MISMATCH,
              severity: ErrorSeverity.ERROR,
              message: `标签不匹配: 期望 </${lastOpenTag.name}>，但找到 </${tag.name}>`,
              file: this.context?.filePath || '',
              position: tag.position,
              context: this.getContextLines(tag.position),
              suggestions: []
            })
          }
        }
      } else if (!tag.isSelfClosing) {
        tagStack.push(tag)
      }
    }

    // 检查未闭合的标签
    for (const unclosedTag of tagStack) {
      result.errors.push({
        errorType: ErrorType.UNCLOSED_TAG,
        severity: ErrorSeverity.ERROR,
        message: `标签未闭合: <${unclosedTag.name}>`,
        file: this.context?.filePath || '',
        position: unclosedTag.position,
        context: this.getContextLines(unclosedTag.position),
        suggestions: []
      })
    }
  }

  /**
   * 检查自闭合标签语法
   */
  private checkSelfClosingTags(result: ParseResult): void {
    // HTML标准标签不应该自闭合
    const htmlVoidElements = new Set([
      'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
      'keygen', 'link', 'meta', 'param', 'source', 'track', 'wbr'
    ])

    for (const tag of result.tags) {
      if (tag.isSelfClosing && !htmlVoidElements.has(tag.name) && 
          tag.name.toLowerCase() === tag.name) {
        result.warnings.push({
          errorType: ErrorType.INVALID_SELF_CLOSING,
          severity: ErrorSeverity.WARNING,
          message: `HTML标签 <${tag.name}> 不应该使用自闭合语法`,
          file: this.context?.filePath || '',
          position: tag.position,
          context: this.getContextLines(tag.position),
          suggestions: []
        })
      }
    }
  }

  /**
   * 检查注释语法
   */
  private checkCommentSyntax(result: ParseResult): void {
    if (!this.context?.fileContent) return

    const commentRegex = /<!--[\s\S]*?-->/g
    let match
    
    while ((match = commentRegex.exec(this.context.fileContent)) !== null) {
      const comment = match[0]
      if (!comment.endsWith('-->')) {
        const position = this.getPositionFromOffset(match.index)
        result.errors.push({
          errorType: ErrorType.INVALID_COMMENT,
          severity: ErrorSeverity.ERROR,
          message: '注释未正确闭合',
          file: this.context.filePath,
          position,
          context: this.getContextLines(position),
          suggestions: []
        })
      }
    }
  }

  /**
   * 检查Vue指令语法
   */
  private checkVueDirectives(result: ParseResult): void {
    for (const directive of result.directives) {
      // 检查指令名称是否有效
      if (!this.isValidDirectiveName(directive.name)) {
        result.errors.push({
          errorType: ErrorType.DIRECTIVE_SYNTAX_ERROR,
          severity: ErrorSeverity.ERROR,
          message: `无效的Vue指令: ${directive.name}`,
          file: this.context?.filePath || '',
          position: directive.position,
          context: this.getContextLines(directive.position),
          suggestions: []
        })
      }
    }
  }

  /**
   * 检查组件标签
   */
  private checkComponentTags(result: ParseResult): void {
    for (const tag of result.tags) {
      // 检查组件名称格式
      if (this.isPascalCase(tag.name) && !this.isValidComponentName(tag.name)) {
        result.warnings.push({
          errorType: ErrorType.COMPONENT_TAG_ERROR,
          severity: ErrorSeverity.WARNING,
          message: `组件名称建议使用PascalCase: ${tag.name}`,
          file: this.context?.filePath || '',
          position: tag.position,
          context: this.getContextLines(tag.position),
          suggestions: []
        })
      }
    }
  }

  /**
   * 创建解析上下文
   */
  private createParseContext(filePath: string, fileContent: string): ParseContext {
    return {
      filePath,
      fileContent,
      config: this.config,
      sourceMap: {
        getOriginalPosition: (line, column) => ({ line, column }),
        getGeneratedPosition: (line, column) => ({ line, column }),
        getSourceLines: (start, end) => {
          const lines = fileContent.split('\n')
          return lines.slice(start - 1, end)
        }
      }
    }
  }

  /**
   * 获取上下文代码行
   */
  private getContextLines(position: Position, contextSize = 3): string {
    if (!this.context?.fileContent) return ''

    const lines = this.context.fileContent.split('\n')
    const startLine = Math.max(0, position.line - contextSize - 1)
    const endLine = Math.min(lines.length, position.line + contextSize)
    
    return lines.slice(startLine, endLine).join('\n')
  }

  /**
   * 从偏移量获取位置信息
   */
  private getPositionFromOffset(offset: number): Position {
    if (!this.context?.fileContent) return { line: 1, column: 1 }

    const content = this.context.fileContent.slice(0, offset)
    const lines = content.split('\n')
    
    return {
      line: lines.length,
      column: lines[lines.length - 1].length + 1
    }
  }

  /**
   * 检查是否为有效的Vue指令名称
   */
  private isValidDirectiveName(name: string): boolean {
    const validDirectives = [
      'v-if', 'v-else', 'v-else-if', 'v-for', 'v-show', 'v-bind', 'v-on',
      'v-model', 'v-slot', 'v-pre', 'v-cloak', 'v-once', 'v-html', 'v-text'
    ]
    
    return validDirectives.includes(name) || name.startsWith('v-') || name.startsWith('@') || name.startsWith(':')
  }

  /**
   * 检查是否为PascalCase格式
   */
  private isPascalCase(str: string): boolean {
    return /^[A-Z][a-zA-Z0-9]*$/.test(str)
  }

  /**
   * 检查是否为有效的组件名称
   */
  private isValidComponentName(name: string): boolean {
    return /^[A-Z][a-zA-Z0-9]*$/.test(name) && name.length > 1
  }
}

// 辅助类型定义
interface Token {
  type: string
  content: string
  tagName?: string
  isClosing?: boolean
  isSelfClosing?: boolean
  position: Position
  range: Range
}

interface TagParseResult {
  token: Token
  endPosition: number
  endLine: number
  endColumn: number
}