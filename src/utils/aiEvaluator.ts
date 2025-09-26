import type {
  Board,
  Position,
  PieceType,
  AIEvaluation,
  PatternScore,
  AIDifficulty
} from '@/types'
import { GameLogic } from '@/utils'

/**
 * 棋型模式定义
 */
interface Pattern {
  pattern: string
  score: number
  type: 'attack' | 'defense'
}

/**
 * AI评估引擎
 */
export class AIEvaluator {
  private patterns: Pattern[]

  constructor() {
    this.patterns = this.initializePatterns()
  }

  /**
   * 初始化棋型模式
   */
  private initializePatterns(): Pattern[] {
    return [
      // 攻击棋型
      { pattern: '11111', score: 100000, type: 'attack' }, // 五连
      { pattern: '011110', score: 10000, type: 'attack' },  // 活四
      { pattern: '011112', score: 1000, type: 'attack' },   // 冲四
      { pattern: '211110', score: 1000, type: 'attack' },   // 冲四
      { pattern: '01110', score: 1000, type: 'attack' },    // 活三
      { pattern: '011101', score: 1000, type: 'attack' },   // 活三
      { pattern: '010110', score: 1000, type: 'attack' },   // 活三
      { pattern: '01112', score: 100, type: 'attack' },     // 眠三
      { pattern: '21110', score: 100, type: 'attack' },     // 眠三
      { pattern: '01100', score: 100, type: 'attack' },     // 活二
      { pattern: '001110', score: 100, type: 'attack' },    // 活二
      { pattern: '0110', score: 10, type: 'attack' },       // 活二
      { pattern: '01010', score: 10, type: 'attack' },      // 跳活二

      // 防守棋型（对手的棋型）
      { pattern: '22222', score: 100000, type: 'defense' }, // 对手五连
      { pattern: '022220', score: 9000, type: 'defense' },  // 对手活四
      { pattern: '022221', score: 900, type: 'defense' },   // 对手冲四
      { pattern: '122220', score: 900, type: 'defense' },   // 对手冲四
      { pattern: '02220', score: 800, type: 'defense' },    // 对手活三
      { pattern: '022202', score: 800, type: 'defense' },   // 对手活三
      { pattern: '020220', score: 800, type: 'defense' },   // 对手活三
      { pattern: '02221', score: 90, type: 'defense' },     // 对手眠三
      { pattern: '12220', score: 90, type: 'defense' },     // 对手眠三
      { pattern: '02200', score: 80, type: 'defense' },     // 对手活二
      { pattern: '002220', score: 80, type: 'defense' },    // 对手活二
      { pattern: '0220', score: 8, type: 'defense' },       // 对手活二
      { pattern: '02020', score: 8, type: 'defense' }       // 对手跳活二
    ]
  }

  /**
   * 评估单个位置的得分
   */
  evaluatePosition(board: Board, position: Position, pieceType: PieceType): number {
    const { row, col } = position
    let totalScore = 0

    // 四个方向：水平、垂直、主对角线、副对角线
    const directions = [
      [0, 1],   // 水平
      [1, 0],   // 垂直
      [1, 1],   // 主对角线
      [1, -1]   // 副对角线
    ]

    for (const [dr, dc] of directions) {
      const line = this.getLine(board, row, col, dr, dc, 9)
      const score = this.evaluateLine(line, pieceType)
      totalScore += score
    }

    // 位置价值加成（中心位置更有价值）
    const center = Math.floor(board.size / 2)
    const distanceFromCenter = Math.abs(row - center) + Math.abs(col - center)
    const positionBonus = Math.max(0, 10 - distanceFromCenter)
    totalScore += positionBonus

    return totalScore
  }

  /**
   * 获取指定方向的直线棋子序列
   */
  private getLine(
    board: Board,
    row: number,
    col: number,
    dr: number,
    dc: number,
    length: number
  ): PieceType[] {
    const line: PieceType[] = []
    const halfLength = Math.floor(length / 2)

    for (let i = -halfLength; i <= halfLength; i++) {
      const newRow = row + dr * i
      const newCol = col + dc * i

      if (GameLogic.isValidPosition({ row: newRow, col: newCol }, board.size)) {
        line.push(board.grid[newRow][newCol])
      } else {
        // 边界视为对手棋子
        line.push(pieceType === PieceType.BLACK ? PieceType.WHITE : PieceType.BLACK)
      }
    }

    return line
  }

