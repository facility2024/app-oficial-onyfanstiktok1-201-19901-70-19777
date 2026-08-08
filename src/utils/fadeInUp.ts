// Animation utility for iOS optimizations
export const fadeInUpAnimation = `
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translate3d(0, 30px, 0);
  }
  to {
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }
}
`;

// Insert animation into head if not present
export const ensureFadeInUpAnimation = () => {
  if (document.querySelector('#fadeInUp-animation')) return;
  
  const style = document.createElement('style');
  style.id = 'fadeInUp-animation';
  style.textContent = fadeInUpAnimation;
  document.head.appendChild(style);
};