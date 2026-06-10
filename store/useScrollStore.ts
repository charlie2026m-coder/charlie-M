import { create } from 'zustand'

interface ScrollState {
  scrollY: number
  scrollDirection: 'up' | 'down'
  isHeaderVisible: boolean
  isDiscountClosed: boolean
  isHomeStickyActive: boolean

  updateScroll: (newY: number) => void
  setDiscountClosed: (closed: boolean) => void
  setHomeStickyActive: (active: boolean) => void
}

const SHOW_THRESHOLD = 400
const HIDE_THRESHOLD_WITH_DISCOUNT = 60
const HIDE_THRESHOLD_WITHOUT_DISCOUNT = 0

export function getHideThreshold(isDiscountClosed: boolean): number {
  return isDiscountClosed
    ? HIDE_THRESHOLD_WITHOUT_DISCOUNT
    : HIDE_THRESHOLD_WITH_DISCOUNT
}

export const useScrollStore = create<ScrollState>((set, get) => ({
  scrollY: 0,
  scrollDirection: 'down',
  isHeaderVisible: false,
  isDiscountClosed: false,
  isHomeStickyActive: false,

  updateScroll: (newY) => {
    const state = get()
    const direction: 'up' | 'down' = newY > state.scrollY ? 'down' : 'up'
    const hideThreshold = getHideThreshold(state.isDiscountClosed)

    let isHeaderVisible = state.isHeaderVisible

    if (newY <= hideThreshold) {
      isHeaderVisible = false
    } else if (newY > SHOW_THRESHOLD) {
      isHeaderVisible = direction === 'up'
    }

    set({
      scrollY: newY,
      scrollDirection: direction,
      isHeaderVisible,
    })
  },

  setDiscountClosed: (closed) => set({ isDiscountClosed: closed }),
  setHomeStickyActive: (active) => set({ isHomeStickyActive: active }),
}))

export const STICKY_HEADER_HEIGHT = 80
