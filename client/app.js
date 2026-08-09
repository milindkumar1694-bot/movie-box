/**
 * App.js — Client-side application logic for Frame Private Room.
 *
 * Manages screen transitions, Socket.IO communication,
 * message rendering, image handling, and UI state.
 *
 * No frameworks — vanilla JS matching the Stitch plain-HTML approach.
 */

(function () {
  'use strict';

  // ─── Session ──────────────────────────────────────────────
  const SESSION_KEY = '__frame_session';
  let sessionId = sessionStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, sessionId);
  }

  // ─── State ────────────────────────────────────────────────
  let currentScreen = 'home';
  let socket = null;
  let isInRoom = false;
  let participantCount = 0;
  let pendingImage = null; // { file, dataUrl, mimeType }

  // ─── DOM References ───────────────────────────────────────
  const screens = {
    home: document.getElementById('screen-home'),
    access: document.getElementById('screen-access'),
    playback: document.getElementById('screen-playback'),
    room: document.getElementById('screen-room'),
  };

  const movieNoInput = document.getElementById('movie-no');
  const accessError = document.getElementById('access-error');
  const accessContainer = document.getElementById('access-container');
  const btnPlay = document.getElementById('btn-play');
  const btnPlayText = document.getElementById('btn-play-text');
  const btnContinue = document.getElementById('btn-continue-screening');
  const btnLeave = document.getElementById('btn-leave-room');
  const btnAttach = document.getElementById('btn-attach');
  const btnSend = document.getElementById('btn-send');
  const btnCancelPreview = document.getElementById('btn-cancel-preview');
  const fileInput = document.getElementById('file-input');
  const messageInput = document.getElementById('message-input');
  const messagesContainer = document.getElementById('messages-container');
  const roomStatusText = document.getElementById('room-status-text');
  const reconnectBanner = document.getElementById('reconnect-banner');
  const toastContainer = document.getElementById('toast-container');
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightbox-img');
  const roomFullOverlay = document.getElementById('room-full-overlay');
  const imagePreviewBar = document.getElementById('image-preview-bar');
  const previewThumb = document.getElementById('preview-thumb');
  const previewFilename = document.getElementById('preview-filename');
  const previewFilesize = document.getElementById('preview-filesize');

  // ─── Screen Navigation ────────────────────────────────────

  function navigateTo(screen) {
    if (!screens[screen]) return;

    // Fade out current
    const current = screens[currentScreen];
    if (current) {
      current.classList.add('fade-out');
      setTimeout(() => {
        current.classList.remove('active', 'fade-out');
      }, 300);
    }

    // Fade in new
    setTimeout(() => {
      screens[screen].classList.add('active');
      currentScreen = screen;
      window.scrollTo(0, 0);

      // Screen-specific initialization
      if (screen === 'access') {
        movieNoInput?.focus();
      }
      if (screen === 'room') {
        scrollToBottom();
        messageInput?.focus();
      }
    }, 320);
  }

  // ─── Access Code Verification ─────────────────────────────

  let isVerifying = false;

  async function verifyAccessCode() {
    if (isVerifying) return;

    const code = movieNoInput?.value?.trim();
    if (!code) {
      showAccessError('Please enter a movie number.');
      shakeInput();
      return;
    }

    isVerifying = true;
    btnPlayText.textContent = '...';
    btnPlay.disabled = true;

    try {
      const res = await fetch('/api/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });

      const data = await res.json();

      if (data.success) {
        hideAccessError();
        navigateTo('playback');
      } else {
        showAccessError(data.error || 'Invalid movie number.');
        shakeInput();
      }
    } catch (err) {
      if (err.message?.includes('Too many') || err.message?.includes('429')) {
        showAccessError('Too many attempts. Please wait a moment.');
      } else {
        showAccessError('Connection error. Please try again.');
      }
      shakeInput();
    } finally {
      isVerifying = false;
      btnPlayText.textContent = 'Play';
      btnPlay.disabled = false;
    }
  }

  function showAccessError(msg) {
    if (accessError) {
      accessError.textContent = msg;
      accessError.style.opacity = '1';
    }
  }

  function hideAccessError() {
    if (accessError) {
      accessError.style.opacity = '0';
      setTimeout(() => { accessError.textContent = ''; }, 300);
    }
  }

  function shakeInput() {
    accessContainer?.classList.add('shake');
    setTimeout(() => accessContainer?.classList.remove('shake'), 400);
  }

  // ─── Socket.IO Connection ────────────────────────────────

  function connectSocket() {
    if (socket?.connected) return;

    socket = io({
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socket.on('connect', () => {
      console.log('[Socket] Connected:', socket.id);
      reconnectBanner.style.display = 'none';

      if (isInRoom) {
        // Re-join room after reconnection
        socket.emit('join-room', { sessionId });
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
      if (isInRoom) {
        reconnectBanner.style.display = 'flex';
        updateRoomStatus('Reconnecting', false);
      }
    });

    socket.on('reconnect_attempt', (attempt) => {
      console.log('[Socket] Reconnection attempt:', attempt);
    });

    // ── Room Events ──

    socket.on('room-joined', (data) => {
      isInRoom = true;
      participantCount = data.participantCount;
      updateRoomStatus(participantCount >= 2 ? 'Active' : 'Waiting', true);
      reconnectBanner.style.display = 'none';
    });

    socket.on('user-joined', (data) => {
      participantCount = data.participantCount;
      updateRoomStatus('Active', true);
      showToast('Someone joined the screening', 'person_add');
    });

    socket.on('user-left', (data) => {
      participantCount = data.participantCount;
      const statusLabel = participantCount >= 2 ? 'Active' : 'Waiting';
      updateRoomStatus(statusLabel, true);
      if (data.gracePeriod) {
        showToast('The other viewer may have lost connection', 'wifi_off');
      } else {
        showToast('The other viewer left', 'person_remove');
      }
    });

    socket.on('room-full', (data) => {
      roomFullOverlay.style.display = 'flex';
    });

    // ── Message Events ──

    socket.on('new-message', (msg) => {
      renderMessage(msg);
      scrollToBottom();
    });

    socket.on('new-image', (msg) => {
      renderImageMessage(msg);
      scrollToBottom();
    });

    socket.on('image-failed', (data) => {
      showToast(data.reason || 'Image failed to send', 'error');
      // Remove uploading placeholder
      const placeholder = document.getElementById(`msg-${data.id}`);
      if (placeholder) {
        placeholder.remove();
      }
    });

    socket.on('error', (data) => {
      showToast(data.message || 'An error occurred', 'warning');
    });
  }

  function joinRoom() {
    if (!socket?.connected) {
      connectSocket();
      // Wait for connection before joining
      socket.once('connect', () => {
        socket.emit('join-room', { sessionId });
      });
    } else {
      socket.emit('join-room', { sessionId });
    }
  }

  function leaveRoom() {
    if (socket && isInRoom) {
      socket.emit('leave-room');
      isInRoom = false;
      participantCount = 0;
      clearMessages();
      cancelImagePreview();
      socket.disconnect();
      socket = null;
    }
    navigateTo('home');
  }

  // ─── Room Status ──────────────────────────────────────────

  function updateRoomStatus(text, connected) {
    if (roomStatusText) {
      roomStatusText.textContent = text;
      if (connected) {
        roomStatusText.className = 'font-metadata text-metadata text-primary uppercase tracking-wider';
      } else {
        roomStatusText.className = 'font-metadata text-metadata text-on-surface-variant uppercase tracking-wider reconnect-pulse';
      }
    }
  }

  // ─── Message Rendering ────────────────────────────────────

  function renderMessage(msg) {
    const isMine = msg.senderId === sessionId;
    const el = document.createElement('div');
    el.id = `msg-${msg.id}`;
    el.className = `flex flex-col ${isMine ? 'items-end self-end' : 'items-start'} max-w-[85%] md:max-w-[70%] group msg-enter`;

    const bubble = document.createElement('div');
    if (isMine) {
      bubble.className = 'px-6 py-4 rounded-[24px] bg-surface-container-highest text-on-surface font-body-lg text-body-lg leading-relaxed border border-surface-variant/30 shadow-md';
    } else {
      bubble.className = 'px-6 py-4 rounded-[24px] bg-surface-container-low text-on-surface-variant font-body-lg text-body-lg leading-relaxed border border-transparent shadow-sm';
    }
    // Safely set text content (XSS prevention)
    bubble.textContent = msg.content;

    const meta = document.createElement('div');
    meta.className = `flex items-center gap-2 mt-2 ${isMine ? 'mr-4' : 'ml-4'} opacity-0 group-hover:opacity-100 transition-opacity duration-300`;
    const time = document.createElement('span');
    time.className = 'font-metadata text-metadata text-on-surface-variant/50';
    time.textContent = formatTime(msg.timestamp);
    meta.appendChild(time);

    el.appendChild(bubble);
    el.appendChild(meta);

    // Insert before the composer spacer
    messagesContainer.appendChild(el);
  }

  function renderImageMessage(msg) {
    // Remove uploading placeholder if it exists
    const placeholder = document.getElementById(`msg-${msg.id}`);
    if (placeholder) {
      placeholder.remove();
    }

    const isMine = msg.senderId === sessionId;
    const el = document.createElement('div');
    el.id = `msg-${msg.id}`;
    el.className = `flex flex-col ${isMine ? 'items-end self-end' : 'items-start'} max-w-[90%] sm:max-w-[75%] md:max-w-[65%] mt-2 msg-enter`;

    const wrapper = document.createElement('div');
    wrapper.className = 'relative rounded-[24px] overflow-hidden group shadow-2xl border border-surface-variant/40 bg-surface-container cursor-pointer';
    wrapper.onclick = () => openLightbox(`data:${msg.mimeType};base64,${msg.content}`);

    const img = document.createElement('img');
    img.className = 'w-full max-h-[400px] object-cover';
    img.src = `data:${msg.mimeType};base64,${msg.content}`;
    img.alt = 'Shared image';
    img.loading = 'lazy';

    // Gradient overlay
    const overlay = document.createElement('div');
    overlay.className = 'absolute inset-0 bg-gradient-to-t from-background/40 via-transparent to-transparent pointer-events-none';

    wrapper.appendChild(img);
    wrapper.appendChild(overlay);

    const meta = document.createElement('div');
    meta.className = `flex items-center gap-2 mt-2 ${isMine ? 'mr-4' : 'ml-4'} opacity-0 group-hover:opacity-100 transition-opacity duration-300`;
    const time = document.createElement('span');
    time.className = 'font-metadata text-metadata text-on-surface-variant/50';
    time.textContent = formatTime(msg.timestamp);
    meta.appendChild(time);

    el.appendChild(wrapper);
    el.appendChild(meta);
    messagesContainer.appendChild(el);
  }

  function renderUploadingPlaceholder(msgId) {
    const el = document.createElement('div');
    el.id = `msg-${msgId}`;
    el.className = 'flex flex-col items-end self-end max-w-[90%] sm:max-w-[75%] md:max-w-[65%] mt-2 msg-enter';

    const wrapper = document.createElement('div');
    wrapper.className = 'relative rounded-[24px] overflow-hidden group shadow-2xl border border-surface-variant/40 bg-surface-container';

    // Thumbnail preview
    if (pendingImage?.dataUrl) {
      const img = document.createElement('img');
      img.className = 'w-full max-h-[300px] object-cover opacity-50';
      img.src = pendingImage.dataUrl;
      img.alt = 'Uploading...';
      wrapper.appendChild(img);
    }

    // Upload overlay (matches Stitch design)
    const uploadOverlay = document.createElement('div');
    uploadOverlay.className = 'absolute inset-0 bg-background/40 backdrop-blur-sm flex flex-col items-center justify-center pointer-events-none p-6 text-center';

    uploadOverlay.innerHTML = `
      <div class="w-12 h-12 rounded-full border-2 border-surface-variant flex items-center justify-center mb-4">
        <span class="material-symbols-outlined text-on-surface-variant animate-pulse" style="font-variation-settings: 'wght' 300;">cloud_upload</span>
      </div>
      <div class="w-full max-w-[160px] h-1.5 bg-surface-variant/50 rounded-full overflow-hidden mt-2 backdrop-blur-md">
        <div class="h-full bg-primary rounded-full relative transition-all duration-500 ease-out" style="width: 30%;">
          <div class="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-r from-transparent to-white/30 rounded-r-full"></div>
        </div>
      </div>
      <span class="font-metadata text-metadata text-on-surface mt-3 tracking-widest uppercase">Uploading...</span>
    `;

    wrapper.appendChild(uploadOverlay);
    el.appendChild(wrapper);
    messagesContainer.appendChild(el);
    scrollToBottom();
  }

  function clearMessages() {
    if (!messagesContainer) return;
    // Keep the "Today" divider, remove everything else
    const children = Array.from(messagesContainer.children);
    children.forEach((child, index) => {
      if (index > 0) child.remove(); // Keep first child (Today divider)
    });
  }

  // ─── Message Sending ──────────────────────────────────────

  function sendMessage() {
    const content = messageInput?.value?.trim();
    if (!content && !pendingImage) return;

    // If there's a pending image, send it
    if (pendingImage) {
      sendImage();
      return;
    }

    if (!socket?.connected || !isInRoom) {
      showToast('Not connected to room', 'wifi_off');
      return;
    }

    const msgId = crypto.randomUUID();

    socket.emit('send-message', {
      id: msgId,
      content,
      timestamp: Date.now(),
    });

    messageInput.value = '';
    messageInput.style.height = 'auto';
  }

  // ─── Image Handling ───────────────────────────────────────

  const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

  function handleFileSelect(file) {
    if (!file) return;

    // Validate type
    if (!ALLOWED_TYPES.includes(file.type)) {
      showToast('Unsupported format. Use JPEG, PNG, or WebP.', 'error');
      return;
    }

    // Validate size
    if (file.size > MAX_IMAGE_SIZE) {
      showToast('Image too large. Maximum size is 10MB.', 'error');
      return;
    }

    // Read file as data URL for preview
    const reader = new FileReader();
    reader.onload = (e) => {
      pendingImage = {
        file,
        dataUrl: e.target.result,
        mimeType: file.type,
      };
      showImagePreview(file, e.target.result);
    };
    reader.onerror = () => {
      showToast('Failed to read image', 'error');
    };
    reader.readAsDataURL(file);
  }

  function showImagePreview(file, dataUrl) {
    previewThumb.src = dataUrl;
    previewFilename.textContent = file.name;
    previewFilesize.textContent = formatFileSize(file.size);
    imagePreviewBar.classList.add('active');
  }

  function cancelImagePreview() {
    pendingImage = null;
    imagePreviewBar.classList.remove('active');
    previewThumb.src = '';
    fileInput.value = '';
  }

  function sendImage() {
    if (!pendingImage) return;

    if (!socket?.connected || !isInRoom) {
      showToast('Not connected to room', 'wifi_off');
      return;
    }

    const msgId = crypto.randomUUID();
    const { file, dataUrl, mimeType } = pendingImage;

    // Show uploading placeholder
    renderUploadingPlaceholder(msgId);

    // Convert to base64 (strip data URL prefix)
    const base64 = dataUrl.split(',')[1];

    socket.emit('send-image', {
      id: msgId,
      content: base64,
      mimeType,
      timestamp: Date.now(),
    });

    // Clear preview
    cancelImagePreview();
    messageInput.value = '';
    messageInput.style.height = 'auto';
  }

  // ─── Lightbox ─────────────────────────────────────────────

  function openLightbox(src) {
    lightboxImg.src = src;
    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    lightbox.classList.remove('active');
    lightboxImg.src = '';
    document.body.style.overflow = '';
  }

  // ─── Toast Notifications ──────────────────────────────────

  function showToast(message, icon = 'info') {
    const toast = document.createElement('div');
    toast.className = 'toast-enter flex items-center gap-3 px-5 py-3 bg-surface-container-high/90 backdrop-blur-md rounded-xl border border-surface-variant/30 shadow-xl pointer-events-auto max-w-sm';

    const iconEl = document.createElement('span');
    iconEl.className = 'material-symbols-outlined text-[18px] text-primary flex-shrink-0';
    iconEl.style.fontVariationSettings = "'wght' 300";
    iconEl.textContent = icon;

    const textEl = document.createElement('span');
    textEl.className = 'font-body-md text-body-md text-on-surface';
    textEl.textContent = message;

    toast.appendChild(iconEl);
    toast.appendChild(textEl);
    toastContainer.appendChild(toast);

    // Auto-remove after 4 seconds
    setTimeout(() => {
      toast.classList.remove('toast-enter');
      toast.classList.add('toast-exit');
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  // ─── Utility Functions ────────────────────────────────────

  function formatTime(timestamp) {
    const d = new Date(timestamp);
    return d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }

  function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function scrollToBottom() {
    requestAnimationFrame(() => {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    });
  }

  // ─── Textarea Auto-Resize ─────────────────────────────────

  messageInput?.addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = this.scrollHeight + 'px';
    if (this.value === '') {
      this.style.height = 'auto';
    }
  });

  // ─── Mobile Keyboard Handling ─────────────────────────────

  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', () => {
      // Adjust composer position when virtual keyboard opens
      if (currentScreen === 'room') {
        const offset = window.innerHeight - window.visualViewport.height;
        const composer = document.querySelector('#screen-room .fixed.bottom-0');
        if (composer && offset > 0) {
          composer.style.bottom = offset + 'px';
        } else if (composer) {
          composer.style.bottom = '0';
        }
      }
    });
  }

  // ─── Event Listeners ──────────────────────────────────────

  // Access: Play button
  btnPlay?.addEventListener('click', (e) => {
    e.preventDefault();
    verifyAccessCode();
  });

  // Access: Enter key
  movieNoInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      verifyAccessCode();
    }
  });

  // Clear error when typing
  movieNoInput?.addEventListener('input', () => {
    hideAccessError();
  });

  // Playback: Continue to Screening
  btnContinue?.addEventListener('click', () => {
    connectSocket();
    navigateTo('room');
    updateRoomStatus('Connecting', false);

    // Join after brief transition
    setTimeout(() => {
      joinRoom();
    }, 500);
  });

  // Room: Leave
  btnLeave?.addEventListener('click', () => {
    leaveRoom();
  });

  // Room: Send message
  btnSend?.addEventListener('click', () => {
    sendMessage();
  });

  // Room: Enter key sends (Shift+Enter for newline)
  messageInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // Room: Attach image
  btnAttach?.addEventListener('click', () => {
    fileInput?.click();
  });

  fileInput?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  });

  // Image preview: Cancel
  btnCancelPreview?.addEventListener('click', () => {
    cancelImagePreview();
  });

  // Lightbox: Close on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeLightbox();
    }
  });

  // Drag & drop image support in room
  messagesContainer?.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
  });

  messagesContainer?.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer?.files?.[0];
    if (file && file.type.startsWith('image/')) {
      handleFileSelect(file);
    }
  });

  // ─── Public API ───────────────────────────────────────────
  window.App = {
    navigateTo,
    closeLightbox,
  };

})();
