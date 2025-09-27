<template>
  <div
    :class="cellClasses"
    @click="handleClick"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
  >
    <!-- 棋盘网格线 -->
    <div class="grid-lines">
      <!-- 水平线 -->
      <div 
        v-if="showTopLine"
        class="grid-line grid-line-top"
      ></div>
      <div 
        v-if="showBottomLine"
        class="grid-line grid-line-bottom"
      ></div>
      <!-- 垂直线 -->
      <div 
        v-if="showLeftLine"
        class="grid-line grid-line-left"
      ></div>
      <div 
        v-if="showRightLine"
        class="grid-line grid-line-right"
      ></div>
    </div>

    <!-- 星位标记 -->
    <div 
      v-if="isStarPoint"
      class="star-point"
    ></div>

    <!-- 棋子 -->
    <div 
      v-if="hasStone"
      :class="stoneClasses"
    >
      <!-- 棋子阴影 -->
      <div class="stone-shadow"></div>
      <!-- 棋子本体 -->
      <div class="stone-body"></div>
      <!-- 最后落子标记 -->
      <div 
        v-if="isLastMove"
        class="last-move-marker"
      ></div>
    </div>

    <!-- 悬停预览 -->
    <div 
      v-if="showPreview && !hasStone"
      :class="previewClasses"
    >
      <div class="preview-stone"></div>
    </div>

    <!-- 获胜连线高亮 -->
    <div 
      v-if="isWinningStone"
      class="winning-highlight"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { PieceType } from '@/types'
import type { Position } from '@/types'

// Props定义
interface Props {
  position: Position
  pieceType: PieceType
  boardSize: number
  clickable?: boolean
  isLastMove?: boolean
  isWinningStone?: boolean
  currentPlayerPiece?: PieceType
}

const props = withDefaults(defineProps<Props>(), {
  clickable: true,
  isLastMove: false,
  isWinningStone: false,
  currentPlayerPiece: PieceType.BLACK
})

// Events定义
interface Emits {
  click: [position: Position]
  mouseEnter: [position: Position]
  mouseLeave: [position: Position]
}

const emit = defineEmits<Emits>()

// 状态
const showPreview = ref(false)

// 计算属性
const hasStone = computed(() => props.pieceType !== PieceType.EMPTY)

const isStarPoint = computed(() => {
  const { row, col } = props.position
  const size = props.boardSize
  
  if (size === 19) {
    // 19路棋盘的星位
    const starPoints = [
      [3, 3], [3, 9], [3, 15],
      [9, 3], [9, 9], [9, 15],
      [15, 3], [15, 9], [15, 15]
    ]
    return starPoints.some(([r, c]) => r === row && c === col)
  } else if (size === 13) {
    // 13路棋盘的星位
    const starPoints = [
      [3, 3], [3, 9], [6, 6], [9, 3], [9, 9]
    ]
    return starPoints.some(([r, c]) => r === row && c === col)
  } else if (size === 9) {
    // 9路棋盘的星位
    const starPoints = [
      [2, 2], [2, 6], [4, 4], [6, 2], [6, 6]
    ]
    return starPoints.some(([r, c]) => r === row && c === col)
  }
  
  return false
})

// 网格线显示逻辑
const showTopLine = computed(() => props.position.row > 0)
const showBottomLine = computed(() => props.position.row < props.boardSize - 1)
const showLeftLine = computed(() => props.position.col > 0)
const showRightLine = computed(() => props.position.col < props.boardSize - 1)

// 样式类
const cellClasses = computed(() => [
  'chess-cell',
  {
    'chess-cell--clickable': props.clickable && !hasStone.value,
    'chess-cell--has-stone': hasStone.value,
    'chess-cell--last-move': props.isLastMove,
    'chess-cell--winning': props.isWinningStone
  }
])

const stoneClasses = computed(() => [
  'chess-stone',
  {
    'chess-stone--black': props.pieceType === PieceType.BLACK,
    'chess-stone--white': props.pieceType === PieceType.WHITE,
    'chess-stone--animated': props.isLastMove
  }
])

const previewClasses = computed(() => [
  'chess-preview',
  {
    'chess-preview--black': props.currentPlayerPiece === PieceType.BLACK,
    'chess-preview--white': props.currentPlayerPiece === PieceType.WHITE
  }
])

// 事件处理
const handleClick = () => {
  if (props.clickable && !hasStone.value) {
    emit('click', props.position)
  }
}

const handleMouseEnter = () => {
  if (props.clickable && !hasStone.value) {
    showPreview.value = true
    emit('mouseEnter', props.position)
  }
}

const handleMouseLeave = () => {
  showPreview.value = false
  emit('mouseLeave', props.position)
}
</script>

