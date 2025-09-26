import type {
  Position,
  Board,
  PieceType,
  Player,
  WinLine,
  Direction,
  Move,
  GameState
} from '@/types'

/**
 * 游戏逻辑工具类
 */
export class GameLogic {
  /**
   * 检查位置是否在棋盘范围内
   */
  static isValidPosition(position: Position, boardSize: number): boolean {
    const { row, col } = position
    return row >= 0 && row < boardSize && col >= 0 && col < boardSize
  }

  /**
   * 检查位置是否为空
   */
  static isEmptyPosition(board: Board, position: Position): boolean {
    if (!this.isValidPosition(position, board.size)) {
      return false
    }
    return board.grid[position.row][position.col] === PieceType.EMPTY
  }

  /**
   * 验证落子是否合法
   */
  static isValidMove(
    board: Board,
    position: Position,
    player: Player
  ): { valid: boolean; reason?: string } {
    // 检查位置是否在棋盘范围内
    if (!this.isValidPosition(position, board.size)) {
      return { valid: false, reason: '位置超出棋盘范围' }
    }

    // 检查位置是否为空
    if (!this.isEmptyPosition(board, position)) {
      return { valid: false, reason: '该位置已有棋子' }
    }

    return { valid: true }
  }

  /**
   * 执行落子操作
   */
  static makeMove(board: Board, position: Position, pieceType: PieceType): Board {
    const newBoard = this.cloneBoard(board)
    newBoard.grid[position.row][position.col] = pieceType
    newBoard.lastMove = position
    return newBoard
  }

  /**
   * 深拷贝棋盘
   */
  static cloneBoard(board: Board): Board {
    return {
      grid: board.grid.map(row => [...row]),
      size: board.size,
      lastMove: board.lastMove ? { ...board.lastMove } : null
    }
  }

  /**
   * 检查游戏是否结束（胜负或平局）
   */
  static checkGameEnd(board: Board, lastMove: Position): {
    isGameEnd: boolean
    winner: PieceType | null
    winLine: WinLine | null
    isDraw: boolean
  } {
    const pieceType = board.grid[lastMove.row][lastMove.col]
    
    // 检查是否有胜者
    const winLine = this.checkWin(board, lastMove, pieceType)
    if (winLine) {
      return {
        isGameEnd: true,
        winner: pieceType,
        winLine,
        isDraw: false
      }
    }

    // 检查是否平局（棋盘满了）
    const isDraw = this.checkDraw(board)
    
    return {
      isGameEnd: isDraw,
      winner: null,
      winLine: null,
      isDraw
    }
  }

  /**
   * 检查是否获胜
   */
  static checkWin(board: Board, position: Position, pieceType: PieceType): WinLine | null {
    if (pieceType === PieceType.EMPTY) return null

    const directions = [
      { dr: 0, dc: 1, direction: Direction.HORIZONTAL },    // 水平
      { dr: 1, dc: 0, direction: Direction.VERTICAL },      // 垂直
      { dr: 1, dc: 1, direction: Direction.DIAGONAL_1 },    // 主对角线
      { dr: 1, dc: -1, direction: Direction.DIAGONAL_2 }    // 副对角线
    ]

    for (const { dr, dc, direction } of directions) {
      const line = this.getLinePositions(board, position, dr, dc, pieceType)
      if (line.length >= 5) {
        return {
          start: line[0],
          end: line[line.length - 1],
          direction,
          positions: line
        }
      }
    }

    return null
  }

  /**
   * 获取指定方向上的连续相同棋子位置
   */
  private static getLinePositions(
    board: Board,
    position: Position,
    dr: number,
    dc: number,
    pieceType: PieceType
  ): Position[] {
    const positions: Position[] = [position]
    
    // 向正方向搜索
    for (let i = 1; i < 5; i++) {
      const newRow = position.row + dr * i
      const newCol = position.col + dc * i
      
      if (!this.isValidPosition({ row: newRow, col: newCol }, board.size)) break
      if (board.grid[newRow][newCol] !== pieceType) break
      
      positions.push({ row: newRow, col: newCol })
    }

    // 向负方向搜索
    for (let i = 1; i < 5; i++) {
      const newRow = position.row - dr * i
      const newCol = position.col - dc * i
      
      if (!this.isValidPosition({ row: newRow, col: newCol }, board.size)) break
      if (board.grid[newRow][newCol] !== pieceType) break
      
      positions.unshift({ row: newRow, col: newCol })
    }

    return positions
  }

