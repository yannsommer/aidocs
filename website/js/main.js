/**
 * AiStudio Website JavaScript
 * Main interactive functionality
 */

(function() {
    'use strict';

    // Initialize
    document.addEventListener('DOMContentLoaded', init);

    function init() {
        setupSmoothScroll();
        setupAnimations();
        setupAccessibility();
        setupLazyLoading();
    }

    /**
     * Smooth Scroll
     * Smooth scrolling for anchor links
     */
    function setupSmoothScroll() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                const targetId = this.getAttribute('href');
                const targetElement = document.querySelector(targetId);

                if (targetElement) {
                    e.preventDefault();

                    const offsetTop = targetElement.offsetTop;

                    window.scrollTo({
                        top: offsetTop,
                        behavior: 'smooth'
                    });
                }
            });
        });
    }

    /**
     * Animation Observer
     * Trigger animations when elements come into view
     */
    function setupAnimations() {
        // Check if Intersection Observer is supported
        if ('IntersectionObserver' in window) {
            const animationObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('animate-in');
                        animationObserver.unobserve(entry.target);
                    }
                });
            }, {
                threshold: 0.1,
                rootMargin: '0px 0px -50px 0px'
            });

            // Observe elements for animation
            document.querySelectorAll('.beta__card, .feature__item').forEach(el => {
                animationObserver.observe(el);
            });
        }
    }

    /**
     * Accessibility Features
     */
    function setupAccessibility() {
        // Add keyboard navigation for interactive elements
        document.querySelectorAll('.feature__item, .beta__card, .info__item').forEach(element => {
            element.setAttribute('tabindex', '0');

            element.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    element.click();
                }
            });
        });

        // Add aria-labels for better screen reader support
        const qrCode = document.querySelector('.qr__code');
        if (qrCode) {
            qrCode.setAttribute('aria-label', 'AiStudio 微信交流群二维码');
            qrCode.setAttribute('role', 'img');
        }
    }

    /**
     * Lazy load non-critical elements
     */
    function setupLazyLoading() {
        if ('IntersectionObserver' in window) {
            const lazyElements = document.querySelectorAll('[data-lazy]');

            const lazyObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const element = entry.target;
                        const src = element.getAttribute('data-lazy');

                        if (src) {
                            element.src = src;
                            element.removeAttribute('data-lazy');
                        }

                        lazyObserver.unobserve(element);
                    }
                });
            });

            lazyElements.forEach(el => lazyObserver.observe(el));
        }
    }

    /**
     * Error Handling
     */
    window.addEventListener('error', function(e) {
        console.error('JavaScript error occurred:', e.error);
    });

    /**
     * Utility Functions
     */

    // Debounce function for performance
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Throttle function for performance
    function throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    // Add visual feedback for development
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        console.log('🚀 AiStudio Website initialized successfully');
        console.log('📱 Responsive breakpoints: Mobile(<768px), Tablet(768-1024px), Desktop(>1024px)');
    }

})();
