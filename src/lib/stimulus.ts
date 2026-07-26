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
const MIN_FIGURE_DOTS = 160
const MIN_BACKGROUND_DOTS = 700
const MAX_GENERATION_ATTEMPTS = 5
const IMAGE_FRAME_WIDTH = 4
const IMAGE_OUTER_RADIUS = 14
const IMAGE_INNER_RADIUS = 10

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

interface StimulusModel {
  groups: Map<string, Array<[number, number, number]>>
  figureDotCount: number
  backgroundDotCount: number
  foreground: string[]
  background: string[]
}

interface StimulusPaintContext {
  clearRect: (x: number, y: number, width: number, height: number) => void
  fillRect: (x: number, y: number, width: number, height: number) => void
  save: () => void
  restore: () => void
  beginPath: () => void
  closePath: () => void
  moveTo: (x: number, y: number) => void
  lineTo: (x: number, y: number) => void
  quadraticCurveTo: (
    cpx: number,
    cpy: number,
    x: number,
    y: number
  ) => void
  arc: (
    x: number,
    y: number,
    radius: number,
    startAngle: number,
    endAngle: number
  ) => void
  fill: () => void
  stroke: () => void
  clip: () => void
  setFillStyle: (color: string) => void
  setStrokeStyle: (color: string) => void
  setLineWidth: (width: number) => void
}

interface ModernCanvasContext {
  fillStyle: string
  strokeStyle: string
  lineWidth: number
  clearRect: StimulusPaintContext['clearRect']
  fillRect: StimulusPaintContext['fillRect']
  save: StimulusPaintContext['save']
  restore: StimulusPaintContext['restore']
  beginPath: StimulusPaintContext['beginPath']
  closePath: StimulusPaintContext['closePath']
  moveTo: StimulusPaintContext['moveTo']
  lineTo: StimulusPaintContext['lineTo']
  quadraticCurveTo: StimulusPaintContext['quadraticCurveTo']
  arc: StimulusPaintContext['arc']
  fill: StimulusPaintContext['fill']
  stroke: StimulusPaintContext['stroke']
  clip: StimulusPaintContext['clip']
}

export interface StimulusValidation {
  valid: boolean
  reasons: string[]
  figureDotCount: number
  backgroundDotCount: number
}

function buildStimulusModel(
  axis: Axis,
  contrast: number,
  direction: Direction,
  seed: number
): StimulusModel {
  const random = createRandom(seed)
  const palettes = createAxisPalettes(axis, contrast)
  const groups = new Map<string, Array<[number, number, number]>>()
  let figureDotCount = 0
  let backgroundDotCount = 0
  const rotation = random() * Math.PI * 2
  const rotationCos = Math.cos(rotation)
  const rotationSin = Math.sin(rotation)
  const startX = -FIELD_RADIUS - GRID_SPACING
  const startY = -FIELD_RADIUS - ROW_SPACING

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
      if (figure) figureDotCount += 1
      else backgroundDotCount += 1
      const palette = figure ? palettes.foreground : palettes.background
      const color = palette[Math.floor(random() * palette.length)]
      const existing = groups.get(color) || []
      existing.push([x, y, radius])
      groups.set(color, existing)
    }

    row += 1
  }

  return {
    groups,
    figureDotCount,
    backgroundDotCount,
    foreground: palettes.foreground,
    background: palettes.background
  }
}

export function validateStimulus(
  axis: Axis,
  contrast: number,
  direction: Direction,
  seed: number
): StimulusValidation {
  const model = buildStimulusModel(axis, contrast, direction, seed)
  const reasons: string[] = []
  if (!Number.isFinite(contrast) || contrast <= 0 || contrast > 0.35) {
    reasons.push('色差参数超出允许范围')
  }
  const paletteHasDifference = model.foreground.some(
    (color, index) => color !== model.background[index]
  )
  if (!paletteHasDifference) {
    reasons.push('前景色与背景色没有形成有效差异')
  }
  if (model.figureDotCount < MIN_FIGURE_DOTS) {
    reasons.push('组成目标圆环的圆点数量不足')
  }
  if (model.backgroundDotCount < MIN_BACKGROUND_DOTS) {
    reasons.push('背景圆点数量不足')
  }
  return {
    valid: reasons.length === 0,
    reasons,
    figureDotCount: model.figureDotCount,
    backgroundDotCount: model.backgroundDotCount
  }
}