  /**
   * 检查是否平局（棋盘已满）
   */
  static checkDraw(board: Board): boolean {
    for (let row = 0; row < board.size; row++) {
      for (let col = 0; col < board.size; col++) {
        if (board.grid[row][col] === PieceType.EMPTY) {
          return false
        }
      }
    }
    return true
  }

  /**
   * 获取所有空位置
   */
  static getEmptyPositions(board: Board): Position[] {
    const emptyPositions: Position[] = []
    
    for (let row = 0; row < board.size; row++) {
      for (let col = 0; col < board.size; col++) {
        if (board.grid[row][col] === PieceType.EMPTY) {
          emptyPositions.push({ row, col })
        }
      }
    }
    
    return emptyPositions
  }

  /**
   * 获取棋盘上指定类型的棋子数量
   */
  static getPieceCount(board: Board, pieceType: PieceType): number {
    let count = 0
    
    for (let row = 0; row < board.size; row++) {
      for (let col = 0; col < board.size; col++) {
        if (board.grid[row][col] === pieceType) {
          count++
        }
      }
    }
    
    return count
  }

  /**
   * 检查指定位置周围是否有棋子（用于AI优化搜索范围）
   */
  static hasAdjacentPiece(board: Board, position: Position, radius: number = 2): boolean {
    const { row, col } = position
    
    for (let dr = -radius; dr <= radius; dr++) {
      for (let dc = -radius; dc <= radius; dc++) {
        if (dr === 0 && dc === 0) continue
        
        const newRow = row + dr
        const newCol = col + dc
        
        if (this.isValidPosition({ row: newRow, col: newCol }, board.size)) {
          if (board.grid[newRow][newCol] !== PieceType.EMPTY) {
            return true
          }
        }
      }
    }
    
    return false
  }

  /**
   * 获取候选落子位置（有棋子的周围位置，用于AI搜索优化）
   */
  static getCandidatePositions(board: Board, radius: number = 2): Position[] {
    const candidates = new Set<string>()
    
    // 如果棋盘为空，返回中心位置
    if (this.getPieceCount(board, PieceType.BLACK) === 0 && 
        this.getPieceCount(board, PieceType.WHITE) === 0) {
      const center = Math.floor(board.size / 2)
      return [{ row: center, col: center }]
    }
    
    // 查找所有已有棋子周围的空位置
    for (let row = 0; row < board.size; row++) {
      for (let col = 0; col < board.size; col++) {
        if (board.grid[row][col] !== PieceType.EMPTY) {
          // 在该棋子周围搜索空位置
          for (let dr = -radius; dr <= radius; dr++) {
            for (let dc = -radius; dc <= radius; dc++) {
              const newRow = row + dr
              const newCol = col + dc
              const newPos = { row: newRow, col: newCol }
              
              if (this.isValidPosition(newPos, board.size) && 
                  this.isEmptyPosition(board, newPos)) {
                candidates.add(`${newRow},${newCol}`)
              }
            }
          }
        }
      }
    }
    
    return Array.from(candidates).map(pos => {
      const [row, col] = pos.split(',').map(Number)
      return { row, col }
    })
  }

  /**
   * 撤销最后一步棋
   */
  static undoLastMove(gameState: GameState): GameState | null {
    if (gameState.moveHistory.length === 0) {
      return null
    }

    const newHistory = [...gameState.moveHistory]
    const lastMove = newHistory.pop()!
    
    const newBoard = this.cloneBoard(gameState.board)
    newBoard.grid[lastMove.position.row][lastMove.position.col] = PieceType.EMPTY
    
    // 更新lastMove为倒数第二步的位置
    newBoard.lastMove = newHistory.length > 0 ? newHistory[newHistory.length - 1].position : null
    
    return {
      ...gameState,
      board: newBoard,
      moveHistory: newHistory,
      currentPlayer: lastMove.player,
      winner: null
    }
  }

  /**
   * 计算两个位置之间的距离
   */
  static getDistance(pos1: Position, pos2: Position): number {
    const dx = pos1.row - pos2.row
    const dy = pos1.col - pos2.col
    return Math.sqrt(dx * dx + dy * dy)
  }

  /**
   * 判断位置是否相等
   */
  static isPositionEqual(pos1: Position, pos2: Position): boolean {
    return pos1.row === pos2.row && pos1.col === pos2.col
  }

  /**
   * 将位置转换为字符串键
   */
  static positionToKey(position: Position): string {
    return `${position.row},${position.col}`
  }

  /**
   * 从字符串键解析位置
   */
  static keyToPosition(key: string): Position {
    const [row, col] = key.split(',').map(Number)
    return { row, col }
  }
}