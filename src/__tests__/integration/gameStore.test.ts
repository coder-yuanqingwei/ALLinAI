import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useGameStore } from '@/stores/gameStore'
import { GameStatus, PieceType, AIDifficulty } from '@/types'

// Mock AI引擎
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

describe('GameStore Integration', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('游戏初始化', () => {
    it('应该正确初始化游戏状态', async () => {
      const gameStore = useGameStore()
      
      await gameStore.startNewGame()
      
      expect(gameStore.gameState.gameStatus).toBe(GameStatus.PLAYING)
      expect(gameStore.gameState.currentPlayer.piece).toBe(PieceType.BLACK)
      expect(gameStore.gameState.moveHistory).toHaveLength(0)
      expect(gameStore.gameState.startTime).toBeGreaterThan(0)
    })

    it('应该使用自定义配置初始化游戏', async () => {
      const gameStore = useGameStore()
      
      await gameStore.startNewGame({
        boardSize: 13,
        aiDifficulty: AIDifficulty.HARD
      })
      
      expect(gameStore.gameState.config.boardSize).toBe(13)
      expect(gameStore.gameState.config.aiDifficulty).toBe(AIDifficulty.HARD)
      expect(gameStore.gameState.board.size).toBe(13)
    })
  })

  describe('玩家落子流程', () => {
    it('应该正确处理有效的玩家落子', async () => {
      const gameStore = useGameStore()
      await gameStore.startNewGame()
      
      const success = await gameStore.makeMove({ row: 9, col: 9 })
      
      expect(success).toBe(true)
      expect(gameStore.gameState.board.grid[9][9]).toBe(PieceType.BLACK)
      expect(gameStore.gameState.moveHistory).toHaveLength(1)
      expect(gameStore.gameState.currentPlayer.piece).toBe(PieceType.WHITE) // 应该切换到AI
    })

    it('应该拒绝无效的落子', async () => {
      const gameStore = useGameStore()
      await gameStore.startNewGame()
      
      // 先在位置落子
      await gameStore.makeMove({ row: 9, col: 9 })
      
      // 尝试在同一位置再次落子
      const success = await gameStore.makeMove({ row: 9, col: 9 })
      
      expect(success).toBe(false)
      expect(gameStore.gameState.moveHistory).toHaveLength(1) // 只有第一次落子成功
    })

    it('应该拒绝超出棋盘范围的落子', async () => {
      const gameStore = useGameStore()
      await gameStore.startNewGame()
      
      const success = await gameStore.makeMove({ row: 19, col: 19 })
      
      expect(success).toBe(false)
      expect(gameStore.gameState.moveHistory).toHaveLength(0)
    })
  })

  describe('AI落子流程', () => {
    it('应该在玩家落子后触发AI落子', async () => {
      const gameStore = useGameStore()
      await gameStore.startNewGame()
      
      await gameStore.makeMove({ row: 9, col: 9 })
      
      // 等待AI完成思考
      await new Promise(resolve => setTimeout(resolve, 100))
      
      expect(gameStore.gameState.moveHistory).toHaveLength(2) // 玩家 + AI
      expect(gameStore.gameState.currentPlayer.piece).toBe(PieceType.BLACK) // 回到玩家回合
    })

    it('应该在AI先手时立即开始AI落子', async () => {
      const gameStore = useGameStore()
      
      // 设置AI先手
      gameStore.gameState.currentPlayer = gameStore.gameState.aiPlayer
      await gameStore.startNewGame()
      
      // 等待AI完成思考
      await new Promise(resolve => setTimeout(resolve, 100))
      
      expect(gameStore.gameState.moveHistory).toHaveLength(1)
      expect(gameStore.gameState.currentPlayer.piece).toBe(PieceType.BLACK) // 切换到玩家
    })
  })

  describe('游戏状态管理', () => {
    it('应该正确处理游戏暂停和恢复', async () => {
      const gameStore = useGameStore()
      await gameStore.startNewGame()
      
      gameStore.pauseGame()
      expect(gameStore.gameState.gameStatus).toBe(GameStatus.PAUSED)
      
      gameStore.resumeGame()
      expect(gameStore.gameState.gameStatus).toBe(GameStatus.PLAYING)
    })

    it('应该正确处理悔棋操作', async () => {
      const gameStore = useGameStore()
      await gameStore.startNewGame()
      
      await gameStore.makeMove({ row: 9, col: 9 })
      expect(gameStore.canUndo).toBe(true)
      
      gameStore.undoMove()
      expect(gameStore.gameState.moveHistory).toHaveLength(0)
      expect(gameStore.gameState.board.grid[9][9]).toBe(PieceType.EMPTY)
    })

    it('应该阻止在无棋可悔时进行悔棋', async () => {
      const gameStore = useGameStore()
      await gameStore.startNewGame()
      
      expect(gameStore.canUndo).toBe(false)
      
      gameStore.undoMove() // 应该没有效果
      expect(gameStore.gameState.moveHistory).toHaveLength(0)
    })
  })

  describe('配置更新', () => {
    it('应该正确更新游戏配置', async () => {
      const gameStore = useGameStore()
      await gameStore.startNewGame()
      
      gameStore.updateConfig({
        enableSound: false,
        timeLimit: 60
      })
      
      expect(gameStore.gameState.config.enableSound).toBe(false)
      expect(gameStore.gameState.config.timeLimit).toBe(60)
    })

    it('应该在更新AI难度时重新配置AI引擎', async () => {
      const gameStore = useGameStore()
      await gameStore.startNewGame()
      
      gameStore.updateConfig({
        aiDifficulty: AIDifficulty.EXPERT
      })
      
      expect(gameStore.gameState.config.aiDifficulty).toBe(AIDifficulty.EXPERT)
    })
  })

  describe('计算属性', () => {
    it('isGameOver 应该正确检测游戏结束状态', async () => {
      const gameStore = useGameStore()
      await gameStore.startNewGame()
      
      expect(gameStore.isGameOver).toBe(false)
      
      // 模拟游戏结束
      gameStore.gameState.gameStatus = GameStatus.HUMAN_WON
      expect(gameStore.isGameOver).toBe(true)
    })

    it('currentGameTime 应该正确计算游戏时间', async () => {
      const gameStore = useGameStore()
      await gameStore.startNewGame()
      
      // 等待一小段时间
      await new Promise(resolve => setTimeout(resolve, 50))
      
      expect(gameStore.currentGameTime).toBeGreaterThan(0)
    })

    it('isCurrentPlayerAI 应该正确检测当前玩家类型', async () => {
      const gameStore = useGameStore()
      await gameStore.startNewGame()
      
      expect(gameStore.isCurrentPlayerAI).toBe(false) // 人类先手
      
      // 切换到AI回合
      gameStore.gameState.currentPlayer = gameStore.gameState.aiPlayer
      expect(gameStore.isCurrentPlayerAI).toBe(true)
    })
  })

  describe('统计数据', () => {
    it('应该正确更新游戏统计', async () => {
      const gameStore = useGameStore()
      
      const initialStats = { ...gameStore.gameStats }
      
      // 模拟完成一局游戏
      await gameStore.startNewGame()
      gameStore.gameState.gameStatus = GameStatus.HUMAN_WON
      
      // 统计应该被更新
      expect(gameStore.gameStats.totalGames).toBeGreaterThan(initialStats.totalGames)
    })
  })

  describe('错误处理', () => {
    it('应该处理AI引擎错误', async () => {
      const gameStore = useGameStore()
      
      // Mock AI引擎抛出错误
      const mockError = new Error('AI引擎错误')
      vi.mocked(gameStore.aiEngine.getBestMove).mockRejectedValueOnce(mockError)
      
      await gameStore.startNewGame()
      await gameStore.makeMove({ row: 9, col: 9 })
      
      // 游戏应该继续，AI应该选择一个随机位置
      expect(gameStore.gameState.gameStatus).toBe(GameStatus.PLAYING)
    })

    it('应该处理无效的游戏状态', async () => {
      const gameStore = useGameStore()
      
      // 尝试在游戏未开始时落子
      gameStore.gameState.gameStatus = GameStatus.READY
      const success = await gameStore.makeMove({ row: 9, col: 9 })
      
      expect(success).toBe(false)
    })
  })

  describe('边界情况', () => {
    it('应该处理满棋盘情况', async () => {
      const gameStore = useGameStore()
      await gameStore.startNewGame({ boardSize: 3 }) // 使用小棋盘便于测试
      
      // 填满棋盘（除了最后一个位置）
      const moves = [
        { row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 },
        { row: 1, col: 0 }, { row: 1, col: 1 }, { row: 1, col: 2 },
        { row: 2, col: 0 }, { row: 2, col: 1 }
      ]
      
      for (const move of moves) {
        await gameStore.makeMove(move)
      }
      
      // 最后一步应该导致平局或游戏结束
      await gameStore.makeMove({ row: 2, col: 2 })
      
      expect(gameStore.isGameOver).toBe(true)
    })

    it('应该处理快速连续操作', async () => {
      const gameStore = useGameStore()
      await gameStore.startNewGame()
      
      // 快速连续落子
      const promises = [
        gameStore.makeMove({ row: 9, col: 9 }),
        gameStore.makeMove({ row: 9, col: 10 }),
        gameStore.makeMove({ row: 9, col: 11 })
      ]
      
      const results = await Promise.all(promises)
      
      // 应该只有第一个成功（其他被AI思考阻挡或位置冲突）
      expect(results.filter(r => r).length).toBeLessThanOrEqual(1)
    })
  })
})