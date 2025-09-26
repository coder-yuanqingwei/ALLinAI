import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AIEngine } from '@/utils/aiEngine'
import { PieceType, AIDifficulty, createEmptyBoard } from '@/types'
import type { Board } from '@/types'

describe('AIEngine', () => {
  let aiEngine: AIEngine
  let board: Board

  beforeEach(() => {
    aiEngine = new AIEngine(AIDifficulty.MEDIUM)
    board = createEmptyBoard(19)
  })

  describe('构造函数', () => {
    it('应该正确初始化AI引擎', () => {
      expect(aiEngine).toBeDefined()
    })

    it('应该接受不同的难度设置', () => {
      const easyAI = new AIEngine(AIDifficulty.EASY)
      const hardAI = new AIEngine(AIDifficulty.HARD)
      
      expect(easyAI).toBeDefined()
      expect(hardAI).toBeDefined()
    })
  })

  describe('getBestMove', () => {
    it('应该为空棋盘返回中心位置', async () => {
      const result = await aiEngine.getBestMove(board, PieceType.BLACK)
      
      expect(result.position).toEqual({ row: 9, col: 9 })
      expect(result.score).toBeDefined()
      expect(result.depth).toBeGreaterThan(0)
      expect(result.evaluationTime).toBeGreaterThan(0)
    })

    it('应该在合理时间内返回结果', async () => {
      const startTime = Date.now()
      const result = await aiEngine.getBestMove(board, PieceType.BLACK)
      const endTime = Date.now()
      
      expect(endTime - startTime).toBeLessThan(5000) // 5秒内完成
      expect(result.evaluationTime).toBeLessThan(5000)
    })

    it('应该检测立即获胜的机会', async () => {
      // 设置一个可以立即获胜的局面
      for (let i = 0; i < 4; i++) {
        board.grid[9][9 + i] = PieceType.BLACK
      }
      
      const result = await aiEngine.getBestMove(board, PieceType.BLACK)
      
      // 应该选择获胜位置
      expect(result.position).toEqual({ row: 9, col: 13 })
      expect(result.score).toBeGreaterThan(90000) // 高分表示获胜
    })

    it('应该检测需要防守的位置', async () => {
      // 设置对手快要获胜的局面
      for (let i = 0; i < 4; i++) {
        board.grid[9][9 + i] = PieceType.WHITE
      }
      
      const result = await aiEngine.getBestMove(board, PieceType.BLACK)
      
      // 应该选择防守位置
      expect(result.position).toEqual({ row: 9, col: 13 })
      expect(result.score).toBeGreaterThan(80000) // 高分表示重要防守
    })

    it('应该为不同颜色的棋子返回合理结果', async () => {
      board.grid[9][9] = PieceType.BLACK
      
      const blackResult = await aiEngine.getBestMove(board, PieceType.BLACK)
      const whiteResult = await aiEngine.getBestMove(board, PieceType.WHITE)
      
      expect(blackResult.position).toBeDefined()
      expect(whiteResult.position).toBeDefined()
      
      // 位置应该在棋盘范围内
      expect(blackResult.position.row).toBeGreaterThanOrEqual(0)
      expect(blackResult.position.row).toBeLessThan(19)
      expect(blackResult.position.col).toBeGreaterThanOrEqual(0)
      expect(blackResult.position.col).toBeLessThan(19)
    })
  })

  describe('setSearchDepth', () => {
    it('应该正确设置搜索深度', () => {
      aiEngine.setSearchDepth(6)
      // 我们无法直接验证深度设置，但可以通过调用来确保没有错误
      expect(() => aiEngine.setSearchDepth(6)).not.toThrow()
    })

    it('应该限制搜索深度在合理范围内', () => {
      aiEngine.setSearchDepth(-1) // 应该被限制为最小值
      aiEngine.setSearchDepth(20) // 应该被限制为最大值
      
      expect(() => aiEngine.setSearchDepth(-1)).not.toThrow()
      expect(() => aiEngine.setSearchDepth(20)).not.toThrow()
    })
  })

  describe('setDifficulty', () => {
    it('应该正确设置难度', () => {
      expect(() => aiEngine.setDifficulty(AIDifficulty.EASY)).not.toThrow()
      expect(() => aiEngine.setDifficulty(AIDifficulty.HARD)).not.toThrow()
    })
  })

  describe('getIterativeDeepeningMove', () => {
    it('应该在指定时间内返回结果', async () => {
      const maxTime = 1000 // 1秒
      const startTime = Date.now()
      
      const result = await aiEngine.getIterativeDeepeningMove(board, PieceType.BLACK, maxTime)
      const endTime = Date.now()
      
      expect(endTime - startTime).toBeLessThanOrEqual(maxTime + 500) // 允许一些误差
      expect(result.position).toBeDefined()
    })

    it('应该返回有效的评估结果', async () => {
      const result = await aiEngine.getIterativeDeepeningMove(board, PieceType.BLACK, 500)
      
      expect(result.position).toBeDefined()
      expect(result.score).toBeDefined()
      expect(result.depth).toBeGreaterThan(0)
      expect(result.evaluationTime).toBeGreaterThan(0)
    })
  })

  describe('搜索统计', () => {
    it('应该正确记录搜索统计', async () => {
      await aiEngine.getBestMove(board, PieceType.BLACK)
      
      const stats = aiEngine.getSearchStats()
      expect(stats.nodesSearched).toBeGreaterThan(0)
      expect(stats.searchTime).toBeGreaterThan(0)
      expect(stats.nodesPerSecond).toBeGreaterThan(0)
    })

    it('应该能够重置统计', () => {
      aiEngine.resetStats()
      const stats = aiEngine.getSearchStats()
      
      expect(stats.nodesSearched).toBe(0)
      expect(stats.searchTime).toBe(0)
    })
  })

  describe('复杂局面测试', () => {
    it('应该处理复杂的中局局面', async () => {
      // 创建一个复杂的中局局面
      const moves = [
        { row: 9, col: 9, piece: PieceType.BLACK },
        { row: 9, col: 10, piece: PieceType.WHITE },
        { row: 10, col: 9, piece: PieceType.BLACK },
        { row: 10, col: 10, piece: PieceType.WHITE },
        { row: 8, col: 9, piece: PieceType.BLACK },
        { row: 8, col: 10, piece: PieceType.WHITE },
      ]
      
      moves.forEach(move => {
        board.grid[move.row][move.col] = move.piece
      })
      
      const result = await aiEngine.getBestMove(board, PieceType.BLACK)
      
      expect(result.position).toBeDefined()
      expect(result.position.row).toBeGreaterThanOrEqual(0)
      expect(result.position.row).toBeLessThan(19)
      expect(result.position.col).toBeGreaterThanOrEqual(0)
      expect(result.position.col).toBeLessThan(19)
    })

    it('应该避免明显的失误', async () => {
      // 创建一个对手快要三连的局面
      board.grid[9][9] = PieceType.WHITE
      board.grid[9][10] = PieceType.WHITE
      // 如果AI不在(9,8)或(9,11)防守，对手下一步就能威胁
      
      const result = await aiEngine.getBestMove(board, PieceType.BLACK)
      
      // AI应该选择一个合理的位置，通常在对手棋子附近
      const isReasonable = Math.abs(result.position.row - 9) <= 2 && 
                          Math.abs(result.position.col - 9) <= 2
      expect(isReasonable).toBe(true)
    })
  })

  describe('性能测试', () => {
    it('简单难度应该快速响应', async () => {
      const easyAI = new AIEngine(AIDifficulty.EASY)
      const startTime = Date.now()
      
      await easyAI.getBestMove(board, PieceType.BLACK)
      const endTime = Date.now()
      
      expect(endTime - startTime).toBeLessThan(1000) // 1秒内
    })

    it('应该在不同难度下给出不同质量的结果', async () => {
      const easyAI = new AIEngine(AIDifficulty.EASY)
      const hardAI = new AIEngine(AIDifficulty.HARD)
      
      // 创建一个有最优解的局面
      board.grid[9][9] = PieceType.BLACK
      board.grid[9][10] = PieceType.BLACK
      board.grid[9][11] = PieceType.BLACK
      
      const easyResult = await easyAI.getBestMove(board, PieceType.BLACK)
      const hardResult = await hardAI.getBestMove(board, PieceType.BLACK)
      
      // 困难AI应该花费更多时间思考
      expect(hardResult.evaluationTime).toBeGreaterThan(easyResult.evaluationTime)
      
      // 两者都应该找到合理的位置
      expect(easyResult.position).toBeDefined()
      expect(hardResult.position).toBeDefined()
    })
  })

  describe('边界情况', () => {
    it('应该处理接近满棋盘的情况', async () => {
      // 填满大部分棋盘，只留少量空位
      for (let row = 0; row < 19; row++) {
        for (let col = 0; col < 19; col++) {
          if (row < 17 || col < 17) {
            board.grid[row][col] = (row + col) % 2 === 0 ? PieceType.BLACK : PieceType.WHITE
          }
        }
      }
      
      const result = await aiEngine.getBestMove(board, PieceType.BLACK)
      
      expect(result.position).toBeDefined()
      // 应该选择剩余的空位之一
      expect(board.grid[result.position.row][result.position.col]).toBe(PieceType.EMPTY)
    })

    it('应该处理只有一个空位的情况', async () => {
      // 填满棋盘，只留一个空位
      for (let row = 0; row < 19; row++) {
        for (let col = 0; col < 19; col++) {
          board.grid[row][col] = (row + col) % 2 === 0 ? PieceType.BLACK : PieceType.WHITE
        }
      }
      board.grid[18][18] = PieceType.EMPTY
      
      const result = await aiEngine.getBestMove(board, PieceType.BLACK)
      
      expect(result.position).toEqual({ row: 18, col: 18 })
    })
  })
})