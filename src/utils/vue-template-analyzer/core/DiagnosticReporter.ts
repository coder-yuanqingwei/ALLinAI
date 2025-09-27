import { 
  DiagnosticReport, 
  DiagnosticSummary,
  BatchDiagnosticResult,
  ErrorInfo, 
  FixSuggestion,
  ErrorType,
  ErrorSeverity,
  CLIOptions
} from '../types'

/**
 * 诊断报告生成器
 * 负责生成各种格式的诊断报告和分析摘要
 */
export class DiagnosticReporter {
  private options: CLIOptions

  constructor(options: Partial<CLIOptions> = {}) {
    this.options = {
      files: [],
      format: 'json',
      ...options
    }
  }

  /**
   * 生成单文件诊断报告
   */
  public generateReport(
    filePath: string,
    errors: ErrorInfo[],
    warnings: ErrorInfo[],
    suggestions: FixSuggestion[]
  ): DiagnosticReport {
    const summary = this.generateSummary(errors, warnings, suggestions)
    
    return {
      filePath,
      totalErrors: errors.length,
      totalWarnings: warnings.length,
      errors,
      warnings,
      suggestions,
      summary,
      timestamp: new Date().toISOString()
    }
  }

  /**
   * 生成批量诊断结果
   */
  public generateBatchResult(reports: DiagnosticReport[]): BatchDiagnosticResult {
    const totalFiles = reports.length
    const errorFiles = reports.filter(r => r.totalErrors > 0).length
    const overallSummary = this.generateOverallSummary(reports)

    return {
      totalFiles,
      processedFiles: totalFiles,
      errorFiles,
      reports,
      overallSummary
    }
  }

  /**
   * 生成诊断摘要
   */
  private generateSummary(
    errors: ErrorInfo[], 
    warnings: ErrorInfo[], 
    suggestions: FixSuggestion[]
  ): DiagnosticSummary {
    const criticalIssues = errors.filter(e => e.severity === ErrorSeverity.ERROR).length
    const fixableIssues = suggestions.filter(s => s.confidence > 0.7).length
    const codeQualityScore = this.calculateQualityScore(errors, warnings)
    const recommendations = this.generateRecommendations(errors, warnings, suggestions)

    return {
      criticalIssues,
      fixableIssues,
      codeQualityScore,
      recommendations
    }
  }

  /**
   * 生成整体摘要
   */
  private generateOverallSummary(reports: DiagnosticReport[]): DiagnosticSummary {
    const totalErrors = reports.reduce((sum, r) => sum + r.totalErrors, 0)
    const totalWarnings = reports.reduce((sum, r) => sum + r.totalWarnings, 0)
    const allSuggestions = reports.flatMap(r => r.suggestions)
    
    const criticalIssues = totalErrors
    const fixableIssues = allSuggestions.filter(s => s.confidence > 0.7).length
    const codeQualityScore = this.calculateOverallQualityScore(reports)
    const recommendations = this.generateOverallRecommendations(reports)

    return {
      criticalIssues,
      fixableIssues,
      codeQualityScore,
      recommendations
    }
  }

  /**
   * 计算代码质量评分
   */
  private calculateQualityScore(errors: ErrorInfo[], warnings: ErrorInfo[]): number {
    const errorWeight = 10
    const warningWeight = 3
    const baseScore = 100
    
    const penalty = errors.length * errorWeight + warnings.length * warningWeight
    const score = Math.max(0, baseScore - penalty)
    
    return Math.round(score)
  }

  /**
   * 计算整体质量评分
   */
  private calculateOverallQualityScore(reports: DiagnosticReport[]): number {
    if (reports.length === 0) return 100
    
    const averageScore = reports.reduce((sum, r) => sum + r.summary.codeQualityScore, 0) / reports.length
    return Math.round(averageScore)
  }

  /**
   * 生成建议
   */
  private generateRecommendations(
    errors: ErrorInfo[], 
    warnings: ErrorInfo[], 
    suggestions: FixSuggestion[]
  ): string[] {
    const recommendations: string[] = []

    // 基于错误类型生成建议
    const errorTypes = [...new Set(errors.map(e => e.errorType))]
    
    if (errorTypes.includes(ErrorType.UNCLOSED_TAG)) {
      recommendations.push('检查所有HTML标签是否正确闭合')
    }
    
    if (errorTypes.includes(ErrorType.TAG_MISMATCH)) {
      recommendations.push('验证标签嵌套结构和匹配关系')
    }
    
    if (errorTypes.includes(ErrorType.DIRECTIVE_SYNTAX_ERROR)) {
      recommendations.push('参考Vue官方文档检查指令语法')
    }
    
    if (errorTypes.includes(ErrorType.COMPONENT_TAG_ERROR)) {
      recommendations.push('确保组件已正确导入和注册')
    }

    // 基于可修复问题数量生成建议
    const autoFixable = suggestions.filter(s => s.type === 'AUTO_FIX').length
    if (autoFixable > 0) {
      recommendations.push(`${autoFixable}个问题可以自动修复`)
    }

    // 基于代码质量评分生成建议
    const qualityScore = this.calculateQualityScore(errors, warnings)
    if (qualityScore < 80) {
      recommendations.push('建议进行代码重构以提高质量')
    }

    return recommendations
  }

