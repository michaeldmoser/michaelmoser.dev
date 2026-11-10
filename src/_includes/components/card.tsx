import type { CardPalette } from '#lib/card.ts'

export function Card(props: {
  title: string
  siteName: string
  palette: CardPalette
}) {
  return (
    <div
      style={`display: flex; flex-direction: column; justify-content: space-between; width: 100%; height: 100%; padding: 80px; background-color: ${props.palette.background}; color: ${props.palette.text}; font-family: Inter`}
    >
      <div style='display: flex; font-size: 72px; font-weight: 700; line-height: 1.15'>
        {props.title}
      </div>
      <div
        style={`display: flex; font-size: 36px; color: ${props.palette.accent}`}
      >
        {props.siteName}
      </div>
    </div>
  )
}
