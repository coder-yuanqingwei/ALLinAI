import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { 
  createInitialGameState,
  GameLogic,
  AIEngine,
  PieceType,
  PlayerType,
  GameStatus,
  AIDifficulty
} from '@/types'
import type {
  GameState,
  Position,
  Move,
  Player,
  GameConfig,
  AIEvaluation,
  WinLine,
  GameStats
} from '@/types'

export const useGameStore = defineStore('game', () => {
  // 状态
  const gameState = ref<GameState>(createInitialGameState())
  const aiEngine = ref<AIEngine>(new AIEngine())
  const isAIThinking = ref(false)
  const currentAIEvaluation = ref<AIEvaluation | null>(null)
  const gameStats = ref<GameStats>({
    totalGames: 0,
    humanWins: 0,
    aiWins: 0,
    draws: 0,
    averageGameTime: 0,
    totalMoves: 0
  })
  const timeRemaining = ref(0)
  const gameTimer = ref<NodeJS.Timeout | null>(null)
  const winLine = ref<WinLine | null>(null)

  // 计算属性
  const isGameOver = computed(() => 
    gameState.value.gameStatus === GameStatus.HUMAN_WON ||
    gameState.value.gameStatus === GameStatus.AI_WON ||
    gameState.value.gameStatus === GameStatus.DRAW
  )

  const canUndo = computed(() => 
    gameState.value.moveHistory.length > 0 && 
    gameState.value.gameStatus === GameStatus.PLAYING &&
    !isAIThinking.value
  )

  const currentGameTime = computed(() => {
    if (!gameState.value.startTime) return 0
    return Math.floor((Date.now() - gameState.value.startTime) / 1000)
  })

  const isCurrentPlayerAI = computed(() => 
    gameState.value.currentPlayer.type === PlayerType.AI
  )

  // 游戏控制方法
  const startNewGame = async (config?: Partial<GameConfig>) => {
    // 更新配置
    if (config) {
      gameState.value.config = { ...gameState.value.config, ...config }
    }

    // 重置游戏状态
    gameState.value = createInitialGameState(gameState.value.config)
    gameState.value.startTime = Date.now()
    gameState.value.gameStatus = GameStatus.PLAYING
    
    // 重置AI引擎
    aiEngine.value.setDifficulty(gameState.value.config.aiDifficulty)
    isAIThinking.value = false
    currentAIEvaluation.value = null
    winLine.value = null
    
    // 启动计时器
    startTimer()
    
    // 如果AI先手，立即开始AI回合
    if (gameState.value.currentPlayer.type === PlayerType.AI) {
      await processAIMove()
    }
  }

  const makeMove = async (position: Position): Promise<boolean> => {
    if (gameState.value.gameStatus !== GameStatus.PLAYING) return false
    if (isAIThinking.value) return false

    const currentPlayer = gameState.value.currentPlayer
    
    // 验证落子
    const validation = GameLogic.isValidMove(gameState.value.board, position, currentPlayer)
    if (!validation.valid) {
      console.warn('Invalid move:', validation.reason)
      return false
    }

    // 执行落子
    const newBoard = GameLogic.makeMove(gameState.value.board, position, currentPlayer.piece)
    
    // 创建移动记录
    const move: Move = {
      position,
      player: currentPlayer,
      timestamp: Date.now(),
      moveNumber: gameState.value.moveHistory.length + 1
    }

    // 更新游戏状态
    gameState.value.board = newBoard
    gameState.value.moveHistory.push(move)
    gameState.value.lastMoveTime = Date.now()

    // 检查游戏是否结束
    const gameEnd = GameLogic.checkGameEnd(newBoard, position)
    if (gameEnd.isGameEnd) {
      await handleGameEnd(gameEnd.winner, gameEnd.winLine)
      return true
    }

    // 切换玩家
    switchPlayer()
    
    // 如果下一个玩家是AI，处理AI移动
    if (gameState.value.currentPlayer.type === PlayerType.AI) {
      setTimeout(() => processAIMove(), 500) // 稍微延迟，让用户看到自己的落子
    } else {
      // 重启计时器
      startTimer()
    }

    return true
  }

  const processAIMove = async () => {
    if (gameState.value.gameStatus !== GameStatus.PLAYING) return
    if (gameState.value.currentPlayer.type !== PlayerType.AI) return

    isAIThinking.value = true
    
    try {
      // 获取AI的最佳移动
      const aiEvaluation = await aiEngine.value.getBestMove(
        gameState.value.board,
        gameState.value.currentPlayer.piece
      )
      
      currentAIEvaluation.value = aiEvaluation
      
      // 执行AI移动
      await makeMove(aiEvaluation.position)
    } catch (error) {
      console.error('AI move error:', error)
      // 如果AI出错，随机选择一个位置
      const candidates = GameLogic.getCandidatePositions(gameState.value.board)
      if (candidates.length > 0) {
        const randomPosition = candidates[Math.floor(Math.random() * candidates.length)]
        await makeMove(randomPosition)
      }
    } finally {
      isAIThinking.value = false
    }
  }

  const undoMove = () => {
    if (!canUndo.value) return

    const newGameState = GameLogic.undoLastMove(gameState.value)
    if (newGameState) {
      gameState.value = newGameState
      gameState.value.gameStatus = GameStatus.PLAYING
      winLine.value = null
      startTimer()
    }
  }

  const pauseGame = () => {
    if (gameState.value.gameStatus === GameStatus.PLAYING) {
      gameState.value.gameStatus = GameStatus.PAUSED
      stopTimer()
    }
  }

  const resumeGame = () => {
    if (gameState.value.gameStatus === GameStatus.PAUSED) {
      gameState.value.gameStatus = GameStatus.PLAYING
      startTimer()
      
      // 如果当前是AI回合，继续AI思考
      if (gameState.value.currentPlayer.type === PlayerType.AI) {
        processAIMove()
      }
    }
  }

  const updateConfig = (config: Partial<GameConfig>) => {
    gameState.value.config = { ...gameState.value.config, ...config }
    
    // 如果更新了AI难度，更新AI引擎
    if (config.aiDifficulty) {
      aiEngine.value.setDifficulty(config.aiDifficulty)
    }
  }

  // 内部辅助方法
  const switchPlayer = () => {
    gameState.value.currentPlayer = gameState.value.currentPlayer === gameState.value.humanPlayer
      ? gameState.value.aiPlayer
      : gameState.value.humanPlayer
  }

  const handleGameEnd = async (winner: PieceType | null, gameWinLine: WinLine | null) => {
    stopTimer()
    
    if (winner === gameState.value.humanPlayer.piece) {
      gameState.value.gameStatus = GameStatus.HUMAN_WON
      gameState.value.winner = gameState.value.humanPlayer
      gameStats.value.humanWins++
    } else if (winner === gameState.value.aiPlayer.piece) {
      gameState.value.gameStatus = GameStatus.AI_WON
      gameState.value.winner = gameState.value.aiPlayer
      gameStats.value.aiWins++
    } else {
      gameState.value.gameStatus = GameStatus.DRAW
      gameStats.value.draws++
    }

    winLine.value = gameWinLine
    gameStats.value.totalGames++
    
    // 更新统计
    updateGameStats()
  }

  const updateGameStats = () => {
    const totalTime = currentGameTime.value
    const totalGames = gameStats.value.totalGames
    
    gameStats.value.averageGameTime = Math.floor(
      (gameStats.value.averageGameTime * (totalGames - 1) + totalTime) / totalGames
    )
    
    gameStats.value.totalMoves = gameState.value.moveHistory.length
  }

  const startTimer = () => {
    stopTimer()
    timeRemaining.value = gameState.value.config.timeLimit
    
    gameTimer.value = setInterval(() => {
      timeRemaining.value--
      
      if (timeRemaining.value <= 0) {
        handleTimeOut()
      }
    }, 1000)
  }

  const stopTimer = () => {
    if (gameTimer.value) {
      clearInterval(gameTimer.value)
      gameTimer.value = null
    }
  }

  const handleTimeOut = () => {
    stopTimer()
    
    // 超时判负
    if (gameState.value.currentPlayer.type === PlayerType.HUMAN) {
      handleGameEnd(gameState.value.aiPlayer.piece, null)
    } else {
      // AI超时，随机落子
      const candidates = GameLogic.getCandidatePositions(gameState.value.board)
      if (candidates.length > 0) {
        const randomPosition = candidates[Math.floor(Math.random() * candidates.length)]
        makeMove(randomPosition)
      }
    }
  }

  // 导出给组件使用的状态和方法
  return {
    // 状态
    gameState: computed(() => gameState.value),
    isAIThinking: computed(() => isAIThinking.value),
    currentAIEvaluation: computed(() => currentAIEvaluation.value),
    gameStats: computed(() => gameStats.value),
    timeRemaining: computed(() => timeRemaining.value),
    winLine: computed(() => winLine.value),
    
    // 计算属性
    isGameOver,
    canUndo,
    currentGameTime,
    isCurrentPlayerAI,
    
    // 方法
    startNewGame,
    makeMove,
    undoMove,
    pauseGame,
    resumeGame,
    updateConfig,
    processAIMove
  }
})