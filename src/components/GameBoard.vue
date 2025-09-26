<template>
  <div class="game-board">
    <!-- 游戏加载遮罩 -->
    <div v-if="isLoading" class="loading-overlay">
      <div class="loading-content">
        <div class="loading-spinner"></div>
        <div class="loading-text">初始化游戏中...</div>
      </div>
    </div>

    <!-- 主游戏界面 -->
    <div class="game-layout">
      <!-- 左侧控制面板 -->
      <div class="game-sidebar game-sidebar--left">
        <ControlPanel
          :game-config="gameStore.gameState.config"
          :game-status="gameStore.gameState.gameStatus"
          :can-undo="gameStore.canUndo"
          :can-show-hint="canShowHint"
          :can-analyze="canAnalyze"
          :can-export="canExport"
          :show-stats="true"
          :stats="gameStore.gameStats"
          :is-game-processing="gameStore.isAIThinking"
          @new-game="handleNewGame"
          @undo="handleUndo"
          @pause-resume="handlePauseResume"
          @config-change="handleConfigChange"
          @show-hint="handleShowHint"
          @analyze-position="handleAnalyzePosition"
          @export-game="handleExportGame"
        />
      </div>

      <!-- 中央棋盘区域 -->
      <div class="game-main">
        <div class="board-container">
          <ChessBoard
            :board="gameStore.gameState.board"
            :current-player="gameStore.gameState.currentPlayer"
            :disabled="isGameDisabled"
            :win-line="gameStore.winLine"
            :show-win-line="showWinLine"
            :is-thinking="gameStore.isAIThinking"
            :thinking-text="thinkingText"
            @move="handlePlayerMove"
            @cell-hover="handleCellHover"
            @cell-leave="handleCellLeave"
          />
        </div>

        <!-- 游戏提示和状态 -->
        <div class="game-hints">
          <!-- 回合提示 -->
          <div v-if="!gameStore.isGameOver" class="turn-hint">
            <div class="hint-content">
              <div v-if="gameStore.isCurrentPlayerAI" class="ai-thinking">
                <div class="thinking-indicator">
                  <div class="thinking-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
                <span>{{ thinkingText }}</span>
              </div>
              <div v-else class="player-turn">
                <div class="player-indicator">
                  <div :class="playerIndicatorClasses"></div>
                </div>
                <span>轮到您下棋了</span>
              </div>
            </div>
          </div>

          <!-- 提示信息 -->
          <div v-if="hintPosition" class="hint-overlay">
            <div class="hint-message">
              建议落子位置: {{ formatPosition(hintPosition) }}
              <button class="hint-close" @click="clearHint">×</button>
            </div>
          </div>

          <!-- 错误提示 */
          <div v-if="errorMessage" class="error-overlay">
            <div class="error-message">
              {{ errorMessage }}
              <button class="error-close" @click="clearError">×</button>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧信息面板 -->
      <div class="game-sidebar game-sidebar--right">
        <GameInfo
          :game-status="gameStore.gameState.gameStatus"
          :current-player="gameStore.gameState.currentPlayer"
          :move-count="gameStore.gameState.moveHistory.length"
          :game-time="gameStore.currentGameTime"
          :time-remaining="gameStore.timeRemaining"
          :time-limit="gameStore.gameState.config.timeLimit"
          :show-timer="showTimer"
          :move-history="gameStore.gameState.moveHistory"
          :ai-analysis="gameStore.currentAIEvaluation"
          :show-ai-analysis="showAIAnalysis"
          :show-history="true"
          :win-reason="winReason"
          :average-think-time="averageThinkTime"
          @select-move="handleSelectMove"
        />
      </div>
    </div>

    <!-- 游戏结束对话框 -->
    <div v-if="gameStore.isGameOver && showGameEndDialog" class="game-end-overlay">
      <div class="game-end-dialog">
        <div class="dialog-header">
          <h2 class="dialog-title">{{ gameEndTitle }}</h2>
          <div class="dialog-result">
            <div :class="resultIconClasses">
              <svg v-if="gameStore.gameState.gameStatus !== 'draw'" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
              <svg v-else viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11H7v-2h10v2z"/>
              </svg>
            </div>
            <div class="result-text">{{ gameEndMessage }}</div>
          </div>
        </div>

        <div class="dialog-body">
          <div class="game-summary">
            <div class="summary-item">
              <span class="summary-label">游戏时长:</span>
              <span class="summary-value">{{ formatTime(gameStore.currentGameTime) }}</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">总步数:</span>
              <span class="summary-value">{{ gameStore.gameState.moveHistory.length }}</span>
            </div>
            <div v-if="gameStore.winLine" class="summary-item">
              <span class="summary-label">获胜方式:</span>
              <span class="summary-value">五子连珠</span>
            </div>
          </div>
        </div>

        <div class="dialog-footer">
          <button class="btn btn-secondary" @click="closeGameEndDialog">
            查看棋局
          </button>
          <button class="btn btn-primary" @click="startNewGameFromDialog">
            再来一局
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { ChessBoard } from '@/components/ChessBoard'
import { ControlPanel } from '@/components/ControlPanel'
import { GameInfo } from '@/components/GameInfo'
import { useGameStore } from '@/stores'
import { GameStatus, PieceType } from '@/types'
import { audioManager, effectsManager } from '@/utils'
import type { Position, GameConfig } from '@/types'

