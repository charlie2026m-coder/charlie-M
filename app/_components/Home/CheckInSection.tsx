import CheckInForm from './CheckInForm'

const CheckInSection = () => {
  return (
    <div className='w-full h-[65px] bg-blue'>
      <div className='container px-[100px]'>
        <CheckInForm isBrown={true} />
      </div>
    </div>
  )
}

export default CheckInSection