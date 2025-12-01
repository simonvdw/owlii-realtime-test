// Extras Page Initialization - Display user info

(function() {
  'use strict';

  // Cookie helper function
  function getCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === ' ') c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
  }

  // Display user info at the top of the page
  function displayUserInfo() {
    const savedName = getCookie('owlyUserName');
    const savedAge = getCookie('owlyUserAge');

    const userInfoDisplay = document.getElementById('userInfoDisplay');
    const userInfoWarning = document.getElementById('userInfoWarning');

    if (!savedName || !savedAge) {
      // Show warning if user info is not available
      if (userInfoWarning) {
        userInfoWarning.style.display = 'block';
      }
      if (userInfoDisplay) {
        userInfoDisplay.style.display = 'none';
      }
    } else {
      // Show user info
      if (userInfoDisplay) {
        document.getElementById('displayUserName').textContent = savedName;
        document.getElementById('displayUserAge').textContent = savedAge;
        userInfoDisplay.style.display = 'block';
      }
      if (userInfoWarning) {
        userInfoWarning.style.display = 'none';
      }
    }
  }

  // Initialize when DOM is ready
  document.addEventListener('DOMContentLoaded', displayUserInfo);

})();