// 状态管理
const gameStore = useGameStore()

// 组件状态
const isLoading = ref(false)
const hintPosition = ref<Position | null>(null)
const errorMessage = ref('')
const showGameEndDialog = ref(false)
const hoveredCell = ref<Position | null>(null)

// 计算属性
const isGameDisabled = computed(() => 
  gameStore.isGameOver || 
  gameStore.gameState.gameStatus === GameStatus.PAUSED ||
  gameStore.isCurrentPlayerAI ||
  gameStore.isAIThinking
)

const showWinLine = computed(() => 
  gameStore.isGameOver && !!gameStore.winLine
)

const thinkingText = computed(() => {
  if (gameStore.isAIThinking) {
    return `AI正在思考中...`
  }
  return 'AI思考中'
})

const playerIndicatorClasses = computed(() => [
  'player-piece',
  {
    'player-piece--black': gameStore.gameState.currentPlayer.piece === PieceType.BLACK,
    'player-piece--white': gameStore.gameState.currentPlayer.piece === PieceType.WHITE
  }
])

const canShowHint = computed(() => 
  gameStore.gameState.gameStatus === GameStatus.PLAYING &&
  !gameStore.isCurrentPlayerAI &&
  !gameStore.isAIThinking
)

const canAnalyze = computed(() => 
  gameStore.gameState.moveHistory.length > 0 &&
  !gameStore.isAIThinking
)

const canExport = computed(() => 
  gameStore.gameState.moveHistory.length > 0
)

const showTimer = computed(() => 
  gameStore.gameState.config.timeLimit > 0 &&
  gameStore.gameState.gameStatus === GameStatus.PLAYING
)

const showAIAnalysis = computed(() => 
  !!gameStore.currentAIEvaluation
)

const winReason = computed(() => {
  if (gameStore.gameState.gameStatus === GameStatus.HUMAN_WON) {
    return '恭喜您获得胜利！'
  } else if (gameStore.gameState.gameStatus === GameStatus.AI_WON) {
    return 'AI获得胜利，再接再厉！'
  } else if (gameStore.gameState.gameStatus === GameStatus.DRAW) {
    return '棋盘已满，平局！'
  }
  return ''
})

const averageThinkTime = computed(() => {
  // 计算AI平均思考时间的逻辑
  return 0
})

const gameEndTitle = computed(() => {
  switch (gameStore.gameState.gameStatus) {
    case GameStatus.HUMAN_WON:
      return '恭喜获胜！'
    case GameStatus.AI_WON:
      return '很遗憾...'
    case GameStatus.DRAW:
      return '平局'
    default:
      return '游戏结束'
  }
})

const gameEndMessage = computed(() => {
  switch (gameStore.gameState.gameStatus) {
    case GameStatus.HUMAN_WON:
      return '您成功击败了AI！'
    case GameStatus.AI_WON:
      return 'AI获得了胜利，再试一次吧！'
    case GameStatus.DRAW:
      return '势均力敌，不分胜负！'
    default:
      return ''
  }
})

const resultIconClasses = computed(() => [
  'result-icon',
  {
    'result-icon--win': gameStore.gameState.gameStatus === GameStatus.HUMAN_WON,
    'result-icon--lose': gameStore.gameState.gameStatus === GameStatus.AI_WON,
    'result-icon--draw': gameStore.gameState.gameStatus === GameStatus.DRAW
  }
])

// 事件处理
const handlePlayerMove = async (position: Position) => {
  clearError()
  
  // 播放落子音效
  if (gameStore.gameState.config.enableSound) {
    audioManager.playSound('stoneDrop')
  }
  
  const success = await gameStore.makeMove(position)
  if (!success) {
    showError('无法在此位置落子')
    
    // 播放错误音效和动画
    if (gameStore.gameState.config.enableSound) {
      audioManager.playSound('buttonClick', 0.3)
    }
  }
}

const handleNewGame = async () => {
  isLoading.value = true
  
  // 播放按钮音效
  if (gameStore.gameState.config.enableSound) {
    audioManager.playSound('buttonClick')
  }
  
  try {
    await gameStore.startNewGame()
    showGameEndDialog.value = false
    clearHint()
    clearError()
    
    // 清理特效
    effectsManager.clearParticles()
  } finally {
    isLoading.value = false
  }
}

