<template>
  <div class="chess-board">
    <!-- 棋盘坐标标识 -->
    <div class="board-coordinates">
      <!-- 顶部列坐标 -->
      <div class="coordinate-row coordinate-row--top">
        <div class="coordinate-corner"></div>
        <div
          v-for="col in boardSize"
          :key="`top-${col}`"
          class="coordinate-cell"
        >
          {{ getColumnLabel(col - 1) }}
        </div>
        <div class="coordinate-corner"></div>
      </div>

      <!-- 中间棋盘区域 -->
      <div class="board-content">
        <!-- 左侧行坐标 -->
        <div class="coordinate-column coordinate-column--left">
          <div
            v-for="row in boardSize"
            :key="`left-${row}`"
            class="coordinate-cell"
          >
            {{ boardSize - row + 1 }}
          </div>
        </div>

        <!-- 棋盘主体 -->
        <div 
          :class="boardClasses"
          :style="boardStyles"
        >
          <div
            v-for="row in boardSize"
            :key="`row-${row}`"
            class="board-row"
          >
            <ChessCell
              v-for="col in boardSize"
              :key="`cell-${row}-${col}`"
              :position="{ row: row - 1, col: col - 1 }"
              :piece-type="getBoardPiece(row - 1, col - 1)"
              :board-size="boardSize"
              :clickable="isCellClickable(row - 1, col - 1)"
              :is-last-move="isLastMove(row - 1, col - 1)"
              :is-winning-stone="isWinningStone(row - 1, col - 1)"
              :current-player-piece="currentPlayerPiece"
              @click="handleCellClick"
              @mouse-enter="handleCellHover"
              @mouse-leave="handleCellLeave"
            />
          </div>
        </div>

        <!-- 右侧行坐标 -->
        <div class="coordinate-column coordinate-column--right">
          <div
            v-for="row in boardSize"
            :key="`right-${row}`"
            class="coordinate-cell"
          >
            {{ boardSize - row + 1 }}
          </div>
        </div>
      </div>

      <!-- 底部列坐标 -->
      <div class="coordinate-row coordinate-row--bottom">
        <div class="coordinate-corner"></div>
        <div
          v-for="col in boardSize"
          :key="`bottom-${col}`"
          class="coordinate-cell"
        >
          {{ getColumnLabel(col - 1) }}
        </div>
        <div class="coordinate-corner"></div>
      </div>
    </div>

    <!-- 获胜连线 -->
    <div
      v-if="winLine && showWinLine"
      class="win-line"
      :style="winLineStyles"
    ></div>

    <!-- 思考提示遮罩 -->
    <div
      v-if="isThinking"
      class="thinking-overlay"
    >
      <div class="thinking-content">
        <div class="thinking-spinner"></div>
        <div class="thinking-text">{{ thinkingText }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import ChessCell from './ChessCell.vue'
import { PieceType } from '@/types'
import { GameLogic } from '@/utils'
import type { Board, Position, WinLine, Player } from '@/types'

// Props定义
interface Props {
  board: Board
  currentPlayer: Player
  disabled?: boolean
  winLine?: WinLine | null
  showWinLine?: boolean
  isThinking?: boolean
  thinkingText?: string
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  winLine: null,
  showWinLine: false,
  isThinking: false,
  thinkingText: 'AI正在思考...'
})

// Events定义
interface Emits {
  move: [position: Position]
  cellHover: [position: Position]
  cellLeave: [position: Position]
}

const emit = defineEmits<Emits>()

// 响应式状态
const hoveredCell = ref<Position | null>(null)

// 计算属性
const boardSize = computed(() => props.board.size)

const currentPlayerPiece = computed(() => props.currentPlayer.piece)

const boardClasses = computed(() => [
  'board-grid',
  {
    'board-grid--disabled': props.disabled,
    'board-grid--thinking': props.isThinking
  }
])

const boardStyles = computed(() => ({
  gridTemplateColumns: `repeat(${boardSize.value}, 1fr)`,
  gridTemplateRows: `repeat(${boardSize.value}, 1fr)`
}))

// 获取棋盘指定位置的棋子
const getBoardPiece = (row: number, col: number): PieceType => {
  if (row < 0 || row >= boardSize.value || col < 0 || col >= boardSize.value) {
    return PieceType.EMPTY
  }
  return props.board.grid[row][col]
}

// 检查格子是否可点击
const isCellClickable = (row: number, col: number): boolean => {
  if (props.disabled || props.isThinking) return false
  return GameLogic.isEmptyPosition(props.board, { row, col })
}

// 检查是否为最后落子位置
const isLastMove = (row: number, col: number): boolean => {
  if (!props.board.lastMove) return false
  return props.board.lastMove.row === row && props.board.lastMove.col === col
}

// 检查是否为获胜棋子
const isWinningStone = (row: number, col: number): boolean => {
  if (!props.winLine || !props.showWinLine) return false
  return props.winLine.positions.some(pos => pos.row === row && pos.col === col)
}

// 获取列标签（A, B, C...）
const getColumnLabel = (col: number): string => {
  return String.fromCharCode(65 + col) // A=65
}

