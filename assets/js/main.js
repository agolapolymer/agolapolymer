/**
 * Main JavaScript for Agola Polymer Website
 */
document.addEventListener('DOMContentLoaded', () => {
  // 1. STICKY NAVBAR
  const header = document.querySelector('.site-header');
  
  if (header) {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
  }

  // 2. MOBILE MENU TOGGLE
  const mobileToggle = document.querySelector('.mobile-toggle');
  const navLinks = document.querySelector('.nav-links');
  
  if (mobileToggle && navLinks) {
    // Check or create overlay
    let overlay = document.querySelector('.nav-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'nav-overlay';
      document.body.appendChild(overlay);
    }

    const toggleMenu = () => {
      navLinks.classList.toggle('active');
      overlay.classList.toggle('active');
      document.body.style.overflow = navLinks.classList.contains('active') ? 'hidden' : '';
    };

    mobileToggle.addEventListener('click', toggleMenu);
    overlay.addEventListener('click', toggleMenu);

    // Close menu when a link is clicked
    const links = navLinks.querySelectorAll('a');
    links.forEach(link => {
      link.addEventListener('click', () => {
        if (navLinks.classList.contains('active')) {
          toggleMenu();
        }
      });
    });
  }

  // 3. SMOOTH SCROLLING
  const anchorLinks = document.querySelectorAll('a[href^="#"]');
  
  anchorLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      const targetId = link.getAttribute('href');
      
      if (targetId === '#') return;
      
      const targetElement = document.querySelector(targetId);
      
      if (targetElement) {
        e.preventDefault();
        const headerHeight = 80;
        const targetPosition = targetElement.getBoundingClientRect().top + window.scrollY - headerHeight;
        
        window.scrollTo({
          top: targetPosition,
          behavior: 'smooth'
        });
      }
    });
  });

  // 4. ACTIVE NAV LINK
  const sections = document.querySelectorAll('section[id]');
  const navItems = document.querySelectorAll('.nav-links a');

  const highlightNav = () => {
    const scrollY = window.scrollY;
    
    sections.forEach(section => {
      const sectionHeight = section.offsetHeight;
      const sectionTop = section.offsetTop - 100;
      const sectionId = section.getAttribute('id');
      
      if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
        navItems.forEach(link => {
          link.classList.remove('active');
          if (link.getAttribute('href') === `#${sectionId}`) {
            link.classList.add('active');
          }
        });
      }
    });
  };

  window.addEventListener('scroll', highlightNav);

  // 5. COUNTER ANIMATION
  const statNumbers = document.querySelectorAll('.stat-number');
  
  if (statNumbers.length > 0) {
    const animateValue = (obj, start, end, duration) => {
      let startTimestamp = null;
      const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        
        // easeOutQuad
        const easeProgress = progress * (2 - progress);
        
        obj.innerHTML = Math.floor(easeProgress * (end - start) + start) + '+';
        
        if (progress < 1) {
          window.requestAnimationFrame(step);
        }
      };
      window.requestAnimationFrame(step);
    };

    const counterObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const target = parseInt(entry.target.getAttribute('data-target'), 10);
          if (!isNaN(target)) {
            animateValue(entry.target, 0, target, 2000);
          }
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });

    statNumbers.forEach(stat => {
      counterObserver.observe(stat);
    });
  }

  // 6. BACK TO TOP BUTTON
  const backToTopBtn = document.querySelector('.back-to-top');
  
  if (backToTopBtn) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 500) {
        backToTopBtn.classList.add('visible');
      } else {
        backToTopBtn.classList.remove('visible');
      }
    });

    backToTopBtn.addEventListener('click', () => {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });
  }

  // 7. TESTIMONIAL SLIDER (simple)
  const testimonials = document.querySelectorAll('.testimonial-card');
  const dotsContainer = document.querySelector('.testimonial-dots');
  
  if (testimonials.length > 0 && dotsContainer) {
    // Setup - initially hide all but first
    testimonials.forEach((testimonial, index) => {
      if (index !== 0) {
        testimonial.style.display = 'none';
        testimonial.style.opacity = '0';
      } else {
        testimonial.style.display = 'block';
        testimonial.style.opacity = '1';
      }
      
      // Create dot
      const dot = document.createElement('div');
      dot.className = index === 0 ? 'dot active' : 'dot';
      dot.setAttribute('data-index', index);
      dotsContainer.appendChild(dot);
      
      // Dot click event
      dot.addEventListener('click', () => {
        showTestimonial(index);
      });
    });

    let currentIndex = 0;
    const dots = document.querySelectorAll('.dot');
    let autoPlayInterval;

    const showTestimonial = (index) => {
      // Hide current
      testimonials[currentIndex].style.opacity = '0';
      setTimeout(() => {
        testimonials[currentIndex].style.display = 'none';
        dots[currentIndex].classList.remove('active');
        
        // Show new
        currentIndex = index;
        testimonials[currentIndex].style.display = 'block';
        setTimeout(() => {
          testimonials[currentIndex].style.opacity = '1';
        }, 50);
        dots[currentIndex].classList.add('active');
      }, 300); // Wait for fade out
      
      resetAutoPlay();
    };

    const nextTestimonial = () => {
      const nextIndex = (currentIndex + 1) % testimonials.length;
      showTestimonial(nextIndex);
    };

    const resetAutoPlay = () => {
      clearInterval(autoPlayInterval);
      autoPlayInterval = setInterval(nextTestimonial, 5000);
    };

    // Initialize auto play
    resetAutoPlay();
  }

  // 8. FAQ ACCORDION HANDLER
  const faqItems = document.querySelectorAll('.faq-item');
  if (faqItems.length > 0) {
    faqItems.forEach(item => {
      const questionBtn = item.querySelector('.faq-question');
      const answer = item.querySelector('.faq-answer');

      if (questionBtn && answer) {
        questionBtn.addEventListener('click', () => {
          const isOpen = item.classList.contains('active');

          // Close all FAQ items
          faqItems.forEach(otherItem => {
            otherItem.classList.remove('active');
            const otherAnswer = otherItem.querySelector('.faq-answer');
            if (otherAnswer) {
              otherAnswer.style.maxHeight = null;
            }
          });

          // Toggle clicked item
          if (!isOpen) {
            item.classList.add('active');
            answer.style.maxHeight = answer.scrollHeight + 'px';
          }
        });
      }
    });

    // Open first FAQ item by default
    const firstFaq = faqItems[0];
    if (firstFaq) {
      const firstAnswer = firstFaq.querySelector('.faq-answer');
      if (firstAnswer) {
        firstFaq.classList.add('active');
        firstAnswer.style.maxHeight = firstAnswer.scrollHeight + 'px';
      }
    }
  }

  // 9. INSTANT RFQ FORM TO WHATSAPP HANDLER
  const rfqForm = document.getElementById('rfqForm');
  if (rfqForm) {
    rfqForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const company = document.getElementById('rfqCompany')?.value.trim() || '';
      const contact = document.getElementById('rfqContact')?.value.trim() || '';
      const width = document.getElementById('rfqWidth')?.value.trim() || '';
      const length = document.getElementById('rfqLength')?.value.trim() || '';
      const thickness = document.getElementById('rfqThickness')?.value.trim() || '';
      const thicknessUnit = document.getElementById('rfqThicknessUnit')?.value || 'Micron';
      const quantity = document.getElementById('rfqQuantity')?.value.trim() || '';
      const quantityUnit = document.getElementById('rfqQuantityUnit')?.value || 'Kg';
      const colour = document.getElementById('rfqColour')?.value || '';
      const location = document.getElementById('rfqLocation')?.value.trim() || '';
      const note = document.getElementById('rfqNote')?.value.trim() || '';
      const productTitle = document.querySelector('.product-detail-title')?.innerText.trim() || document.querySelector('.blog-hero-title')?.innerText.trim() || '';

      if (!company || !contact) {
        alert('Please fill in Company Name and Contact Number.');
        return;
      }

      // Build formatted quotation request message
      let message = `*INSTANT QUOTATION REQUEST — AGOLA POLYMER*\n`;
      message += `---------------------------------\n`;
      if (productTitle) {
        message += `📦 *Inquiry For:* ${productTitle}\n`;
      }
      message += `🏢 *1. Company Name:* ${company}\n`;
      message += `📞 *2. Contact No:* ${contact}\n`;
      if (width || length) {
        message += `📏 *3. Required Size:* ${width ? 'Width: ' + width : ''}${width && length ? ' | ' : ''}${length ? 'Length: ' + length : ''}\n`;
      }
      if (thickness) {
        message += `📐 *4. Thickness:* ${thickness} ${thicknessUnit}\n`;
      }
      if (quantity) {
        message += `⚖️ *5. Quantity:* ${quantity} ${quantityUnit}\n`;
      }
      if (colour) {
        message += `🎨 *6. Colour & Transparency:* ${colour}\n`;
      }
      if (location) {
        message += `📍 *7. Delivery Location:* ${location}\n`;
      }
      if (note) {
        message += `📝 *8. Note:* ${note}\n`;
      }
      message += `---------------------------------\n`;
      message += `Sent directly from Agola Polymer Official Website`;

      const whatsappNumber = '919913945550'; // Agola Polymer Factory Sales Number (+91 99139 45550)
      const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;

      // Open WhatsApp
      window.open(whatsappUrl, '_blank');
    });
  }
});