export function resolveStimulusSeed(
  axis: Axis,
  contrast: number,
  direction: Direction,
  initialSeed: number
): number {
  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt += 1) {
    const candidateSeed = initialSeed + attempt * 104729
    if (validateStimulus(axis, contrast, direction, candidateSeed).valid) {
      return candidateSeed
    }
  }
  return initialSeed
}

function paintStimulus(
  context: StimulusPaintContext,
  model: StimulusModel
) {
  context.clearRect(0, 0, SIZE, SIZE)

  const roundedRect = (
    inset: number,
    radius: number
  ) => {
    const start = inset
    const end = SIZE - inset
    context.beginPath()
    context.moveTo(start + radius, start)
    context.lineTo(end - radius, start)
    context.quadraticCurveTo(end, start, end, start + radius)
    context.lineTo(end, end - radius)
    context.quadraticCurveTo(end, end, end - radius, end)
    context.lineTo(start + radius, end)
    context.quadraticCurveTo(start, end, start, end - radius)
    context.lineTo(start, start + radius)
    context.quadraticCurveTo(start, start, start + radius, start)
    context.closePath()
  }

  roundedRect(0, IMAGE_OUTER_RADIUS)
  context.setFillStyle('#ffffff')
  context.fill()

  context.save()
  roundedRect(IMAGE_FRAME_WIDTH, IMAGE_INNER_RADIUS)
  context.setFillStyle('#ddd9d0')
  context.fill()
  context.clip()

  model.groups.forEach((dots, color) => {
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
  context.restore()
}

export function drawStimulusOffscreen(
  axis: Axis,
  contrast: number,
  direction: Direction,
  seed: number
): Promise<string> {
  const canvas = Taro.createOffscreenCanvas({
    type: '2d',
    width: SIZE,
    height: SIZE
  })
  const modern = canvas.getContext('2d') as unknown as ModernCanvasContext
  const context: StimulusPaintContext = {
    clearRect: modern.clearRect.bind(modern),
    fillRect: modern.fillRect.bind(modern),
    save: modern.save.bind(modern),
    restore: modern.restore.bind(modern),
    beginPath: modern.beginPath.bind(modern),
    closePath: modern.closePath.bind(modern),
    moveTo: modern.moveTo.bind(modern),
    lineTo: modern.lineTo.bind(modern),
    quadraticCurveTo: modern.quadraticCurveTo.bind(modern),
    arc: modern.arc.bind(modern),
    fill: modern.fill.bind(modern),
    stroke: modern.stroke.bind(modern),
    clip: modern.clip.bind(modern),
    setFillStyle: (color) => {
      modern.fillStyle = color
    },
    setStrokeStyle: (color) => {
      modern.strokeStyle = color
    },
    setLineWidth: (width) => {
      modern.lineWidth = width
    }
  }
  paintStimulus(context, buildStimulusModel(axis, contrast, direction, seed))
  return Taro.canvasToTempFilePath({
    canvas: canvas as never,
    x: 0,
    y: 0,
    width: SIZE,
    height: SIZE,
    destWidth: SIZE * 2,
    destHeight: SIZE * 2,
    fileType: 'png'
  }).then((result) => result.tempFilePath)
}

export function drawStimulus(
  canvasId: string,
  axis: Axis,
  contrast: number,
  direction: Direction,
  seed: number,
  onComplete?: () => void
) {
  const context = Taro.createCanvasContext(canvasId)
  const model = buildStimulusModel(axis, contrast, direction, seed)

  paintStimulus(context, model)
  context.draw(false, onComplete)
}
