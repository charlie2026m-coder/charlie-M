import Image from 'next/image'
import Line from '../_components/footer/Line'
import PosterSection from './components/PosterSection'
import LocationSection from './components/LocationSection'


const LocationPage = () => {
  return (
    <section>
      <PosterSection />
      <Line black={true} /> 
      <LocationSection />
      <Line black={true} /> 
    </section>
  )
}

export default LocationPage