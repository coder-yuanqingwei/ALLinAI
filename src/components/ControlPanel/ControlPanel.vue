<template>
  <div class="control-panel">
    <!-- 游戏控制按钮区域 -->
    <div class="control-section">
      <h3 class="section-title">游戏控制</h3>
      
      <div class="button-group">
        <!-- 新游戏按钮 -->
        <button
          class="btn btn-primary"
          @click="handleNewGame"
          :disabled="isGameStarting"
        >
          <svg v-if="!isGameStarting" class="btn-icon" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
          <div v-else class="btn-spinner"></div>
          {{ isGameStarting ? '初始化中...' : '新游戏' }}
        </button>

        <!-- 悔棋按钮 -->
        <button
          class="btn btn-secondary"
          @click="handleUndo"
          :disabled="!canUndo || isGameProcessing"
        >
          <svg class="btn-icon" viewBox="0 0 24 24">
            <path d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z"/>
          </svg>
          悔棋
        </button>

        <!-- 暂停/继续按钮 -->
        <button
          class="btn btn-secondary"
          @click="handlePauseResume"
          :disabled="gameStatus === 'ready' || isGameOver"
        >
          <svg v-if="gameStatus !== 'paused'" class="btn-icon" viewBox="0 0 24 24">
            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
          </svg>
          <svg v-else class="btn-icon" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z"/>
          </svg>
          {{ gameStatus === 'paused' ? '继续' : '暂停' }}
        </button>
      </div>
    </div>

    <!-- 游戏设置区域 -->
    <div class="control-section">
      <h3 class="section-title">游戏设置</h3>
      
      <div class="setting-group">
        <!-- AI难度设置 -->
        <div class="setting-item">
          <label class="setting-label">AI难度</label>
          <select 
            v-model="localAIDifficulty"
            class="setting-select"
            @change="handleDifficultyChange"
            :disabled="gameStatus === 'playing'"
          >
            <option value="easy">简单</option>
            <option value="medium">中等</option>
            <option value="hard">困难</option>
            <option value="expert">专家</option>
          </select>
        </div>

        <!-- 棋盘大小设置 -->
        <div class="setting-item">
          <label class="setting-label">棋盘大小</label>
          <select 
            v-model="localBoardSize"
            class="setting-select"
            @change="handleBoardSizeChange"
            :disabled="gameStatus === 'playing'"
          >
            <option :value="9">9×9</option>
            <option :value="13">13×13</option>
            <option :value="19">19×19</option>
          </select>
        </div>

        <!-- 先手设置 */
        <div class="setting-item">
          <label class="setting-label">先手</label>
          <select 
            v-model="localFirstPlayer"
            class="setting-select"
            @change="handleFirstPlayerChange"
            :disabled="gameStatus === 'playing'"
          >
            <option value="human">玩家先手</option>
            <option value="ai">AI先手</option>
          </select>
        </div>

        <!-- 时间限制设置 -->
        <div class="setting-item">
          <label class="setting-label">每步时限(秒)</label>
          <input
            v-model.number="localTimeLimit"
            type="range"
            min="10"
            max="300"
            step="10"
            class="setting-range"
            @change="handleTimeLimitChange"
            :disabled="gameStatus === 'playing'"
          />
          <span class="setting-value">{{ localTimeLimit }}s</span>
        </div>
      </div>
    </div>

    <!-- 音效和动画设置 -->
    <div class="control-section">
      <h3 class="section-title">效果设置</h3>
      
      <div class="toggle-group">
        <div class="setting-item">
          <label class="setting-label">音效</label>
          <div class="toggle-switch">
            <input
              id="sound-toggle"
              v-model="localEnableSound"
              type="checkbox"
              class="toggle-input"
              @change="handleSoundToggle"
            />
            <label for="sound-toggle" class="toggle-label">
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>

        <div class="setting-item">
          <label class="setting-label">动画</label>
          <div class="toggle-switch">
            <input
              id="animation-toggle"
              v-model="localEnableAnimation"
              type="checkbox"
              class="toggle-input"
              @change="handleAnimationToggle"
            />
            <label for="animation-toggle" class="toggle-label">
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>
      </div>
    </div>

    <!-- 快捷操作 -->
    <div class="control-section">
      <h3 class="section-title">快捷操作</h3>
      
      <div class="quick-actions">
        <button
          class="btn btn-sm btn-secondary"
          @click="handleShowHint"
          :disabled="!canShowHint"
        >
          <svg class="btn-icon" viewBox="0 0 24 24">
            <path d="M11 18h2v-2h-2v2zm1-16C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-2.21 0-4 1.79-4 4h2c0-1.1.9-2 2-2s2 .9 2 2c0 2-3 1.75-3 5h2c0-2.25 3-2.5 3-5 0-2.21-1.79-4-4-4z"/>
          </svg>
          提示
        </button>

        <button
          class="btn btn-sm btn-secondary"
          @click="handleAnalyzePosition"
          :disabled="!canAnalyze"
        >
          <svg class="btn-icon" viewBox="0 0 24 24">
            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
          </svg>
          分析
        </button>

        <button
          class="btn btn-sm btn-secondary"
          @click="handleExportGame"
          :disabled="!canExport"
        >
          <svg class="btn-icon" viewBox="0 0 24 24">
            <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"/>
          </svg>
          导出
        </button>
      </div>
    </div>

    <!-- 游戏统计 -->
    <div v-if="showStats" class="control-section">
      <h3 class="section-title">游戏统计</h3>
      
      <div class="stats-grid">
        <div class="stat-item">
          <div class="stat-value">{{ stats.totalGames }}</div>
          <div class="stat-label">总局数</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">{{ stats.humanWins }}</div>
          <div class="stat-label">玩家胜</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">{{ stats.aiWins }}</div>
          <div class="stat-label">AI胜</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">{{ winRate }}%</div>
          <div class="stat-label">胜率</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { AIDifficulty, GameStatus } from '@/types'
