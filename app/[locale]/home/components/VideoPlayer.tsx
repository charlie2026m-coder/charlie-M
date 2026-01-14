'use client';

interface VideoPlayerProps {
  videoSrc: string;
  posterSrc?: string;
  className?: string;
}

function getVideoType(url: string): 'youtube' | 'vimeo' | 'direct' {
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    return 'youtube';
  }
  if (url.includes('vimeo.com')) {
    return 'vimeo';
  }
  return 'direct';
}

function getYouTubeId(url: string): string | null {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

function getVimeoId(url: string): string | null {
  const regExp = /vimeo.*\/(\d+)/i;
  const match = url.match(regExp);
  return match ? match[1] : null;
}

export default function VideoPlayer({ videoSrc, posterSrc, className = '' }: VideoPlayerProps) {
  const videoType = getVideoType(videoSrc);

  const getEmbedUrl = () => {
    if (videoType === 'youtube') {
      const videoId = getYouTubeId(videoSrc);
      return videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=1&loop=1&playlist=${videoId}&controls=0&modestbranding=1&rel=0&mute=1&disablekb=1&fs=0&iv_load_policy=3&showinfo=0&cc_load_policy=0&playsinline=1&enablejsapi=1&start=0` : '';
    }
    if (videoType === 'vimeo') {
      const videoId = getVimeoId(videoSrc);
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
