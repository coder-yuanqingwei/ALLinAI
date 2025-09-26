import { describe, it, expect, beforeEach } from 'vitest'
import { GameLogic } from '@/utils/gameLogic'
import { PieceType, createEmptyBoard, createDefaultPlayers } from '@/types'
import type { Board, Position } from '@/types'

describe('GameLogic', () => {
  let board: Board
  const { human, ai } = createDefaultPlayers()

  beforeEach(() => {
    board = createEmptyBoard(19)
  })

  describe('isValidPosition', () => {
    it('应该返回true对于有效位置', () => {
      expect(GameLogic.isValidPosition({ row: 0, col: 0 }, 19)).toBe(true)
      expect(GameLogic.isValidPosition({ row: 18, col: 18 }, 19)).toBe(true)
      expect(GameLogic.isValidPosition({ row: 9, col: 9 }, 19)).toBe(true)
    })

    it('应该返回false对于无效位置', () => {
      expect(GameLogic.isValidPosition({ row: -1, col: 0 }, 19)).toBe(false)
      expect(GameLogic.isValidPosition({ row: 0, col: -1 }, 19)).toBe(false)
      expect(GameLogic.isValidPosition({ row: 19, col: 0 }, 19)).toBe(false)
      expect(GameLogic.isValidPosition({ row: 0, col: 19 }, 19)).toBe(false)
    })
  })

  describe('isEmptyPosition', () => {
    it('应该返回true对于空位置', () => {
      expect(GameLogic.isEmptyPosition(board, { row: 0, col: 0 })).toBe(true)
    })

    it('应该返回false对于已占用位置', () => {
      board.grid[0][0] = PieceType.BLACK
      expect(GameLogic.isEmptyPosition(board, { row: 0, col: 0 })).toBe(false)
    })

    it('应该返回false对于无效位置', () => {
      expect(GameLogic.isEmptyPosition(board, { row: -1, col: 0 })).toBe(false)
    })
  })

  describe('isValidMove', () => {
    it('应该允许在空位置落子', () => {
      const result = GameLogic.isValidMove(board, { row: 9, col: 9 }, human)
      expect(result.valid).toBe(true)
    })

    it('应该拒绝在已占用位置落子', () => {
      board.grid[9][9] = PieceType.BLACK
      const result = GameLogic.isValidMove(board, { row: 9, col: 9 }, human)
      expect(result.valid).toBe(false)
      expect(result.reason).toBe('该位置已有棋子')
    })

    it('应该拒绝超出棋盘范围的落子', () => {
      const result = GameLogic.isValidMove(board, { row: 19, col: 19 }, human)
      expect(result.valid).toBe(false)
      expect(result.reason).toBe('位置超出棋盘范围')
    })
  })

  describe('makeMove', () => {
    it('应该在指定位置放置棋子', () => {
      const position: Position = { row: 9, col: 9 }
      const newBoard = GameLogic.makeMove(board, position, PieceType.BLACK)
      
      expect(newBoard.grid[9][9]).toBe(PieceType.BLACK)
      expect(newBoard.lastMove).toEqual(position)
    })

    it('应该不修改原始棋盘', () => {
      const position: Position = { row: 9, col: 9 }
      GameLogic.makeMove(board, position, PieceType.BLACK)
      
      expect(board.grid[9][9]).toBe(PieceType.EMPTY)
      expect(board.lastMove).toBeNull()
    })
  })

  describe('checkWin', () => {
    it('应该检测水平五子连珠', () => {
      // 水平放置5个黑子
      for (let i = 0; i < 5; i++) {
        board.grid[9][9 + i] = PieceType.BLACK
      }
      
      const winLine = GameLogic.checkWin(board, { row: 9, col: 11 }, PieceType.BLACK)
      expect(winLine).not.toBeNull()
      expect(winLine?.positions).toHaveLength(5)
    })

    it('应该检测垂直五子连珠', () => {
      // 垂直放置5个黑子
      for (let i = 0; i < 5; i++) {
        board.grid[9 + i][9] = PieceType.BLACK
      }
      
      const winLine = GameLogic.checkWin(board, { row: 11, col: 9 }, PieceType.BLACK)
      expect(winLine).not.toBeNull()
      expect(winLine?.positions).toHaveLength(5)
    })

    it('应该检测主对角线五子连珠', () => {
      // 主对角线放置5个黑子
      for (let i = 0; i < 5; i++) {
        board.grid[9 + i][9 + i] = PieceType.BLACK
      }
      
      const winLine = GameLogic.checkWin(board, { row: 11, col: 11 }, PieceType.BLACK)
      expect(winLine).not.toBeNull()
      expect(winLine?.positions).toHaveLength(5)
    })

    it('应该检测副对角线五子连珠', () => {
      // 副对角线放置5个黑子
      for (let i = 0; i < 5; i++) {
        board.grid[9 + i][13 - i] = PieceType.BLACK
      }
      
      const winLine = GameLogic.checkWin(board, { row: 11, col: 11 }, PieceType.BLACK)
      expect(winLine).not.toBeNull()
      expect(winLine?.positions).toHaveLength(5)
    })

    it('应该返回null当没有获胜时', () => {
      // 放置4个黑子
      for (let i = 0; i < 4; i++) {
        board.grid[9][9 + i] = PieceType.BLACK
      }
      
      const winLine = GameLogic.checkWin(board, { row: 9, col: 11 }, PieceType.BLACK)
      expect(winLine).toBeNull()
    })

    it('应该不检测超过5子的连珠', () => {
      // 放置6个黑子
      for (let i = 0; i < 6; i++) {
        board.grid[9][9 + i] = PieceType.BLACK
      }
      
      const winLine = GameLogic.checkWin(board, { row: 9, col: 11 }, PieceType.BLACK)
      expect(winLine).not.toBeNull()
      expect(winLine?.positions).toHaveLength(6) // 应该包含所有连续的棋子
    })
  })

  describe('checkDraw', () => {
    it('应该返回false当棋盘未满时', () => {
      expect(GameLogic.checkDraw(board)).toBe(false)
    })

    it('应该返回true当棋盘已满时', () => {
      // 填满棋盘
      for (let row = 0; row < 19; row++) {
        for (let col = 0; col < 19; col++) {
          board.grid[row][col] = (row + col) % 2 === 0 ? PieceType.BLACK : PieceType.WHITE
        }
      }
      
      expect(GameLogic.checkDraw(board)).toBe(true)
    })
  })

  describe('checkGameEnd', () => {
    it('应该检测获胜情况', () => {
      // 水平放置5个黑子
      for (let i = 0; i < 5; i++) {
        board.grid[9][9 + i] = PieceType.BLACK
      }
      
      const result = GameLogic.checkGameEnd(board, { row: 9, col: 11 })
      expect(result.isGameEnd).toBe(true)
      expect(result.winner).toBe(PieceType.BLACK)
      expect(result.winLine).not.toBeNull()
      expect(result.isDraw).toBe(false)
    })

    it('应该检测平局情况', () => {
      // 填满棋盘但没有五子连珠
      for (let row = 0; row < 19; row++) {
        for (let col = 0; col < 19; col++) {
          board.grid[row][col] = (row + col) % 2 === 0 ? PieceType.BLACK : PieceType.WHITE
        }
      }
      
      const result = GameLogic.checkGameEnd(board, { row: 18, col: 18 })
      expect(result.isGameEnd).toBe(true)
      expect(result.winner).toBeNull()
      expect(result.winLine).toBeNull()
      expect(result.isDraw).toBe(true)
    })

    it('应该返回游戏继续当没有结束条件时', () => {
      board.grid[9][9] = PieceType.BLACK
      
      const result = GameLogic.checkGameEnd(board, { row: 9, col: 9 })
      expect(result.isGameEnd).toBe(false)
      expect(result.winner).toBeNull()
      expect(result.winLine).toBeNull()
      expect(result.isDraw).toBe(false)
    })
  })

  describe('getEmptyPositions', () => {
    it('应该返回所有空位置', () => {
      const positions = GameLogic.getEmptyPositions(board)
      expect(positions).toHaveLength(19 * 19)
    })

    it('应该排除已占用位置', () => {
      board.grid[9][9] = PieceType.BLACK
      board.grid[10][10] = PieceType.WHITE
      
      const positions = GameLogic.getEmptyPositions(board)
      expect(positions).toHaveLength(19 * 19 - 2)
      expect(positions.find(pos => pos.row === 9 && pos.col === 9)).toBeUndefined()
      expect(positions.find(pos => pos.row === 10 && pos.col === 10)).toBeUndefined()
    })
  })

  describe('getCandidatePositions', () => {
    it('应该返回中心位置对于空棋盘', () => {
      const candidates = GameLogic.getCandidatePositions(board)
      expect(candidates).toHaveLength(1)
      expect(candidates[0]).toEqual({ row: 9, col: 9 })
    })

    it('应该返回已有棋子周围的位置', () => {
      board.grid[9][9] = PieceType.BLACK
      
      const candidates = GameLogic.getCandidatePositions(board, 1)
      expect(candidates.length).toBeGreaterThan(1)
      
      // 检查是否包含相邻位置
      const hasAdjacent = candidates.some(pos => 
        Math.abs(pos.row - 9) <= 1 && Math.abs(pos.col - 9) <= 1 && 
        !(pos.row === 9 && pos.col === 9)
      )
      expect(hasAdjacent).toBe(true)
    })
  })

  describe('getPieceCount', () => {
    it('应该正确计算棋子数量', () => {
      expect(GameLogic.getPieceCount(board, PieceType.BLACK)).toBe(0)
      expect(GameLogic.getPieceCount(board, PieceType.WHITE)).toBe(0)
      expect(GameLogic.getPieceCount(board, PieceType.EMPTY)).toBe(19 * 19)
      
      board.grid[9][9] = PieceType.BLACK
      board.grid[10][10] = PieceType.WHITE
      
      expect(GameLogic.getPieceCount(board, PieceType.BLACK)).toBe(1)
      expect(GameLogic.getPieceCount(board, PieceType.WHITE)).toBe(1)
      expect(GameLogic.getPieceCount(board, PieceType.EMPTY)).toBe(19 * 19 - 2)
    })
  })

  describe('hasAdjacentPiece', () => {
    it('应该返回false当周围没有棋子时', () => {
      expect(GameLogic.hasAdjacentPiece(board, { row: 9, col: 9 })).toBe(false)
    })

    it('应该返回true当周围有棋子时', () => {
      board.grid[9][9] = PieceType.BLACK
      expect(GameLogic.hasAdjacentPiece(board, { row: 10, col: 10 })).toBe(true)
      expect(GameLogic.hasAdjacentPiece(board, { row: 8, col: 8 })).toBe(true)
    })

    it('应该考虑指定的半径', () => {
      board.grid[9][9] = PieceType.BLACK
      expect(GameLogic.hasAdjacentPiece(board, { row: 12, col: 12 }, 2)).toBe(false)
      expect(GameLogic.hasAdjacentPiece(board, { row: 11, col: 11 }, 2)).toBe(true)
    })
  })

  describe('工具方法', () => {
    it('getDistance 应该正确计算距离', () => {
      const distance = GameLogic.getDistance({ row: 0, col: 0 }, { row: 3, col: 4 })
      expect(distance).toBe(5) // 3-4-5三角形
    })

    it('isPositionEqual 应该正确比较位置', () => {
      expect(GameLogic.isPositionEqual({ row: 9, col: 9 }, { row: 9, col: 9 })).toBe(true)
      expect(GameLogic.isPositionEqual({ row: 9, col: 9 }, { row: 9, col: 10 })).toBe(false)
    })

    it('positionToKey 和 keyToPosition 应该正确转换', () => {
      const position = { row: 9, col: 9 }
      const key = GameLogic.positionToKey(position)
      const converted = GameLogic.keyToPosition(key)
      expect(converted).toEqual(position)
    })
  })
})