<template>
  <div class="game-info">
    <!-- 游戏状态显示 -->
    <div class="status-section">
      <div class="status-header">
        <h3 class="status-title">游戏状态</h3>
        <div :class="statusIndicatorClasses">
          <div class="status-dot"></div>
          <span class="status-text">{{ statusText }}</span>
        </div>
      </div>
      
      <!-- 当前回合信息 -->
      <div v-if="gameStatus === 'playing'" class="turn-info">
        <div class="current-player">
          <div :class="playerIconClasses">
            <div class="player-piece"></div>
          </div>
          <div class="player-details">
            <div class="player-name">{{ currentPlayer.name }}</div>
            <div class="player-type">{{ playerTypeText }}</div>
          </div>
        </div>
        
        <!-- 倒计时 -->
        <div v-if="showTimer && timeRemaining > 0" class="timer-container">
          <div class="timer-label">剩余时间</div>
          <div :class="timerClasses">
            <svg class="timer-icon" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/>
              <path d="M12 2v6l4-4-4-4z" fill="currentColor"/>
            </svg>
            <span class="timer-text">{{ formatTime(timeRemaining) }}</span>
          </div>
          <div 
            class="timer-progress"
            :style="{ transform: `scaleX(${timeProgress})` }"
          ></div>
        </div>
      </div>

      <!-- 游戏结果 -->
      <div v-if="isGameOver" class="game-result">
        <div :class="resultClasses">
          <svg v-if="gameStatus !== 'draw'" class="result-icon" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
          <svg v-else class="result-icon" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11H7v-2h10v2z"/>
          </svg>
          <div class="result-text">{{ resultText }}</div>
        </div>
        
        <!-- 获胜原因 -->
        <div v-if="winReason" class="win-reason">
          {{ winReason }}
        </div>
      </div>
    </div>

    <!-- 游戏统计 -->
    <div class="stats-section">
      <h3 class="section-title">本局统计</h3>
      
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon">
            <svg viewBox="0 0 24 24">
              <path d="M7 14l5-5 5 5z"/>
            </svg>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ moveCount }}</div>
            <div class="stat-label">步数</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon">
            <svg viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
            </svg>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ formatTime(gameTime) }}</div>
            <div class="stat-label">用时</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon">
            <svg viewBox="0 0 24 24">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ averageThinkTime }}s</div>
            <div class="stat-label">平均思考</div>
          </div>
        </div>
      </div>
    </div>

    <!-- AI分析信息 -->
    <div v-if="showAIAnalysis && aiAnalysis" class="analysis-section">
      <h3 class="section-title">AI分析</h3>
      
      <div class="analysis-content">
        <div class="analysis-item">
          <span class="analysis-label">评估分数:</span>
          <span class="analysis-value">{{ aiAnalysis.score }}</span>
        </div>
        
        <div class="analysis-item">
          <span class="analysis-label">搜索深度:</span>
          <span class="analysis-value">{{ aiAnalysis.depth }}</span>
        </div>
        
        <div class="analysis-item">
          <span class="analysis-label">计算时间:</span>
          <span class="analysis-value">{{ aiAnalysis.evaluationTime }}ms</span>
        </div>
        
        <div v-if="aiAnalysis.bestMove" class="analysis-item">
          <span class="analysis-label">推荐落子:</span>
          <span class="analysis-value">
            {{ getPositionLabel(aiAnalysis.bestMove) }}
          </span>
        </div>
      </div>
    </div>

    <!-- 游戏历史 -->
    <div v-if="showHistory && moveHistory.length > 0" class="history-section">
      <h3 class="section-title">
        着法记录
        <button 
          class="history-toggle"
          @click="toggleHistoryExpanded"
        >
          <svg :class="{ 'rotated': historyExpanded }" viewBox="0 0 24 24">
            <path d="M7 10l5 5 5-5z"/>
          </svg>
        </button>
      </h3>
      
      <div v-if="historyExpanded" class="history-content">
        <div class="history-list">
          <div
            v-for="(move, index) in visibleMoves"
            :key="index"
            :class="moveItemClasses(index)"
            @click="selectMove(index)"
          >
            <div class="move-number">{{ move.moveNumber }}</div>
            <div class="move-player">
              <div :class="getMovePlayerPieceClass(move.player.piece)"></div>
            </div>
            <div class="move-position">{{ getPositionLabel(move.position) }}</div>
            <div class="move-time">{{ formatMoveTime(move.timestamp) }}</div>
          </div>
        </div>
        
        <div v-if="moveHistory.length > maxVisibleMoves" class="history-pagination">
          <button 
            @click="loadMoreMoves"
            class="btn btn-sm btn-secondary"
          >
            显示更多 ({{ moveHistory.length - visibleMoves.length }})
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { GameStatus, PieceType, PlayerType } from '@/types'
import type { Player, Move, Position, AIEvaluation } from '@/types'