  /**
   * 生成整体建议
   */
  private generateOverallRecommendations(reports: DiagnosticReport[]): string[] {
    const recommendations: string[] = []
    
    const errorFiles = reports.filter(r => r.totalErrors > 0).length
    const totalFiles = reports.length
    
    if (errorFiles > 0) {
      recommendations.push(`${errorFiles}/${totalFiles} 个文件存在错误`)
    }
    
    const highErrorFiles = reports.filter(r => r.totalErrors > 5).length
    if (highErrorFiles > 0) {
      recommendations.push(`${highErrorFiles} 个文件错误较多，建议优先修复`)
    }
    
    const lowQualityFiles = reports.filter(r => r.summary.codeQualityScore < 70).length
    if (lowQualityFiles > 0) {
      recommendations.push(`${lowQualityFiles} 个文件代码质量较低`)
    }

    return recommendations
  }

  /**
   * 格式化输出报告
   */
  public formatReport(report: DiagnosticReport | BatchDiagnosticResult): string {
    switch (this.options.format) {
      case 'json':
        return this.formatAsJSON(report)
      case 'xml':
        return this.formatAsXML(report)
      case 'html':
        return this.formatAsHTML(report)
      case 'text':
        return this.formatAsText(report)
      default:
        return this.formatAsJSON(report)
    }
  }

  /**
   * JSON格式输出
   */
  private formatAsJSON(report: DiagnosticReport | BatchDiagnosticResult): string {
    return JSON.stringify(report, null, 2)
  }

  /**
   * XML格式输出
   */
  private formatAsXML(report: DiagnosticReport | BatchDiagnosticResult): string {
    if ('filePath' in report) {
      return this.formatSingleReportAsXML(report)
    } else {
      return this.formatBatchReportAsXML(report)
    }
  }

  /**
   * 单文件报告XML格式
   */
  private formatSingleReportAsXML(report: DiagnosticReport): string {
    const errors = report.errors.map(e => `
    <error>
      <type>${e.errorType}</type>
      <severity>${e.severity}</severity>
      <message><![CDATA[${e.message}]]></message>
      <line>${e.position.line}</line>
      <column>${e.position.column}</column>
    </error>`).join('')

    const warnings = report.warnings.map(w => `
    <warning>
      <type>${w.errorType}</type>
      <message><![CDATA[${w.message}]]></message>
      <line>${w.position.line}</line>
      <column>${w.position.column}</column>
    </warning>`).join('')

    return `<?xml version="1.0" encoding="UTF-8"?>
<diagnostic-report>
  <file>${report.filePath}</file>
  <timestamp>${report.timestamp}</timestamp>
  <summary>
    <total-errors>${report.totalErrors}</total-errors>
    <total-warnings>${report.totalWarnings}</total-warnings>
    <quality-score>${report.summary.codeQualityScore}</quality-score>
  </summary>
  <errors>${errors}
  </errors>
  <warnings>${warnings}
  </warnings>
</diagnostic-report>`
  }

  /**
   * 批量报告XML格式
   */
  private formatBatchReportAsXML(result: BatchDiagnosticResult): string {
    const reports = result.reports.map(r => `
  <file-report>
    <path>${r.filePath}</path>
    <errors>${r.totalErrors}</errors>
    <warnings>${r.totalWarnings}</warnings>
    <quality-score>${r.summary.codeQualityScore}</quality-score>
  </file-report>`).join('')

    return `<?xml version="1.0" encoding="UTF-8"?>
<batch-diagnostic-result>
  <summary>
    <total-files>${result.totalFiles}</total-files>
    <error-files>${result.errorFiles}</error-files>
    <overall-quality-score>${result.overallSummary.codeQualityScore}</overall-quality-score>
  </summary>
  <files>${reports}
  </files>
</batch-diagnostic-result>`
  }

  /**
   * HTML格式输出
   */
  private formatAsHTML(report: DiagnosticReport | BatchDiagnosticResult): string {
    if ('filePath' in report) {
      return this.formatSingleReportAsHTML(report)
    } else {
      return this.formatBatchReportAsHTML(report)
    }
  }

