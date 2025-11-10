
export default function Dot({size, color}: {size: number, color: string}) {
  const colorMap = {
    brown: '#8B7B70',
    blue: '#9EC2DD',

  }
  const colorValue = colorMap[color as keyof typeof colorMap]; 
  return (
    <div style={{
      width: size,
      height: size,
      backgroundColor: colorValue,
      borderRadius: '100%',
    }} />
  )
}