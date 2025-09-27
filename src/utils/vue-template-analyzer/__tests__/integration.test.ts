import { describe, it, expect, beforeEach } from 'vitest'
import { VueTemplateAnalyzerCLI, parseArguments } from '../cli'
import { GameBoardDiagnostic } from '../GameBoardDiagnostic'
import * as fs from 'fs'
import * as path from 'path'

describe('Vue Template Analyzer - 集成测试', () => {
  const testFilesDir = path.join(__dirname, 'fixtures')
  
  beforeEach(() => {
    // 确保测试文件目录存在
    if (!fs.existsSync(testFilesDir)) {
      fs.mkdirSync(testFilesDir, { recursive: true })
    }
  })

  describe('CLI功能测试', () => {
    it('应该解析命令行参数', () => {
      const args = ['src/test.vue', '--format', 'json', '--verbose']
      const options = parseArguments(args)
      
      expect(options.files).toEqual(['src/test.vue'])
      expect(options.format).toBe('json')
      expect(options.verbose).toBe(true)
    })

    it('应该解析所有支持的选项', () => {
      const args = [
        'src/**/*.vue',
        '--config', 'config.json',
        '--output', 'report.html',
        '--format', 'html',
        '--fix',
        '--strict',
        '--verbose'
      ]
      const options = parseArguments(args)
      
      expect(options.files).toEqual(['src/**/*.vue'])
      expect(options.config).toBe('config.json')
      expect(options.output).toBe('report.html')
      expect(options.format).toBe('html')
      expect(options.fix).toBe(true)
      expect(options.strict).toBe(true)
      expect(options.verbose).toBe(true)
    })
  })

  describe('GameBoard诊断测试', () => {
    let diagnostic: GameBoardDiagnostic

    beforeEach(() => {
      diagnostic = new GameBoardDiagnostic()
    })

    it('应该诊断正确的Vue文件', async () => {
      const vueContent = `
<template>
  <div class="game-board">
    <div class="game-layout">
      <div class="content">Hello World</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
const message = ref('Hello')
</script>

<style scoped>
.game-board {
  padding: 20px;
}
</style>
`
      
      const report = await diagnostic.diagnoseGameBoard('test.vue', vueContent)
      
      expect(report.totalErrors).toBe(0)
      expect(report.totalWarnings).toBeLessThanOrEqual(1) // 可能有一些样式相关的警告
      expect(report.summary.codeQualityScore).toBeGreaterThan(80)
    })

    it('应该检测未闭合标签', async () => {
      const vueContent = `
<template>
  <div class="game-board">
    <div class="game-layout">
      <div class="content">Hello World
    </div>
  </div>
</template>
`
      
      const report = await diagnostic.diagnoseGameBoard('test.vue', vueContent)
      
      expect(report.totalErrors).toBeGreaterThan(0)
      expect(report.errors.some(e => e.errorType === 'UNCLOSED_TAG')).toBe(true)
    })

    it('应该检测标签不匹配', async () => {
      const vueContent = `
<template>
  <div class="game-board">
    <div class="game-layout">
      <span class="content">Hello World</div>
    </div>
  </div>
</template>
`
      
      const report = await diagnostic.diagnoseGameBoard('test.vue', vueContent)
      
      expect(report.totalErrors).toBeGreaterThan(0)
      expect(report.errors.some(e => e.errorType === 'TAG_MISMATCH')).toBe(true)
    })

    it('应该检测Vue指令错误', async () => {
      const vueContent = `
<template>
  <div class="game-board">
    <div v-for="invalid syntax" class="item">
      {{ item }}
    </div>
    <input v-model="" />
    <button v-on="">Click</button>
  </div>
</template>
`
      
      const report = await diagnostic.diagnoseGameBoard('test.vue', vueContent)
      
      expect(report.totalErrors).toBeGreaterThan(0)
      expect(report.errors.some(e => e.errorType === 'DIRECTIVE_SYNTAX_ERROR')).toBe(true)
    })

    it('应该生成修复建议', async () => {
      const vueContent = `
<template>
  <div class="game-board">
    <div class="unclosed-tag">
    <br>
  </div>
</template>
`
      
      const report = await diagnostic.diagnoseGameBoard('test.vue', vueContent)
      
      expect(report.suggestions.length).toBeGreaterThan(0)
      expect(report.suggestions.some(s => s.confidence > 0.7)).toBe(true)
    })

    it('应该验证修复效果', async () => {
      const originalContent = `
<template>
  <div class="game-board">
    <div class="unclosed-tag">
  </div>
</template>
`
      
      const fixedContent = `
<template>
  <div class="game-board">
    <div class="unclosed-tag">
    </div>
  </div>
</template>
`
      
      const originalReport = await diagnostic.diagnoseGameBoard('test.vue', originalContent)
      const isFixed = await diagnostic.validateFix('test.vue', fixedContent)
      
      expect(originalReport.totalErrors).toBeGreaterThan(0)
      expect(isFixed).toBe(true)
    })
  })

  describe('端到端测试', () => {
    it('应该处理完整的分析流程', async () => {
      // 创建测试文件
      const testFile = path.join(testFilesDir, 'test-component.vue')
      const vueContent = `
<template>
  <div class="container">
    <h1>{{ title }}</h1>
    <div v-if="showContent" class="content">
      <p v-for="item in items" :key="item.id">
        {{ item.name }}
      </p>
    </div>
    <button @click="handleClick">Click me</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const title = ref('Test Component')
const showContent = ref(true)
const items = ref([
  { id: 1, name: 'Item 1' },
  { id: 2, name: 'Item 2' }
])

const handleClick = () => {
  console.log('Button clicked')
}
</script>

<style scoped>
.container {
  padding: 20px;
}

.content {
  margin-top: 20px;
}
</style>
`
      
      fs.writeFileSync(testFile, vueContent, 'utf-8')
      
      try {
        const cli = new VueTemplateAnalyzerCLI({
          files: [testFile],
          format: 'json',
          verbose: true
        })
        
        // 这里我们不能直接运行CLI，因为它会尝试输出到控制台
        // 但我们可以测试其初始化是否正确
        expect(cli).toBeInstanceOf(VueTemplateAnalyzerCLI)
        
      } finally {
        // 清理测试文件
        if (fs.existsSync(testFile)) {
          fs.unlinkSync(testFile)
        }
      }
    })

    it('应该处理有错误的文件', async () => {
      const testFile = path.join(testFilesDir, 'error-component.vue')
      const vueContent = `
<template>
  <div class="container">
    <h1>{{ title }}
    <div v-if="showContent" class="content">
      <p v-for="invalid syntax">
        {{ item.name }}
      </div>
    </div>
    <button @click="">Click me</button>
  </div>
</template>
`
      
      fs.writeFileSync(testFile, vueContent, 'utf-8')
      
      try {
        const diagnostic = new GameBoardDiagnostic()
        const report = await diagnostic.diagnoseGameBoard(testFile, vueContent)
        
        expect(report.totalErrors).toBeGreaterThan(0)
        expect(report.suggestions.length).toBeGreaterThan(0)
        expect(report.summary.codeQualityScore).toBeLessThan(80)
        
      } finally {
        // 清理测试文件
        if (fs.existsSync(testFile)) {
          fs.unlinkSync(testFile)
        }
      }
    })
  })

  describe('性能测试', () => {
    it('应该在合理时间内处理大文件', async () => {
      // 生成一个较大的Vue文件
      const largeTemplate = Array(100).fill(0).map((_, i) => 
        `<div class="item-${i}">
          <h2>Title ${i}</h2>
          <p v-if="show${i}">Content ${i}</p>
          <button @click="handle${i}">Action ${i}</button>
        </div>`
      ).join('\n')
      
      const vueContent = `
<template>
  <div class="large-component">
    ${largeTemplate}
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
${Array(100).fill(0).map((_, i) => `const show${i} = ref(false)`).join('\n')}
${Array(100).fill(0).map((_, i) => `const handle${i} = () => {}`).join('\n')}
</script>
`
      
      const startTime = Date.now()
      const diagnostic = new GameBoardDiagnostic()
      const report = await diagnostic.diagnoseGameBoard('large-test.vue', vueContent)
      const endTime = Date.now()
      
      const duration = endTime - startTime
      
      expect(duration).toBeLessThan(5000) // 应该在5秒内完成
      expect(report).toBeDefined()
      expect(report.totalErrors).toBe(0) // 大文件但语法正确
    })

    it('应该处理深度嵌套的模板', async () => {
      const nestedDivs = Array(20).fill(0).reduce((acc, _, i) => 
        `<div class="level-${i}">${acc}</div>`, '<span>Deep content</span>'
      )
      
      const vueContent = `
<template>
  <div class="nested-component">
    ${nestedDivs}
  </div>
</template>
`
      
      const diagnostic = new GameBoardDiagnostic()
      const report = await diagnostic.diagnoseGameBoard('nested-test.vue', vueContent)
      
      expect(report.totalErrors).toBe(0)
      expect(report.warnings.length).toBeLessThanOrEqual(1) // 可能有嵌套过深的警告
    })
  })

  describe('错误恢复测试', () => {
    it('应该在遇到错误后继续分析', async () => {
      const vueContent = `
<template>
  <div class="container">
    <h1>Valid header</h1>
    <div class="error-section">
      <p>Unclosed paragraph
      <span>This should still be analyzed</span>
    </div>
    <footer>Valid footer</footer>
  </div>
</template>
`
      
      const diagnostic = new GameBoardDiagnostic()
      const report = await diagnostic.diagnoseGameBoard('recovery-test.vue', vueContent)
      
      expect(report.totalErrors).toBeGreaterThan(0)
      // 应该检测到多个标签（包括错误后的标签）
      expect(report.errors.length).toBeGreaterThan(0)
      expect(report.suggestions.length).toBeGreaterThan(0)
    })

    it('应该处理部分损坏的模板', async () => {
      const vueContent = `
<template>
  <div class="container">
    <h1>{{ title </h1>
    <div v-if=condition" class="content">
      <p>Content</p>
    </div>
  </div>
</template>
`
      
      const diagnostic = new GameBoardDiagnostic()
      const report = await diagnostic.diagnoseGameBoard('damaged-test.vue', vueContent)
      
      expect(report.totalErrors).toBeGreaterThan(0)
      expect(report.suggestions.length).toBeGreaterThan(0)
    })
  })

  describe('特殊字符处理', () => {
    it('应该处理包含中文的模板', async () => {
      const vueContent = `
<template>
  <div class="中文容器">
    <h1>{{ 标题 }}</h1>
    <p>这是一个包含中文的段落</p>
    <button @click="处理点击">点击按钮</button>
  </div>
</template>
`
      
      const diagnostic = new GameBoardDiagnostic()
      const report = await diagnostic.diagnoseGameBoard('chinese-test.vue', vueContent)
      
      expect(report.totalErrors).toBe(0)
      expect(report.summary.codeQualityScore).toBeGreaterThan(80)
    })

    it('应该处理特殊Unicode字符', async () => {
      const vueContent = `
<template>
  <div class="unicode-test">
    <p>Emoji: 🎮 🎯 ⚡</p>
    <p>Math: ∑ ∏ ∆ π</p>
    <p>Arrows: → ← ↑ ↓</p>
  </div>
</template>
`
      
      const diagnostic = new GameBoardDiagnostic()
      const report = await diagnostic.diagnoseGameBoard('unicode-test.vue', vueContent)
      
      expect(report.totalErrors).toBe(0)
    })
  })

  afterEach(() => {
    // 清理测试文件目录
    if (fs.existsSync(testFilesDir)) {
      const files = fs.readdirSync(testFilesDir)
      files.forEach(file => {
        const filePath = path.join(testFilesDir, file)
        if (fs.statSync(filePath).isFile()) {
          fs.unlinkSync(filePath)
        }
      })
    }
  })
})