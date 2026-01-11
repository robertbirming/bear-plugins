document.addEventListener('DOMContentLoaded', function () {
  if (window.__bearmingPhotoGalleryLightbox) return
  window.__bearmingPhotoGalleryLightbox = true

  const images = Array.from(document.querySelectorAll('.bearming-gallery img'))
  if (!images.length) return

  images.forEach(function (img) {
    if (!img.hasAttribute('tabindex')) img.setAttribute('tabindex', '0')
    img.style.cursor = 'zoom-in'
  })

  const overlay = document.createElement('div')
  overlay.className = 'bearming-lightbox'
  overlay.setAttribute('role', 'dialog')
  overlay.setAttribute('aria-modal', 'true')
  overlay.setAttribute('aria-hidden', 'true')
  overlay.tabIndex = -1

  // Make the overlay work even if CSS is missing.
  overlay.style.position = 'fixed'
  overlay.style.inset = '0'
  overlay.style.display = 'flex'
  overlay.style.alignItems = 'center'
  overlay.style.justifyContent = 'center'
  overlay.style.padding = '1.5rem'
  overlay.style.background = 'rgba(0,0,0,0.85)'
  overlay.style.opacity = '0'
  overlay.style.pointerEvents = 'none'
  overlay.style.transition = 'opacity 0.2s ease'
  overlay.style.zIndex = '9999'

  overlay.innerHTML = `
    <button class="bearming-lightbox-close" type="button" aria-label="Close image">Close</button>
    <img alt="">
  `
  document.body.appendChild(overlay)

  const overlayImg = overlay.querySelector('img')
  const closeBtn = overlay.querySelector('.bearming-lightbox-close')

  // Minimal styling for the contents too.
  closeBtn.style.position = 'absolute'
  closeBtn.style.top = '1rem'
  closeBtn.style.right = '1rem'
  closeBtn.style.border = '1px solid rgba(255,255,255,0.35)'
  closeBtn.style.background = 'rgba(0,0,0,0.6)'
  closeBtn.style.color = '#fff'
  closeBtn.style.padding = '0.2em 0.6em'
  closeBtn.style.borderRadius = '999px'
  closeBtn.style.font = 'inherit'
  closeBtn.style.fontSize = '0.9rem'
  closeBtn.style.lineHeight = '1.3'
  closeBtn.style.cursor = 'pointer'

  overlayImg.style.maxWidth = '100%'
  overlayImg.style.maxHeight = '100%'
  overlayImg.style.borderRadius = '3px'
  overlayImg.style.boxShadow = '0 12px 40px rgba(0,0,0,0.45)'
  overlayImg.style.cursor = 'zoom-out'

  let currentIndex = -1
  let lastActiveEl = null
  let prevOverflow = ''
  let isLocked = false

  function showOverlay() {
    overlay.style.opacity = '1'
    overlay.style.pointerEvents = 'auto'
    overlay.setAttribute('aria-hidden', 'false')
  }

  function hideOverlay() {
    overlay.style.opacity = '0'
    overlay.style.pointerEvents = 'none'
    overlay.setAttribute('aria-hidden', 'true')
  }

  function lockScroll() {
    if (isLocked) return
    prevOverflow = document.documentElement.style.overflow || ''
    document.documentElement.style.overflow = 'hidden'
    isLocked = true
  }

  function unlockScroll() {
    if (!isLocked) return
    document.documentElement.style.overflow = prevOverflow
    isLocked = false
  }

  function updateImage(index) {
    const total = images.length
    currentIndex = ((index % total) + total) % total

    const img = images[currentIndex]
    overlayImg.src = img.currentSrc || img.src
    overlayImg.alt = img.alt || ''
    overlay.setAttribute('aria-label', `Image ${currentIndex + 1} of ${total}`)
  }

  function openAt(index) {
    if (currentIndex === -1) {
      lastActiveEl = document.activeElement
      lockScroll()
      showOverlay()
      overlay.focus({ preventScroll: true })
    }
    updateImage(index)
  }

  function closeLightbox(opts) {
    if (currentIndex === -1) {
      unlockScroll()
      hideOverlay()
      return
    }

    hideOverlay()
    overlayImg.src = ''
    currentIndex = -1

    unlockScroll()

    const skipFocus = opts && opts.skipFocus
    if (!skipFocus && lastActiveEl && typeof lastActiveEl.focus === 'function') {
      lastActiveEl.focus({ preventScroll: true })
    }
    lastActiveEl = null
  }

  function showNext(step) {
    if (currentIndex === -1) return
    updateImage(currentIndex + step)
  }

  images.forEach(function (img, index) {
    img.addEventListener('click', function () {
      openAt(index)
    })

    img.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        openAt(index)
      }
    })
  })

  closeBtn.addEventListener('click', function (event) {
    event.preventDefault()
    closeLightbox()
  })

  overlayImg.addEventListener('click', function () {
    closeLightbox()
  })

  overlay.addEventListener('click', function (event) {
    if (event.target !== overlay) return

    const x = event.clientX
    const left = window.innerWidth * 0.33
    const right = window.innerWidth * 0.67

    if (x < left) showNext(-1)
    else if (x > right) showNext(1)
    else closeLightbox()
  })

  document.addEventListener('keydown', function (event) {
    if (currentIndex === -1) return

    if (event.key === 'Escape') closeLightbox()
    else if (event.key === 'ArrowRight' || event.key === 'd' || event.key === 'D') showNext(1)
    else if (event.key === 'ArrowLeft' || event.key === 'a' || event.key === 'A') showNext(-1)
    else if (event.key === 'Tab') {
      event.preventDefault()
      closeBtn.focus({ preventScroll: true })
    }
  })

  // Safari back button / bfcache safety: never keep scroll locked.
  window.addEventListener('pagehide', function () {
    closeLightbox({ skipFocus: true })
  })

  window.addEventListener('pageshow', function () {
    unlockScroll()
    hideOverlay()
    overlayImg.src = ''
    currentIndex = -1
    lastActiveEl = null
  })

  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState !== 'visible') {
      closeLightbox({ skipFocus: true })
    }
  })
}, { once: true })
