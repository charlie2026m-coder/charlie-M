import { Button } from "./button"

export const ButtonIcon = ({ onClick, symbol, disabled }: { onClick: () => void, symbol: '+' | '-', disabled?: boolean }) => {
  return (
    <Button
      variant="ghost"
      size="icon"
      disabled={disabled}
      className='size-6 rounded-full bg-blue hover:opacity-60 disabled:opacity-50 pb-[2px] hover:bg-blue hover:text-white text-white'
      onClick={() => onClick()}
    > {symbol} </Button>
  )
}