import { useEffect, useState } from 'react';

const bannerImages = [
  { src: 'https://tiktokonyfans.b-cdn.net/material%20coconudi/Moedas%20coconudi%20(1).png', alt: 'Moedas Coconudi' },
  { src: 'https://tiktokonyfans.b-cdn.net/material%20coconudi/2.jpg', alt: 'Banner 2' },
  { src: 'https://tiktokonyfans.b-cdn.net/material%20coconudi/3.jpg', alt: 'Banner 3' },
  { src: 'https://tiktokonyfans.b-cdn.net/material%20coconudi/4.jpg', alt: 'Banner 4' },
  { src: 'https://tiktokonyfans.b-cdn.net/material%20coconudi/5.jpg', alt: 'Banner 5' },
  { src: 'https://tiktokonyfans.b-cdn.net/material%20coconudi/6.jpg', alt: 'Banner 6' },
];

export const BannerCarousel = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % bannerImages.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full overflow-hidden rounded-xl shadow-lg shadow-black/30">
      <div
        className="flex transition-transform duration-700 ease-in-out"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {bannerImages.map((img, index) => (
          <img
            key={index}
            src={img.src}
            alt={img.alt}
            className="w-full flex-shrink-0 object-contain"
          />
        ))}
      </div>

      {/* Indicadores */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
        {bannerImages.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`w-2 h-2 rounded-full transition-all ${
              index === currentIndex ? 'bg-white w-5' : 'bg-white/50'
            }`}
          />
        ))}
      </div>
    </div>
  );
};
