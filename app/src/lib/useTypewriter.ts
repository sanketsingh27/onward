'use client'
import { useEffect, useState } from 'react'

const PHRASES = [
  'senior software engineer',
  'product engineer, platform',
  'staff ml engineer',
  'full-stack, typescript, react',
  'distributed systems',
]

export function useTypewriter(speed = 62, hold = 1700) {
  const [text, setText] = useState('')

  useEffect(() => {
    let phrase = 0
    let pos = 0
    let deleting = false
    let timer: number

    const tick = () => {
      const current = PHRASES[phrase]
      if (!deleting) {
        pos += 1
        setText(current.slice(0, pos))
        if (pos === current.length) {
          deleting = true
          timer = window.setTimeout(tick, hold)
          return
        }
        timer = window.setTimeout(tick, speed)
      } else {
        pos -= 1
        setText(current.slice(0, pos))
        if (pos === 0) {
          deleting = false
          phrase = (phrase + 1) % PHRASES.length
        }
        timer = window.setTimeout(tick, deleting ? 34 : speed)
      }
    }

    timer = window.setTimeout(tick, speed)
    return () => clearTimeout(timer)
  }, [speed, hold])

  return text
}
