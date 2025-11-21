'use client';

import { useState, useRef } from 'react';
import { Play, Pause } from 'lucide-react';

interface VideoPlayerProps {
  videoSrc: string;
  posterSrc?: string;
  className?: string;
  showTitle?: boolean;
}

// Helper to detect video type from URL
function getVideoType(url: string): 'youtube' | 'vimeo' | 'direct' {
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    return 'youtube';
  }
  if (url.includes('vimeo.com')) {
    return 'vimeo';
  }
  return 'direct';
}

// Extract video ID from YouTube URL
function getYouTubeId(url: string): string | null {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

// Extract video ID from Vimeo URL
function getVimeoId(url: string): string | null {
  const regExp = /vimeo.*\/(\d+)/i;
  const match = url.match(regExp);
  return match ? match[1] : null;
}

export default function VideoPlayer({ videoSrc, posterSrc, className = '', showTitle = false }: VideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const videoType = getVideoType(videoSrc);

  const togglePlay = () => {
    if (videoType === 'direct' && videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    } else if (videoType === 'youtube' && iframeRef.current) {
      // For YouTube iframe API
      const message = isPlaying ? '{"event":"command","func":"pauseVideo","args":""}' : '{"event":"command","func":"playVideo","args":""}';
      iframeRef.current.contentWindow?.postMessage(message, '*');
      setIsPlaying(!isPlaying);
    } else if (videoType === 'vimeo' && iframeRef.current) {
      // For Vimeo iframe API
      const message = isPlaying ? '{"method":"pause"}' : '{"method":"play"}';
      iframeRef.current.contentWindow?.postMessage(message, '*');
      setIsPlaying(!isPlaying);
    }
  };

  const handleVideoClick = () => {
    if (videoType === 'direct') {
      togglePlay();
    }
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

  // Generate embed URL for YouTube/Vimeo
  const getEmbedUrl = () => {
    if (videoType === 'youtube') {
      const videoId = getYouTubeId(videoSrc);
      return videoId ? `https://www.youtube.com/embed/${videoId}?enablejsapi=1&controls=0&modestbranding=1&rel=0` : '';
    }
    if (videoType === 'vimeo') {
      const videoId = getVimeoId(videoSrc);
      return videoId ? `https://player.vimeo.com/video/${videoId}?api=1&controls=0` : '';
    }
    return '';
  };

  return (
    <div 
      className={`relative w-full rounded-[40px] overflow-hidden ${className}`}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      {videoType === 'direct' ? (
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
      ) : (
        <iframe
          ref={iframeRef}
          className="w-full h-full object-cover"
          src={getEmbedUrl()}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      )}

      <div className={`absolute top-0 left-0 right-0 bottom-0 ${isPlaying ? '' : 'bg-black/50'} transition-all duration-300 pointer-events-none`}/>
      
      {!isPlaying && showTitle && <>
        <h1 className='text-4xl md:text-5xl lg:text-6xl text-white font-[700] absolute top-[30px] jakarta w-full text-center'>Charlie M — Hotel Rethought</h1>
        <h1 className='text-xl md:text-2xl lg:text-4xl text-white font-[700] absolute top-[110px] sm:top-[80px] lg:top-[120px] jakarta w-full text-center'>Feel the vibe in the heart of Berlin</h1>
      </>}

      {/* Custom Play Button Overlay */}
      <button
        onClick={togglePlay}
        className={
          `absolute cursor-pointer top-1/3 md:top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[130px] rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center shadow-xl transition-all duration-300 hover:scale-110 hover:opacity-100 
          ${isPlaying ? 'opacity-0' : 'opacity-100'}`
        }
        aria-label={isPlaying ? 'Pause video' : 'Play video'}
      >
         {isPlaying ? <Pause 
            className="size-10 text-white ml-1 transition-transform" 
            fill="currentColor"
          />
          :<Play 
          className="size-10 text-white ml-1 transition-transform" 
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

