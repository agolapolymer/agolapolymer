/**
 * Animations JavaScript for Agola Polymer Website
 */
document.addEventListener('DOMContentLoaded', () => {
  // Check if user prefers reduced motion
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  
  // 1. Select all elements to animate
  const animatedElements = document.querySelectorAll('.fade-in, .slide-up, .slide-left, .slide-right, .slide-down, .scale-in');
  
  if (animatedElements.length > 0) {
    if (prefersReducedMotion) {
      // 5. If user prefers reduced motion, add .animate to all immediately
      animatedElements.forEach(el => {
        el.classList.add('animate');
      });
    } else {
      // 2. Create IntersectionObserver
      const animationObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
          // 3. When element enters viewport, add .animate class
          if (entry.isIntersecting) {
            entry.target.classList.add('animate');
            // 4. Unobserve after animation triggered (one-time)
            observer.unobserve(entry.target);
          }
        });
      }, {
        threshold: 0.15,
        rootMargin: '0px 0px -50px 0px'
      });
      
      // Observe all animated elements
      animatedElements.forEach(el => {
        animationObserver.observe(el);
      });
    }
  }
});
