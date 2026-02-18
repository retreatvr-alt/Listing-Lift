"use client";

interface YouTubeEmbedProps {
  videoUrl: string;
  title?: string;
}

export function YouTubeEmbed({ videoUrl, title = "Tutorial Video" }: YouTubeEmbedProps) {
  // Extract video ID from various YouTube URL formats
  const getVideoId = (url: string): string | null => {
    const patterns = [
      /youtu\.be\/([^?&]+)/,
      /youtube\.com\/watch\?v=([^?&]+)/,
      /youtube\.com\/embed\/([^?&]+)/
    ];
    
    for (const pattern of patterns) {
      const match = url?.match?.(pattern);
      if (match?.[1]) return match[1];
    }
    return null;
  };

  const videoId = getVideoId(videoUrl);

  if (!videoId) {
    return null;
  }

  return (
    <div className="relative w-full aspect-video rounded-lg overflow-hidden shadow-md bg-gray-900">
      <iframe
        src={`https://www.youtube.com/embed/${videoId}`}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="absolute inset-0 w-full h-full"
      />
    </div>
  );
}
