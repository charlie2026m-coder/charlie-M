import Image from 'next/image'
import Line from '../_components/footer/Line'
import PosterSection from './components/PosterSection'
import LocationSection from './components/LocationSection'
import ShoppingSection from './components/ShoppingSection'
import LifeStyle from './components/LifeStyle'

const LocationPage = () => {
  return (
    <section>
      <PosterSection />
      <Line black={true} /> 
      <LocationSection />
      <Line black={true} /> 
      <ShoppingSection />
      <Line black={true} /> 
      <LifeStyle />
    </section>
  )
}

export default LocationPage