import type { GameConfig, GameStats } from '@/types'

// Props定义
interface Props {
  gameConfig: GameConfig
  gameStatus: GameStatus
  canUndo: boolean
  canShowHint: boolean
  canAnalyze: boolean
  canExport: boolean
  showStats?: boolean
  stats?: GameStats
  isGameProcessing?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showStats: true,
  stats: () => ({
    totalGames: 0,
    humanWins: 0,
    aiWins: 0,
    draws: 0,
    averageGameTime: 0,
    totalMoves: 0
  }),
  isGameProcessing: false
})

// Events定义
interface Emits {
  newGame: []
  undo: []
  pauseResume: []
  configChange: [config: Partial<GameConfig>]
  showHint: []
  analyzePosition: []
  exportGame: []
}

const emit = defineEmits<Emits>()

// 本地状态
const isGameStarting = ref(false)
const localAIDifficulty = ref(props.gameConfig.aiDifficulty)
const localBoardSize = ref(props.gameConfig.boardSize)
const localFirstPlayer = ref('human')
const localTimeLimit = ref(props.gameConfig.timeLimit)
const localEnableSound = ref(props.gameConfig.enableSound)
const localEnableAnimation = ref(props.gameConfig.enableAnimation)

// 计算属性
const isGameOver = computed(() => 
  props.gameStatus === 'human_won' || 
  props.gameStatus === 'ai_won' || 
  props.gameStatus === 'draw'
)

const winRate = computed(() => {
  const total = props.stats.totalGames
  if (total === 0) return 0
  return Math.round((props.stats.humanWins / total) * 100)
})

// 事件处理
const handleNewGame = async () => {
  isGameStarting.value = true
  try {
    emit('newGame')
  } finally {
    setTimeout(() => {
      isGameStarting.value = false
    }, 500)
  }
}

const handleUndo = () => {
  emit('undo')
}

const handlePauseResume = () => {
  emit('pauseResume')
}

const handleDifficultyChange = () => {
  emit('configChange', { aiDifficulty: localAIDifficulty.value })
}

const handleBoardSizeChange = () => {
  emit('configChange', { boardSize: localBoardSize.value })
}

