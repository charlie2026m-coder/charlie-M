const Price = ({ price, className }: { price: string, className?: string }) => {
  return (
    <div className={`text-xl rounded-full bg-green/15 font-[700] text-green px-2.5 py-2 ${className ?? ''}`}>€{price}</div> 
  )
}

export default Price