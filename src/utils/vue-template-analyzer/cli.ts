#!/usr/bin/env node

import * as fs from 'fs'
import * as path from 'path'
import { glob } from 'glob'
import { ErrorAnalyzer } from './core/ErrorAnalyzer'
import { TagMatcher } from './core/TagMatcher'
import { DirectiveValidator } from './core/DirectiveValidator'
import { ErrorLocator } from './core/ErrorLocator'
import { FixSuggestionGenerator } from './core/FixSuggestionGenerator'
import { DiagnosticReporter } from './core/DiagnosticReporter'
import { 
  CLIOptions, 
  DiagnosticConfig, 
  DiagnosticReport, 
  BatchDiagnosticResult,
  ErrorInfo,
  FixSuggestion
} from './types'

/**
 * Vue模板错误解析器CLI工具
 */
export class VueTemplateAnalyzerCLI {
  private options: CLIOptions
  private analyzer: ErrorAnalyzer
  private tagMatcher: TagMatcher
  private directiveValidator: DirectiveValidator
  private errorLocator: ErrorLocator
  private fixGenerator: FixSuggestionGenerator
  private reporter: DiagnosticReporter

  constructor(options: CLIOptions) {
    this.options = options
    
    const config: DiagnosticConfig = {
      enableStrictMode: options.strict || false,
      checkVueDirectives: true,
      checkComponentTags: true,
      enableAutoFix: options.fix || false,
      maxErrors: 100,
      ignoreErrors: []
    }

    this.analyzer = new ErrorAnalyzer(config)
    this.tagMatcher = new TagMatcher()
    this.directiveValidator = new DirectiveValidator()
    this.errorLocator = new ErrorLocator()
    this.fixGenerator = new FixSuggestionGenerator()
    this.reporter = new DiagnosticReporter(options)
  }

  /**
   * 运行CLI工具
   */
  public async run(): Promise<void> {
    try {
      if (this.options.files.length === 0) {
        this.showHelp()
        return
      }

      // 解析文件列表
      const files = await this.resolveFiles(this.options.files)
      
      if (files.length === 0) {
        console.error('❌ 未找到匹配的文件')
        process.exit(1)
      }

      if (this.options.verbose) {
        console.log(`📁 找到 ${files.length} 个Vue文件`)
      }

      // 分析文件
      if (files.length === 1) {
        await this.analyzeSingleFile(files[0])
      } else {
        await this.analyzeBatchFiles(files)
      }

    } catch (error) {
      console.error('❌ 分析过程中发生错误:', error instanceof Error ? error.message : '未知错误')
      process.exit(1)
    }
  }

  /**
   * 分析单个文件
   */
  private async analyzeSingleFile(filePath: string): Promise<void> {
    if (this.options.verbose) {
      console.log(`🔍 分析文件: ${filePath}`)
    }

    try {
      const fileContent = fs.readFileSync(filePath, 'utf-8')
      const result = await this.analyzeFile(filePath, fileContent)
      
      // 输出结果
      if (this.options.output) {
        this.saveReport(result, this.options.output)
      } else {
        this.displaySingleFileResult(result)
      }

      // 应用自动修复
      if (this.options.fix && result.suggestions.length > 0) {
        await this.applyAutoFixes(filePath, fileContent, result.suggestions)
      }

    } catch (error) {
      console.error(`❌ 分析文件 ${filePath} 时发生错误:`, error instanceof Error ? error.message : '未知错误')
      process.exit(1)
    }
  }

  /**
   * 批量分析文件
   */
  private async analyzeBatchFiles(files: string[]): Promise<void> {
    const reports: DiagnosticReport[] = []
    
    console.log(`🚀 开始分析 ${files.length} 个文件...\n`)

    for (let i = 0; i < files.length; i++) {
      const filePath = files[i]
      
      try {
        // 显示进度
        if (!this.options.verbose) {
          process.stdout.write(this.reporter.generateProgressReport(i, files.length, path.basename(filePath)))
        } else {
          console.log(`🔍 [${i + 1}/${files.length}] 分析: ${filePath}`)
        }

        const fileContent = fs.readFileSync(filePath, 'utf-8')
        const report = await this.analyzeFile(filePath, fileContent)
        reports.push(report)

        // 应用自动修复
        if (this.options.fix && report.suggestions.length > 0) {
          await this.applyAutoFixes(filePath, fileContent, report.suggestions)
        }

      } catch (error) {
        console.error(`\n❌ 分析文件 ${filePath} 时发生错误:`, error instanceof Error ? error.message : '未知错误')
        continue
      }
    }

    // 清除进度显示
    if (!this.options.verbose) {
      process.stdout.write('\r' + ' '.repeat(80) + '\r')
    }

    // 生成批量报告
    const batchResult = this.reporter.generateBatchResult(reports)
    
    // 输出结果
    if (this.options.output) {
      this.saveBatchReport(batchResult, this.options.output)
    } else {
      this.displayBatchResult(batchResult)
    }
  }