const handleFirstPlayerChange = () => {
  // 这里可以添加先手选择的逻辑
  console.log('First player changed to:', localFirstPlayer.value)
}

const handleTimeLimitChange = () => {
  emit('configChange', { timeLimit: localTimeLimit.value })
}

const handleSoundToggle = () => {
  emit('configChange', { enableSound: localEnableSound.value })
}

const handleAnimationToggle = () => {
  emit('configChange', { enableAnimation: localEnableAnimation.value })
}

const handleShowHint = () => {
  emit('showHint')
}

const handleAnalyzePosition = () => {
  emit('analyzePosition')
}

const handleExportGame = () => {
  emit('exportGame')
}

// 监听配置变化
watch(
  () => props.gameConfig,
  (newConfig) => {
    localAIDifficulty.value = newConfig.aiDifficulty
    localBoardSize.value = newConfig.boardSize
    localTimeLimit.value = newConfig.timeLimit
    localEnableSound.value = newConfig.enableSound
    localEnableAnimation.value = newConfig.enableAnimation
  },
  { deep: true }
)
</script>

<style scoped>
.control-panel {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 1.5rem;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  min-width: 280px;
  max-height: 80vh;
  overflow-y: auto;
}

.control-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.section-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: #333;
  margin: 0;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid #f0f0f0;
}

/* 按钮组 */
.button-group {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: center;
  min-height: 2.5rem;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.btn-secondary {
  background-color: #6b7280;
  color: white;
}

.btn-secondary:hover:not(:disabled) {
  background-color: #4b5563;
  transform: translateY(-1px);
}

.btn-sm {
  padding: 0.5rem 0.75rem;
  font-size: 0.8rem;
  min-height: 2rem;
}

.btn-icon {
  width: 1.2rem;
  height: 1.2rem;
  fill: currentColor;
}

.btn-spinner {
  width: 1rem;
  height: 1rem;
  border: 2px solid transparent;
  border-top: 2px solid currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

/* 设置组 */
.setting-group {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.setting-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
  white-space: nowrap;
}

.setting-select {
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.875rem;
  background: white;
  cursor: pointer;
  transition: border-color 0.2s ease;
}

.setting-select:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.setting-select:disabled {
  background-color: #f9fafb;
  cursor: not-allowed;
}

.setting-range {
  flex: 1;
  margin: 0 0.5rem;
}

.setting-value {
  font-size: 0.875rem;
  font-weight: 500;
  color: #667eea;
  min-width: 3rem;
  text-align: right;
}

/* 切换开关 */
.toggle-group {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.toggle-switch {
  position: relative;
  display: inline-block;
  width: 3rem;
  height: 1.5rem;
}

.toggle-input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-label {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  border-radius: 1.5rem;
  transition: .4s;
}

.toggle-label:before {
  position: absolute;
  content: "";
  height: 1.125rem;
  width: 1.125rem;
  left: 0.1875rem;
  bottom: 0.1875rem;
  background-color: white;
  border-radius: 50%;
  transition: .4s;
}

.toggle-input:checked + .toggle-label {
  background-color: #667eea;
}

.toggle-input:checked + .toggle-label:before {
  transform: translateX(1.5rem);
}

/* 快捷操作 */
.quick-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
}

.quick-actions .btn {
  padding: 0.5rem;
  gap: 0.25rem;
}

.quick-actions .btn-icon {
  width: 1rem;
  height: 1rem;
}

/* 统计区域 */
.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.stat-item {
  text-align: center;
  padding: 0.75rem;
  background: #f8fafc;
  border-radius: 6px;
}

.stat-value {
  font-size: 1.25rem;
  font-weight: 700;
  color: #333;
}

.stat-label {
  font-size: 0.75rem;
  color: #6b7280;
  margin-top: 0.25rem;
}

/* 动画 */
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .control-panel {
    min-width: auto;
    padding: 1rem;
  }
  
  .setting-item {
    flex-direction: column;
    align-items: stretch;
    gap: 0.5rem;
  }
  
  .setting-label {
    text-align: center;
  }
  
  .quick-actions {
    grid-template-columns: 1fr;
  }
  
  .stats-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}
</style>