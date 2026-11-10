import type { CardPalette } from '#lib/card.ts'

export function Card(props: {
  title: string
  name: string
  domain: string
  palette: CardPalette
}) {
  return (
    <div
      style={`display: flex; flex-direction: column; width: 100%; height: 100%; background-color: ${props.palette.background}; color: ${props.palette.text}; font-family: Inter`}
    >
      <div
        style={`display: flex; height: 12px; background-color: ${props.palette.accent}`}
      />
      <div style='display: flex; flex-grow: 1; padding: 72px 80px 0 80px; overflow: hidden'>
        <div style='display: block; font-size: 64px; font-weight: 700; line-height: 1.2; line-clamp: 3; text-overflow: ellipsis'>
          {props.title}
        </div>
      </div>
      <div
        style={`display: flex; justify-content: space-between; align-items: center; height: 136px; margin: 0 80px; border-top: 2px solid ${props.palette.accent}; font-size: 32px`}
      >
        <div style='display: flex; font-weight: 700'>{props.name}</div>
        <div style={`display: flex; color: ${props.palette.accent}`}>
          {props.domain}
        </div>
      </div>
    </div>
  )
}