  /**
   * 单文件报告HTML格式
   */
  private formatSingleReportAsHTML(report: DiagnosticReport): string {
    const errorsHTML = report.errors.map(e => `
      <div class="error-item">
        <div class="error-header">
          <span class="error-type">${e.errorType}</span>
          <span class="error-position">第${e.position.line}行:${e.position.column}列</span>
        </div>
        <div class="error-message">${e.message}</div>
        <div class="error-context"><pre>${e.context}</pre></div>
      </div>`).join('')

    const warningsHTML = report.warnings.map(w => `
      <div class="warning-item">
        <div class="warning-header">
          <span class="warning-type">${w.errorType}</span>
          <span class="warning-position">第${w.position.line}行:${w.position.column}列</span>
        </div>
        <div class="warning-message">${w.message}</div>
      </div>`).join('')

    const suggestionsHTML = report.suggestions.map(s => `
      <div class="suggestion-item">
        <div class="suggestion-header">
          <span class="suggestion-type">${s.type}</span>
          <span class="suggestion-confidence">可信度: ${Math.round(s.confidence * 100)}%</span>
        </div>
        <div class="suggestion-description">${s.description}</div>
        <div class="suggestion-explanation">${s.explanation}</div>
      </div>`).join('')

    return `<!DOCTYPE html>
<html>
<head>
  <title>Vue模板诊断报告</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    .header { background: #f5f5f5; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
    .summary { display: flex; gap: 20px; margin-bottom: 20px; }
    .summary-item { background: white; padding: 15px; border-radius: 5px; border: 1px solid #ddd; }
    .error-item, .warning-item { background: #fff; margin: 10px 0; padding: 15px; border-left: 4px solid #dc3545; }
    .warning-item { border-left-color: #ffc107; }
    .suggestion-item { background: #e7f3ff; margin: 10px 0; padding: 15px; border-left: 4px solid #007bff; }
    .error-header, .warning-header, .suggestion-header { font-weight: bold; margin-bottom: 5px; }
    .error-context { background: #f8f9fa; padding: 10px; margin-top: 10px; border-radius: 3px; }
    pre { margin: 0; white-space: pre-wrap; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Vue模板诊断报告</h1>
    <p>文件: ${report.filePath}</p>
    <p>生成时间: ${report.timestamp}</p>
  </div>
  
  <div class="summary">
    <div class="summary-item">
      <h3>错误统计</h3>
      <p>错误: ${report.totalErrors}</p>
      <p>警告: ${report.totalWarnings}</p>
    </div>
    <div class="summary-item">
      <h3>质量评分</h3>
      <p>${report.summary.codeQualityScore}/100</p>
    </div>
    <div class="summary-item">
      <h3>可修复问题</h3>
      <p>${report.summary.fixableIssues}个</p>
    </div>
  </div>

  <h2>错误详情</h2>
  <div class="errors">${errorsHTML}</div>

  <h2>警告详情</h2>
  <div class="warnings">${warningsHTML}</div>

  <h2>修复建议</h2>
  <div class="suggestions">${suggestionsHTML}</div>
</body>
</html>`
  }

  /**
   * 批量报告HTML格式
   */
  private formatBatchReportAsHTML(result: BatchDiagnosticResult): string {
    const fileReportsHTML = result.reports.map(r => `
      <tr>
        <td>${r.filePath}</td>
        <td>${r.totalErrors}</td>
        <td>${r.totalWarnings}</td>
        <td>${r.summary.codeQualityScore}/100</td>
        <td>${r.summary.fixableIssues}</td>
      </tr>`).join('')

    return `<!DOCTYPE html>
<html>
<head>
  <title>批量Vue模板诊断报告</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    .header { background: #f5f5f5; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
    .summary { display: flex; gap: 20px; margin-bottom: 20px; }
    .summary-item { background: white; padding: 15px; border-radius: 5px; border: 1px solid #ddd; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { padding: 10px; border: 1px solid #ddd; text-align: left; }
    th { background: #f8f9fa; }
  </style>
</head>
<body>
  <div class="header">
    <h1>批量Vue模板诊断报告</h1>
  </div>
  
  <div class="summary">
    <div class="summary-item">
      <h3>文件统计</h3>
      <p>总文件: ${result.totalFiles}</p>
      <p>错误文件: ${result.errorFiles}</p>
    </div>
    <div class="summary-item">
      <h3>整体质量</h3>
      <p>${result.overallSummary.codeQualityScore}/100</p>
    </div>
    <div class="summary-item">
      <h3>关键问题</h3>
      <p>${result.overallSummary.criticalIssues}个</p>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>文件路径</th>
        <th>错误数</th>
        <th>警告数</th>
        <th>质量评分</th>
        <th>可修复问题</th>
      </tr>
    </thead>
    <tbody>
      ${fileReportsHTML}
    </tbody>
  </table>
</body>
</html>`
  }

