import { describe, it, expect } from 'vitest'
import { AIEngine } from '@/utils/aiEngine'
import { GameLogic } from '@/utils/gameLogic'
import { createEmptyBoard, PieceType, AIDifficulty } from '@/types'

describe('性能测试', () => {
  describe('AI引擎性能', () => {
    it('简单难度AI应该在1秒内响应', async () => {
      const ai = new AIEngine(AIDifficulty.EASY)
      const board = createEmptyBoard(19)
      
      const startTime = Date.now()
      await ai.getBestMove(board, PieceType.BLACK)
      const endTime = Date.now()
      
      expect(endTime - startTime).toBeLessThan(1000)
    })

    it('中等难度AI应该在3秒内响应', async () => {
      const ai = new AIEngine(AIDifficulty.MEDIUM)
      const board = createEmptyBoard(19)
      
      const startTime = Date.now()
      await ai.getBestMove(board, PieceType.BLACK)
      const endTime = Date.now()
      
      expect(endTime - startTime).toBeLessThan(3000)
    })

    it('AI应该在复杂局面下保持合理性能', async () => {
      const ai = new AIEngine(AIDifficulty.MEDIUM)
      const board = createEmptyBoard(19)
      
      // 创建复杂中局
      const moves = [
        { row: 9, col: 9 }, { row: 9, col: 10 }, { row: 10, col: 9 },
        { row: 10, col: 10 }, { row: 8, col: 9 }, { row: 8, col: 10 },
        { row: 11, col: 9 }, { row: 11, col: 10 }, { row: 9, col: 8 },
        { row: 9, col: 11 }
      ]
      
      moves.forEach((move, index) => {
        board.grid[move.row][move.col] = index % 2 === 0 ? PieceType.BLACK : PieceType.WHITE
      })
      
      const startTime = Date.now()
      await ai.getBestMove(board, PieceType.BLACK)
      const endTime = Date.now()
      
      expect(endTime - startTime).toBeLessThan(5000)
    })
  })

  describe('游戏逻辑性能', () => {
    it('胜负判断应该快速执行', () => {
      const board = createEmptyBoard(19)
      
      // 创建获胜局面
      for (let i = 0; i < 5; i++) {
        board.grid[9][9 + i] = PieceType.BLACK
      }
      
      const startTime = performance.now()
      for (let i = 0; i < 1000; i++) {
        GameLogic.checkWin(board, { row: 9, col: 11 }, PieceType.BLACK)
      }
      const endTime = performance.now()
      
      const avgTime = (endTime - startTime) / 1000
      expect(avgTime).toBeLessThan(1) // 平均每次小于1毫秒
    })

    it('落子验证应该快速执行', () => {
      const board = createEmptyBoard(19)
      const player = { type: 'human' as const, piece: PieceType.BLACK, name: '玩家' }
      
      const startTime = performance.now()
      for (let i = 0; i < 10000; i++) {
        GameLogic.isValidMove(board, { row: i % 19, col: (i * 2) % 19 }, player)
      }
      const endTime = performance.now()
      
      const avgTime = (endTime - startTime) / 10000
      expect(avgTime).toBeLessThan(0.1) // 平均每次小于0.1毫秒
    })

    it('候选位置生成应该快速执行', () => {
      const board = createEmptyBoard(19)
      
      // 添加一些棋子
      board.grid[9][9] = PieceType.BLACK
      board.grid[10][10] = PieceType.WHITE
      board.grid[8][8] = PieceType.BLACK
      
      const startTime = performance.now()
      for (let i = 0; i < 1000; i++) {
        GameLogic.getCandidatePositions(board, 2)
      }
      const endTime = performance.now()
      
      const avgTime = (endTime - startTime) / 1000
      expect(avgTime).toBeLessThan(5) // 平均每次小于5毫秒
    })
  })

  describe('内存使用测试', () => {
    it('棋盘创建不应该泄露内存', () => {
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0
      
      // 创建大量棋盘
      for (let i = 0; i < 1000; i++) {
        const board = createEmptyBoard(19)
        // 模拟使用
        board.grid[0][0] = PieceType.BLACK
      }
      
      // 强制垃圾回收（如果支持）
      if (global.gc) {
        global.gc()
      }
      
      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0
      
      // 内存增长应该在合理范围内（这是一个粗略的检查）
      if (initialMemory > 0 && finalMemory > 0) {
        const memoryIncrease = finalMemory - initialMemory
        expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024) // 小于50MB
      }
    })

    it('AI搜索不应该过度消耗内存', async () => {
      const ai = new AIEngine(AIDifficulty.EASY)
      const board = createEmptyBoard(19)
      
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0
      
      // 连续执行多次AI搜索
      for (let i = 0; i < 10; i++) {
        await ai.getBestMove(board, PieceType.BLACK)
        board.grid[i][i] = PieceType.BLACK
      }
      
      if (global.gc) {
        global.gc()
      }
      
      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0
      
      if (initialMemory > 0 && finalMemory > 0) {
        const memoryIncrease = finalMemory - initialMemory
        expect(memoryIncrease).toBeLessThan(20 * 1024 * 1024) // 小于20MB
      }
    })
  })

  describe('并发性能测试', () => {
    it('应该能够处理并发的游戏逻辑操作', async () => {
      const board = createEmptyBoard(19)
      const player = { type: 'human' as const, piece: PieceType.BLACK, name: '玩家' }
      
      const promises = []
      const startTime = Date.now()
      
      // 并发执行多个操作
      for (let i = 0; i < 100; i++) {
        promises.push(Promise.resolve().then(() => {
          return GameLogic.isValidMove(board, { row: i % 19, col: (i * 2) % 19 }, player)
        }))
      }
      
      const results = await Promise.all(promises)
      const endTime = Date.now()
      
      expect(results).toHaveLength(100)
      expect(endTime - startTime).toBeLessThan(1000)
    })
  })

  describe('压力测试', () => {
    it('应该能够处理大量连续的游戏操作', () => {
      const board = createEmptyBoard(19)
      let moveCount = 0
      
      const startTime = Date.now()
      
      // 模拟大量游戏操作
      for (let i = 0; i < 10000; i++) {
        const row = Math.floor(Math.random() * 19)
        const col = Math.floor(Math.random() * 19)
        
        if (board.grid[row][col] === PieceType.EMPTY) {
          board.grid[row][col] = moveCount % 2 === 0 ? PieceType.BLACK : PieceType.WHITE
          moveCount++
          
          // 检查游戏结束
          const gameEnd = GameLogic.checkGameEnd(board, { row, col })
          if (gameEnd.isGameEnd) {
            break
          }
        }
      }
      
      const endTime = Date.now()
      
      expect(endTime - startTime).toBeLessThan(5000)
      expect(moveCount).toBeGreaterThan(0)
    })
  })
})