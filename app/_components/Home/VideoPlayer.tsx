'use client';

interface VideoPlayerProps {
  videoSrc: string;
  posterSrc?: string;
  className?: string;
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

export default function VideoPlayer({ videoSrc, posterSrc, className = '' }: VideoPlayerProps) {
  const videoType = getVideoType(videoSrc);

  // Generate embed URL for YouTube/Vimeo
  const getEmbedUrl = () => {
    if (videoType === 'youtube') {
      const videoId = getYouTubeId(videoSrc);
      // Loop requires playlist parameter with same video ID
      // All controls disabled, no user interaction allowed
      // Additional parameters to hide all YouTube UI elements on load
      return videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=1&loop=1&playlist=${videoId}&controls=0&modestbranding=1&rel=0&mute=1&disablekb=1&fs=0&iv_load_policy=3&showinfo=0&cc_load_policy=0&playsinline=1&enablejsapi=1&start=0` : '';
    }
    if (videoType === 'vimeo') {
      const videoId = getVimeoId(videoSrc);
      // background=1 hides all controls and makes it autoplay/loop
      return videoId ? `https://player.vimeo.com/video/${videoId}?autoplay=1&loop=1&muted=1&background=1&api=1` : '';
    }
    return '';
  };

  return (
    <div className={`relative w-full overflow-hidden ${className}`}>
      {videoType === 'direct' ? (
        <video
          className="w-full h-full object-cover pointer-events-none"
          poster={posterSrc}
          playsInline
          muted
          autoPlay
          loop
          style={{ pointerEvents: 'none' }}
        >
          <source src={videoSrc} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      ) : (
        <div className="relative w-full h-full overflow-hidden">
          <iframe
            className="w-full h-full object-cover pointer-events-none absolute top-0 left-0"
            src={getEmbedUrl()}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen={false}
            style={{ pointerEvents: 'none' }}
            frameBorder="0"
          />
        </div>
      )}
    </div>
  );
}
