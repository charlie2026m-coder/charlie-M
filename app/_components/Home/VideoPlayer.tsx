'use client';

import { useState, useRef } from 'react';
import { Play, Pause } from 'lucide-react';

interface VideoPlayerProps {
  videoSrc: string;
  posterSrc?: string;
  className?: string;
}

export default function VideoPlayer({ videoSrc, posterSrc, className = '' }: VideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleVideoClick = () => {
    togglePlay();
  };

  const handleVideoPlay = () => {
    setIsPlaying(true);
    setShowControls(false);
  };

  const handleVideoPause = () => {
    setIsPlaying(false);
    setShowControls(true);
  };

  const handleVideoEnded = () => {
    setIsPlaying(false);
    setShowControls(true);
  };

  return (
    <div 
      className={`relative w-full rounded-[40px] overflow-hidden ${className}`}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      <video
        ref={videoRef}
        className="w-full h-full object-cover cursor-pointer"
        poster={posterSrc}
        onClick={handleVideoClick}
        onPlay={handleVideoPlay}
        onPause={handleVideoPause}
        onEnded={handleVideoEnded}
        playsInline
      >
        <source src={videoSrc} type="video/mp4" />
        Your browser does not support the video tag.
      </video>
      <div className={`absolute top-0 left-0 right-0 bottom-0 ${isPlaying ? '' : 'bg-black/50'} transition-all duration-300 pointer-events-none`}/>
      {!isPlaying && <>
        <h1 className='text-6xl text-white font-[700] absolute top-[30px] jakarta  w-full text-center'>Charlie M — Hotel Rethought</h1>
        <h1 className='text-4xl text-white font-[700] absolute top-[120px] jakarta  w-full text-center'>Feel the vibe in the heart of Berlin</h1>
      </>}

      {/* Custom Play Button Overlay */}

        <button
          onClick={togglePlay}
          className={
            `absolute cursor-pointer top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[130px] rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center shadow-xl transition-all duration-300 hover:scale-110 hover:opacity-100 
            ${isPlaying ? 'opacity-0' : 'opacity-100'}`
          }
          aria-label={isPlaying ? 'Pause video' : 'Play video'}
        >
           {isPlaying ? <Pause 
              className="size-10 text-white ml-1 transition-transform " 
              fill="currentColor"
            />
            :<Play 
            className="size-10 text-white ml-1 transition-transform " 
            fill="currentColor"
          />}
        </button>

      {/* Gradient overlay for better button visibility */}
      <div className={`absolute inset-0 bg-gradient-to-t from-black/30 to-transparent transition-opacity duration-300 pointer-events-none ${
        showControls && !isPlaying ? 'opacity-100' : 'opacity-0'
      }`} />
    </div>
  );
}