// 计算获胜连线样式
const winLineStyles = computed(() => {
  if (!props.winLine || !props.showWinLine) return {}

  const start = props.winLine.start
  const end = props.winLine.end
  
  // 计算线条的位置和角度
  const cellSize = 100 / boardSize.value // 每个格子的百分比大小
  
  const startX = (start.col + 0.5) * cellSize
  const startY = (start.row + 0.5) * cellSize
  const endX = (end.col + 0.5) * cellSize
  const endY = (end.row + 0.5) * cellSize
  
  const length = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2))
  const angle = Math.atan2(endY - startY, endX - startX) * 180 / Math.PI
  
  return {
    position: 'absolute',
    left: `${startX}%`,
    top: `${startY}%`,
    width: `${length}%`,
    height: '4px',
    backgroundColor: '#4CAF50',
    transform: `rotate(${angle}deg)`,
    transformOrigin: '0 50%',
    zIndex: 100,
    borderRadius: '2px',
    boxShadow: '0 0 8px rgba(76, 175, 80, 0.6)'
  }
})

// 事件处理
const handleCellClick = (position: Position) => {
  if (!isCellClickable(position.row, position.col)) return
  
  const validation = GameLogic.isValidMove(props.board, position, props.currentPlayer)
  if (validation.valid) {
    emit('move', position)
  }
}

const handleCellHover = (position: Position) => {
  hoveredCell.value = position
  emit('cellHover', position)
}

const handleCellLeave = (position: Position) => {
  hoveredCell.value = null
  emit('cellLeave', position)
}

// 监听棋盘变化
watch(
  () => props.board,
  () => {
    // 棋盘更新时可以添加一些动画效果
  },
  { deep: true }
)
</script>

<style scoped>
.chess-board {
  position: relative;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #DEB887 0%, #D2691E 100%);
  border-radius: 8px;
  padding: 1rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  user-select: none;
}

/* 棋盘坐标系统 */
.board-coordinates {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
}

.coordinate-row {
  display: flex;
  align-items: center;
  height: 2rem;
}

.coordinate-row--top {
  margin-bottom: 0.5rem;
}

.coordinate-row--bottom {
  margin-top: 0.5rem;
}

.board-content {
  display: flex;
  flex: 1;
  align-items: stretch;
}

.coordinate-column {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  width: 2rem;
}

.coordinate-column--left {
  margin-right: 0.5rem;
}

.coordinate-column--right {
  margin-left: 0.5rem;
}

.coordinate-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
  font-weight: 600;
  color: #8B4513;
  flex: 1;
  min-height: 1.5rem;
}

.coordinate-corner {
  width: 2rem;
  height: 2rem;
}

/* 棋盘主体 */
.board-grid {
  position: relative;
  display: grid;
  gap: 0;
  aspect-ratio: 1;
  background-color: #F4A460;
  border: 2px solid #8B4513;
  border-radius: 4px;
  overflow: hidden;
  transition: all 0.3s ease;
}

.board-grid--disabled {
  pointer-events: none;
  opacity: 0.7;
}

.board-grid--thinking {
  pointer-events: none;
}

.board-row {
  display: contents;
}

/* 获胜连线 */
.win-line {
  animation: winLineAppear 0.8s ease-out;
}

/* 思考遮罩 */
.thinking-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  border-radius: 8px;
}

.thinking-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  background: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.thinking-spinner {
  width: 2rem;
  height: 2rem;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.thinking-text {
  font-size: 1rem;
  font-weight: 500;
  color: #333;
  text-align: center;
}

/* 动画 */
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@keyframes winLineAppear {
  0% {
    transform: scale(0) rotate(var(--angle, 0deg));
    opacity: 0;
  }
  50% {
    opacity: 1;
  }
  100% {
    transform: scale(1) rotate(var(--angle, 0deg));
    opacity: 1;
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .chess-board {
    padding: 0.5rem;
  }
  
  .coordinate-cell {
    font-size: 0.75rem;
  }
  
  .coordinate-row,
  .coordinate-column {
    height: 1.5rem;
    width: 1.5rem;
  }
  
  .coordinate-corner {
    width: 1.5rem;
    height: 1.5rem;
  }
  
  .thinking-content {
    padding: 1.5rem;
  }
  
  .thinking-spinner {
    width: 1.5rem;
    height: 1.5rem;
  }
  
  .thinking-text {
    font-size: 0.875rem;
  }
}

@media (max-width: 480px) {
  .chess-board {
    padding: 0.25rem;
  }
  
  .coordinate-row,
  .coordinate-column {
    height: 1rem;
    width: 1rem;
  }
  
  .coordinate-cell {
    font-size: 0.625rem;
  }
  
  .coordinate-corner {
    width: 1rem;
    height: 1rem;
  }
}

/* 棋盘大小适配 */
.board-grid {
  max-width: min(80vh, 80vw);
  max-height: min(80vh, 80vw);
  width: 100%;
  height: 100%;
}

/* 高分辨率屏幕优化 */
@media (min-resolution: 2dppx) {
  .board-grid {
    border-width: 1px;
  }
  
  .win-line {
    height: 2px;
  }
}
</style>