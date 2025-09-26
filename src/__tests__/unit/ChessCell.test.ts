import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ChessCell from '@/components/ChessBoard/ChessCell.vue'
import { PieceType } from '@/types'

describe('ChessCell组件', () => {
  const defaultProps = {
    position: { row: 9, col: 9 },
    pieceType: PieceType.EMPTY,
    boardSize: 19,
    clickable: true,
    isLastMove: false,
    isWinningStone: false,
    currentPlayerPiece: PieceType.BLACK
  }

  describe('渲染测试', () => {
    it('应该正确渲染空棋格', () => {
      const wrapper = mount(ChessCell, {
        props: defaultProps
      })

      expect(wrapper.find('.chess-cell').exists()).toBe(true)
      expect(wrapper.find('.chess-stone').exists()).toBe(false)
      expect(wrapper.classes()).toContain('chess-cell--clickable')
    })

    it('应该正确渲染黑棋', () => {
      const wrapper = mount(ChessCell, {
        props: {
          ...defaultProps,
          pieceType: PieceType.BLACK
        }
      })

      expect(wrapper.find('.chess-stone').exists()).toBe(true)
      expect(wrapper.find('.chess-stone').classes()).toContain('chess-stone--black')
      expect(wrapper.classes()).toContain('chess-cell--has-stone')
    })

    it('应该正确渲染白棋', () => {
      const wrapper = mount(ChessCell, {
        props: {
          ...defaultProps,
          pieceType: PieceType.WHITE
        }
      })

      expect(wrapper.find('.chess-stone').exists()).toBe(true)
      expect(wrapper.find('.chess-stone').classes()).toContain('chess-stone--white')
    })

    it('应该显示星位标记', () => {
      const wrapper = mount(ChessCell, {
        props: {
          ...defaultProps,
          position: { row: 3, col: 3 }, // 19路棋盘的星位
          boardSize: 19
        }
      })

      expect(wrapper.find('.star-point').exists()).toBe(true)
    })

    it('应该显示最后落子标记', () => {
      const wrapper = mount(ChessCell, {
        props: {
          ...defaultProps,
          pieceType: PieceType.BLACK,
          isLastMove: true
        }
      })

      expect(wrapper.find('.last-move-marker').exists()).toBe(true)
      expect(wrapper.classes()).toContain('chess-cell--last-move')
    })

    it('应该显示获胜棋子高亮', () => {
      const wrapper = mount(ChessCell, {
        props: {
          ...defaultProps,
          pieceType: PieceType.BLACK,
          isWinningStone: true
        }
      })

      expect(wrapper.find('.winning-highlight').exists()).toBe(true)
      expect(wrapper.classes()).toContain('chess-cell--winning')
    })
  })

  describe('网格线渲染', () => {
    it('应该为中心位置显示所有网格线', () => {
      const wrapper = mount(ChessCell, {
        props: {
          ...defaultProps,
          position: { row: 9, col: 9 }
        }
      })

      expect(wrapper.find('.grid-line-top').exists()).toBe(true)
      expect(wrapper.find('.grid-line-bottom').exists()).toBe(true)
      expect(wrapper.find('.grid-line-left').exists()).toBe(true)
      expect(wrapper.find('.grid-line-right').exists()).toBe(true)
    })

    it('应该为左上角位置隐藏顶部和左侧网格线', () => {
      const wrapper = mount(ChessCell, {
        props: {
          ...defaultProps,
          position: { row: 0, col: 0 }
        }
      })

      expect(wrapper.find('.grid-line-top').exists()).toBe(false)
      expect(wrapper.find('.grid-line-left').exists()).toBe(false)
      expect(wrapper.find('.grid-line-bottom').exists()).toBe(true)
      expect(wrapper.find('.grid-line-right').exists()).toBe(true)
    })

    it('应该为右下角位置隐藏底部和右侧网格线', () => {
      const wrapper = mount(ChessCell, {
        props: {
          ...defaultProps,
          position: { row: 18, col: 18 }
        }
      })

      expect(wrapper.find('.grid-line-bottom').exists()).toBe(false)
      expect(wrapper.find('.grid-line-right').exists()).toBe(false)
      expect(wrapper.find('.grid-line-top').exists()).toBe(true)
      expect(wrapper.find('.grid-line-left').exists()).toBe(true)
    })
  })

  describe('交互测试', () => {
    it('应该在点击时发出click事件', async () => {
      const wrapper = mount(ChessCell, {
        props: defaultProps
      })

      await wrapper.trigger('click')

      expect(wrapper.emitted('click')).toBeTruthy()
      expect(wrapper.emitted('click')?.[0]).toEqual([defaultProps.position])
    })

    it('应该在不可点击时不发出click事件', async () => {
      const wrapper = mount(ChessCell, {
        props: {
          ...defaultProps,
          clickable: false
        }
      })

      await wrapper.trigger('click')

      expect(wrapper.emitted('click')).toBeFalsy()
    })

    it('应该在已有棋子时不发出click事件', async () => {
      const wrapper = mount(ChessCell, {
        props: {
          ...defaultProps,
          pieceType: PieceType.BLACK
        }
      })

      await wrapper.trigger('click')

      expect(wrapper.emitted('click')).toBeFalsy()
    })

    it('应该在鼠标进入时发出mouseEnter事件和显示预览', async () => {
      const wrapper = mount(ChessCell, {
        props: defaultProps
      })

      await wrapper.trigger('mouseenter')

      expect(wrapper.emitted('mouseEnter')).toBeTruthy()
      expect(wrapper.emitted('mouseEnter')?.[0]).toEqual([defaultProps.position])
      expect(wrapper.find('.chess-preview').exists()).toBe(true)
    })

    it('应该在鼠标离开时发出mouseLeave事件和隐藏预览', async () => {
      const wrapper = mount(ChessCell, {
        props: defaultProps
      })

      await wrapper.trigger('mouseenter')
      await wrapper.trigger('mouseleave')

      expect(wrapper.emitted('mouseLeave')).toBeTruthy()
      expect(wrapper.emitted('mouseLeave')?.[0]).toEqual([defaultProps.position])
      expect(wrapper.find('.chess-preview').exists()).toBe(false)
    })

    it('应该在已有棋子时不显示预览', async () => {
      const wrapper = mount(ChessCell, {
        props: {
          ...defaultProps,
          pieceType: PieceType.BLACK
        }
      })

      await wrapper.trigger('mouseenter')

      expect(wrapper.find('.chess-preview').exists()).toBe(false)
    })
  })

  describe('星位检测', () => {
    it('应该正确识别19路棋盘的星位', () => {
      const starPositions = [
        { row: 3, col: 3 }, { row: 3, col: 9 }, { row: 3, col: 15 },
        { row: 9, col: 3 }, { row: 9, col: 9 }, { row: 9, col: 15 },
        { row: 15, col: 3 }, { row: 15, col: 9 }, { row: 15, col: 15 }
      ]

      starPositions.forEach(position => {
        const wrapper = mount(ChessCell, {
          props: {
            ...defaultProps,
            position,
            boardSize: 19
          }
        })

        expect(wrapper.find('.star-point').exists()).toBe(true)
      })
    })

    it('应该正确识别13路棋盘的星位', () => {
      const starPositions = [
        { row: 3, col: 3 }, { row: 3, col: 9 }, { row: 6, col: 6 },
        { row: 9, col: 3 }, { row: 9, col: 9 }
      ]

      starPositions.forEach(position => {
        const wrapper = mount(ChessCell, {
          props: {
            ...defaultProps,
            position,
            boardSize: 13
          }
        })

        expect(wrapper.find('.star-point').exists()).toBe(true)
      })
    })

    it('应该正确识别9路棋盘的星位', () => {
      const starPositions = [
        { row: 2, col: 2 }, { row: 2, col: 6 }, { row: 4, col: 4 },
        { row: 6, col: 2 }, { row: 6, col: 6 }
      ]

      starPositions.forEach(position => {
        const wrapper = mount(ChessCell, {
          props: {
            ...defaultProps,
            position,
            boardSize: 9
          }
        })

        expect(wrapper.find('.star-point').exists()).toBe(true)
      })
    })

    it('应该不为非星位显示星位标记', () => {
      const wrapper = mount(ChessCell, {
        props: {
          ...defaultProps,
          position: { row: 5, col: 5 }, // 非星位
          boardSize: 19
        }
      })

      expect(wrapper.find('.star-point').exists()).toBe(false)
    })
  })

  describe('预览功能', () => {
    it('应该显示黑棋预览', async () => {
      const wrapper = mount(ChessCell, {
        props: {
          ...defaultProps,
          currentPlayerPiece: PieceType.BLACK
        }
      })

      await wrapper.trigger('mouseenter')

      expect(wrapper.find('.chess-preview').exists()).toBe(true)
      expect(wrapper.find('.chess-preview').classes()).toContain('chess-preview--black')
    })

    it('应该显示白棋预览', async () => {
      const wrapper = mount(ChessCell, {
        props: {
          ...defaultProps,
          currentPlayerPiece: PieceType.WHITE
        }
      })

      await wrapper.trigger('mouseenter')

      expect(wrapper.find('.chess-preview').exists()).toBe(true)
      expect(wrapper.find('.chess-preview').classes()).toContain('chess-preview--white')
    })
  })

  describe('样式类', () => {
    it('应该为可点击状态应用正确的类', () => {
      const wrapper = mount(ChessCell, {
        props: {
          ...defaultProps,
          clickable: true
        }
      })

      expect(wrapper.classes()).toContain('chess-cell--clickable')
    })

    it('应该为不可点击状态移除可点击类', () => {
      const wrapper = mount(ChessCell, {
        props: {
          ...defaultProps,
          clickable: false
        }
      })

      expect(wrapper.classes()).not.toContain('chess-cell--clickable')
    })

    it('应该为有棋子状态应用正确的类', () => {
      const wrapper = mount(ChessCell, {
        props: {
          ...defaultProps,
          pieceType: PieceType.BLACK
        }
      })

      expect(wrapper.classes()).toContain('chess-cell--has-stone')
    })

    it('应该为最后落子应用动画类', () => {
      const wrapper = mount(ChessCell, {
        props: {
          ...defaultProps,
          pieceType: PieceType.BLACK,
          isLastMove: true
        }
      })

      expect(wrapper.find('.chess-stone').classes()).toContain('chess-stone--animated')
    })
  })
})