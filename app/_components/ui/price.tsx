const Price = ({ price, className }: { price: string, className?: string }) => {
  return (
    <div className={`text-lg rounded-full bg-green/10 font-bold text-green px-2.5 py-2 flex items-center justify-center ${className ?? ''}`}>€{price}</div> 
  )
}

export default Price