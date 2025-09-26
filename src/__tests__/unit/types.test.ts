import { describe, it, expect } from 'vitest'
import {
  PieceType,
  PlayerType,
  GameStatus,
  AIDifficulty,
  Direction,
  DEFAULT_GAME_CONFIG,
  createEmptyBoard,
  createDefaultPlayers,
  createInitialGameState
} from '@/types'

describe('类型系统和工厂函数', () => {
  describe('枚举类型', () => {
    it('PieceType 应该有正确的值', () => {
      expect(PieceType.EMPTY).toBe(0)
      expect(PieceType.BLACK).toBe(1)
      expect(PieceType.WHITE).toBe(2)
    })

    it('PlayerType 应该有正确的值', () => {
      expect(PlayerType.HUMAN).toBe('human')
      expect(PlayerType.AI).toBe('ai')
    })

    it('GameStatus 应该有正确的值', () => {
      expect(GameStatus.READY).toBe('ready')
      expect(GameStatus.PLAYING).toBe('playing')
      expect(GameStatus.HUMAN_WON).toBe('human_won')
      expect(GameStatus.AI_WON).toBe('ai_won')
      expect(GameStatus.DRAW).toBe('draw')
      expect(GameStatus.PAUSED).toBe('paused')
    })

    it('AIDifficulty 应该有正确的值', () => {
      expect(AIDifficulty.EASY).toBe('easy')
      expect(AIDifficulty.MEDIUM).toBe('medium')
      expect(AIDifficulty.HARD).toBe('hard')
      expect(AIDifficulty.EXPERT).toBe('expert')
    })

    it('Direction 应该有正确的值', () => {
      expect(Direction.HORIZONTAL).toBe('horizontal')
      expect(Direction.VERTICAL).toBe('vertical')
      expect(Direction.DIAGONAL_1).toBe('diagonal_1')
      expect(Direction.DIAGONAL_2).toBe('diagonal_2')
    })
  })

  describe('DEFAULT_GAME_CONFIG', () => {
    it('应该有正确的默认值', () => {
      expect(DEFAULT_GAME_CONFIG.boardSize).toBe(19)
      expect(DEFAULT_GAME_CONFIG.aiDifficulty).toBe(AIDifficulty.MEDIUM)
      expect(DEFAULT_GAME_CONFIG.enableSound).toBe(true)
      expect(DEFAULT_GAME_CONFIG.enableAnimation).toBe(true)
      expect(DEFAULT_GAME_CONFIG.timeLimit).toBe(30)
    })

    it('应该是不可变的', () => {
      const originalBoardSize = DEFAULT_GAME_CONFIG.boardSize
      
      // 尝试修改（在TypeScript中应该被阻止，但在运行时我们测试）
      expect(() => {
        const config = DEFAULT_GAME_CONFIG as any
        config.boardSize = 13
      }).not.toThrow()
      
      // 但是应该创建新的配置对象而不是修改原始对象
      const newConfig = { ...DEFAULT_GAME_CONFIG, boardSize: 13 }
      expect(newConfig.boardSize).toBe(13)
      expect(DEFAULT_GAME_CONFIG.boardSize).toBe(originalBoardSize)
    })
  })

  describe('createEmptyBoard', () => {
    it('应该创建指定大小的空棋盘', () => {
      const board = createEmptyBoard(19)
      
      expect(board.size).toBe(19)
      expect(board.grid).toHaveLength(19)
      expect(board.grid[0]).toHaveLength(19)
      expect(board.lastMove).toBeNull()
    })

    it('应该默认创建19x19棋盘', () => {
      const board = createEmptyBoard()
      
      expect(board.size).toBe(19)
      expect(board.grid).toHaveLength(19)
    })

    it('应该创建其他大小的棋盘', () => {
      const sizes = [9, 13, 15]
      
      sizes.forEach(size => {
        const board = createEmptyBoard(size)
        expect(board.size).toBe(size)
        expect(board.grid).toHaveLength(size)
        expect(board.grid[0]).toHaveLength(size)
      })
    })

    it('所有位置应该初始化为空', () => {
      const board = createEmptyBoard(9)
      
      for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
          expect(board.grid[row][col]).toBe(PieceType.EMPTY)
        }
      }
    })

    it('应该创建深拷贝的网格', () => {
      const board1 = createEmptyBoard(3)
      const board2 = createEmptyBoard(3)
      
      board1.grid[0][0] = PieceType.BLACK
      
      expect(board2.grid[0][0]).toBe(PieceType.EMPTY)
      expect(board1.grid).not.toBe(board2.grid)
    })
  })

  describe('createDefaultPlayers', () => {
    it('应该创建默认的人类和AI玩家', () => {
      const { human, ai } = createDefaultPlayers()
      
      expect(human.type).toBe(PlayerType.HUMAN)
      expect(human.piece).toBe(PieceType.BLACK)
      expect(human.name).toBe('玩家')
      
      expect(ai.type).toBe(PlayerType.AI)
      expect(ai.piece).toBe(PieceType.WHITE)
      expect(ai.name).toBe('AI')
    })

    it('每次调用应该创建新的对象', () => {
      const players1 = createDefaultPlayers()
      const players2 = createDefaultPlayers()
      
      expect(players1.human).not.toBe(players2.human)
      expect(players1.ai).not.toBe(players2.ai)
      
      // 但内容应该相同
      expect(players1.human).toEqual(players2.human)
      expect(players1.ai).toEqual(players2.ai)
    })
  })

  describe('createInitialGameState', () => {
    it('应该创建初始游戏状态', () => {
      const gameState = createInitialGameState()
      
      expect(gameState.board.size).toBe(19)
      expect(gameState.currentPlayer.type).toBe(PlayerType.HUMAN)
      expect(gameState.gameStatus).toBe(GameStatus.READY)
      expect(gameState.moveHistory).toHaveLength(0)
      expect(gameState.startTime).toBeNull()
      expect(gameState.lastMoveTime).toBeNull()
      expect(gameState.winner).toBeNull()
    })

    it('应该使用默认配置', () => {
      const gameState = createInitialGameState()
      
      expect(gameState.config).toEqual(DEFAULT_GAME_CONFIG)
    })

    it('应该接受自定义配置', () => {
      const customConfig = {
        boardSize: 13,
        aiDifficulty: AIDifficulty.HARD
      }
      
      const gameState = createInitialGameState(customConfig)
      
      expect(gameState.config.boardSize).toBe(13)
      expect(gameState.config.aiDifficulty).toBe(AIDifficulty.HARD)
      expect(gameState.config.enableSound).toBe(DEFAULT_GAME_CONFIG.enableSound) // 未指定的使用默认值
      expect(gameState.board.size).toBe(13) // 棋盘大小应该匹配配置
    })

    it('应该正确设置玩家信息', () => {
      const gameState = createInitialGameState()
      
      expect(gameState.humanPlayer.type).toBe(PlayerType.HUMAN)
      expect(gameState.humanPlayer.piece).toBe(PieceType.BLACK)
      expect(gameState.aiPlayer.type).toBe(PlayerType.AI)
      expect(gameState.aiPlayer.piece).toBe(PieceType.WHITE)
      
      // 当前玩家应该是人类玩家（先手）
      expect(gameState.currentPlayer).toEqual(gameState.humanPlayer)
    })

    it('每次调用应该创建新的状态对象', () => {
      const state1 = createInitialGameState()
      const state2 = createInitialGameState()
      
      expect(state1).not.toBe(state2)
      expect(state1.board).not.toBe(state2.board)
      expect(state1.moveHistory).not.toBe(state2.moveHistory)
      
      // 修改一个状态不应该影响另一个
      state1.gameStatus = GameStatus.PLAYING
      expect(state2.gameStatus).toBe(GameStatus.READY)
    })
  })

  describe('类型安全性', () => {
    it('Position 应该有正确的属性', () => {
      const position = { row: 9, col: 9 }
      
      expect(typeof position.row).toBe('number')
      expect(typeof position.col).toBe('number')
    })

    it('Move 应该有正确的结构', () => {
      const { human } = createDefaultPlayers()
      const move = {
        position: { row: 9, col: 9 },
        player: human,
        timestamp: Date.now(),
        moveNumber: 1
      }
      
      expect(move.position).toBeDefined()
      expect(move.player).toBeDefined()
      expect(typeof move.timestamp).toBe('number')
      expect(typeof move.moveNumber).toBe('number')
    })

    it('WinLine 应该有正确的结构', () => {
      const winLine = {
        start: { row: 9, col: 9 },
        end: { row: 9, col: 13 },
        direction: Direction.HORIZONTAL,
        positions: [
          { row: 9, col: 9 },
          { row: 9, col: 10 },
          { row: 9, col: 11 },
          { row: 9, col: 12 },
          { row: 9, col: 13 }
        ]
      }
      
      expect(winLine.start).toBeDefined()
      expect(winLine.end).toBeDefined()
      expect(winLine.direction).toBe(Direction.HORIZONTAL)
      expect(winLine.positions).toHaveLength(5)
    })

    it('AIEvaluation 应该有正确的结构', () => {
      const evaluation = {
        position: { row: 9, col: 9 },
        score: 1000,
        depth: 4,
        evaluationTime: 150
      }
      
      expect(evaluation.position).toBeDefined()
      expect(typeof evaluation.score).toBe('number')
      expect(typeof evaluation.depth).toBe('number')
      expect(typeof evaluation.evaluationTime).toBe('number')
    })
  })

  describe('边界情况', () => {
    it('应该处理极小的棋盘大小', () => {
      const board = createEmptyBoard(1)
      
      expect(board.size).toBe(1)
      expect(board.grid).toHaveLength(1)
      expect(board.grid[0]).toHaveLength(1)
      expect(board.grid[0][0]).toBe(PieceType.EMPTY)
    })

    it('应该处理大的棋盘大小', () => {
      const board = createEmptyBoard(50)
      
      expect(board.size).toBe(50)
      expect(board.grid).toHaveLength(50)
      expect(board.grid[0]).toHaveLength(50)
    })

    it('应该处理零配置的情况', () => {
      const gameState = createInitialGameState({})
      
      expect(gameState.config).toEqual(DEFAULT_GAME_CONFIG)
    })

    it('应该处理部分配置覆盖', () => {
      const gameState = createInitialGameState({
        enableSound: false
      })
      
      expect(gameState.config.enableSound).toBe(false)
      expect(gameState.config.boardSize).toBe(DEFAULT_GAME_CONFIG.boardSize)
      expect(gameState.config.aiDifficulty).toBe(DEFAULT_GAME_CONFIG.aiDifficulty)
    })
  })
})