// Props定义
interface Props {
  gameStatus: GameStatus
  currentPlayer: Player
  moveCount: number
  gameTime: number
  timeRemaining?: number
  timeLimit?: number
  showTimer?: boolean
  moveHistory: Move[]
  aiAnalysis?: AIEvaluation | null
  showAIAnalysis?: boolean
  showHistory?: boolean
  winReason?: string
  averageThinkTime?: number
}

const props = withDefaults(defineProps<Props>(), {
  timeRemaining: 0,
  timeLimit: 30,
  showTimer: true,
  aiAnalysis: null,
  showAIAnalysis: false,
  showHistory: true,
  winReason: '',
  averageThinkTime: 0
})

// Events定义
interface Emits {
  selectMove: [moveIndex: number]
}

const emit = defineEmits<Emits>()

// 响应式状态
const historyExpanded = ref(true)
const selectedMoveIndex = ref(-1)
const maxVisibleMoves = ref(10)

// 计算属性
const isGameOver = computed(() => 
  props.gameStatus === 'human_won' || 
  props.gameStatus === 'ai_won' || 
  props.gameStatus === 'draw'
)

const statusText = computed(() => {
  switch (props.gameStatus) {
    case 'ready':
      return '准备开始'
    case 'playing':
      return '游戏中'
    case 'paused':
      return '已暂停'
    case 'human_won':
      return '玩家获胜'
    case 'ai_won':
      return 'AI获胜'
    case 'draw':
      return '平局'
    default:
      return '未知状态'
  }
})

const statusIndicatorClasses = computed(() => [
  'status-indicator',
  {
    'status-indicator--ready': props.gameStatus === 'ready',
    'status-indicator--playing': props.gameStatus === 'playing',
    'status-indicator--paused': props.gameStatus === 'paused',
    'status-indicator--won': isGameOver.value && props.gameStatus !== 'draw',
    'status-indicator--draw': props.gameStatus === 'draw'
  }
])

const playerTypeText = computed(() => 
  props.currentPlayer.type === PlayerType.HUMAN ? '人类玩家' : 'AI玩家'
)

const playerIconClasses = computed(() => [
  'player-icon',
  {
    'player-icon--black': props.currentPlayer.piece === PieceType.BLACK,
    'player-icon--white': props.currentPlayer.piece === PieceType.WHITE
  }
])

const timeProgress = computed(() => {
  if (props.timeLimit <= 0) return 1
  return props.timeRemaining / props.timeLimit
})

const timerClasses = computed(() => [
  'timer',
  {
    'timer--warning': timeProgress.value < 0.3,
    'timer--danger': timeProgress.value < 0.1
  }
])

const resultText = computed(() => {
  switch (props.gameStatus) {
    case 'human_won':
      return '恭喜！您获得了胜利'
    case 'ai_won':
      return 'AI获胜，再接再厉'
    case 'draw':
      return '平局，势均力敌'
    default:
      return ''
  }
})

const resultClasses = computed(() => [
  'result',
  {
    'result--human-won': props.gameStatus === 'human_won',
    'result--ai-won': props.gameStatus === 'ai_won',
    'result--draw': props.gameStatus === 'draw'
  }
])

