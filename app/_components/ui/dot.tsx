export default function Dot({size, color, className}: {size: number, color: string, className?: string}) {
  const colorMap = {
    brown: '#8B7B70',
    blue: '#9EC2DD',
    green: '#2A9421',
    yellow: '#CA932E',
    orange: '#FF8C00',
    red: '#923D4F',
    black: '#000000',
    gold: '#D3C393',
  }
  const colorValue = colorMap[color as keyof typeof colorMap]; 
  return (
    <div style={{
      width: size,
      minWidth: size,
      height: size,
      backgroundColor: colorValue,
      borderRadius: '100%',
    }} className={className} />
  )
}