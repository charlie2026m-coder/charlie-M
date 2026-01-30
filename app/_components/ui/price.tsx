const Price = ({ price, className }: { price: number, className?: string }) => {
  // Format price for display without modifying the original value
  const formattedPrice = price.toFixed(2);
  
  return (
    <div className={`text-lg rounded-full bg-green/10 font-bold text-green px-5 py-2 flex items-center justify-center ${className ?? ''}`}>€{formattedPrice}</div> 
  )
}

export default Price