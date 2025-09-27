/**
 * Vue模板错误解析器 基本使用示例
 */

import { 
  ErrorAnalyzer,
  TagMatcher, 
  DirectiveValidator,
  ErrorLocator,
  FixSuggestionGenerator,
  DiagnosticReporter,
  GameBoardDiagnostic
} from '../'

// 示例1: 基本错误检测
async function basicErrorDetection() {
  console.log('🔍 示例1: 基本错误检测')
  console.log('=' .repeat(40))
  
  const analyzer = new ErrorAnalyzer({
    enableStrictMode: true,
    checkVueDirectives: true,
    checkComponentTags: true,
    enableAutoFix: true,
    maxErrors: 50,
    ignoreErrors: []
  })

  const vueContent = `
<template>
  <div class="container">
    <h1>{{ title }}
    <div v-for="item in items" class="item">
      <span>{{ item.name }}</span>
    </div>
    <input v-model="" />
  </div>
</template>
`

  const result = await analyzer.analyzeVueFile('example.vue', vueContent)
  
  console.log(`✅ 分析完成`)
  console.log(`❌ 错误数量: ${result.errors.length}`)
  console.log(`⚠️  警告数量: ${result.warnings.length}`)
  
  if (result.errors.length > 0) {
    console.log('\n错误详情:')
    result.errors.forEach((error, index) => {
      console.log(`${index + 1}. [${error.errorType}] ${error.message}`)
      console.log(`   位置: 第${error.position.line}行:${error.position.column}列`)
    })
  }
}

// 示例2: 标签匹配验证
function tagMatchingExample() {
  console.log('\n🏷️  示例2: 标签匹配验证')
  console.log('=' .repeat(40))
  
  const tagMatcher = new TagMatcher()
  
  // 模拟标签数据
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
  
  const errors = tagMatcher.validateTagMatching(tags, 'example.vue', '<div>\n</span>')
  
  console.log(`✅ 标签验证完成`)
  console.log(`❌ 发现 ${errors.length} 个标签错误`)
  
  errors.forEach((error, index) => {
    console.log(`${index + 1}. ${error.message}`)
  })
}

// 示例3: Vue指令验证
function directiveValidationExample() {
  console.log('\n⚡ 示例3: Vue指令验证')
  console.log('=' .repeat(40))
  
  const validator = new DirectiveValidator()
  
  // 模拟指令数据
  const directives = [
    {
      name: 'v-for',
      value: 'invalid syntax',
      modifiers: [],
      position: { line: 1, column: 1 },
      range: { start: { line: 1, column: 1 }, end: { line: 1, column: 15 } }
    },
    {
      name: 'v-model',
      value: '',
      modifiers: ['invalid'],
      position: { line: 2, column: 1 },
      range: { start: { line: 2, column: 1 }, end: { line: 2, column: 10 } }
    }
  ]
  
  const errors = validator.validateDirectives(directives, [], 'example.vue', '')
  
  console.log(`✅ 指令验证完成`)
  console.log(`❌ 发现 ${errors.length} 个指令错误`)
  
  errors.forEach((error, index) => {
    console.log(`${index + 1}. ${error.message}`)
  })
}

// 示例4: 错误定位
function errorLocationExample() {
  console.log('\n🎯 示例4: 错误定位')
  console.log('=' .repeat(40))
  
  const locator = new ErrorLocator()
  const content = 'Line 1\nLine 2\nLine 3 with error\nLine 4'
  
  locator.initialize(content)
  
  // 测试位置计算
  const position = locator.getPositionFromOffset(14) // 'L' in 'Line 2'
  console.log(`✅ 偏移量14对应位置: 第${position.line}行:${position.column}列`)
  
  // 测试上下文获取
  const context = locator.getContextLines({ line: 3, column: 10 }, 1, 1)
  console.log(`✅ 第3行上下文:`)
  context.lines.forEach(line => {
    const prefix = line.isErrorLine ? '>>> ' : '    '
    console.log(`${prefix}${line.number}: ${line.content}`)
  })
  
  // 测试编译器错误解析
  const errorMessage = 'Error at 3:10'
  const location = locator.locateFromCompilerError(errorMessage)
  if (location) {
    console.log(`✅ 解析编译器错误: 第${location.position.line}行:${location.position.column}列`)
  }
}

