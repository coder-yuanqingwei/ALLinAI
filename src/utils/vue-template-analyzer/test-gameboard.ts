import * as fs from 'fs'
import * as path from 'path'
import { GameBoardDiagnostic } from './GameBoardDiagnostic'

/**
 * 运行GameBoard.vue诊断测试
 */
async function runGameBoardDiagnostic(): Promise<void> {
  const diagnostic = new GameBoardDiagnostic()
  const filePath = '/data/workspace/ALLinAI/src/components/GameBoard.vue'
  
  try {
    console.log('🎯 Vue模板错误解析器 - GameBoard.vue 诊断')
    console.log('=' .repeat(50))
    console.log(`📂 分析文件: ${filePath}`)
    console.log('=' .repeat(50))
    
    // 读取文件内容
    const fileContent = fs.readFileSync(filePath, 'utf-8')
    
    // 执行诊断
    const report = await diagnostic.diagnoseGameBoard(filePath, fileContent)
    
    // 输出诊断结果
    console.log('📊 诊断结果摘要:')
    console.log('-' .repeat(30))
    console.log(`❌ 错误数量: ${report.totalErrors}`)
    console.log(`⚠️  警告数量: ${report.totalWarnings}`)
    console.log(`📈 质量评分: ${report.summary.codeQualityScore}/100`)
    console.log(`🔧 可修复问题: ${report.summary.fixableIssues}个`)
    console.log('')
    
    // 显示具体错误
    if (report.errors.length > 0) {
      console.log('🔍 错误详情:')
      console.log('-' .repeat(30))
      report.errors.forEach((error, index) => {
        console.log(`${index + 1}. [${error.errorType}] 第${error.position.line}行:${error.position.column}列`)
        console.log(`   ${error.message}`)
        if (error.context) {
          console.log('   上下文:')
          console.log(error.context.split('\n').map(line => `     ${line}`).join('\n'))
        }
        console.log('')
      })
    }
    
    // 显示警告
    if (report.warnings.length > 0) {
      console.log('⚠️  警告详情:')
      console.log('-' .repeat(30))
      report.warnings.forEach((warning, index) => {
        console.log(`${index + 1}. [${warning.errorType}] 第${warning.position.line}行:${warning.position.column}列`)
        console.log(`   ${warning.message}`)
        console.log('')
      })
    }
    
    // 显示修复建议
    if (report.suggestions.length > 0) {
      console.log('💡 修复建议:')
      console.log('-' .repeat(30))
      report.suggestions.forEach((suggestion, index) => {
        console.log(`${index + 1}. [${suggestion.type}] 可信度: ${Math.round(suggestion.confidence * 100)}%`)
        console.log(`   ${suggestion.description}`)
        if (suggestion.explanation) {
          console.log(`   说明: ${suggestion.explanation}`)
        }
        if (suggestion.examples && suggestion.examples.length > 0) {
          console.log(`   示例:`)
          suggestion.examples.forEach(example => {
            console.log(`     • ${example}`)
          })
        }
        console.log('')
      })
    }
    
    // 显示总体建议
    if (report.summary.recommendations.length > 0) {
      console.log('🎯 总体建议:')
      console.log('-' .repeat(30))
      report.summary.recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. ${rec}`)
      })
      console.log('')
    }
    
    // 如果没有发现问题
    if (report.totalErrors === 0 && report.totalWarnings === 0) {
      console.log('✅ 恭喜！没有发现任何问题。')
      console.log('   您的Vue组件模板语法完全正确。')
    } else {
      console.log('🔧 建议操作:')
      console.log('-' .repeat(30))
      
      if (report.totalErrors > 0) {
        console.log('1. 优先修复所有错误（红色标记）')
      }
      
      if (report.totalWarnings > 0) {
        console.log('2. 考虑修复警告以提高代码质量')
      }
      
      const autoFixable = report.suggestions.filter(s => s.type === 'AUTO_FIX' && s.confidence > 0.8)
      if (autoFixable.length > 0) {
        console.log(`3. ${autoFixable.length}个问题可以自动修复`)
      }
      
      console.log('4. 使用IDE的Vue语法检查工具进行二次验证')
      console.log('5. 参考Vue官方文档确认最佳实践')
    }
    
    // 保存详细报告
    const reportPath = path.join(process.cwd(), 'gameboard-diagnostic-report.json')
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8')
    console.log(`\n📄 详细报告已保存到: ${reportPath}`)
    
    // 特别针对第12行的分析
    console.log('\n🎯 特别分析 - 第12行问题:')
    console.log('-' .repeat(30))
    
    const lines = fileContent.split('\n')
    const line12 = lines[11] // 数组索引从0开始
    
    console.log(`第12行内容: ${line12}`)
    console.log(`行长度: ${line12.length}字符`)
    console.log(`第5列字符: "${line12[4] || '(空)'}"`)
    
    // 分析可能的问题
    const issues = []
    
    if (line12.includes('<div') && !line12.includes('</div>')) {
      issues.push('可能包含未闭合的div标签')
    }
    
    if (/[^\x00-\x7F]/.test(line12)) {
      issues.push('包含非ASCII字符')
    }
    
    if (line12.includes('<<') || line12.includes('>>')) {
      issues.push('可能有双重标签符号')
    }
    
    const quoteCount = (line12.match(/"/g) || []).length
    if (quoteCount % 2 !== 0) {
      issues.push('可能有未闭合的引号')
    }
    
    if (issues.length > 0) {
      console.log('发现的潜在问题:')
      issues.forEach((issue, index) => {
        console.log(`  ${index + 1}. ${issue}`)
      })
    } else {
      console.log('未发现明显的语法问题，可能是更复杂的嵌套或上下文相关问题')
    }
    
    console.log('\n✨ 诊断完成！')
    
  } catch (error) {
    console.error('❌ 诊断过程中发生错误:')
    console.error(error instanceof Error ? error.message : '未知错误')
    console.error('\n调试信息:')
    if (error instanceof Error && error.stack) {
      console.error(error.stack)
    }
  }
}

// 运行诊断
if (require.main === module) {
  runGameBoardDiagnostic().catch(console.error)
}

export { runGameBoardDiagnostic }