  /**
   * 分析单个文件内容
   */
  private async analyzeFile(filePath: string, fileContent: string): Promise<DiagnosticReport> {
    // 初始化组件
    this.errorLocator.initialize(fileContent)
    this.fixGenerator.initialize(fileContent, filePath)

    // 执行分析
    const parseResult = await this.analyzer.analyzeVueFile(filePath, fileContent)
    
    // 额外的标签匹配验证
    const tagErrors = this.tagMatcher.validateTagMatching(
      parseResult.tags, 
      filePath, 
      fileContent
    )
    
    // 指令验证
    const directiveErrors = this.directiveValidator.validateDirectives(
      parseResult.directives,
      [], // 这里需要从解析结果中提取属性信息
      filePath,
      fileContent
    )

    // 合并所有错误
    const allErrors = [
      ...parseResult.errors,
      ...tagErrors,
      ...directiveErrors
    ]

    const allWarnings = parseResult.warnings

    // 生成修复建议
    const suggestions: FixSuggestion[] = []
    for (const error of allErrors) {
      const errorSuggestions = this.fixGenerator.generateSuggestions(error)
      suggestions.push(...errorSuggestions)
    }

    // 生成报告
    return this.reporter.generateReport(filePath, allErrors, allWarnings, suggestions)
  }

  /**
   * 解析文件列表
   */
  private async resolveFiles(patterns: string[]): Promise<string[]> {
    const files: string[] = []
    
    for (const pattern of patterns) {
      if (fs.existsSync(pattern) && fs.statSync(pattern).isFile()) {
        // 直接文件路径
        if (pattern.endsWith('.vue')) {
          files.push(path.resolve(pattern))
        }
      } else {
        // Glob模式
        try {
          const matches = await glob(pattern, { 
            ignore: ['**/node_modules/**', '**/dist/**', '**/.git/**'],
            absolute: true
          })
          files.push(...matches.filter(f => f.endsWith('.vue')))
        } catch (error) {
          console.error(`❌ 解析模式 "${pattern}" 时发生错误:`, error instanceof Error ? error.message : '未知错误')
        }
      }
    }

    return [...new Set(files)] // 去重
  }

  /**
   * 显示单文件结果
   */
  private displaySingleFileResult(report: DiagnosticReport): void {
    console.log(this.reporter.generateConsoleOutput(report))
    
    if (this.options.verbose) {
      console.log('\n' + this.reporter.formatReport(report))
    }

    // 设置退出码
    if (report.totalErrors > 0) {
      process.exitCode = 1
    }
  }

  /**
   * 显示批量结果
   */
  private displayBatchResult(result: BatchDiagnosticResult): void {
    console.log('\n📊 批量分析结果:')
    console.log('=================')
    console.log(`📁 总文件数: ${result.totalFiles}`)
    console.log(`❌ 错误文件数: ${result.errorFiles}`)
    console.log(`📈 整体质量评分: ${result.overallSummary.codeQualityScore}/100`)
    console.log(`🔧 可修复问题: ${result.overallSummary.fixableIssues}个`)

    if (result.errorFiles > 0) {
      console.log('\n❌ 存在错误的文件:')
      result.reports
        .filter(r => r.totalErrors > 0)
        .forEach(r => {
          console.log(`  ${r.filePath} (${r.totalErrors}个错误, ${r.totalWarnings}个警告)`)
        })
    }

    if (result.overallSummary.recommendations.length > 0) {
      console.log('\n💡 建议:')
      result.overallSummary.recommendations.forEach(rec => {
        console.log(`  • ${rec}`)
      })
    }

    if (this.options.verbose) {
      console.log('\n' + this.reporter.formatReport(result))
    }

    // 设置退出码
    if (result.errorFiles > 0) {
      process.exitCode = 1
    }
  }

