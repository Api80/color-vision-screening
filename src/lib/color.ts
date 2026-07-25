import type { Axis } from '@/types'

type Rgb = [number, number, number]
type Lms = [number, number, number]

const RGB_TO_LMS = [
  [0.31399022, 0.63951294, 0.04649755],
  [0.15537241, 0.75789446, 0.08670142],
  [0.01775239, 0.10944209, 0.87256922]
]

const LMS_TO_RGB = [
  [5.47221206, -4.6419601, 0.16963708],
  [-1.1252419, 2.29317094, -0.1678952],
  [0.02980165, -0.19318073, 1.16364789]
]

function multiply(matrix: number[][], vector: Rgb | Lms): Rgb {
  return matrix.map(
    (row) => row[0] * vector[0] + row[1] * vector[1] + row[2] * vector[2]
  ) as Rgb
}

function linearToSrgb(value: number): number {
  const clamped = Math.max(0, Math.min(1, value))
  if (clamped <= 0.0031308) return 12.92 * clamped
  return 1.055 * Math.pow(clamped, 1 / 2.4) - 0.055
}

function toHex(rgb: Rgb): string {
  return `#${rgb
    .map((channel) =>
      Math.round(linearToSrgb(channel) * 255)
        .toString(16)
        .padStart(2, '0')
    )
    .join('')}`
}

export function createAxisPalettes(
  axis: Axis,
  contrast: number
): { foreground: string[]; background: string[] } {
  const baseRgb: Rgb = [0.31, 0.31, 0.31]
  const baseLms = multiply(RGB_TO_LMS, baseRgb)
  const axisIndex = axis === 'l' ? 0 : axis === 'm' ? 1 : 2
  const noiseLevels = [0.8, 0.88, 0.96, 1.04, 1.12, 1.2]

  const build = (sign: -1 | 1) =>
    noiseLevels.map((noise) => {
      const next: Lms = [...baseLms] as Lms
      next[axisIndex] *= 1 + sign * contrast
      const linearRgb = multiply(LMS_TO_RGB, next).map(
        (channel) => channel * noise
      ) as Rgb
      return toHex(linearRgb)
    })

  return {
    foreground: build(1),
    background: build(-1)
  }
}

