// Install Prompt for iOS devices

(function() {
  'use strict';

  // Detect if device is iOS
  function isIOS() {
    const userAgent = window.navigator.userAgent.toLowerCase();
    return /iphone|ipad|ipod/.test(userAgent);
  }

  // Check if already installed as PWA
  function isStandalone() {
    return window.navigator.standalone === true || 
           window.matchMedia('(display-mode: standalone)').matches;
  }

  // Check if user has dismissed the prompt before
  function hasBeenDismissed() {
    return localStorage.getItem('owlyInstallPromptDismissed') === 'true';
  }

  // Show install prompt
  function showInstallPrompt() {
    // Don't show if not iOS, already installed, or previously dismissed
    if (!isIOS() || isStandalone() || hasBeenDismissed()) {
      return;
    }

    // Create prompt element
    const prompt = document.createElement('div');
    prompt.className = 'install-prompt';
    prompt.innerHTML = `
      <div class="install-prompt-content">
        <button class="install-prompt-close" aria-label="Sluiten">×</button>
        <div class="install-prompt-icon">📱</div>
        <p class="install-prompt-text">
          <strong>Tip:</strong> Druk op <span class="share-icon">
            <svg width="18" height="22" viewBox="0 0 18 22" fill="currentColor">
              <path d="M9 0L9 13M9 0L5 4M9 0L13 4M2 8v11c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V8"/>
            </svg>
          </span> (delen) en kies <strong>"Zet op beginscherm"</strong> om Owly makkelijker te vinden!
        </p>
      </div>
    `;

    // Add close button handler
    const closeButton = prompt.querySelector('.install-prompt-close');
    closeButton.addEventListener('click', () => {
      prompt.classList.add('hiding');
      setTimeout(() => {
        prompt.remove();
      }, 300);
      localStorage.setItem('owlyInstallPromptDismissed', 'true');
    });

    // Add to page
    document.body.appendChild(prompt);

    // Animate in
    setTimeout(() => {
      prompt.classList.add('visible');
    }, 500);
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', showInstallPrompt);
  } else {
    showInstallPrompt();
  }

})();

