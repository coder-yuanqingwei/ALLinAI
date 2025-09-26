/**
 * 玩家类型枚举
 */
export enum PlayerType {
  HUMAN = 'human',
  AI = 'ai'
}

/**
 * 棋子类型枚举
 */
export enum PieceType {
  EMPTY = 0,
  BLACK = 1,
  WHITE = 2
}

/**
 * 游戏状态枚举
 */
export enum GameStatus {
  READY = 'ready',
  PLAYING = 'playing',
  HUMAN_WON = 'human_won',
  AI_WON = 'ai_won',
  DRAW = 'draw',
  PAUSED = 'paused'
}

/**
 * AI难度等级枚举
 */
export enum AIDifficulty {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard',
  EXPERT = 'expert'
}

/**
 * 棋盘位置接口
 */
export interface Position {
  row: number
  col: number
}

/**
 * 玩家接口
 */
export interface Player {
  type: PlayerType
  piece: PieceType
  name: string
}

/**
 * 落子记录接口
 */
export interface Move {
  position: Position
  player: Player
  timestamp: number
  moveNumber: number
}

/**
 * 棋盘接口
 */
export interface Board {
  grid: PieceType[][]
  size: number
  lastMove: Position | null
}

/**
 * 游戏配置接口
 */
export interface GameConfig {
  boardSize: number
  aiDifficulty: AIDifficulty
  enableSound: boolean
  enableAnimation: boolean
  timeLimit: number // 每步时间限制（秒）
}

/**
 * 游戏状态接口
 */
export interface GameState {
  board: Board
  currentPlayer: Player
  gameStatus: GameStatus
  moveHistory: Move[]
  humanPlayer: Player
  aiPlayer: Player
  config: GameConfig
  startTime: number | null
  lastMoveTime: number | null
  winner: Player | null
}

/**
 * AI评估结果接口
 */
export interface AIEvaluation {
  position: Position
  score: number
  depth: number
  evaluationTime: number
}

/**
 * 棋型评估接口
 */
export interface PatternScore {
  attack: number
  defense: number
  pattern: string
}

/**
 * 游戏统计接口
 */
export interface GameStats {
  totalGames: number
  humanWins: number
  aiWins: number
  draws: number
  averageGameTime: number
  totalMoves: number
}

/**
 * 棋盘方向枚举（用于胜负判断）
 */
export enum Direction {
  HORIZONTAL = 'horizontal',
  VERTICAL = 'vertical',
  DIAGONAL_1 = 'diagonal_1', // 主对角线 (\)
  DIAGONAL_2 = 'diagonal_2'  // 副对角线 (/)
}

/**
 * 胜利线条信息接口
 */
export interface WinLine {
  start: Position
  end: Position
  direction: Direction
  positions: Position[]
}

/**
 * 游戏事件接口
 */
export interface GameEvent {
  type: 'move' | 'win' | 'draw' | 'reset' | 'undo'
  data: any
  timestamp: number
}

/**
 * 辅助类型：棋盘坐标的联合类型
 */
export type BoardCoordinate = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18

/**
 * 游戏配置的默认值
 */
export const DEFAULT_GAME_CONFIG: GameConfig = {
  boardSize: 19,
  aiDifficulty: AIDifficulty.MEDIUM,
  enableSound: true,
  enableAnimation: true,
  timeLimit: 30
}

/**
 * 创建空棋盘的工厂函数
 */
export const createEmptyBoard = (size: number = 19): Board => ({
  grid: Array(size).fill(null).map(() => Array(size).fill(PieceType.EMPTY)),
  size,
  lastMove: null
})

/**
 * 创建默认玩家的工厂函数
 */
export const createDefaultPlayers = (): { human: Player; ai: Player } => ({
  human: {
    type: PlayerType.HUMAN,
    piece: PieceType.BLACK,
    name: '玩家'
  },
  ai: {
    type: PlayerType.AI,
    piece: PieceType.WHITE,
    name: 'AI'
  }
})

/**
 * 创建初始游戏状态的工厂函数
 */
export const createInitialGameState = (config: Partial<GameConfig> = {}): GameState => {
  const gameConfig = { ...DEFAULT_GAME_CONFIG, ...config }
  const { human, ai } = createDefaultPlayers()
  
  return {
    board: createEmptyBoard(gameConfig.boardSize),
    currentPlayer: human, // 人类玩家先手
    gameStatus: GameStatus.READY,
    moveHistory: [],
    humanPlayer: human,
    aiPlayer: ai,
    config: gameConfig,
    startTime: null,
    lastMoveTime: null,
    winner: null
  }
}