  /**
   * 文本格式输出
   */
  private formatAsText(report: DiagnosticReport | BatchDiagnosticResult): string {
    if ('filePath' in report) {
      return this.formatSingleReportAsText(report)
    } else {
      return this.formatBatchReportAsText(report)
    }
  }

  /**
   * 单文件报告文本格式
   */
  private formatSingleReportAsText(report: DiagnosticReport): string {
    let output = `Vue模板诊断报告\n`
    output += `==================\n\n`
    output += `文件: ${report.filePath}\n`
    output += `生成时间: ${report.timestamp}\n\n`
    
    output += `摘要:\n`
    output += `  错误: ${report.totalErrors}\n`
    output += `  警告: ${report.totalWarnings}\n`
    output += `  质量评分: ${report.summary.codeQualityScore}/100\n`
    output += `  可修复问题: ${report.summary.fixableIssues}个\n\n`

    if (report.errors.length > 0) {
      output += `错误详情:\n`
      output += `----------\n`
      report.errors.forEach((error, index) => {
        output += `${index + 1}. [${error.errorType}] 第${error.position.line}行:${error.position.column}列\n`
        output += `   ${error.message}\n`
        if (error.context) {
          output += `   上下文:
${error.context.split('
').map(line => `     ${line}`).join('
')}
`
        }
        output += `\n`
      })
    }

    if (report.warnings.length > 0) {
      output += `警告详情:\n`
      output += `----------\n`
      report.warnings.forEach((warning, index) => {
        output += `${index + 1}. [${warning.errorType}] 第${warning.position.line}行:${warning.position.column}列\n`
        output += `   ${warning.message}\n\n`
      })
    }

    if (report.suggestions.length > 0) {
      output += `修复建议:\n`
      output += `----------\n`
      report.suggestions.forEach((suggestion, index) => {
        output += `${index + 1}. [${suggestion.type}] 可信度: ${Math.round(suggestion.confidence * 100)}%\n`
        output += `   ${suggestion.description}\n`
        if (suggestion.explanation) {
          output += `   说明: ${suggestion.explanation}\n`
        }
        output += `\n`
      })
    }

    if (report.summary.recommendations.length > 0) {
      output += `建议:\n`
      output += `-----\n`
      report.summary.recommendations.forEach((rec, index) => {
        output += `${index + 1}. ${rec}\n`
      })
    }

    return output
  }

  /**
   * 批量报告文本格式
   */
  private formatBatchReportAsText(result: BatchDiagnosticResult): string {
    let output = `批量Vue模板诊断报告\n`
    output += `====================\n\n`
    
    output += `总体摘要:\n`
    output += `  总文件数: ${result.totalFiles}\n`
    output += `  错误文件数: ${result.errorFiles}\n`
    output += `  整体质量评分: ${result.overallSummary.codeQualityScore}/100\n`
    output += `  关键问题: ${result.overallSummary.criticalIssues}个\n\n`

    output += `文件详情:\n`
    output += `----------\n`
    result.reports.forEach((report, index) => {
      output += `${index + 1}. ${report.filePath}\n`
      output += `   错误: ${report.totalErrors}, 警告: ${report.totalWarnings}\n`
      output += `   质量评分: ${report.summary.codeQualityScore}/100\n`
      output += `   可修复: ${report.summary.fixableIssues}个\n\n`
    })

    if (result.overallSummary.recommendations.length > 0) {
      output += `整体建议:\n`
      output += `----------\n`
      result.overallSummary.recommendations.forEach((rec, index) => {
        output += `${index + 1}. ${rec}\n`
      })
    }

    return output
  }

  /**
   * 生成简洁的控制台输出
   */
  public generateConsoleOutput(report: DiagnosticReport): string {
    const { filePath, totalErrors, totalWarnings, summary } = report
    
    let output = `\n📄 ${filePath}\n`
    
    if (totalErrors > 0) {
      output += `❌ ${totalErrors} 个错误\n`
    }
    
    if (totalWarnings > 0) {
      output += `⚠️  ${totalWarnings} 个警告\n`
    }
    
    if (totalErrors === 0 && totalWarnings === 0) {
      output += `✅ 没有发现问题\n`
    }
    
    output += `📊 质量评分: ${summary.codeQualityScore}/100\n`
    
    if (summary.fixableIssues > 0) {
      output += `🔧 ${summary.fixableIssues} 个问题可自动修复\n`
    }
    
    return output
  }

  /**
   * 生成进度报告
   */
  public generateProgressReport(processed: number, total: number, current?: string): string {
    const percentage = Math.round((processed / total) * 100)
    const progress = '▓'.repeat(Math.round(percentage / 5)) + '░'.repeat(20 - Math.round(percentage / 5))
    
    let output = `\r分析进度: [${progress}] ${percentage}% (${processed}/${total})`
    
    if (current) {
      output += ` - ${current}`
    }
    
    return output
  }
}