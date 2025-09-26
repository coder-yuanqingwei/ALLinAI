// 测试环境设置
import { vi } from 'vitest'

// Mock Web Audio API
global.AudioContext = vi.fn().mockImplementation(() => ({
  createBuffer: vi.fn(),
  createBufferSource: vi.fn(() => ({
    buffer: null,
    connect: vi.fn(),
    start: vi.fn(),
  })),
  createGain: vi.fn(() => ({
    gain: { value: 1 },
    connect: vi.fn(),
  })),
  destination: {},
  sampleRate: 44100,
  state: 'running',
  resume: vi.fn().mockResolvedValue(undefined),
}))

// Mock window.webkitAudioContext
global.window.webkitAudioContext = global.AudioContext

// Mock requestAnimationFrame
global.requestAnimationFrame = vi.fn((cb) => setTimeout(cb, 16))
global.cancelAnimationFrame = vi.fn()

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))