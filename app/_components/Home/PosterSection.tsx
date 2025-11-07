import VideoPlayer from './VideoPlayer'
import CheckInForm from './CheckInForm'

const PosterSection = () => {
  return (
    <div className="w-full mb-[85px] relative">
      <VideoPlayer 
        videoSrc="/videos/video.mov" 
        className="aspect-video w-full h-[510px]" 
      />
      <CheckInForm className="absolute bottom-[30px] left-1/2 -translate-x-1/2 w-[90%] max-w-[1200px]" />
    </div>
  )
}

export default PosterSection