/**
 * 动画和特效管理系统
 */
export class EffectsManager {
  private particleContainer: HTMLElement | null = null
  private animationQueue: Array<() => Promise<void>> = []
  private isProcessingQueue = false

  constructor() {
    this.createParticleContainer()
  }

  /**
   * 创建粒子容器
   */
  private createParticleContainer() {
    this.particleContainer = document.createElement('div')
    this.particleContainer.className = 'particle-container'
    this.particleContainer.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      pointer-events: none;
      z-index: 9999;
    `
    document.body.appendChild(this.particleContainer)
  }

  /**
   * 创建粒子效果
   */
  createParticles(
    centerX: number,
    centerY: number,
    count: number = 20,
    colors: string[] = ['#ffd700', '#ffed4e', '#ff6b35']
  ) {
    if (!this.particleContainer) return

    for (let i = 0; i < count; i++) {
      const particle = document.createElement('div')
      particle.className = 'particle'
      
      const color = colors[Math.floor(Math.random() * colors.length)]
      const size = Math.random() * 6 + 2
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5
      const velocity = Math.random() * 100 + 50
      const lifetime = Math.random() * 2000 + 1000

      particle.style.cssText = `
        position: absolute;
        left: ${centerX}px;
        top: ${centerY}px;
        width: ${size}px;
        height: ${size}px;
        background: ${color};
        border-radius: 50%;
        pointer-events: none;
        animation: particleMove ${lifetime}ms linear forwards;
        --velocity-x: ${Math.cos(angle) * velocity}px;
        --velocity-y: ${Math.sin(angle) * velocity}px;
      `

      // 添加粒子移动动画
      const keyframes = `
        @keyframes particleMove {
          0% {
            transform: translate(0, 0) scale(1);
            opacity: 1;
          }
          100% {
            transform: translate(var(--velocity-x), var(--velocity-y)) scale(0);
            opacity: 0;
          }
        }
      `
      
      if (!document.querySelector('#particle-styles')) {
        const styleSheet = document.createElement('style')
        styleSheet.id = 'particle-styles'
        styleSheet.textContent = keyframes
        document.head.appendChild(styleSheet)
      }

      this.particleContainer.appendChild(particle)

      // 清理粒子
      setTimeout(() => {
        if (particle.parentNode) {
          particle.parentNode.removeChild(particle)
        }
      }, lifetime)
    }
  }

  /**
   * 创建获胜庆祝效果
   */
  async createWinCelebration(element: HTMLElement) {
    // 添加庆祝动画类
    element.classList.add('celebration-animation')
    
    // 获取元素位置用于粒子效果
    const rect = element.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2

    // 创建多波粒子
    for (let wave = 0; wave < 3; wave++) {
      setTimeout(() => {
        this.createParticles(centerX, centerY, 15, ['#4CAF50', '#66BB6A', '#81C784'])
      }, wave * 200)
    }

    // 清理动画类
    setTimeout(() => {
      element.classList.remove('celebration-animation')
    }, 2000)
  }

  /**
   * 创建棋子落下动画
   */
  async animateStonePlace(element: HTMLElement, piece: 'black' | 'white') {
    return new Promise<void>((resolve) => {
      element.classList.add('chess-stone--dropping')
      
      const colors = piece === 'black' 
        ? ['#333', '#666', '#999'] 
        : ['#fff', '#f0f0f0', '#e0e0e0']
      
      // 添加轻微的粒子效果
      const rect = element.getBoundingClientRect()
      setTimeout(() => {
        this.createParticles(
          rect.left + rect.width / 2,
          rect.top + rect.height / 2,
          5,
          colors
        )
      }, 400)

      setTimeout(() => {
        element.classList.remove('chess-stone--dropping')
        resolve()
      }, 800)
    })
  }

  /**
   * 创建连线动画
   */
  async animateWinLine(lineElement: HTMLElement) {
    return new Promise<void>((resolve) => {
      lineElement.style.opacity = '0'
      lineElement.style.transform = 'scaleX(0)'
      lineElement.style.transformOrigin = 'left center'
      
      // 渐显和拉伸动画
      setTimeout(() => {
        lineElement.style.transition = 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
        lineElement.style.opacity = '1'
        lineElement.style.transform = 'scaleX(1)'
      }, 100)

      // 发光脉冲效果
      setTimeout(() => {
        lineElement.style.animation = 'winLineGlow 1s ease-in-out infinite alternate'
      }, 900)

      setTimeout(() => {
        resolve()
      }, 1000)
    })
  }

  /**
   * 创建错误摇摆动画
   */
  shakeElement(element: HTMLElement) {
    element.classList.add('shake-effect')
    setTimeout(() => {
      element.classList.remove('shake-effect')
    }, 500)
  }

  /**
   * 创建弹跳动画
   */
  bounceElement(element: HTMLElement) {
    element.classList.add('bounce-effect')
    setTimeout(() => {
      element.classList.remove('bounce-effect')
    }, 1000)
  }

  /**
   * 创建脉冲动画
   */
  pulseElement(element: HTMLElement, duration: number = 2000) {
    element.classList.add('pulse-breathing')
    setTimeout(() => {
      element.classList.remove('pulse-breathing')
    }, duration)
  }

  /**
   * 创建波纹效果
   */
  createRipple(element: HTMLElement, x: number, y: number) {
    const ripple = document.createElement('div')
    const rect = element.getBoundingClientRect()
    const size = Math.max(rect.width, rect.height)
    
    ripple.style.cssText = `
      position: absolute;
      left: ${x - rect.left - size / 2}px;
      top: ${y - rect.top - size / 2}px;
      width: ${size}px;
      height: ${size}px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.6);
      transform: scale(0);
      animation: rippleExpand 0.6s linear;
      pointer-events: none;
    `

    const keyframes = `
      @keyframes rippleExpand {
        to {
          transform: scale(2);
          opacity: 0;
        }
      }
    `

    if (!document.querySelector('#ripple-styles')) {
      const styleSheet = document.createElement('style')
      styleSheet.id = 'ripple-styles'
      styleSheet.textContent = keyframes
      document.head.appendChild(styleSheet)
    }

    element.style.position = 'relative'
    element.appendChild(ripple)

    setTimeout(() => {
      if (ripple.parentNode) {
        ripple.parentNode.removeChild(ripple)
      }
    }, 600)
  }

  /**
   * 添加动画到队列
   */
  queueAnimation(animation: () => Promise<void>) {
    this.animationQueue.push(animation)
    this.processQueue()
  }

  /**
   * 处理动画队列
   */
  private async processQueue() {
    if (this.isProcessingQueue || this.animationQueue.length === 0) {
      return
    }

    this.isProcessingQueue = true

    while (this.animationQueue.length > 0) {
      const animation = this.animationQueue.shift()!
      try {
        await animation()
      } catch (error) {
        console.error('动画执行失败:', error)
      }
    }

    this.isProcessingQueue = false
  }

  /**
   * 清理所有粒子
   */
  clearParticles() {
    if (this.particleContainer) {
      this.particleContainer.innerHTML = ''
    }
  }

  /**
   * 销毁效果管理器
   */
  destroy() {
    this.clearParticles()
    if (this.particleContainer?.parentNode) {
      this.particleContainer.parentNode.removeChild(this.particleContainer)
    }
    this.animationQueue = []
  }
}

// 创建全局效果管理器实例
export const effectsManager = new EffectsManager()