// 示例5: 修复建议生成
function fixSuggestionExample() {
  console.log('\n🔧 示例5: 修复建议生成')
  console.log('=' .repeat(40))
  
  const generator = new FixSuggestionGenerator()
  generator.initialize('<div>Test', 'example.vue')
  
  // 模拟错误
  const error = {
    errorType: 'UNCLOSED_TAG' as const,
    severity: 'ERROR' as const,
    message: '标签未闭合: <div>',
    file: 'example.vue',
    position: { line: 1, column: 1 },
    context: '<div>Test',
    suggestions: []
  }
  
  const suggestions = generator.generateSuggestions(error)
  
  console.log(`✅ 生成 ${suggestions.length} 个修复建议:`)
  suggestions.forEach((suggestion, index) => {
    console.log(`${index + 1}. [${suggestion.type}] ${suggestion.description}`)
    console.log(`   可信度: ${Math.round(suggestion.confidence * 100)}%`)
    console.log(`   风险: ${suggestion.riskLevel}`)
    if (suggestion.originalCode && suggestion.fixedCode) {
      console.log(`   修复: "${suggestion.originalCode}" → "${suggestion.fixedCode}"`)
    }
  })
}

// 示例6: 诊断报告生成
function diagnosticReportExample() {
  console.log('\n📊 示例6: 诊断报告生成')
  console.log('=' .repeat(40))
  
  const reporter = new DiagnosticReporter({ format: 'text', verbose: true })
  
  // 模拟错误和建议
  const errors = [
    {
      errorType: 'UNCLOSED_TAG' as const,
      severity: 'ERROR' as const,
      message: '标签未闭合: <div>',
      file: 'example.vue',
      position: { line: 1, column: 1 },
      context: '<div>',
      suggestions: []
    }
  ]
  
  const suggestions = [
    {
      type: 'AUTO_FIX' as const,
      description: '添加闭合标签',
      originalCode: '<div>',
      fixedCode: '<div></div>',
      confidence: 0.95,
      riskLevel: 'LOW' as const,
      explanation: '自动添加缺失的闭合标签'
    }
  ]
  
  const report = reporter.generateReport('example.vue', errors, [], suggestions)
  
  console.log(`✅ 报告生成完成`)
  console.log(`📂 文件: ${report.filePath}`)
  console.log(`❌ 错误: ${report.totalErrors}`)
  console.log(`📈 质量评分: ${report.summary.codeQualityScore}/100`)
  console.log(`🔧 可修复: ${report.summary.fixableIssues}个`)
  
  // 生成简洁输出
  const consoleOutput = reporter.generateConsoleOutput(report)
  console.log('\n控制台输出示例:')
  console.log(consoleOutput)
}

// 示例7: GameBoard专门诊断
async function gameBoardDiagnosticExample() {
  console.log('\n🎮 示例7: GameBoard专门诊断')
  console.log('=' .repeat(40))
  
  const diagnostic = new GameBoardDiagnostic()
  
  // 模拟GameBoard内容
  const gameBoardContent = `
<template>
  <div class="game-board">
    <div class="game-layout">
      <div class="game-sidebar">
        <ControlPanel />
      </div>
      <div class="game-main">
        <ChessBoard />
      </div>
      <div class="game-sidebar">
        <GameInfo />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ControlPanel } from '@/components/ControlPanel'
import { ChessBoard } from '@/components/ChessBoard'
import { GameInfo } from '@/components/GameInfo'

const gameState = ref({})
</script>
`
  
  const report = await diagnostic.diagnoseGameBoard('GameBoard.vue', gameBoardContent)
  
  console.log(`✅ GameBoard诊断完成`)
  console.log(`❌ 错误: ${report.totalErrors}`)
  console.log(`⚠️  警告: ${report.totalWarnings}`)
  console.log(`📈 质量评分: ${report.summary.codeQualityScore}/100`)
  
  if (report.suggestions.length > 0) {
    console.log(`\n💡 修复建议:`)
    report.suggestions.slice(0, 3).forEach((suggestion, index) => {
      console.log(`${index + 1}. ${suggestion.description}`)
    })
  }
  
  // 验证修复
  if (report.suggestions.length > 0) {
    const fixedContent = diagnostic.generateFixedContent(gameBoardContent, report.suggestions)
    const isValid = await diagnostic.validateFix('GameBoard.vue', fixedContent)
    console.log(`🔧 修复验证: ${isValid ? '成功' : '失败'}`)
  }
}