  /**
   * 评估一条直线的得分
   */
  private evaluateLine(line: PieceType[], pieceType: PieceType): number {
    const lineStr = line.join('')
    let score = 0

    for (const pattern of this.patterns) {
      const regex = new RegExp(pattern.pattern, 'g')
      let match
      
      while ((match = regex.exec(lineStr)) !== null) {
        // 检查是否匹配当前玩家的棋型
        const isPlayerPattern = pattern.pattern.includes('1') && 
          pattern.pattern.replace(/1/g, pieceType.toString()) === 
          pattern.pattern.replace(/1/g, pieceType.toString())
        
        const isOpponentPattern = pattern.pattern.includes('2') &&
          pattern.pattern.replace(/2/g, (pieceType === PieceType.BLACK ? PieceType.WHITE : PieceType.BLACK).toString()) ===
          pattern.pattern.replace(/2/g, (pieceType === PieceType.BLACK ? PieceType.WHITE : PieceType.BLACK).toString())

        if (isPlayerPattern || isOpponentPattern) {
          score += pattern.score
        }
        
        // 防止重复匹配
        regex.lastIndex = match.index + 1
      }
    }

    return score
  }

  /**
   * 评估整个棋盘的形势
   */
  evaluateBoard(board: Board, aiPieceType: PieceType): number {
    let totalScore = 0
    const humanPieceType = aiPieceType === PieceType.BLACK ? PieceType.WHITE : PieceType.BLACK

    // 评估所有位置
    for (let row = 0; row < board.size; row++) {
      for (let col = 0; col < board.size; col++) {
        const piece = board.grid[row][col]
        
        if (piece === aiPieceType) {
          totalScore += this.evaluatePosition(board, { row, col }, aiPieceType)
        } else if (piece === humanPieceType) {
          totalScore -= this.evaluatePosition(board, { row, col }, humanPieceType) * 0.9
        }
      }
    }

    return totalScore
  }

  /**
   * 检查是否存在必胜或必败威胁
   */
  checkCriticalMoves(board: Board, pieceType: PieceType): Position[] {
    const criticalMoves: Position[] = []
    const candidates = GameLogic.getCandidatePositions(board, 2)

    for (const position of candidates) {
      const testBoard = GameLogic.makeMove(board, position, pieceType)
      const gameEnd = GameLogic.checkGameEnd(testBoard, position)
      
      if (gameEnd.isGameEnd && gameEnd.winner === pieceType) {
        criticalMoves.push(position)
      }
    }

    return criticalMoves
  }

  /**
   * 检查是否需要防守
   */
  checkDefensiveMoves(board: Board, opponentPieceType: PieceType): Position[] {
    const defensiveMoves: Position[] = []
    const candidates = GameLogic.getCandidatePositions(board, 2)

    for (const position of candidates) {
      const testBoard = GameLogic.makeMove(board, position, opponentPieceType)
      const gameEnd = GameLogic.checkGameEnd(testBoard, position)
      
      if (gameEnd.isGameEnd && gameEnd.winner === opponentPieceType) {
        defensiveMoves.push(position)
      }
    }

    return defensiveMoves
  }

  /**
   * 根据难度获取搜索深度
   */
  getSearchDepth(difficulty: AIDifficulty): number {
    switch (difficulty) {
      case AIDifficulty.EASY:
        return 2
      case AIDifficulty.MEDIUM:
        return 4
      case AIDifficulty.HARD:
        return 6
      case AIDifficulty.EXPERT:
        return 8
      default:
        return 4
    }
  }

  /**
   * 获取最佳候选位置（限制搜索范围）
   */
  getBestCandidates(board: Board, pieceType: PieceType, maxCandidates: number = 10): Position[] {
    const candidates = GameLogic.getCandidatePositions(board, 2)
    
    // 评估每个候选位置
    const evaluatedCandidates = candidates.map(position => ({
      position,
      score: this.evaluatePosition(board, position, pieceType)
    }))

    // 按分数排序并返回前N个
    return evaluatedCandidates
      .sort((a, b) => b.score - a.score)
      .slice(0, maxCandidates)
      .map(candidate => candidate.position)
  }
}