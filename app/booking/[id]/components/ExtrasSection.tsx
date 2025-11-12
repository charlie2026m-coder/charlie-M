import ExtraCard from './ExtraCard'

const ExtrasSection = ({ 
  setExtra,
  extras, 
  specialPackages, 
  externalExtras 
}: { 
  setExtra: (extra: { image: string, title: string, price: number }) => void,
  extras: { image: string, title: string, price: number }[], 
  specialPackages: { image: string, title: string, price: number }[], 
  externalExtras: { image: string, title: string, price: number }[] 
}) => {

  return (  
    <div className='flex flex-col gap-[26px]'>
      <h2 className='inter  font-semibold w-full pb-2.5 border-b'>Add Extras:</h2>
      <div className='grid grid-cols-4 gap-6 gap-y-10'>
        {extras.map((extra, index) => (
          <ExtraCard key={extra.title + index} item={extra} setExtra={setExtra} />
        ))}
      </div>
      <h2 className='inter  font-semibold w-full text-lg'>Additional "Special" Packages:</h2>
      <div className='grid grid-cols-4 gap-6 gap-y-10'>
        {specialPackages.map((specialPackage, index) => (
          <ExtraCard key={specialPackage.title + index} item={specialPackage} setExtra={setExtra} />
        ))}
      </div>
      <h2 className='inter  font-semibold w-full text-lg'>External Extras:</h2>
      <div className='grid grid-cols-4 gap-6 gap-y-10'>
        {externalExtras.map((specialPackage, index) => (
          <ExtraCard key={specialPackage.title + index} item={specialPackage} setExtra={setExtra} />
        ))}
      </div>
    </div>
  )
}

export default ExtrasSection;


