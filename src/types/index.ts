// 导出所有类型定义
export * from './game'
export * from './common'

// 重新导出常用类型，提供更简洁的导入方式
export type {
  Position,
  Player,
  Move,
  Board,
  GameState,
  GameConfig,
  AIEvaluation,
  PatternScore,
  GameStats,
  WinLine,
  GameEvent
} from './game'

export {
  PlayerType,
  PieceType,
  GameStatus,
  AIDifficulty,
  Direction,
  DEFAULT_GAME_CONFIG,
  createEmptyBoard,
  createDefaultPlayers,
  createInitialGameState
} from './game'