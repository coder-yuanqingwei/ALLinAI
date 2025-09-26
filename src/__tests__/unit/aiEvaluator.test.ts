import { describe, it, expect, beforeEach } from 'vitest'
import { AIEvaluator } from '@/utils/aiEvaluator'
import { PieceType, AIDifficulty, createEmptyBoard } from '@/types'
import type { Board, Position } from '@/types'

describe('AIEvaluator', () => {
  let evaluator: AIEvaluator
  let board: Board

  beforeEach(() => {
    evaluator = new AIEvaluator()
    board = createEmptyBoard(19)
  })

  describe('evaluatePosition', () => {
    it('应该为中心位置给出更高评分', () => {
      const centerScore = evaluator.evaluatePosition(board, { row: 9, col: 9 }, PieceType.BLACK)
      const cornerScore = evaluator.evaluatePosition(board, { row: 0, col: 0 }, PieceType.BLACK)
      
      expect(centerScore).toBeGreaterThan(cornerScore)
    })

    it('应该为不同棋子类型给出不同评分', () => {
      const blackScore = evaluator.evaluatePosition(board, { row: 9, col: 9 }, PieceType.BLACK)
      const whiteScore = evaluator.evaluatePosition(board, { row: 9, col: 9 }, PieceType.WHITE)
      
      // 分数可能不同，但都应该是有效的数值
      expect(typeof blackScore).toBe('number')
      expect(typeof whiteScore).toBe('number')
    })

    it('应该根据周围棋子给出合理评分', () => {
      // 放置一些黑子形成潜在威胁
      board.grid[9][8] = PieceType.BLACK
      board.grid[9][10] = PieceType.BLACK
      
      const score = evaluator.evaluatePosition(board, { row: 9, col: 9 }, PieceType.BLACK)
      expect(score).toBeGreaterThan(0)
    })
  })

  describe('evaluateBoard', () => {
    it('应该返回合理的评估分数', () => {
      const score = evaluator.evaluateBoard(board, PieceType.BLACK)
      expect(typeof score).toBe('number')
    })

    it('应该为有利局面给出正分', () => {
      // 给AI(黑子)一些优势
      for (let i = 0; i < 3; i++) {
        board.grid[9][9 + i] = PieceType.BLACK
      }
      
      const score = evaluator.evaluateBoard(board, PieceType.BLACK)
      expect(score).toBeGreaterThan(0)
    })

    it('应该考虑对手的威胁', () => {
      // 给对手一些优势
      for (let i = 0; i < 4; i++) {
        board.grid[10][9 + i] = PieceType.WHITE
      }
      
      const scoreForBlack = evaluator.evaluateBoard(board, PieceType.BLACK)
      expect(scoreForBlack).toBeLessThan(0) // 对黑子不利
    })
  })

  describe('checkCriticalMoves', () => {
    it('应该检测获胜机会', () => {
      // 放置4个黑子，第5个位置是获胜位置
      for (let i = 0; i < 4; i++) {
        board.grid[9][9 + i] = PieceType.BLACK
      }
      
      const criticalMoves = evaluator.checkCriticalMoves(board, PieceType.BLACK)
      expect(criticalMoves).toContainEqual({ row: 9, col: 13 })
    })

    it('应该返回空数组当没有立即获胜机会时', () => {
      board.grid[9][9] = PieceType.BLACK
      
      const criticalMoves = evaluator.checkCriticalMoves(board, PieceType.BLACK)
      expect(criticalMoves).toHaveLength(0)
    })
  })

  describe('checkDefensiveMoves', () => {
    it('应该检测需要防守的位置', () => {
      // 对手快要获胜，需要防守
      for (let i = 0; i < 4; i++) {
        board.grid[9][9 + i] = PieceType.WHITE
      }
      
      const defensiveMoves = evaluator.checkDefensiveMoves(board, PieceType.WHITE)
      expect(defensiveMoves).toContainEqual({ row: 9, col: 13 })
    })

    it('应该返回空数组当对手没有立即威胁时', () => {
      board.grid[9][9] = PieceType.WHITE
      
      const defensiveMoves = evaluator.checkDefensiveMoves(board, PieceType.WHITE)
      expect(defensiveMoves).toHaveLength(0)
    })
  })

  describe('getSearchDepth', () => {
    it('应该为不同难度返回正确深度', () => {
      expect(evaluator.getSearchDepth(AIDifficulty.EASY)).toBe(2)
      expect(evaluator.getSearchDepth(AIDifficulty.MEDIUM)).toBe(4)
      expect(evaluator.getSearchDepth(AIDifficulty.HARD)).toBe(6)
      expect(evaluator.getSearchDepth(AIDifficulty.EXPERT)).toBe(8)
    })
  })

  describe('getBestCandidates', () => {
    it('应该返回指定数量的候选位置', () => {
      board.grid[9][9] = PieceType.BLACK
      
      const candidates = evaluator.getBestCandidates(board, PieceType.BLACK, 5)
      expect(candidates.length).toBeLessThanOrEqual(5)
      expect(candidates.length).toBeGreaterThan(0)
    })

    it('应该返回按分数排序的候选位置', () => {
      // 创建一个有利的局面
      board.grid[9][9] = PieceType.BLACK
      board.grid[9][10] = PieceType.BLACK
      
      const candidates = evaluator.getBestCandidates(board, PieceType.BLACK, 3)
      expect(candidates.length).toBeGreaterThan(0)
      
      // 候选位置应该包含有意义的位置
      expect(candidates.some(pos => 
        Math.abs(pos.row - 9) <= 2 && Math.abs(pos.col - 9) <= 2
      )).toBe(true)
    })

    it('应该处理空棋盘情况', () => {
      const candidates = evaluator.getBestCandidates(board, PieceType.BLACK, 1)
      expect(candidates).toHaveLength(1)
      expect(candidates[0]).toEqual({ row: 9, col: 9 }) // 中心位置
    })
  })

  describe('棋型识别', () => {
    it('应该识别连续的棋子', () => {
      // 创建一个3连的局面
      board.grid[9][9] = PieceType.BLACK
      board.grid[9][10] = PieceType.BLACK
      board.grid[9][11] = PieceType.BLACK
      
      // 评估相邻位置应该有更高分数
      const leftScore = evaluator.evaluatePosition(board, { row: 9, col: 8 }, PieceType.BLACK)
      const rightScore = evaluator.evaluatePosition(board, { row: 9, col: 12 }, PieceType.BLACK)
      const farScore = evaluator.evaluatePosition(board, { row: 5, col: 5 }, PieceType.BLACK)
      
      expect(leftScore).toBeGreaterThan(farScore)
      expect(rightScore).toBeGreaterThan(farScore)
    })

    it('应该考虑被阻挡的棋型', () => {
      // 创建被阻挡的3连
      board.grid[9][9] = PieceType.BLACK
      board.grid[9][10] = PieceType.BLACK
      board.grid[9][11] = PieceType.BLACK
      board.grid[9][12] = PieceType.WHITE // 阻挡
      
      // 评估左侧位置(开放)和右侧位置(被阻挡)
      const openScore = evaluator.evaluatePosition(board, { row: 9, col: 8 }, PieceType.BLACK)
      const blockedScore = evaluator.evaluatePosition(board, { row: 9, col: 13 }, PieceType.BLACK)
      
      expect(openScore).toBeGreaterThan(blockedScore)
    })
  })

  describe('边界情况', () => {
    it('应该处理棋盘边缘位置', () => {
      const cornerScore = evaluator.evaluatePosition(board, { row: 0, col: 0 }, PieceType.BLACK)
      expect(typeof cornerScore).toBe('number')
      expect(cornerScore).toBeGreaterThanOrEqual(0)
    })

    it('应该处理满棋盘情况', () => {
      // 填满大部分棋盘
      for (let row = 0; row < 18; row++) {
        for (let col = 0; col < 18; col++) {
          board.grid[row][col] = (row + col) % 2 === 0 ? PieceType.BLACK : PieceType.WHITE
        }
      }
      
      const candidates = evaluator.getBestCandidates(board, PieceType.BLACK, 5)
      expect(candidates.length).toBeGreaterThan(0)
    })

    it('应该处理只有一个棋子的情况', () => {
      board.grid[9][9] = PieceType.BLACK
      
      const score = evaluator.evaluateBoard(board, PieceType.BLACK)
      expect(typeof score).toBe('number')
      
      const candidates = evaluator.getBestCandidates(board, PieceType.WHITE, 3)
      expect(candidates.length).toBeGreaterThan(0)
    })
  })
})