import type {
  Board,
  Position,
  PieceType,
  AIEvaluation,
  AIDifficulty
} from '@/types'
import { GameLogic } from '@/utils'
import { AIEvaluator } from './aiEvaluator'

/**
 * AI决策引擎 - 使用极小极大算法和Alpha-Beta剪枝
 */
export class AIEngine {
  private evaluator: AIEvaluator
  private searchDepth: number
  private maxSearchTime: number = 30000 // 最大搜索时间30秒
  private startTime: number = 0
  private nodesSearched: number = 0

  constructor(difficulty: AIDifficulty = 'medium') {
    this.evaluator = new AIEvaluator()
    this.searchDepth = this.evaluator.getSearchDepth(difficulty)
  }

  /**
   * 获取AI的最佳落子位置
   */
  async getBestMove(board: Board, aiPieceType: PieceType): Promise<AIEvaluation> {
    this.startTime = Date.now()
    this.nodesSearched = 0

    const humanPieceType = aiPieceType === PieceType.BLACK ? PieceType.WHITE : PieceType.BLACK

    // 检查是否有必胜步骤
    const winningMoves = this.evaluator.checkCriticalMoves(board, aiPieceType)
    if (winningMoves.length > 0) {
      return {
        position: winningMoves[0],
        score: 100000,
        depth: 1,
        evaluationTime: Date.now() - this.startTime
      }
    }

    // 检查是否需要防守
    const defensiveMoves = this.evaluator.checkDefensiveMoves(board, humanPieceType)
    if (defensiveMoves.length > 0) {
      return {
        position: defensiveMoves[0],
        score: 90000,
        depth: 1,
        evaluationTime: Date.now() - this.startTime
      }
    }

    // 使用极小极大算法搜索最佳位置
    const result = await this.minimax(
      board,
      this.searchDepth,
      true,
      aiPieceType,
      -Infinity,
      Infinity
    )

    return {
      position: result.position!,
      score: result.score,
      depth: this.searchDepth,
      evaluationTime: Date.now() - this.startTime
    }
  }

  /**
   * 极小极大算法实现（带Alpha-Beta剪枝）
   */
  private async minimax(
    board: Board,
    depth: number,
    isMaximizing: boolean,
    aiPieceType: PieceType,
    alpha: number,
    beta: number
  ): Promise<{ score: number; position?: Position }> {
    this.nodesSearched++

    // 检查时间限制
    if (Date.now() - this.startTime > this.maxSearchTime) {
      return { score: this.evaluator.evaluateBoard(board, aiPieceType) }
    }

    // 终止条件：达到搜索深度或游戏结束
    if (depth === 0) {
      return { score: this.evaluator.evaluateBoard(board, aiPieceType) }
    }

    // 检查游戏是否结束
    if (board.lastMove) {
      const gameEnd = GameLogic.checkGameEnd(board, board.lastMove)
      if (gameEnd.isGameEnd) {
        if (gameEnd.winner === aiPieceType) {
          return { score: 100000 + depth } // 更快获胜得分更高
        } else if (gameEnd.winner !== null) {
          return { score: -100000 - depth } // 更快失败得分更低
        } else {
          return { score: 0 } // 平局
        }
      }
    }

    const currentPieceType = isMaximizing ? aiPieceType : 
      (aiPieceType === PieceType.BLACK ? PieceType.WHITE : PieceType.BLACK)

    // 获取候选位置（限制搜索范围以提高性能）
    const candidates = this.evaluator.getBestCandidates(
      board, 
      currentPieceType, 
      Math.max(10, 20 - depth * 2) // 深度越深，候选位置越少
    )

    let bestPosition: Position | undefined
    let bestScore = isMaximizing ? -Infinity : Infinity

    for (const position of candidates) {
      // 创建新的棋盘状态
      const newBoard = GameLogic.makeMove(board, position, currentPieceType)

      // 递归搜索
      const result = await this.minimax(
        newBoard,
        depth - 1,
        !isMaximizing,
        aiPieceType,
        alpha,
        beta
      )

      // 更新最佳结果
      if (isMaximizing) {
        if (result.score > bestScore) {
          bestScore = result.score
          bestPosition = position
        }
        alpha = Math.max(alpha, result.score)
      } else {
        if (result.score < bestScore) {
          bestScore = result.score
          bestPosition = position
        }
        beta = Math.min(beta, result.score)
      }

      // Alpha-Beta剪枝
      if (beta <= alpha) {
        break
      }

      // 时间检查
      if (Date.now() - this.startTime > this.maxSearchTime) {
        break
      }
    }

    return { score: bestScore, position: bestPosition }
  }

  /**
   * 迭代深化搜索（渐进加深搜索深度）
   */
  async getIterativeDeepeningMove(
    board: Board,
    aiPieceType: PieceType,
    maxTime: number = 5000
  ): Promise<AIEvaluation> {
    this.startTime = Date.now()
    let bestResult: { score: number; position?: Position } = { score: -Infinity }
    let finalDepth = 1

    // 逐步增加搜索深度
    for (let depth = 1; depth <= this.searchDepth; depth++) {
      if (Date.now() - this.startTime > maxTime) {
        break
      }

      const result = await this.minimax(
        board,
        depth,
        true,
        aiPieceType,
        -Infinity,
        Infinity
      )

      if (result.position) {
        bestResult = result
        finalDepth = depth
      }

      // 如果找到必胜结果，提前退出
      if (result.score >= 90000) {
        break
      }
    }

    return {
      position: bestResult.position || this.getRandomMove(board),
      score: bestResult.score,
      depth: finalDepth,
      evaluationTime: Date.now() - this.startTime
    }
  }

  /**
   * 获取随机落子位置（作为后备方案）
   */
  private getRandomMove(board: Board): Position {
    const candidates = GameLogic.getCandidatePositions(board, 3)
    
    if (candidates.length === 0) {
      // 如果没有候选位置，返回中心点
      const center = Math.floor(board.size / 2)
      return { row: center, col: center }
    }

    return candidates[Math.floor(Math.random() * candidates.length)]
  }

  /**
   * 设置搜索深度
   */
  setSearchDepth(depth: number): void {
    this.searchDepth = Math.max(1, Math.min(10, depth))
  }

  /**
   * 设置难度
   */
  setDifficulty(difficulty: AIDifficulty): void {
    this.searchDepth = this.evaluator.getSearchDepth(difficulty)
  }

  /**
   * 获取搜索统计信息
   */
  getSearchStats(): {
    nodesSearched: number
    searchTime: number
    nodesPerSecond: number
  } {
    const searchTime = Date.now() - this.startTime
    return {
      nodesSearched: this.nodesSearched,
      searchTime,
      nodesPerSecond: Math.round(this.nodesSearched / (searchTime / 1000))
    }
  }

  /**
   * 重置搜索统计
   */
  resetStats(): void {
    this.nodesSearched = 0
    this.startTime = 0
  }
}