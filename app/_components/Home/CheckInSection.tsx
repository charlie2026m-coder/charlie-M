import CheckInForm from './CheckInForm'

const CheckInSection = () => {
  return (
    <div className='w-full h-[250px] md:h-[65px] bg-light1'>
      <div className='container px-4 lg:px-[100px]'>
        <CheckInForm isBrown={true} />
      </div>
    </div>
  )
}

export default CheckInSection