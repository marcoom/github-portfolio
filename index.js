/* -----------------------------------------
  Have focus outline only for keyboard users 
 ---------------------------------------- */

const handleFirstTab = (e) => {
  if (e.key === 'Tab') {
    document.body.classList.add('user-is-tabbing')

    window.removeEventListener('keydown', handleFirstTab)
    window.addEventListener('mousedown', handleMouseDownOnce)
  }

}

const handleMouseDownOnce = () => {
  document.body.classList.remove('user-is-tabbing')

  window.removeEventListener('mousedown', handleMouseDownOnce)
  window.addEventListener('keydown', handleFirstTab)
}

window.addEventListener('keydown', handleFirstTab)

const backToTopButton = document.querySelector(".back-to-top");
let isBackToTopRendered = false;

let alterStyles = (isBackToTopRendered) => {
  backToTopButton.style.visibility = isBackToTopRendered ? "visible" : "hidden";
  backToTopButton.style.opacity = isBackToTopRendered ? 1 : 0;
  backToTopButton.style.transform = isBackToTopRendered
    ? "scale(1)"
    : "scale(0)";
};

window.addEventListener("scroll", () => {
  if (window.scrollY > 700) {
    isBackToTopRendered = true;
    alterStyles(isBackToTopRendered);
  } else {
    isBackToTopRendered = false;
    alterStyles(isBackToTopRendered);
  }
});

// Synchronize project media playback with viewport visibility
const projectMediaBoxes = Array.from(document.querySelectorAll('.work__box')).filter((box) => box.querySelector('[data-project-media]'));

if (projectMediaBoxes.length) {
  const visibilityByBox = new Map();
  let activeBox = null;

  const getMedia = (box) => box.querySelector('[data-project-media]');

  const ensureVideoSource = (video) => {
    if (!video || video.dataset.videoLoaded === 'true') {
      return;
    }

    const source = video.dataset.videoSrc;

    if (!source) {
      return;
    }

    video.src = source;
    video.load();
    video.dataset.videoLoaded = 'true';
  };

  const seekToStart = (video) => {
    if (!video || video.dataset.videoLoaded !== 'true') {
      return;
    }

    const setTime = () => {
      try {
        video.currentTime = 0;
      } catch (_) {
        /* Metadata not ready yet; ignore and wait for the next cycle. */
      }
    };

    if (video.readyState >= 1) {
      setTime();
      return;
    }

    const onLoadedMetadata = () => {
      setTime();
      video.removeEventListener('loadedmetadata', onLoadedMetadata);
    };

    video.addEventListener('loadedmetadata', onLoadedMetadata, { once: true });
  };

  const resetVideo = (video) => {
    if (!video || video.dataset.videoLoaded !== 'true') {
      return;
    }

    video.pause();
    seekToStart(video);
  };

  const playVideo = (video) => {
    if (!video) {
      return;
    }

    ensureVideoSource(video);

    if (video.dataset.videoLoaded !== 'true') {
      return;
    }

    seekToStart(video);
    const playPromise = video.play();

    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {
        /* Autoplay may be blocked; user interaction will resume playback. */
      });
    }
  };

  projectMediaBoxes.forEach((box) => {
    const media = getMedia(box);

    if (media) {
      resetVideo(media);
    }

    visibilityByBox.set(box, 0);
  });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      visibilityByBox.set(entry.target, entry.intersectionRatio);

      if (entry.intersectionRatio <= 0 && entry.target === activeBox) {
        resetVideo(getMedia(entry.target));
        activeBox = null;
      }
    });

    let bestBox = null;
    let bestRatio = 0;

    visibilityByBox.forEach((ratio, box) => {
      if (ratio > bestRatio) {
        bestRatio = ratio;
        bestBox = box;
      }
    });

    const minimumRatio = 0.3;

    if (bestBox && bestRatio >= minimumRatio) {
      if (bestBox !== activeBox) {
        if (activeBox) {
          resetVideo(getMedia(activeBox));
        }

        playVideo(getMedia(bestBox));
        activeBox = bestBox;
      }

      return;
    }

    if (activeBox) {
      resetVideo(getMedia(activeBox));
      activeBox = null;
    }
  }, {
    threshold: [0, 0.1, 0.25, 0.35, 0.5, 0.75, 1],
  });

  projectMediaBoxes.forEach((box) => observer.observe(box));
}

// Accessible collapsible sections for project groups
const collapsibleGroups = Array.from(document.querySelectorAll('[data-collapsible]'));

if (collapsibleGroups.length) {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const transitionDefinition = 'height 0.32s cubic-bezier(0.4, 0, 0.2, 1)';

  collapsibleGroups.forEach((group, index) => {
    const trigger = group.querySelector('[data-collapsible-toggle]');
    const panel = group.querySelector('[data-collapsible-panel]');

    if (!trigger || !panel) {
      return;
    }

    let transitionEndHandler = null;

    const stopAnimation = () => {
      if (transitionEndHandler) {
        panel.removeEventListener('transitionend', transitionEndHandler);
        transitionEndHandler = null;
      }

      panel.style.transition = '';
      panel.style.height = '';
      panel.style.overflow = '';
    };

    const ensureAriaControls = () => {
      if (trigger.hasAttribute('aria-controls')) {
        return;
      }

      const fallbackId = panel.id || `work-collapsible-${index}`;

      if (!panel.id) {
        panel.id = fallbackId;
      }

      trigger.setAttribute('aria-controls', fallbackId);
    };

    ensureAriaControls();

    const registerTransitionEnd = (shouldHideAfter) => {
      const handler = (event) => {
        if (event.target !== panel || event.propertyName !== 'height') {
          return;
        }

        stopAnimation();

        if (shouldHideAfter) {
          panel.hidden = true;
        }
      };

      transitionEndHandler = handler;
      panel.addEventListener('transitionend', handler);
    };

    const expandPanel = () => {
      stopAnimation();
      group.classList.add('is-open');
      trigger.setAttribute('aria-expanded', 'true');
      panel.hidden = false;

      if (prefersReducedMotion.matches) {
        return;
      }

      const targetHeight = panel.scrollHeight;

      panel.style.height = '0px';
      panel.style.overflow = 'hidden';
      panel.style.transition = transitionDefinition;

      requestAnimationFrame(() => {
        panel.style.height = `${targetHeight}px`;
      });

      registerTransitionEnd(false);
    };

    const collapsePanel = ({ skipAnimation = false } = {}) => {
      stopAnimation();
      group.classList.remove('is-open');
      trigger.setAttribute('aria-expanded', 'false');

      if (skipAnimation || prefersReducedMotion.matches) {
        panel.hidden = true;
        return;
      }

      const startHeight = panel.scrollHeight;

      if (startHeight === 0) {
        panel.hidden = true;
        return;
      }

      panel.style.height = `${startHeight}px`;
      panel.style.overflow = 'hidden';
      panel.style.transition = transitionDefinition;

      requestAnimationFrame(() => {
        panel.style.height = '0px';
      });

      registerTransitionEnd(true);
    };

    trigger.addEventListener('click', () => {
      const isExpanded = trigger.getAttribute('aria-expanded') === 'true';

      if (isExpanded) {
        collapsePanel();
        return;
      }

      expandPanel();
    });

    collapsePanel({ skipAnimation: true });
  });
}
