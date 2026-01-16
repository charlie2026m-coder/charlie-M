import SummaryCard from '../booking/SummaryCard'
import GuestDetailsForm from '../payment/GuestDetailsForm'

const GuestInfo = ({ setBookingPage }: { setBookingPage: (page: number) => void }) => {
  return (
    <div className='grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-10 pb-[30px]'>
      <GuestDetailsForm setBookingPage={setBookingPage} />
      <SummaryCard />
    </div>
  )
}

export default GuestInfo