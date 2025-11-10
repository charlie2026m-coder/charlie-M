import VideoPlayer from './VideoPlayer'
import CheckInForm from './CheckInForm'

const PosterSection = () => {
  return (
    <div className="w-full mb-[85px] relative">
      <VideoPlayer 
        videoSrc="https://www.youtube.com/watch?v=_Yhyp-_hX2s&list=RD_Yhyp-_hX2s&start_radio=1" 
        className="aspect-video w-full h-[510px]" 
        showTitle={true}
      />
      <CheckInForm className="absolute bottom-[30px] left-1/2 -translate-x-1/2 w-[90%] max-w-[1200px]" />
    </div>
  )
}

export default PosterSection