const GuestCard = ({
  name,
  birthdate,
  id,
  nationality,
  address,
}: {
  name: string
  birthdate: string
  id: string
  nationality: string
  address: string
}) => {

  return (
    <div className='grid grid-cols-5 gap-2 p-5 rounded-2xl bg-white border hover:shadow-md transition-all duration-300 cursor-pointer'>
      <div className='col-span-1 flex flex-col gap-6'>
        <Item label='Name' value={name} />
        <Item label='Birthdate' value={birthdate} />
      </div>
      <div className='col-span-1 flex flex-col gap-6'>
        <Item label='ID' value={id} />
        <Item label='Nationality' value={nationality} />
      </div>

      <div className='col-span-3 flex flex-col'>
        <Item label='Address' value={address} />
      </div>
    </div>
  )
}

export default GuestCard

const Item = ({ label, value }: { label: string, value: string }) => {
  return (
    <div className='flex flex-col text-sm'>
    {label}
    <span className='font-semibold'>{value}</span>
  </div>
  )
}