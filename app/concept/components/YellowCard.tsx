import Dot from '@/app/_components/ui/dot'
const YellowCard = ({ isFirst, items}: { isFirst: boolean, items: string[] }) => {
  return (
    <div className='bg-blue/20 rounded-[20px] p-5 flex flex-col gap-2 w-full'>
      <h4 className='font-semibold mb-2 text-start md:text-center w-full'>{isFirst ? 'What you’ll find:' : 'Where to find it:'}</h4>
      {items.map((item) => (
        <div key={item} className='flex gap-2 text-dark'><Dot size={10} color='brown' className='mt-2' />{item}</div>
      ))}
    </div>
  )
}

export default YellowCard
