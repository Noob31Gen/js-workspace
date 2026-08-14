// Extension Options Page Logic - Domain-Salted SHA-256 Hashing & Storage

const DOMAIN_SALT = 'js.noob31.com:salt:v1:';

async function sha256Hex(str) {
  const encoder = new TextEncoder();
  const data = encoder.encode(DOMAIN_SALT + str);
  const hashBuf = await crypto.subtle.digest('SHA-256', data);
  const hashArr = Array.from(new Uint8Array(hashBuf));
  return hashArr.map(b => b.toString(16).padStart(2, '0')).join('');
}

document.addEventListener('DOMContentLoaded', () => {
  const statusBox = document.getElementById('statusBox');
  const statusText = document.getElementById('statusText');
  const authForm = document.getElementById('authForm');
  const passwordInput = document.getElementById('passwordInput');
  const clearBtn = document.getElementById('clearBtn');
  const hashPreview = document.getElementById('hashPreview');

  function updateStatusUI(hash) {
    if (hash) {
      statusBox.className = 'status-card configured';
      statusText.textContent = 'Domain-Salted Hash Active';
      hashPreview.textContent = `Salted SHA-256: ${hash.substring(0, 16)}...${hash.substring(48)}`;
    } else {
      statusBox.className = 'status-card unconfigured';
      statusText.textContent = 'Password Hash Not Configured';
      hashPreview.textContent = '';
    }
  }

  // Load existing hash status
  chrome.storage.local.get(['extension_auth_hash'], (res) => {
    updateStatusUI(res.extension_auth_hash);
  });

  // Handle password save
  authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const password = passwordInput.value.trim();
    if (!password) return;

    const hash = await sha256Hex(password);
    chrome.storage.local.set({ extension_auth_hash: hash }, () => {
      updateStatusUI(hash);
      passwordInput.value = '';
      alert('Security password hash saved successfully!');
    });
  });

  // Handle clear
  clearBtn.addEventListener('click', () => {
    chrome.storage.local.remove(['extension_auth_hash'], () => {
      updateStatusUI(null);
      passwordInput.value = '';
      alert('Security authentication hash cleared.');
    });
  });
});