  /**
   * 保存单文件报告
   */
  private saveReport(report: DiagnosticReport, outputPath: string): void {
    const content = this.reporter.formatReport(report)
    
    try {
      fs.writeFileSync(outputPath, content, 'utf-8')
      console.log(`📄 报告已保存到: ${outputPath}`)
    } catch (error) {
      console.error('❌ 保存报告时发生错误:', error instanceof Error ? error.message : '未知错误')
    }
  }

  /**
   * 保存批量报告
   */
  private saveBatchReport(result: BatchDiagnosticResult, outputPath: string): void {
    const content = this.reporter.formatReport(result)
    
    try {
      fs.writeFileSync(outputPath, content, 'utf-8')
      console.log(`📄 批量报告已保存到: ${outputPath}`)
    } catch (error) {
      console.error('❌ 保存批量报告时发生错误:', error instanceof Error ? error.message : '未知错误')
    }
  }

  /**
   * 应用自动修复
   */
  private async applyAutoFixes(filePath: string, originalContent: string, suggestions: FixSuggestion[]): Promise<void> {
    const autoFixSuggestions = suggestions.filter(s => 
      s.type === 'AUTO_FIX' && s.confidence > 0.8
    )

    if (autoFixSuggestions.length === 0) {
      return
    }

    console.log(`🔧 应用 ${autoFixSuggestions.length} 个自动修复...`)

    let modifiedContent = originalContent

    // 按位置倒序排列，避免位置偏移问题
    autoFixSuggestions
      .sort((a, b) => b.originalCode.length - a.originalCode.length)
      .forEach(suggestion => {
        modifiedContent = modifiedContent.replace(suggestion.originalCode, suggestion.fixedCode)
      })

    // 创建备份
    const backupPath = filePath + '.backup'
    fs.writeFileSync(backupPath, originalContent, 'utf-8')

    // 写入修复后的内容
    fs.writeFileSync(filePath, modifiedContent, 'utf-8')

    console.log(`✅ 自动修复完成，原文件已备份到: ${backupPath}`)
  }

  /**
   * 显示帮助信息
   */
  private showHelp(): void {
    console.log(`
Vue模板错误解析器 CLI工具

使用方法:
  vue-template-analyzer [选项] <文件或模式...>

选项:
  --config, -c     指定配置文件
  --output, -o     指定输出文件路径
  --format, -f     输出格式 (json|xml|html|text) [默认: json]
  --fix            自动应用修复建议
  --strict         启用严格模式
  --verbose, -v    显示详细信息
  --help, -h       显示此帮助信息

示例:
  # 分析单个文件
  vue-template-analyzer src/components/MyComponent.vue

  # 分析多个文件
  vue-template-analyzer src/components/*.vue

  # 批量分析并输出HTML报告
  vue-template-analyzer src/**/*.vue -f html -o report.html

  # 自动修复问题
  vue-template-analyzer src/components/*.vue --fix

  # 严格模式分析
  vue-template-analyzer src/**/*.vue --strict --verbose
`)
  }
}

/**
 * 解析命令行参数
 */
function parseArguments(args: string[]): CLIOptions {
  const options: CLIOptions = {
    files: [],
    format: 'json'
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    
    switch (arg) {
      case '--config':
      case '-c':
        options.config = args[++i]
        break
      case '--output':
      case '-o':
        options.output = args[++i]
        break
      case '--format':
      case '-f':
        options.format = args[++i] as 'json' | 'xml' | 'html' | 'text'
        break
      case '--fix':
        options.fix = true
        break
      case '--strict':
        options.strict = true
        break
      case '--watch':
        options.watch = true
        break
      case '--verbose':
      case '-v':
        options.verbose = true
        break
      case '--help':
      case '-h':
        new VueTemplateAnalyzerCLI(options).run()
        return options
      default:
        if (!arg.startsWith('--')) {
          options.files.push(arg)
        }
    }
  }

  return options
}

/**
 * 主函数
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const options = parseArguments(args)
  
  const cli = new VueTemplateAnalyzerCLI(options)
  await cli.run()
}

// 如果直接运行此文件
if (require.main === module) {
  main().catch(error => {
    console.error('❌ 程序执行失败:', error instanceof Error ? error.message : '未知错误')
    process.exit(1)
  })
}

export { VueTemplateAnalyzerCLI, parseArguments }