const visibleMoves = computed(() => 
  props.moveHistory.slice(0, maxVisibleMoves.value)
)

// 方法
const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

const formatMoveTime = (timestamp: number): string => {
  const date = new Date(timestamp)
  return date.toLocaleTimeString()
}

const getPositionLabel = (position: Position): string => {
  const col = String.fromCharCode(65 + position.col) // A, B, C...
  const row = 19 - position.row // 从上到下: 19, 18, 17...
  return `${col}${row}`
}

const getMovePlayerPieceClass = (piece: PieceType) => [
  'move-piece',
  {
    'move-piece--black': piece === PieceType.BLACK,
    'move-piece--white': piece === PieceType.WHITE
  }
]

const moveItemClasses = (index: number) => [
  'move-item',
  {
    'move-item--selected': index === selectedMoveIndex.value,
    'move-item--even': index % 2 === 0
  }
]

const toggleHistoryExpanded = () => {
  historyExpanded.value = !historyExpanded.value
}

const selectMove = (index: number) => {
  selectedMoveIndex.value = index
  emit('selectMove', index)
}

const loadMoreMoves = () => {
  maxVisibleMoves.value += 10
}

// 监听器
watch(
  () => props.moveHistory.length,
  () => {
    // 新的移动时自动选择最后一步
    if (props.moveHistory.length > 0) {
      selectedMoveIndex.value = props.moveHistory.length - 1
    }
  }
)
</script>

<style scoped>
.game-info {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 1.5rem;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  min-width: 300px;
  max-height: 80vh;
  overflow-y: auto;
}

/* 状态部分 */
.status-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.status-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.status-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: #333;
  margin: 0;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border-radius: 20px;
  font-size: 0.875rem;
  font-weight: 500;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  animation: pulse 2s infinite;
}

.status-indicator--ready {
  background-color: #f3f4f6;
  color: #6b7280;
}

.status-indicator--ready .status-dot {
  background-color: #6b7280;
}

.status-indicator--playing {
  background-color: #dbeafe;
  color: #1d4ed8;
}

.status-indicator--playing .status-dot {
  background-color: #3b82f6;
}

.status-indicator--paused {
  background-color: #fef3c7;
  color: #d97706;
}

.status-indicator--paused .status-dot {
  background-color: #f59e0b;
}

.status-indicator--won {
  background-color: #dcfce7;
  color: #166534;
}

.status-indicator--won .status-dot {
  background-color: #22c55e;
}

.status-indicator--draw {
  background-color: #f1f5f9;
  color: #475569;
}

.status-indicator--draw .status-dot {
  background-color: #64748b;
}

/* 回合信息 */
.turn-info {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
  background: #f8fafc;
  border-radius: 6px;
}

