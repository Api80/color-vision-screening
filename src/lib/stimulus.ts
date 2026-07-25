import Taro from '@tarojs/taro'
import type { Axis, Direction } from '@/types'
import { createAxisPalettes } from './color'
import { createRandom } from './random'

const SIZE = 320
const CENTER = SIZE / 2
const FIELD_RADIUS = 148
const GRID_SPACING = 7.4
const ROW_SPACING = GRID_SPACING * 0.866
const DOT_JITTER = 1.15

const DIRECTION_ANGLES: Record<Direction, number> = {
  right: 0,
  down: Math.PI / 2,
  left: Math.PI,
  up: -Math.PI / 2
}

function angleDistance(left: number, right: number): number {
  return Math.abs(Math.atan2(Math.sin(left - right), Math.cos(left - right)))
}

function isFigureDot(x: number, y: number, direction: Direction): boolean {
  const dx = x - CENTER
  const dy = y - CENTER
  const radius = Math.sqrt(dx * dx + dy * dy) / FIELD_RADIUS
  if (radius < 0.24 || radius > 0.52) return false

  const angle = Math.atan2(dy, dx)
  const inGap = angleDistance(angle, DIRECTION_ANGLES[direction]) < 0.44
  return !inGap
}

export function drawStimulus(
  canvasId: string,
  axis: Axis,
  contrast: number,
  direction: Direction,
  seed: number
) {
  const context = Taro.createCanvasContext(canvasId)
  const random = createRandom(seed)
  const palettes = createAxisPalettes(axis, contrast)
  const groups = new Map<string, Array<[number, number, number]>>()
  const rotation = random() * Math.PI * 2
  const rotationCos = Math.cos(rotation)
  const rotationSin = Math.sin(rotation)
  const startX = -FIELD_RADIUS - GRID_SPACING
  const startY = -FIELD_RADIUS - ROW_SPACING

  context.setFillStyle('#ddd9d0')
  context.fillRect(0, 0, SIZE, SIZE)

  let row = 0
  for (
    let gridY = startY;
    gridY <= FIELD_RADIUS + ROW_SPACING;
    gridY += ROW_SPACING
  ) {
    const rowOffset = row % 2 === 0 ? 0 : GRID_SPACING / 2

    for (
      let gridX = startX + rowOffset;
      gridX <= FIELD_RADIUS + GRID_SPACING;
      gridX += GRID_SPACING
    ) {
      const jitteredX = gridX + (random() - 0.5) * DOT_JITTER * 2
      const jitteredY = gridY + (random() - 0.5) * DOT_JITTER * 2
      const rotatedX = jitteredX * rotationCos - jitteredY * rotationSin
      const rotatedY = jitteredX * rotationSin + jitteredY * rotationCos
      const radius = 1.2 + Math.pow(random(), 0.72) * 2.25

      if (
        rotatedX * rotatedX + rotatedY * rotatedY >
        (FIELD_RADIUS - radius - 0.8) ** 2
      ) {
        continue
      }

      const x = CENTER + rotatedX
      const y = CENTER + rotatedY
      const figure = isFigureDot(x, y, direction)
      const palette = figure ? palettes.foreground : palettes.background
      const color = palette[Math.floor(random() * palette.length)]
      const existing = groups.get(color) || []
      existing.push([x, y, radius])
      groups.set(color, existing)
    }

    row += 1
  }

  groups.forEach((dots, color) => {
    context.beginPath()
    dots.forEach(([x, y, radius]) => {
      context.moveTo(x + radius, y)
      context.arc(x, y, radius, 0, Math.PI * 2)
    })
    context.setFillStyle(color)
    context.fill()
  })

  context.beginPath()
  context.arc(CENTER, CENTER, FIELD_RADIUS + 2, 0, Math.PI * 2)
  context.setStrokeStyle('rgba(60, 68, 66, 0.18)')
  context.setLineWidth(1)
  context.stroke()
  context.draw(false)
}