<style scoped>
.chess-cell {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.chess-cell--clickable:hover {
  background-color: rgba(255, 235, 59, 0.1);
}

.chess-cell--has-stone {
  cursor: default;
}

.chess-cell--winning {
  background-color: rgba(76, 175, 80, 0.2);
  animation: winningPulse 1s ease-in-out infinite;
}

/* 网格线 */
.grid-lines {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
}

.grid-line {
  position: absolute;
  background-color: #8B4513;
  z-index: 1;
}

.grid-line-top {
  top: 0;
  left: 50%;
  width: 1px;
  height: 50%;
  transform: translateX(-50%);
}

.grid-line-bottom {
  bottom: 0;
  left: 50%;
  width: 1px;
  height: 50%;
  transform: translateX(-50%);
}

.grid-line-left {
  left: 0;
  top: 50%;
  width: 50%;
  height: 1px;
  transform: translateY(-50%);
}

.grid-line-right {
  right: 0;
  top: 50%;
  width: 50%;
  height: 1px;
  transform: translateY(-50%);
}

/* 星位 */
.star-point {
  position: absolute;
  width: 8px;
  height: 8px;
  background-color: #8B4513;
  border-radius: 50%;
  z-index: 2;
  transform: translate(-50%, -50%);
  top: 50%;
  left: 50%;
}

/* 棋子 */
.chess-stone {
  position: relative;
  width: 85%;
  height: 85%;
  border-radius: 50%;
  z-index: 10;
  cursor: pointer;
  transition: transform 0.2s ease;
}

.chess-stone:hover {
  transform: scale(1.05);
}

.stone-shadow {
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: radial-gradient(circle at 30% 30%, transparent 30%, rgba(0, 0, 0, 0.3) 70%);
  transform: translate(2px, 2px);
  z-index: -1;
}

.stone-body {
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 2px solid rgba(0, 0, 0, 0.1);
}

.chess-stone--black .stone-body {
  background: radial-gradient(circle at 30% 30%, #666 0%, #1a1a1a 70%);
}

.chess-stone--white .stone-body {
  background: 
    radial-gradient(circle at 30% 30%, #ffffff 0%, #f8f8f8 40%, #f0f0f0 70%, #e8e8e8 100%),
    linear-gradient(135deg, rgba(255, 255, 255, 0.3) 0%, transparent 50%, rgba(0, 0, 0, 0.05) 100%);
  border: 2px solid #ffffff;
  box-shadow: 
    /* 双层边框系统 */
    inset 0 0 0 1px rgba(255, 255, 255, 0.8),
    inset 0 0 0 3px rgba(0, 0, 0, 0.1),
    /* 主阴影 */
    2px 3px 6px rgba(0, 0, 0, 0.4),
    /* 辅助阴影 */
    0 2px 4px rgba(0, 0, 0, 0.25),
    /* 环境阴影 */
    0 8px 16px rgba(0, 0, 0, 0.15);
}

.chess-stone--animated {
  animation: stoneDrop 0.3s ease-out;
}

/* 最后落子标记 */
.last-move-marker {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 20%;
  height: 20%;
  background-color: #ff4444;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  z-index: 15;
  animation: lastMoveMarker 0.5s ease-in-out;
}

/* 预览棋子 */
.chess-preview {
  position: absolute;
  width: 70%;
  height: 70%;
  border-radius: 50%;
  opacity: 0.5;
  z-index: 5;
  transition: opacity 0.2s ease;
}

.chess-preview--black {
  background: radial-gradient(circle at 30% 30%, #666 0%, #1a1a1a 70%);
  border: 2px solid rgba(0, 0, 0, 0.3);
}

.chess-preview--white {
  background: 
    radial-gradient(circle at 30% 30%, #ffffff 0%, #f8f8f8 40%, #f0f0f0 70%, #e8e8e8 100%),
    linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, transparent 50%, rgba(0, 0, 0, 0.03) 100%);
  border: 2px solid rgba(255, 255, 255, 0.9);
  box-shadow: 
    /* 边框效果 */
    inset 0 0 0 1px rgba(255, 255, 255, 0.6),
    inset 0 0 0 2px rgba(0, 0, 0, 0.1),
    /* 阴影效果 */
    2px 2px 4px rgba(0, 0, 0, 0.3),
    0 1px 2px rgba(0, 0, 0, 0.2);
}

/* 获胜高亮 */
.winning-highlight {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(45deg, transparent 40%, rgba(76, 175, 80, 0.3) 50%, transparent 60%);
  border-radius: 50%;
  z-index: 20;
  animation: winningShine 1.5s ease-in-out infinite;
}

/* 动画 */
@keyframes stoneDrop {
  0% {
    transform: translateY(-200%) scale(0.5);
    opacity: 0;
  }
  50% {
    opacity: 1;
  }
  100% {
    transform: translateY(0) scale(1);
    opacity: 1;
  }
}

@keyframes lastMoveMarker {
  0% {
    transform: translate(-50%, -50%) scale(0);
    opacity: 0;
  }
  50% {
    transform: translate(-50%, -50%) scale(1.2);
    opacity: 1;
  }
  100% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 1;
  }
}

@keyframes winningPulse {
  0%, 100% {
    background-color: rgba(76, 175, 80, 0.2);
  }
  50% {
    background-color: rgba(76, 175, 80, 0.4);
  }
}

@keyframes winningShine {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .chess-stone {
    width: 90%;
    height: 90%;
  }
  
  .chess-stone--white .stone-body {
    box-shadow: 
      /* 简化边框 */
      inset 0 0 0 1px rgba(255, 255, 255, 0.8),
      inset 0 0 0 2px rgba(0, 0, 0, 0.1),
      /* 适配阴影强度 */
      2px 2px 4px rgba(0, 0, 0, 0.35),
      0 1px 2px rgba(0, 0, 0, 0.25),
      0 6px 12px rgba(0, 0, 0, 0.15);
  }
  
  .chess-preview--white {
    box-shadow: 
      inset 0 0 0 1px rgba(255, 255, 255, 0.5),
      1px 1px 2px rgba(0, 0, 0, 0.25);
  }
  
  .star-point {
    width: 6px;
    height: 6px;
  }
  
  .last-move-marker {
    width: 25%;
    height: 25%;
  }
}

@media (max-width: 480px) {
  .chess-stone--white .stone-body {
    box-shadow: 
      /* 进一步简化 */
      inset 0 0 0 1px rgba(255, 255, 255, 0.7),
      1px 2px 3px rgba(0, 0, 0, 0.3),
      0 4px 8px rgba(0, 0, 0, 0.12);
  }
}
</style>