.current-player {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.player-icon {
  position: relative;
  width: 3rem;
  height: 3rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.player-icon--black {
  background: radial-gradient(circle at 30% 30%, #666 0%, #1a1a1a 70%);
}

.player-icon--white {
  background: radial-gradient(circle at 30% 30%, #fff 0%, #e0e0e0 70%);
  border: 2px solid #d1d5db;
}

.player-piece {
  width: 80%;
  height: 80%;
  border-radius: 50%;
  background: inherit;
}

.player-details {
  flex: 1;
}

.player-name {
  font-size: 1rem;
  font-weight: 600;
  color: #333;
}

.player-type {
  font-size: 0.875rem;
  color: #6b7280;
}

/* 计时器 */
.timer-container {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.timer-label {
  font-size: 0.875rem;
  color: #6b7280;
  text-align: center;
}

.timer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: white;
  border-radius: 6px;
  border: 2px solid #e5e7eb;
  transition: all 0.3s ease;
}

.timer--warning {
  border-color: #f59e0b;
  background-color: #fef3c7;
  color: #d97706;
}

.timer--danger {
  border-color: #ef4444;
  background-color: #fee2e2;
  color: #dc2626;
  animation: timerPulse 1s infinite;
}

.timer-icon {
  width: 1.25rem;
  height: 1.25rem;
  fill: currentColor;
}

.timer-text {
  font-size: 1.125rem;
  font-weight: 600;
  font-family: 'Courier New', monospace;
}

.timer-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 3px;
  background: linear-gradient(90deg, #22c55e, #f59e0b, #ef4444);
  border-radius: 0 0 6px 6px;
  transform-origin: left;
  transition: transform 1s linear;
}

/* 游戏结果 */
.game-result {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1.5rem;
  border-radius: 8px;
  text-align: center;
}

.result {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
}

.result--human-won {
  background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
  color: #166534;
}

.result--ai-won {
  background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
  color: #dc2626;
}

.result--draw {
  background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
  color: #475569;
}

.result-icon {
  width: 2rem;
  height: 2rem;
  fill: currentColor;
}

.result-text {
  font-size: 1.125rem;
  font-weight: 600;
}

.win-reason {
  font-size: 0.875rem;
  opacity: 0.8;
}

/* 统计网格 */
.section-title {
  font-size: 1rem;
  font-weight: 600;
  color: #333;
  margin: 0;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
  gap: 0.75rem;
}

.stat-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  background: #f8fafc;
  border-radius: 6px;
  text-align: center;
}

.stat-icon {
  width: 1.5rem;
  height: 1.5rem;
  color: #6b7280;
}

.stat-icon svg {
  width: 100%;
  height: 100%;
  fill: currentColor;
}

.stat-value {
  font-size: 1.25rem;
  font-weight: 700;
  color: #333;
}

.stat-label {
  font-size: 0.75rem;
  color: #6b7280;
}

/* AI分析 */
.analysis-content {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem;
  background: #f8fafc;
  border-radius: 6px;
}

.analysis-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.875rem;
}

.analysis-label {
  color: #6b7280;
}

.analysis-value {
  font-weight: 600;
  color: #333;
}

/* 历史记录 */
.history-section .section-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.history-toggle {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 3px;
  transition: background-color 0.2s ease;
}

.history-toggle:hover {
  background-color: #f3f4f6;
}

.history-toggle svg {
  width: 1rem;
  height: 1rem;
  fill: #6b7280;
  transition: transform 0.2s ease;
}

.history-toggle svg.rotated {
  transform: rotate(180deg);
}

.history-content {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  max-height: 300px;
  overflow-y: auto;
}

.move-item {
  display: grid;
  grid-template-columns: 2rem 2rem 3rem 1fr;
  gap: 0.5rem;
  align-items: center;
  padding: 0.5rem;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  font-size: 0.875rem;
}

.move-item:hover {
  background-color: #f3f4f6;
}

.move-item--selected {
  background-color: #dbeafe;
  color: #1d4ed8;
}

.move-item--even {
  background-color: #f9fafb;
}

.move-number {
  font-weight: 600;
  text-align: center;
}

.move-piece {
  width: 1.25rem;
  height: 1.25rem;
  border-radius: 50%;
  margin: 0 auto;
}

.move-piece--black {
  background: radial-gradient(circle at 30% 30%, #666 0%, #1a1a1a 70%);
}

.move-piece--white {
  background: radial-gradient(circle at 30% 30%, #fff 0%, #e0e0e0 70%);
  border: 1px solid #d1d5db;
}

.move-position {
  font-weight: 600;
  text-align: center;
}

.move-time {
  font-size: 0.75rem;
  color: #6b7280;
  text-align: right;
}

.history-pagination {
  display: flex;
  justify-content: center;
}

/* 动画 */
@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

@keyframes timerPulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .game-info {
    min-width: auto;
    padding: 1rem;
  }
  
  .status-header {
    flex-direction: column;
    align-items: stretch;
  }
  
  .current-player {
    flex-direction: column;
    text-align: center;
  }
  
  .stats-grid {
    grid-template-columns: repeat(3, 1fr);
  }
  
  .move-item {
    grid-template-columns: 1.5rem 1.5rem 2.5rem 1fr;
    gap: 0.25rem;
    font-size: 0.8rem;
  }
}
</style>