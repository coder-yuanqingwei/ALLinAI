import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import GameBoard from '@/components/GameBoard.vue'
import { useGameStore } from '@/stores/gameStore'
import { GameStatus, PieceType } from '@/types'

// Mock audio and effects managers
vi.mock('@/utils/audioManager', () => ({
  audioManager: {
    initializeSounds: vi.fn(),
    setEnabled: vi.fn(),
    playSound: vi.fn(),
    resumeAudioContext: vi.fn()
  }
}))

vi.mock('@/utils/effectsManager', () => ({
  effectsManager: {
    clearParticles: vi.fn(),
    animateWinLine: vi.fn(),
    createWinCelebration: vi.fn(),
    destroy: vi.fn()
  }
}))

// Mock AI Engine
vi.mock('@/utils/aiEngine', () => ({
  AIEngine: vi.fn().mockImplementation(() => ({
    getBestMove: vi.fn().mockResolvedValue({
      position: { row: 10, col: 10 },
      score: 100,
      depth: 4,
      evaluationTime: 200
    }),
    setDifficulty: vi.fn(),
    setSearchDepth: vi.fn()
  }))
}))

describe('游戏流程集成测试', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    
    // Mock DOM APIs
    Object.defineProperty(document, 'querySelector', {
      value: vi.fn().mockReturnValue({
        style: {},
        classList: {
          add: vi.fn(),
          remove: vi.fn()
        }
      }),
      writable: true
    })
    
    Object.defineProperty(document, 'querySelectorAll', {
      value: vi.fn().mockReturnValue([]),
      writable: true
    })
  })

  describe('游戏启动流程', () => {
    it('应该正确渲染游戏界面', async () => {
      const wrapper = mount(GameBoard)
      
      expect(wrapper.find('.game-board').exists()).toBe(true)
      expect(wrapper.find('.game-layout').exists()).toBe(true)
      expect(wrapper.find('.board-container').exists()).toBe(true)
    })

    it('应该显示初始游戏状态', async () => {
      const wrapper = mount(GameBoard)
      const gameStore = useGameStore()
      
      await wrapper.vm.$nextTick()
      
      expect(gameStore.gameState.gameStatus).toBe(GameStatus.PLAYING)
      expect(wrapper.find('.turn-hint').exists()).toBe(true)
    })
  })

  describe('人机对战流程', () => {
    it('应该完成一个完整的人机对战回合', async () => {
      const wrapper = mount(GameBoard)
      const gameStore = useGameStore()
      
      // 等待游戏初始化完成
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // 模拟玩家点击棋盘
      const position = { row: 9, col: 9 }
      await wrapper.vm.handlePlayerMove(position)
      
      expect(gameStore.gameState.moveHistory.length).toBeGreaterThan(0)
      expect(gameStore.gameState.board.grid[9][9]).toBe(PieceType.BLACK)
      
      // 等待AI响应
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // AI应该也完成了落子
      expect(gameStore.gameState.moveHistory.length).toBeGreaterThanOrEqual(1)
    })

    it('应该正确处理无效的落子尝试', async () => {
      const wrapper = mount(GameBoard)
      const gameStore = useGameStore()
      
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // 先在某位置落子
      await wrapper.vm.handlePlayerMove({ row: 9, col: 9 })
      
      // 尝试在同一位置再次落子
      await wrapper.vm.handlePlayerMove({ row: 9, col: 9 })
      
      // 应该显示错误信息
      expect(wrapper.vm.errorMessage).toBeTruthy()
    })
  })

  describe('游戏控制功能', () => {
    it('应该正确处理新游戏操作', async () => {
      const wrapper = mount(GameBoard)
      const gameStore = useGameStore()
      
      // 先进行一些落子
      await wrapper.vm.handlePlayerMove({ row: 9, col: 9 })
      
      const initialMoveCount = gameStore.gameState.moveHistory.length
      
      // 开始新游戏
      await wrapper.vm.handleNewGame()
      
      expect(gameStore.gameState.moveHistory.length).toBe(0)
      expect(gameStore.gameState.gameStatus).toBe(GameStatus.PLAYING)
    })

    it('应该正确处理悔棋操作', async () => {
      const wrapper = mount(GameBoard)
      const gameStore = useGameStore()
      
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // 进行一步落子
      await wrapper.vm.handlePlayerMove({ row: 9, col: 9 })
      const moveCountAfterMove = gameStore.gameState.moveHistory.length
      
      // 悔棋
      wrapper.vm.handleUndo()
      
      expect(gameStore.gameState.moveHistory.length).toBeLessThan(moveCountAfterMove)
      expect(gameStore.gameState.board.grid[9][9]).toBe(PieceType.EMPTY)
    })

    it('应该正确处理游戏暂停和恢复', async () => {
      const wrapper = mount(GameBoard)
      const gameStore = useGameStore()
      
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // 暂停游戏
      wrapper.vm.handlePauseResume()
      expect(gameStore.gameState.gameStatus).toBe(GameStatus.PAUSED)
      
      // 恢复游戏
      wrapper.vm.handlePauseResume()
      expect(gameStore.gameState.gameStatus).toBe(GameStatus.PLAYING)
    })
  })

  describe('配置更改流程', () => {
    it('应该正确处理难度更改', async () => {
      const wrapper = mount(GameBoard)
      const gameStore = useGameStore()
      
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // 更改AI难度
      await wrapper.vm.handleConfigChange({ aiDifficulty: 'hard' })
      
      expect(gameStore.gameState.config.aiDifficulty).toBe('hard')
    })

    it('应该正确处理音效设置更改', async () => {
      const wrapper = mount(GameBoard)
      const gameStore = useGameStore()
      
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // 关闭音效
      await wrapper.vm.handleConfigChange({ enableSound: false })
      
      expect(gameStore.gameState.config.enableSound).toBe(false)
    })
  })

  describe('游戏结束流程', () => {
    it('应该正确检测并处理获胜情况', async () => {
      const wrapper = mount(GameBoard)
      const gameStore = useGameStore()
      
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // 模拟获胜局面 - 手动设置游戏状态
      gameStore.gameState.gameStatus = GameStatus.HUMAN_WON
      gameStore.gameState.winner = gameStore.gameState.humanPlayer
      
      // 触发获胜检测
      await wrapper.vm.$nextTick()
      
      // 应该显示游戏结束对话框
      await new Promise(resolve => setTimeout(resolve, 1600)) // 等待延迟显示
      expect(wrapper.vm.showGameEndDialog).toBe(true)
    })

    it('应该正确显示游戏结果信息', async () => {
      const wrapper = mount(GameBoard)
      const gameStore = useGameStore()
      
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // 设置获胜状态
      gameStore.gameState.gameStatus = GameStatus.HUMAN_WON
      gameStore.gameState.winner = gameStore.gameState.humanPlayer
      
      await wrapper.vm.$nextTick()
      
      expect(wrapper.vm.gameEndTitle).toBe('恭喜获胜！')
      expect(wrapper.vm.gameEndMessage).toBe('您成功击败了AI！')
    })
  })

  describe('用户界面交互', () => {
    it('应该正确响应棋盘悬停事件', async () => {
      const wrapper = mount(GameBoard)
      
      await new Promise(resolve => setTimeout(resolve, 100))
      
      const position = { row: 5, col: 5 }
      wrapper.vm.handleCellHover(position)
      
      expect(wrapper.vm.hoveredCell).toEqual(position)
    })

    it('应该正确处理棋盘离开事件', async () => {
      const wrapper = mount(GameBoard)
      
      await new Promise(resolve => setTimeout(resolve, 100))
      
      wrapper.vm.handleCellHover({ row: 5, col: 5 })
      wrapper.vm.handleCellLeave({ row: 5, col: 5 })
      
      expect(wrapper.vm.hoveredCell).toBeNull()
    })

    it('应该正确格式化位置显示', async () => {
      const wrapper = mount(GameBoard)
      
      const formatted = wrapper.vm.formatPosition({ row: 0, col: 0 })
      expect(formatted).toBe('A19')
      
      const formatted2 = wrapper.vm.formatPosition({ row: 18, col: 18 })
      expect(formatted2).toBe('S1')
    })

    it('应该正确格式化时间显示', async () => {
      const wrapper = mount(GameBoard)
      
      expect(wrapper.vm.formatTime(65)).toBe('01:05')
      expect(wrapper.vm.formatTime(3661)).toBe('61:01')
    })
  })

  describe('错误处理和提示', () => {
    it('应该显示和清除错误信息', async () => {
      const wrapper = mount(GameBoard)
      
      wrapper.vm.showError('测试错误信息')
      expect(wrapper.vm.errorMessage).toBe('测试错误信息')
      
      wrapper.vm.clearError()
      expect(wrapper.vm.errorMessage).toBe('')
    })

    it('应该自动清除错误信息', async () => {
      const wrapper = mount(GameBoard)
      
      wrapper.vm.showError('测试错误信息')
      expect(wrapper.vm.errorMessage).toBe('测试错误信息')
      
      // 等待自动清除
      await new Promise(resolve => setTimeout(resolve, 3100))
      expect(wrapper.vm.errorMessage).toBe('')
    })
  })

  describe('响应式行为', () => {
    it('应该根据游戏状态禁用棋盘', async () => {
      const wrapper = mount(GameBoard)
      const gameStore = useGameStore()
      
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // 正常游戏状态下应该可用
      expect(wrapper.vm.isGameDisabled).toBe(false)
      
      // 暂停状态下应该被禁用
      gameStore.gameState.gameStatus = GameStatus.PAUSED
      await wrapper.vm.$nextTick()
      expect(wrapper.vm.isGameDisabled).toBe(true)
      
      // AI思考时应该被禁用
      gameStore.gameState.gameStatus = GameStatus.PLAYING
      gameStore.isAIThinking = true
      await wrapper.vm.$nextTick()
      expect(wrapper.vm.isGameDisabled).toBe(true)
    })

    it('应该正确显示当前玩家指示器', async () => {
      const wrapper = mount(GameBoard)
      const gameStore = useGameStore()
      
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // 人类玩家回合
      expect(wrapper.vm.playerIndicatorClasses).toContain('player-piece--black')
      
      // AI回合
      gameStore.gameState.currentPlayer = gameStore.gameState.aiPlayer
      await wrapper.vm.$nextTick()
      expect(wrapper.vm.playerIndicatorClasses).toContain('player-piece--white')
    })
  })

  describe('导出功能', () => {
    it('应该正确处理游戏导出', async () => {
      const wrapper = mount(GameBoard)
      
      // Mock URL.createObjectURL 和相关DOM API
      const mockCreateObjectURL = vi.fn().mockReturnValue('blob:mock-url')
      const mockRevokeObjectURL = vi.fn()
      global.URL.createObjectURL = mockCreateObjectURL
      global.URL.revokeObjectURL = mockRevokeObjectURL
      
      const mockClick = vi.fn()
      const mockLink = {
        href: '',
        download: '',
        click: mockClick
      }
      vi.spyOn(document, 'createElement').mockReturnValue(mockLink as any)
      
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // 进行一些落子以产生数据
      await wrapper.vm.handlePlayerMove({ row: 9, col: 9 })
      
      // 执行导出
      wrapper.vm.handleExportGame()
      
      expect(mockCreateObjectURL).toHaveBeenCalled()
      expect(mockClick).toHaveBeenCalled()
      expect(mockRevokeObjectURL).toHaveBeenCalled()
    })
  })
})