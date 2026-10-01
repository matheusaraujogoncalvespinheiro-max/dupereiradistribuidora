import { useEffect, useRef } from 'react';
import ocutusVideo from '../assets/ocutus_intro.mp4';

export default function SplashScreen({ onFinish }) {
  const videoRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Bloqueia Picture-in-Picture e menu de tradução
    try { video.disablePictureInPicture = true; } catch {}
    video.setAttribute('disablePictureInPicture', '');
    video.setAttribute('controlsList', 'nodownload nofullscreen noremoteplayback noplaybackrate');

    const setPlaybackRate = () => {
      try {
        video.playbackRate = 1.5;
      } catch (e) {
        console.warn('Não foi possível definir playbackRate', e);
      }
    };

    // Define 1.5x assim que metadados carregarem e também imediatamente
    video.addEventListener('loadedmetadata', setPlaybackRate);
    setPlaybackRate();

    // Tenta autoplay (necessário para alguns browsers)
    const playPromise = video.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {
        // Autoplay bloqueado - usuário precisará interagir; mantém fallback de tempo
      });
    }

    // Fallback: se o vídeo falhar ou onEnded não disparar, avança automático após ~6s (8s / 1.5x + buffer)
    const fallbackTimer = setTimeout(() => {
      onFinish();
    }, 6500);

    const handleEnded = () => {
      clearTimeout(fallbackTimer);
      onFinish();
    };
    video.addEventListener('ended', handleEnded);
    video.addEventListener('error', handleEnded);

    return () => {
      clearTimeout(fallbackTimer);
      video.removeEventListener('loadedmetadata', setPlaybackRate);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('error', handleEnded);
    };
  }, [onFinish]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: '#000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      <video
        ref={videoRef}
        src={ocutusVideo}
        autoPlay
        muted
        playsInline
        preload="auto"
        disablePictureInPicture
        controlsList="nodownload nofullscreen noremoteplayback noplaybackrate"
        translate="no"
        onEnded={onFinish}
        onError={onFinish}
        onLoadedMetadata={(e) => {
          try { e.target.playbackRate = 1.5; } catch {}
        }}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
      />
    </div>
  );
}
