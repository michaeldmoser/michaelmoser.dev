export function Card(props: { title: string; siteName: string }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        width: '100%',
        height: '100%',
        padding: 80,
        backgroundColor: '#ffffff',
        color: '#111111',
        fontFamily: 'Inter'
      }}
    >
      <div
        style={{
          display: 'flex',
          fontSize: 72,
          fontWeight: 700,
          lineHeight: 1.15
        }}
      >
        {props.title}
      </div>
      <div style={{ display: 'flex', fontSize: 36, color: '#0b57d0' }}>
        {props.siteName}
      </div>
    </div>
  )
}
