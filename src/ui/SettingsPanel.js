export class SettingsPanel {
  constructor(settings, onChange) {
    this.settings = settings;
    this.onChange = onChange;

    this.el = document.createElement('div');
    this.el.id = 'settings-panel';
    this.el.innerHTML = `
      <div class="settings-header">
        <h2>⚙️ Settings</h2>
        <button class="settings-close-btn" id="settings-close">✕</button>
      </div>
      <div class="settings-content">
        <div class="settings-section">
          <div class="settings-label">🎵 Music Volume</div>
          <div class="settings-row">
            <input type="range" id="setting-music" min="0" max="100" value="${settings.musicVolume}" />
            <span id="setting-music-val">${settings.musicVolume}%</span>
          </div>
        </div>
        <div class="settings-section">
          <div class="settings-label">🔊 SFX Volume</div>
          <div class="settings-row">
            <input type="range" id="setting-sfx" min="0" max="100" value="${settings.sfxVolume}" />
            <span id="setting-sfx-val">${settings.sfxVolume}%</span>
          </div>
        </div>
        <div class="settings-section">
          <div class="settings-row settings-toggle-row">
            <span class="settings-label">🐛 Debug Mode</span>
            <label class="toggle-switch">
              <input type="checkbox" id="setting-debug" ${settings.debugMode ? 'checked' : ''} />
              <span class="toggle-track"></span>
            </label>
          </div>
          <div class="settings-hint">Shows debug overlay with game controls</div>
        </div>
      </div>
    `;
    document.body.appendChild(this.el);

    document.getElementById('settings-close').addEventListener('click', () => this.close());

    document.getElementById('setting-music').addEventListener('input', (e) => {
      settings.musicVolume = +e.target.value;
      document.getElementById('setting-music-val').textContent = `${settings.musicVolume}%`;
      onChange?.('musicVolume', settings.musicVolume);
    });
    document.getElementById('setting-sfx').addEventListener('input', (e) => {
      settings.sfxVolume = +e.target.value;
      document.getElementById('setting-sfx-val').textContent = `${settings.sfxVolume}%`;
      onChange?.('sfxVolume', settings.sfxVolume);
    });
    document.getElementById('setting-debug').addEventListener('change', (e) => {
      settings.debugMode = e.target.checked;
      onChange?.('debugMode', settings.debugMode);
    });
  }

  open() {
    document.getElementById('setting-music').value = this.settings.musicVolume;
    document.getElementById('setting-music-val').textContent = `${this.settings.musicVolume}%`;
    document.getElementById('setting-sfx').value = this.settings.sfxVolume;
    document.getElementById('setting-sfx-val').textContent = `${this.settings.sfxVolume}%`;
    document.getElementById('setting-debug').checked = this.settings.debugMode;
    this.el.classList.add('open');
  }

  close() {
    this.el.classList.remove('open');
  }

  destroy() {
    this.el.remove();
  }
}