// 示例8: 完整工作流程
async function completeWorkflowExample() {
  console.log('\n🚀 示例8: 完整工作流程')
  console.log('=' .repeat(40))
  
  // 1. 创建有问题的Vue文件内容
  const problematicVue = `
<template>
  <div class="app">
    <h1>{{ title }}
    <div v-for="item in items" class="item">
      <span>{{ item.name }}</span>
    <input v-model="" @click="" />
    <MyComponent>
  </div>
</template>

<script setup>
import { ref } from 'vue'
const title = ref('Hello')
const items = ref([])
</script>
`

  // 2. 执行完整分析
  const analyzer = new ErrorAnalyzer({
    enableStrictMode: true,
    checkVueDirectives: true,
    checkComponentTags: true,
    enableAutoFix: true,
    maxErrors: 20,
    ignoreErrors: []
  })
  
  const result = await analyzer.analyzeVueFile('problematic.vue', problematicVue)
  
  // 3. 生成修复建议
  const generator = new FixSuggestionGenerator()
  generator.initialize(problematicVue, 'problematic.vue')
  
  const allSuggestions = []
  for (const error of result.errors) {
    const suggestions = generator.generateSuggestions(error)
    allSuggestions.push(...suggestions)
  }
  
  // 4. 生成报告
  const reporter = new DiagnosticReporter({ format: 'text' })
  const report = reporter.generateReport(
    'problematic.vue',
    result.errors,
    result.warnings,
    allSuggestions
  )
  
  // 5. 输出结果
  console.log(`✅ 完整分析完成`)
  console.log(`📂 文件: ${report.filePath}`)
  console.log(`❌ 错误数: ${report.totalErrors}`)
  console.log(`⚠️  警告数: ${report.totalWarnings}`)
  console.log(`🔧 建议数: ${report.suggestions.length}`)
  console.log(`📈 质量评分: ${report.summary.codeQualityScore}/100`)
  
  // 6. 显示可自动修复的问题
  const autoFixable = allSuggestions.filter(s => s.type === 'AUTO_FIX' && s.confidence > 0.8)
  console.log(`🤖 可自动修复: ${autoFixable.length}个`)
  
  if (autoFixable.length > 0) {
    console.log(`\n自动修复预览:`)
    autoFixable.slice(0, 3).forEach((fix, index) => {
      console.log(`${index + 1}. ${fix.description}`)
      if (fix.originalCode && fix.fixedCode) {
        console.log(`   "${fix.originalCode}" → "${fix.fixedCode}"`)
      }
    })
  }
}

// 运行所有示例
async function runAllExamples() {
  console.log('🎯 Vue模板错误解析器 - 使用示例')
  console.log('=' .repeat(50))
  
  try {
    await basicErrorDetection()
    tagMatchingExample()
    directiveValidationExample()
    errorLocationExample()
    fixSuggestionExample()
    diagnosticReportExample()
    await gameBoardDiagnosticExample()
    await completeWorkflowExample()
    
    console.log('\n✨ 所有示例执行完成！')
    console.log('\n📚 更多信息请查看README.md文档')
    
  } catch (error) {
    console.error('\n❌ 示例执行过程中发生错误:')
    console.error(error instanceof Error ? error.message : '未知错误')
  }
}

// 如果直接运行此文件
if (require.main === module) {
  runAllExamples()
}

export {
  basicErrorDetection,
  tagMatchingExample,
  directiveValidationExample,
  errorLocationExample,
  fixSuggestionExample,
  diagnosticReportExample,
  gameBoardDiagnosticExample,
  completeWorkflowExample,
  runAllExamples
}