const handleUndo = () => {
  // 播放悔棋音效
  if (gameStore.gameState.config.enableSound) {
    audioManager.playSound('undo')
  }
  
  gameStore.undoMove()
  clearHint()
}

const handlePauseResume = () => {
  if (gameStore.gameState.gameStatus === GameStatus.PLAYING) {
    gameStore.pauseGame()
  } else if (gameStore.gameState.gameStatus === GameStatus.PAUSED) {
    gameStore.resumeGame()
  }
}

const handleConfigChange = (config: Partial<GameConfig>) => {
  gameStore.updateConfig(config)
  
  // 更新音频设置
  if (config.enableSound !== undefined) {
    audioManager.setEnabled(config.enableSound)
    if (config.enableSound) {
      audioManager.playSound('buttonClick', 0.5)
    }
  }
}

const handleShowHint = async () => {
  if (!canShowHint.value) return
  
  try {
    // 使用AI引擎计算提示位置
    // 这里可以调用一个简化的AI计算
    clearHint()
    showError('提示功能开发中...')
  } catch (error) {
    showError('无法获取提示')
  }
}

const handleAnalyzePosition = () => {
  // 分析当前局面
  showError('分析功能开发中...')
}

const handleExportGame = () => {
  // 导出游戏记录
  try {
    const gameData = {
      config: gameStore.gameState.config,
      moves: gameStore.gameState.moveHistory,
      result: gameStore.gameState.gameStatus,
      startTime: gameStore.gameState.startTime,
      endTime: Date.now()
    }
    
    const dataStr = JSON.stringify(gameData, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    
    const link = document.createElement('a')
    link.href = url
    link.download = `gomoku_game_${new Date().getTime()}.json`
    link.click()
    
    URL.revokeObjectURL(url)
  } catch (error) {
    showError('导出失败')
  }
}

const handleCellHover = (position: Position) => {
  hoveredCell.value = position
}

const handleCellLeave = (position: Position) => {
  hoveredCell.value = null
}

const handleSelectMove = (moveIndex: number) => {
  // 这里可以实现回到指定步数的功能
  console.log('Select move:', moveIndex)
}

const startNewGameFromDialog = () => {
  handleNewGame()
}

const closeGameEndDialog = () => {
  showGameEndDialog.value = false
}

// 工具方法
const formatPosition = (position: Position): string => {
  const col = String.fromCharCode(65 + position.col)
  const row = 19 - position.row
  return `${col}${row}`
}

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

const showError = (message: string) => {
  errorMessage.value = message
  setTimeout(() => {
    errorMessage.value = ''
  }, 3000)
}

const clearError = () => {
  errorMessage.value = ''
}

const clearHint = () => {
  hintPosition.value = null
}

// 监听游戏结束事件
watch(
  () => gameStore.isGameOver,
  async (isGameOver) => {
    if (isGameOver) {
      // 播放结束音效
      if (gameStore.gameState.config.enableSound) {
        if (gameStore.gameState.gameStatus === GameStatus.HUMAN_WON) {
          audioManager.playSound('win')
        } else if (gameStore.gameState.gameStatus === GameStatus.AI_WON) {
          audioManager.playSound('lose')
        }
      }
      
      // 获胜特效
      if (gameStore.gameState.config.enableAnimation && gameStore.winLine) {
        await nextTick()
        const winLineElement = document.querySelector('.win-line') as HTMLElement
        if (winLineElement) {
          effectsManager.animateWinLine(winLineElement)
        }
        
        // 获胜棋子庆祝效果
        const winningStones = document.querySelectorAll('.chess-cell--winning .chess-stone')
        winningStones.forEach((stone, index) => {
          setTimeout(() => {
            effectsManager.createWinCelebration(stone as HTMLElement)
          }, index * 100)
        })
      }
      
      setTimeout(() => {
        showGameEndDialog.value = true
      }, 1500) // 延迟显示对话框，让用户看到最后的落子
    }
  }
)

// 生命周期
onMounted(async () => {
  // 初始化音频系统
  audioManager.initializeSounds()
  audioManager.setEnabled(true)
  
  // 用户交互后恢复音频上下文
  const resumeAudio = () => {
    audioManager.resumeAudioContext()
    document.removeEventListener('click', resumeAudio)
    document.removeEventListener('keydown', resumeAudio)
  }
  document.addEventListener('click', resumeAudio)
  document.addEventListener('keydown', resumeAudio)
  
  // 初始化游戏
  await handleNewGame()
})

onUnmounted(() => {
  // 清理资源
  effectsManager.destroy()
})
</script>

<style scoped>
.game-board {
  position: relative;
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
}

.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.loading-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  background: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.loading-spinner {
  width: 2rem;
  height: 2rem;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.loading-text {
  font-size: 1rem;
  font-weight: 500;
  color: #333;
}

.game-layout {
  display: grid;
  grid-template-columns: 320px 1fr 320px;
  gap: 2rem;
  padding: 2rem;
  min-height: 100vh;
}

.game-sidebar {
  display: flex;
  flex-direction: column;
}

.game-main {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.board-container {
  position: relative;
  max-width: 600px;
  width: 100%;
}

.game-hints {
  position: relative;
  width: 100%;
  max-width: 600px;
}

.turn-hint {
  display: flex;
  justify-content: center;
  padding: 1rem;
}

.hint-content {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1.5rem;
  background: white;
  border-radius: 25px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.ai-thinking {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: #3b82f6;
}

.thinking-indicator {
  display: flex;
  align-items: center;
}

.thinking-dots {
  display: flex;
  gap: 0.25rem;
}

.thinking-dots span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #3b82f6;
  animation: thinking 1.4s infinite ease-in-out both;
}

.thinking-dots span:nth-child(1) { animation-delay: -0.32s; }
.thinking-dots span:nth-child(2) { animation-delay: -0.16s; }

.player-turn {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: #16a34a;
}

.player-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
}

.player-piece {
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 50%;
  border: 2px solid rgba(0, 0, 0, 0.1);
}

.player-piece--black {
  background: radial-gradient(circle at 30% 30%, #666 0%, #1a1a1a 70%);
}

.player-piece--white {
  background: radial-gradient(circle at 30% 30%, #fff 0%, #e0e0e0 70%);
}

.hint-overlay,
.error-overlay {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  z-index: 100;
}

.hint-message,
.error-message {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.hint-message {
  background: #dbeafe;
  color: #1d4ed8;
  border: 1px solid #3b82f6;
}

.error-message {
  background: #fee2e2;
  color: #dc2626;
  border: 1px solid #ef4444;
}

.hint-close,
.error-close {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1.25rem;
  font-weight: bold;
  color: inherit;
  opacity: 0.7;
  transition: opacity 0.2s ease;
}

.hint-close:hover,
.error-close:hover {
  opacity: 1;
}

.game-end-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1500;
  animation: fadeIn 0.3s ease-out;
}

.game-end-dialog {
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  max-width: 400px;
  width: 90%;
  overflow: hidden;
  animation: slideIn 0.3s ease-out;
}

.dialog-header {
  padding: 2rem 2rem 1rem;
  text-align: center;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
}

.dialog-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #333;
  margin: 0 0 1rem;
}

.dialog-result {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}

.result-icon {
  width: 4rem;
  height: 4rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.result-icon svg {
  width: 2rem;
  height: 2rem;
  fill: white;
}

.result-icon--win {
  background: linear-gradient(135deg, #22c55e, #16a34a);
}

.result-icon--lose {
  background: linear-gradient(135deg, #ef4444, #dc2626);
}

.result-icon--draw {
  background: linear-gradient(135deg, #64748b, #475569);
}

.result-text {
  font-size: 1.125rem;
  font-weight: 500;
  color: #333;
}

.dialog-body {
  padding: 1rem 2rem;
}

.game-summary {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.summary-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px solid #f1f5f9;
}

.summary-label {
  font-size: 0.875rem;
  color: #6b7280;
}

.summary-value {
  font-size: 0.875rem;
  font-weight: 600;
  color: #333;
}

.dialog-footer {
  display: flex;
  gap: 0.75rem;
  padding: 1rem 2rem 2rem;
}

.dialog-footer .btn {
  flex: 1;
  padding: 0.75rem 1rem;
  font-size: 0.875rem;
  font-weight: 500;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary {
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: white;
}

.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
}

.btn-secondary {
  background: #f8fafc;
  color: #475569;
  border: 1px solid #e2e8f0;
}

.btn-secondary:hover {
  background: #f1f5f9;
}

/* 动画 */
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@keyframes thinking {
  0%, 80%, 100% {
    transform: scale(0);
  }
  40% {
    transform: scale(1);
  }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideIn {
  from {
    transform: translateY(-20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .game-layout {
    grid-template-columns: 280px 1fr 280px;
    gap: 1rem;
    padding: 1rem;
  }
}

@media (max-width: 968px) {
  .game-layout {
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr auto;
    gap: 1rem;
  }
  
  .game-sidebar--left {
    order: 2;
  }
  
  .game-main {
    order: 1;
  }
  
  .game-sidebar--right {
    order: 3;
  }
}

@media (max-width: 640px) {
  .game-layout {
    padding: 0.5rem;
  }
  
  .dialog-header,
  .dialog-body,
  .dialog-footer {
    padding-left: 1rem;
    padding-right: 1rem;
  }
}
</style>