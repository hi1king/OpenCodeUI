import { useState, useEffect, useCallback } from 'react'

type AnimationType = 'right' | 'bottom'

export function usePanelAnimation(isOpen: boolean, type: AnimationType) {
  const [shouldRender, setShouldRender] = useState(isOpen)
  const [isClosing, setIsClosing] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true)
      setIsClosing(false)
    } else {
      setIsClosing(true)
    }
  }, [isOpen])

  const onAnimationEnd = useCallback(() => {
    if (!isOpen) {
      setShouldRender(false)
    }
  }, [isOpen])

  const animationClass = isOpen && !isClosing
    ? (type === 'right' ? 'animate-slide-in-right' : 'animate-slide-in-bottom')
    : (type === 'right' ? 'animate-slide-out-right' : 'animate-slide-out-bottom')

  const overlayAnimationClass = isOpen && !isClosing
    ? 'animate-fade-in-overlay'
    : 'animate-fade-out-overlay'

  return {
    shouldRender,
    isClosing,
    animationClass,
    overlayAnimationClass,
    onAnimationEnd
  }
}
