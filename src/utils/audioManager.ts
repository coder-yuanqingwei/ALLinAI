/**
 * 音效管理系统
 */
export class AudioManager {
  private audioContext: AudioContext | null = null
  private sounds: Map<string, AudioBuffer> = new Map()
  private enabled: boolean = true
  private volume: number = 0.7

  constructor() {
    this.initializeAudioContext()
  }

  /**
   * 初始化音频上下文
   */
  private initializeAudioContext() {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    } catch (error) {
      console.warn('音频上下文初始化失败:', error)
    }
  }

  /**
   * 创建合成音效
   */
  private createSynthSound(
    frequency: number,
    duration: number,
    type: OscillatorType = 'sine',
    volume: number = 0.5
  ): AudioBuffer | null {
    if (!this.audioContext) return null

    const sampleRate = this.audioContext.sampleRate
    const length = sampleRate * duration
    const buffer = this.audioContext.createBuffer(1, length, sampleRate)
    const data = buffer.getChannelData(0)

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate
      let value = 0

      switch (type) {
        case 'sine':
          value = Math.sin(2 * Math.PI * frequency * t)
          break
        case 'square':
          value = Math.sin(2 * Math.PI * frequency * t) > 0 ? 1 : -1
          break
        case 'sawtooth':
          value = 2 * (t * frequency - Math.floor(t * frequency + 0.5))
          break
        case 'triangle':
          value = 2 * Math.abs(2 * (t * frequency - Math.floor(t * frequency + 0.5))) - 1
          break
      }

      // 应用包络(淡入淡出)
      const envelope = Math.exp(-t * 3) // 指数衰减
      data[i] = value * envelope * volume
    }

    return buffer
  }

  /**
   * 初始化所有游戏音效
   */
  initializeSounds() {
    if (!this.audioContext) return

    // 棋子落下音效 - 清脆的点击声
    const stoneDropBuffer = this.createSynthSound(800, 0.1, 'sine', 0.6)
    if (stoneDropBuffer) {
      this.sounds.set('stoneDrop', stoneDropBuffer)
    }

    // 获胜音效 - 上升的和弦
    const winBuffer = this.createWinSound()
    if (winBuffer) {
      this.sounds.set('win', winBuffer)
    }

    // 失败音效 - 下降音调
    const loseBuffer = this.createLoseSound()
    if (loseBuffer) {
      this.sounds.set('lose', loseBuffer)
    }

    // 按钮点击音效
    const buttonClickBuffer = this.createSynthSound(1000, 0.05, 'square', 0.3)
    if (buttonClickBuffer) {
      this.sounds.set('buttonClick', buttonClickBuffer)
    }

    // 悔棋音效
    const undoBuffer = this.createSynthSound(600, 0.2, 'triangle', 0.4)
    if (undoBuffer) {
      this.sounds.set('undo', undoBuffer)
    }

    // 计时器警告音效
    const timerWarningBuffer = this.createSynthSound(1200, 0.1, 'square', 0.5)
    if (timerWarningBuffer) {
      this.sounds.set('timerWarning', timerWarningBuffer)
    }
  }

  /**
   * 创建获胜音效
   */
  private createWinSound(): AudioBuffer | null {
    if (!this.audioContext) return null

    const duration = 1.0
    const sampleRate = this.audioContext.sampleRate
    const length = sampleRate * duration
    const buffer = this.audioContext.createBuffer(1, length, sampleRate)
    const data = buffer.getChannelData(0)

    // 创建上升的和弦 (C大调和弦)
    const frequencies = [523.25, 659.25, 783.99] // C5, E5, G5
    
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate
      let value = 0

      // 混合多个频率
      frequencies.forEach((freq, index) => {
        const phase = 2 * Math.PI * freq * t
        value += Math.sin(phase) * (0.3 / frequencies.length)
      })

      // 应用包络
      const envelope = Math.exp(-t * 2) * (1 - t / duration)
      data[i] = value * envelope
    }

    return buffer
  }

  /**
   * 创建失败音效
   */
  private createLoseSound(): AudioBuffer | null {
    if (!this.audioContext) return null

    const duration = 0.8
    const sampleRate = this.audioContext.sampleRate
    const length = sampleRate * duration
    const buffer = this.audioContext.createBuffer(1, length, sampleRate)
    const data = buffer.getChannelData(0)

    // 创建下降音调
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate
      const frequency = 400 - (t / duration) * 200 // 从400Hz降到200Hz
      const value = Math.sin(2 * Math.PI * frequency * t)
      
      // 应用包络
      const envelope = Math.exp(-t * 1.5)
      data[i] = value * envelope * 0.4
    }

    return buffer
  }

  /**
   * 播放音效
   */
  playSound(soundName: string, volume?: number) {
    if (!this.enabled || !this.audioContext || !this.sounds.has(soundName)) {
      return
    }

    const buffer = this.sounds.get(soundName)!
    const source = this.audioContext.createBufferSource()
    const gainNode = this.audioContext.createGain()

    source.buffer = buffer
    gainNode.gain.value = (volume ?? this.volume) * this.volume

    source.connect(gainNode)
    gainNode.connect(this.audioContext.destination)

    source.start()
  }

  /**
   * 启用/禁用音效
   */
  setEnabled(enabled: boolean) {
    this.enabled = enabled
  }

  /**
   * 设置音量
   */
  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume))
  }

  /**
   * 获取音效启用状态
   */
  isEnabled(): boolean {
    return this.enabled
  }

  /**
   * 获取当前音量
   */
  getVolume(): number {
    return this.volume
  }

  /**
   * 恢复音频上下文（用户交互后调用）
   */
  async resumeAudioContext() {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      try {
        await this.audioContext.resume()
      } catch (error) {
        console.warn('音频上下文恢复失败:', error)
      }
    }
  }
}

// 创建全局音频管理器实例
export const audioManager = new AudioManager()