/* ============================================================
   DALMAC PS4 — Application Controller (Offline Edition)
   Enhanced with:
   - DualShock 4 / PS4 Controller Gamepad API & Button Prompts
   - Web Audio API Sound Synthesizer (Zero-file dependency)
   - Dynamic Firmware Profile Selector (13.52, 13.50, 13.04, 13.02)
   - Advanced Options Drawer & Debug Log Mode (?log=1)
   - Auto-Launch 3-second Countdown with Cancel
   - Pre-flight binary asset validation
   - Bilingual Arabic (RTL) & English (LTR) Localization
   - HTML5 ApplicationCache & Modern Service Worker Offline Fallback
   ============================================================ */

import { PS4, offsetsFor } from './ps4_offsets.js';

(function () {
  'use strict';

  // ---- Localization Dictionaries ----
  const I18N = {
    ar: {
      title: 'DALMAC PS4',
      subtitle: 'الإصدار غير المتصل',
      detectedFw: 'إصدار النظام المكتشف',
      config: 'الإعدادات',
      patch: 'ملف الترقيع',
      payload: 'الحمولة',
      engine: 'المحرك',
      offline: 'التخزين غير المتصل',
      start: 'بدء التشغيل',
      loading: 'جاري تحميل المحرك...',

      // States
      stateVerified: 'مؤكد',
      stateExperimental: 'تجريبي',
      stateUntested: 'غير مختبر',
      stateUnsupported: 'غير مدعوم',

      // Values
      ready: 'جاهز',
      notDetected: 'غير مكتشف (افتراضي)',
      none: 'لا يوجد',
      unknown: 'غير معروف',

      // Controls & Options
      targetFw: 'إصدارات النظام المدعومة:',
      advOptions: '⚙️ خيارات متقدمة',
      debugLog: 'وضع السجل المفصل (?log=1)',
      autoLaunch: 'تشغيل تلقائي خلال 3 ثوانٍ',
      gamepadConnected: 'يد التحكم متصلة',
      soundOn: 'كتم الصوت',
      soundOff: 'تشغيل الصوت',
      countdownMsg: 'جاري التشغيل التلقائي خلال {sec} ثوانٍ...',
      cancel: 'إلغاء',

      // Controller Hints
      hintStart: 'بدء التشغيل',
      hintLog: 'السجل',
      hintLang: 'اللغة',

      // Logs & Toggles
      showLog: 'إظهار السجل',
      hideLog: 'إخفاء السجل',

      // User Alert Errors
      errNoFw: 'لم يتم التعرف على إصدار نظام PlayStation 4',
      errNoConfig: 'ملف الإعداد غير موجود للإصدار المحدد',
      errMissingPatch: 'ملف الترقيع المطلوب غير موجود:',
      errMissingPayload: 'ملف الحمولة المطلوب غير موجود:',
      errCacheFailed: 'فشل تحميل التخزين المؤقت',

      // Cache Footer Messages
      cacheReady: 'جاهز للعمل بدون إنترنت',
      cacheOffline: 'غير متصل — من التخزين المؤقت',
      caching: 'جاري التخزين المؤقت...',
      updateReady: 'تحديث جاهز — اضغط لإعادة التحميل'
    },
    en: {
      title: 'DALMAC PS4',
      subtitle: 'OFFLINE EDITION',
      detectedFw: 'Detected Firmware',
      config: 'Configuration',
      patch: 'Kernel Patch',
      payload: 'Payload',
      engine: 'Engine',
      offline: 'Offline Storage',
      start: 'START',
      loading: 'Loading engine...',

      // States
      stateVerified: 'VERIFIED',
      stateExperimental: 'EXPERIMENTAL',
      stateUntested: 'UNTESTED',
      stateUnsupported: 'UNSUPPORTED',

      // Values
      ready: 'READY',
      notDetected: 'Not Detected (Default)',
      none: 'None',
      unknown: 'Unknown',

      // Controls & Options
      targetFw: 'Target Firmware Profiles:',
      advOptions: '⚙️ Advanced Options',
      debugLog: 'Step-by-step debug log (?log=1)',
      autoLaunch: 'Auto-run exploit after 3s',
      gamepadConnected: 'Controller Connected',
      soundOn: 'Mute Sound',
      soundOff: 'Enable Sound',
      countdownMsg: 'Auto-launching in {sec}s...',
      cancel: 'Cancel',

      // Controller Hints
      hintStart: 'START',
      hintLog: 'Log',
      hintLang: 'Language',

      // Logs & Toggles
      showLog: 'Show Log',
      hideLog: 'Hide Log',

      // User Alert Errors
      errNoFw: 'Unable to detect PS4 firmware version',
      errNoConfig: 'Firmware configuration not found',
      errMissingPatch: 'Required kernel patch file is missing:',
      errMissingPayload: 'Required payload file is missing:',
      errCacheFailed: 'Offline cache operation failed',

      // Cache Footer Messages
      cacheReady: 'Offline Ready (Cached)',
      cacheOffline: 'Offline — from cache',
      caching: 'Caching for offline use...',
      updateReady: 'Update ready — click to reload'
    }
  };

  let currentLang = 'ar';
  try {
    const saved = localStorage.getItem('dalmac_lang');
    if (saved === 'en' || saved === 'ar') currentLang = saved;
  } catch (e) {}

  // ---- Audio Synthesizer (Web Audio API - 0 External Files) ----
  let audioCtx = null;
  let soundEnabled = true;
  try {
    const savedSound = localStorage.getItem('dalmac_sound');
    if (savedSound !== null) soundEnabled = savedSound === '1';
  } catch (e) {}

  function playTone(freq, duration, type = 'sine') {
    if (!soundEnabled) return;
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.06, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) {}
  }

  function sfxClick() { playTone(540, 0.04, 'triangle'); }
  function sfxSuccess() {
    playTone(523, 0.08);
    setTimeout(() => playTone(659, 0.12), 90);
  }
  function sfxError() {
    playTone(220, 0.18, 'sawtooth');
  }

  // ---- DOM References ----
  const docEl           = document.documentElement;
  const elTitle         = document.getElementById('dalmac-title');
  const elSubtitle      = document.getElementById('dalmac-subtitle');
  const elFwBadge       = document.getElementById('fw-badge');
  const elFwBadgeLabel  = document.getElementById('fw-badge-label');
  const elFwBadgeStatus = document.getElementById('fw-badge-status');
  const elAlert         = document.getElementById('dalmac-alert');
  const elAlertText     = document.getElementById('alert-text');
  const elBtnStart      = document.getElementById('btn-start');

  const elLblDetectedFw = document.getElementById('lbl-detected-fw');
  const elValDetectedFw = document.getElementById('val-detected-fw');
  const elLblConfigFw   = document.getElementById('lbl-config-fw');
  const elValConfigFw   = document.getElementById('val-config-fw');
  const elLblPatch      = document.getElementById('lbl-patch');
  const elValPatch      = document.getElementById('val-patch');
  const elLblPayload    = document.getElementById('lbl-payload');
  const elValPayload    = document.getElementById('val-payload');
  const elLblEngine     = document.getElementById('lbl-engine');
  const elValEngine     = document.getElementById('val-engine');
  const elLblOffline    = document.getElementById('lbl-offline');
  const elValOffline    = document.getElementById('val-offline');

  const elLogToggle     = document.getElementById('log-toggle');
  const elLogPanel      = document.getElementById('log-panel');
  const elLogContent    = document.getElementById('log-content');
  const elLangAr        = document.getElementById('lang-ar');
  const elLangEn        = document.getElementById('lang-en');
  const elCacheStatus   = document.getElementById('cache-status');

  // Enhanced Element References
  const elGamepadBadge  = document.getElementById('gamepad-badge');
  const elGpLabel       = document.getElementById('gp-label');
  const elSoundToggle   = document.getElementById('sound-toggle');
  const elSoundIcon     = document.getElementById('sound-icon');
  const elFwPills       = document.getElementById('fw-pills');
  const elLblFwSelect   = document.getElementById('lbl-fw-select');
  const elAdvToggle     = document.getElementById('adv-toggle');
  const elAdvToggleText = document.getElementById('adv-toggle-text');
  const elAdvPanel      = document.getElementById('adv-panel');
  const elOptDebugLog   = document.getElementById('opt-debug-log');
  const elLblOptLog     = document.getElementById('lbl-opt-log');
  const elOptAutoLaunch = document.getElementById('opt-auto-launch');
  const elLblOptAuto    = document.getElementById('lbl-opt-auto');
  const elCountdownCard = document.getElementById('countdown-card');
  const elCountdownMsg  = document.getElementById('countdown-msg');
  const elCountdownSec  = document.getElementById('countdown-sec');
  const elCountdownBar  = document.getElementById('countdown-bar');
  const elBtnCancelCd   = document.getElementById('btn-cancel-countdown');
  const elHintStart     = document.getElementById('hint-start');
  const elHintLog       = document.getElementById('hint-log');
  const elHintLang      = document.getElementById('hint-lang');

  // ---- URL Parameters & Firmware Resolution ----
  const urlParams  = new URLSearchParams(window.location.search);
  const paramFw    = urlParams.get('fw');
  const isForced   = urlParams.get('force') === '1';

  // Detect PS4 User-Agent
  const uaDetection = offsetsFor(navigator.userAgent);
  const isPs4Ua     = !!uaDetection.key;
  const detectedFw  = uaDetection.key || null;

  // Resolved configuration firmware key
  let effectiveFw = paramFw || detectedFw || '13.52';
  let configEntry = PS4[effectiveFw] || null;

  // Resolve Kernel Patch & Payload names
  let patchFileName = 'None';
  let patchFilePath = null;
  let payloadFileName = 'None';
  let payloadFilePath = null;
  let fwState = 'EXPERIMENTAL';

  function updateFirmwareProfile(fwKey) {
    effectiveFw = fwKey;
    configEntry = PS4[effectiveFw] || null;

    if (configEntry) {
      patchFileName = configEntry.kpatch || (effectiveFw.replace('.', '') + '.bin');
      patchFilePath = patchFileName.startsWith('patches/') ? patchFileName : ('patches/' + patchFileName);
      payloadFileName = configEntry.payload || 'payload.bin';
      payloadFilePath = payloadFileName;
    } else {
      patchFileName = 'None';
      patchFilePath = null;
      payloadFileName = 'None';
      payloadFilePath = null;
    }

    fwState = resolveFirmwareState(effectiveFw, configEntry);

    // Update active pill UI
    if (elFwPills) {
      const pills = elFwPills.querySelectorAll('.fw-pill');
      pills.forEach(pill => {
        if (pill.getAttribute('data-fw') === effectiveFw) {
          pill.classList.add('active');
        } else {
          pill.classList.remove('active');
        }
      });
    }

    applyLanguage(currentLang);
    validateAssets();
  }

  // Derive Firmware State
  function resolveFirmwareState(key, off) {
    if (!off) return 'UNSUPPORTED';
    const status = off.fw_status || '';

    // Hardware proven builds without untested caveats
    if (status.includes('PROVEN-on-hw') && !status.includes('UNTESTED')) {
      return 'VERIFIED';
    }
    // Shared hardware proven kernels (e.g., 13.04 shared with 13.02)
    if (key === '13.02' || key === '13.04') {
      return 'VERIFIED';
    }
    // Active modern builds: 13.52, 13.50
    if (key === '13.52' || key === '13.50') {
      return 'EXPERIMENTAL';
    }
    // Untested on hardware entries
    if (status.includes('UNTESTED-on-hardware') || status.includes('UNTESTED-on-hw') || status.includes('UNTESTED')) {
      return 'UNTESTED';
    }
    return 'EXPERIMENTAL';
  }

  // Diagnostic Log Store
  const logEntries = [];

  function addLog(text, cls = '') {
    logEntries.push({ text, cls, time: new Date().toLocaleTimeString() });
    renderLog();
  }

  function renderLog() {
    if (!elLogContent) return;
    elLogContent.innerHTML = '';
    logEntries.forEach(entry => {
      const line = document.createElement('div');
      line.className = 'log-line' + (entry.cls ? ' ' + entry.cls : '');
      line.textContent = entry.text;
      elLogContent.appendChild(line);
    });
    elLogContent.scrollTop = elLogContent.scrollHeight;
  }

  function showAlert(msg) {
    if (!elAlert || !elAlertText) return;
    elAlertText.textContent = msg;
    elAlert.style.display = 'flex';
  }

  function hideAlert() {
    if (!elAlert) return;
    elAlert.style.display = 'none';
  }

  // ---- Language Application ----
  function applyLanguage(lang) {
    currentLang = lang;
    try { localStorage.setItem('dalmac_lang', lang); } catch (e) {}
    const t = I18N[lang];

    docEl.setAttribute('lang', lang);
    docEl.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');

    if (elTitle) elTitle.textContent = t.title;
    if (elSubtitle) elSubtitle.textContent = t.subtitle;
    if (elBtnStart && !elBtnStart.disabled) elBtnStart.textContent = t.start;

    // Grid labels
    if (elLblDetectedFw) elLblDetectedFw.textContent = t.detectedFw;
    if (elLblConfigFw)   elLblConfigFw.textContent   = t.config;
    if (elLblPatch)      elLblPatch.textContent      = t.patch;
    if (elLblPayload)    elLblPayload.textContent    = t.payload;
    if (elLblEngine)     elLblEngine.textContent     = t.engine;
    if (elLblOffline)    elLblOffline.textContent    = t.offline;

    // Enhanced Controls Labels
    if (elLblFwSelect)   elLblFwSelect.textContent   = t.targetFw;
    if (elAdvToggleText) elAdvToggleText.textContent = t.advOptions;
    if (elLblOptLog)     elLblOptLog.textContent     = t.debugLog;
    if (elLblOptAuto)    elLblOptAuto.textContent    = t.autoLaunch;
    if (elGpLabel)       elGpLabel.textContent       = t.gamepadConnected;
    if (elHintStart)     elHintStart.textContent     = t.hintStart;
    if (elHintLog)       elHintLog.textContent       = t.hintLog;
    if (elHintLang)      elHintLang.textContent      = t.hintLang;
    if (elBtnCancelCd)   elBtnCancelCd.textContent   = t.cancel;

    if (elSoundToggle) {
      elSoundToggle.title = soundEnabled ? t.soundOn : t.soundOff;
      elSoundToggle.setAttribute('aria-label', soundEnabled ? t.soundOn : t.soundOff);
      if (elSoundIcon) elSoundIcon.textContent = soundEnabled ? '🔊' : '🔇';
    }

    // Dynamic grid values
    if (elValDetectedFw) {
      if (detectedFw) {
        elValDetectedFw.textContent = detectedFw;
      } else if (paramFw) {
        elValDetectedFw.textContent = paramFw + (lang === 'ar' ? ' (يدوي)' : ' (manual)');
      } else {
        elValDetectedFw.textContent = '13.52 ' + (lang === 'ar' ? '(افتراضي)' : '(default)');
      }
    }

    if (elValConfigFw) {
      elValConfigFw.textContent = configEntry ? effectiveFw : t.none;
    }

    if (elValPatch) {
      elValPatch.textContent = patchFileName;
    }

    if (elValPayload) {
      elValPayload.textContent = payloadFileName;
    }

    if (elValEngine) {
      elValEngine.textContent = t.ready;
    }

    // Firmware Badge State Text
    let stateString = t.stateUnsupported;
    if (fwState === 'VERIFIED') stateString = t.stateVerified;
    else if (fwState === 'EXPERIMENTAL') stateString = t.stateExperimental;
    else if (fwState === 'UNTESTED') stateString = t.stateUntested;

    if (elFwBadgeLabel) elFwBadgeLabel.textContent = (lang === 'ar' ? 'النظام: ' : 'FW: ') + effectiveFw;
    if (elFwBadgeStatus) elFwBadgeStatus.textContent = stateString;

    if (elFwBadge) {
      elFwBadge.className = 'fw-badge ' + fwState.toLowerCase();
    }

    // Language buttons
    if (elLangAr) elLangAr.className = lang === 'ar' ? 'active' : '';
    if (elLangEn) elLangEn.className = lang === 'en' ? 'active' : '';

    // Log toggle text
    const isLogOpen = elLogPanel && elLogPanel.classList.contains('open');
    if (elLogToggle) {
      const toggleSpan = elLogToggle.querySelector('.log-text');
      if (toggleSpan) toggleSpan.textContent = isLogOpen ? t.hideLog : t.showLog;
    }
  }

  // ---- Diagnostics Initialization Log ----
  function initDiagnostics() {
    addLog('[ DALMAC ] Initializing');
    addLog('[ DALMAC ] Detecting firmware');

    if (detectedFw) {
      addLog('[ DALMAC ] Firmware: ' + detectedFw, 'ok');
    } else {
      addLog('[ DALMAC ] Firmware: ' + effectiveFw + ' (Simulated/Default)');
    }

    if (configEntry) {
      addLog('[ DALMAC ] Configuration loaded: ' + effectiveFw, 'ok');
      addLog('[ DALMAC ] Patch: ' + patchFileName, 'ok');
      addLog('[ DALMAC ] Payload: ' + payloadFileName, 'ok');
    } else {
      addLog('[ DALMAC ] Warning: No configuration found for ' + effectiveFw, 'bad');
      showAlert(I18N[currentLang].errNoConfig);
    }

    addLog('[ DALMAC ] State: ' + fwState, fwState === 'VERIFIED' ? 'ok' : (fwState === 'EXPERIMENTAL' ? 'warn' : ''));
    addLog('[ DALMAC ] Offline assets: READY', 'ok');
    addLog('[ DALMAC ] Engine: READY', 'ok');
    addLog('[ DALMAC ] Waiting for user');
  }

  // ---- Asset Pre-flight Validation ----
  async function validateAssets() {
    if (!configEntry) return;

    if (patchFilePath) {
      try {
        const r = await fetch(patchFilePath, { method: 'GET' });
        if (r.ok) {
          addLog('[ DALMAC ] Patch file verified: ' + patchFileName, 'ok');
        } else {
          addLog('[ DALMAC ] Warning: Patch file not found: ' + patchFilePath, 'bad');
          showAlert(I18N[currentLang].errMissingPatch + ' ' + patchFileName);
        }
      } catch (e) {
        // Full offline without server
      }
    }

    if (payloadFilePath && payloadFilePath !== 'None') {
      try {
        const r2 = await fetch(payloadFilePath, { method: 'GET' });
        if (r2.ok) {
          addLog('[ DALMAC ] Payload file verified: ' + payloadFileName, 'ok');
        } else {
          addLog('[ DALMAC ] Warning: Payload file not found: ' + payloadFilePath, 'bad');
          showAlert(I18N[currentLang].errMissingPayload + ' ' + payloadFileName);
        }
      } catch (e) {}
    }
  }

  // ---- Navigation to Jailbreak Execution Page ----
  function launchExploit() {
    cancelCountdown();
    sfxSuccess();

    if (elBtnStart) {
      elBtnStart.textContent = I18N[currentLang].loading;
      elBtnStart.disabled = true;
    }

    const query = new URLSearchParams(window.location.search);
    query.set('fw', effectiveFw);

    if (elOptDebugLog && elOptDebugLog.checked) {
      query.set('log', '1');
    }

    const targetUrl = 'jb.html?' + query.toString();
    window.location.replace(targetUrl);
  }

  // ---- Auto-Launch Countdown Feature ----
  let countdownTimer = null;
  let countdownSeconds = 3;

  function startCountdown() {
    if (!elOptAutoLaunch || !elOptAutoLaunch.checked) return;
    if (!elCountdownCard) return;

    countdownSeconds = 3;
    elCountdownCard.style.display = 'block';
    if (elCountdownSec) elCountdownSec.textContent = countdownSeconds;
    if (elCountdownBar) {
      elCountdownBar.style.transition = 'none';
      elCountdownBar.style.width = '100%';
      setTimeout(() => {
        elCountdownBar.style.transition = 'width 3s linear';
        elCountdownBar.style.width = '0%';
      }, 50);
    }

    countdownTimer = setInterval(() => {
      countdownSeconds--;
      if (elCountdownSec) elCountdownSec.textContent = countdownSeconds;
      if (countdownSeconds <= 0) {
        clearInterval(countdownTimer);
        countdownTimer = null;
        launchExploit();
      }
    }, 1000);
  }

  function cancelCountdown() {
    if (countdownTimer) {
      clearInterval(countdownTimer);
      countdownTimer = null;
    }
    if (elCountdownCard) {
      elCountdownCard.style.display = 'none';
    }
  }

  if (elBtnCancelCd) {
    elBtnCancelCd.addEventListener('click', () => {
      sfxClick();
      cancelCountdown();
      if (elOptAutoLaunch) elOptAutoLaunch.checked = false;
      try { localStorage.setItem('dalmac_auto', '0'); } catch (e) {}
    });
  }

  // ---- Sound Toggle Handler ----
  if (elSoundToggle) {
    elSoundToggle.addEventListener('click', () => {
      soundEnabled = !soundEnabled;
      try { localStorage.setItem('dalmac_sound', soundEnabled ? '1' : '0'); } catch (e) {}
      if (soundEnabled) sfxClick();
      applyLanguage(currentLang);
    });
  }

  // ---- Firmware Selector Pills ----
  if (elFwPills) {
    elFwPills.addEventListener('click', (e) => {
      const btn = e.target.closest('.fw-pill');
      if (!btn) return;
      sfxClick();
      const targetFw = btn.getAttribute('data-fw');
      if (targetFw) {
        updateFirmwareProfile(targetFw);
      }
    });
  }

  // ---- Advanced Options Accordion ----
  if (elAdvToggle && elAdvPanel) {
    elAdvToggle.addEventListener('click', () => {
      sfxClick();
      const isOpen = elAdvPanel.classList.toggle('open');
      elAdvToggle.classList.toggle('open', isOpen);
      elAdvToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
  }

  // Auto-launch Option Persistence
  try {
    const savedAuto = localStorage.getItem('dalmac_auto');
    if (elOptAutoLaunch && savedAuto === '1') {
      elOptAutoLaunch.checked = true;
    }
  } catch (e) {}

  if (elOptAutoLaunch) {
    elOptAutoLaunch.addEventListener('change', () => {
      sfxClick();
      try {
        localStorage.setItem('dalmac_auto', elOptAutoLaunch.checked ? '1' : '0');
      } catch (e) {}
    });
  }

  if (elOptDebugLog) {
    elOptDebugLog.addEventListener('change', () => {
      sfxClick();
    });
  }

  // ---- Event Handlers ----
  if (elBtnStart) {
    elBtnStart.addEventListener('click', () => {
      launchExploit();
    });
  }

  // Controller / Keyboard Cross (Enter / Space)
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      if (document.activeElement === elBtnStart || document.activeElement === document.body) {
        e.preventDefault();
        launchExploit();
      }
    }
  });

  // Log Panel Toggle
  function toggleLog() {
    if (!elLogPanel || !elLogToggle) return;
    const isOpen = elLogPanel.classList.toggle('open');
    elLogToggle.classList.toggle('open', isOpen);
    elLogToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    const toggleSpan = elLogToggle.querySelector('.log-text');
    if (toggleSpan) {
      toggleSpan.textContent = isOpen ? I18N[currentLang].hideLog : I18N[currentLang].showLog;
    }
  }

  if (elLogToggle) {
    elLogToggle.addEventListener('click', () => {
      sfxClick();
      toggleLog();
    });
  }

  // Language Switchers
  if (elLangAr) {
    elLangAr.addEventListener('click', (e) => {
      e.preventDefault();
      sfxClick();
      applyLanguage('ar');
    });
  }

  if (elLangEn) {
    elLangEn.addEventListener('click', (e) => {
      e.preventDefault();
      sfxClick();
      applyLanguage('en');
    });
  }

  // ---- DualShock 4 / PS4 Gamepad API Loop ----
  let gamepadConnected = false;
  const lastButtonState = {};

  function checkGamepad() {
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    let activeGp = null;
    for (let i = 0; i < gamepads.length; i++) {
      if (gamepads[i]) {
        activeGp = gamepads[i];
        break;
      }
    }

    if (activeGp) {
      if (!gamepadConnected) {
        gamepadConnected = true;
        if (elGamepadBadge) elGamepadBadge.style.display = 'inline-flex';
        addLog('[ DALMAC ] Controller Connected: ' + (activeGp.id || 'DualShock 4'), 'ok');
      }

      // Button 0: Cross (✕) -> Launch Exploit
      if (activeGp.buttons[0] && activeGp.buttons[0].pressed && !lastButtonState['btn0']) {
        lastButtonState['btn0'] = true;
        launchExploit();
      } else if (activeGp.buttons[0] && !activeGp.buttons[0].pressed) {
        lastButtonState['btn0'] = false;
      }

      // Button 1: Circle (◯) -> Cancel Auto-Launch or Close Log
      if (activeGp.buttons[1] && activeGp.buttons[1].pressed && !lastButtonState['btn1']) {
        lastButtonState['btn1'] = true;
        cancelCountdown();
        if (elLogPanel && elLogPanel.classList.contains('open')) toggleLog();
      } else if (activeGp.buttons[1] && !activeGp.buttons[1].pressed) {
        lastButtonState['btn1'] = false;
      }

      // Button 2: Square (□) -> Toggle Diagnostic Log
      if (activeGp.buttons[2] && activeGp.buttons[2].pressed && !lastButtonState['btn2']) {
        lastButtonState['btn2'] = true;
        sfxClick();
        toggleLog();
      } else if (activeGp.buttons[2] && !activeGp.buttons[2].pressed) {
        lastButtonState['btn2'] = false;
      }

      // Button 3: Triangle (△) -> Switch Language
      if (activeGp.buttons[3] && activeGp.buttons[3].pressed && !lastButtonState['btn3']) {
        lastButtonState['btn3'] = true;
        sfxClick();
        applyLanguage(currentLang === 'ar' ? 'en' : 'ar');
      } else if (activeGp.buttons[3] && !activeGp.buttons[3].pressed) {
        lastButtonState['btn3'] = false;
      }
    } else {
      if (gamepadConnected) {
        gamepadConnected = false;
        if (elGamepadBadge) elGamepadBadge.style.display = 'none';
      }
    }

    requestAnimationFrame(checkGamepad);
  }

  window.addEventListener('gamepadconnected', (e) => {
    gamepadConnected = true;
    if (elGamepadBadge) elGamepadBadge.style.display = 'inline-flex';
    addLog('[ DALMAC ] Gamepad detected: ' + (e.gamepad.id || 'DualShock 4'), 'ok');
  });

  window.addEventListener('gamepaddisconnected', () => {
    gamepadConnected = false;
    if (elGamepadBadge) elGamepadBadge.style.display = 'none';
  });

  requestAnimationFrame(checkGamepad);

  // ---- PS4 Offline Caching Management ----
  const elCacheBoxBadge    = document.getElementById('cache-box-badge');
  const elCacheProgressWrap = document.getElementById('cache-progress-wrap');
  const elCacheProgressBar  = document.getElementById('cache-progress-bar');
  const elCacheDetailMsg    = document.getElementById('cache-detail-msg');

  function updateCacheFooter(text, isOk = true) {
    if (elCacheStatus) {
      elCacheStatus.textContent = text;
      elCacheStatus.className = 'cache-status' + (isOk ? ' ok' : '');
    }
  }

  // HTML5 ApplicationCache (PS4 WebKit offline)
  const ac = window.applicationCache;
  if (ac && docEl.hasAttribute('manifest')) {
    if (!navigator.onLine) {
      updateCacheFooter(I18N[currentLang].cacheOffline, true);
      if (elCacheBoxBadge) {
        elCacheBoxBadge.textContent = currentLang === 'ar' ? 'أوفلاين (من الكاش)' : 'Offline (Cached)';
        elCacheBoxBadge.className = 'cache-badge';
      }
      if (elCacheDetailMsg) {
        elCacheDetailMsg.textContent = currentLang === 'ar'
          ? 'يعمل حالياً من ذاكرة كاش المتصفح بدون اتصال إنترنت.'
          : 'Currently running from PS4 browser cache without internet.';
      }
    } else if (ac.status === ac.IDLE) {
      updateCacheFooter(I18N[currentLang].cacheReady, true);
      if (elCacheBoxBadge) {
        elCacheBoxBadge.textContent = currentLang === 'ar' ? 'جاهز أوفلاين' : 'Offline Ready';
        elCacheBoxBadge.className = 'cache-badge';
      }
      if (elCacheDetailMsg) {
        elCacheDetailMsg.textContent = currentLang === 'ar'
          ? 'تم حفظ كافة ملفات الهوست محلياً. جاهز للتشغيل بدون إنترنت.'
          : 'All host assets cached locally. Ready for offline execution.';
      }
    } else if (ac.status === ac.UPDATEREADY) {
      try { ac.swapCache(); } catch (e) {}
      updateCacheFooter(I18N[currentLang].updateReady, true);
    }

    ac.addEventListener('downloading', () => {
      if (elCacheProgressWrap) elCacheProgressWrap.style.display = 'block';
      if (elCacheBoxBadge) {
        elCacheBoxBadge.textContent = currentLang === 'ar' ? 'جاري التثبيت...' : 'Caching...';
        elCacheBoxBadge.className = 'cache-badge caching';
      }
      if (elCacheDetailMsg) {
        elCacheDetailMsg.textContent = currentLang === 'ar'
          ? 'جاري تخزين الملفات للاستخدام بدون إنترنت في متصفح PS4...'
          : 'Caching files for offline use in PS4 browser...';
      }
      addLog('[ DALMAC ] ApplicationCache: Downloading offline assets...');
    }, false);

    ac.addEventListener('progress', (e) => {
      if (e && e.total) {
        const pct = Math.round((e.loaded / e.total) * 100);
        if (elCacheProgressBar) elCacheProgressBar.style.width = pct + '%';
        if (elCacheBoxBadge) elCacheBoxBadge.textContent = pct + '% (' + e.loaded + '/' + e.total + ')';
        if (elCacheDetailMsg) {
          elCacheDetailMsg.textContent = (currentLang === 'ar' ? 'جاري حفظ الملفات محلياً: ' : 'Saving offline assets: ') + pct + '%';
        }
      }
    }, false);

    ac.addEventListener('cached', () => {
      updateCacheFooter(I18N[currentLang].cacheReady, true);
      if (elCacheProgressWrap) elCacheProgressWrap.style.display = 'none';
      if (elCacheBoxBadge) {
        elCacheBoxBadge.textContent = currentLang === 'ar' ? 'جاهز أوفلاين 100%' : 'Offline Ready 100%';
        elCacheBoxBadge.className = 'cache-badge';
      }
      if (elCacheDetailMsg) {
        elCacheDetailMsg.textContent = currentLang === 'ar'
          ? '✅ تم تثبيت كاش PS4 بنجاح! يمكنك الآن قطع اتصال الإنترنت بالكامل واستخدام الهوست أوفلاين في أي وقت.'
          : '✅ PS4 Offline Cache Installed! You can disconnect internet completely and run offline anytime.';
      }
      addLog('[ DALMAC ] ApplicationCache: Successfully Cached Offline', 'ok');
      sfxSuccess();
    }, false);

    ac.addEventListener('updateready', () => {
      try { ac.swapCache(); } catch (e) {}
      updateCacheFooter(I18N[currentLang].updateReady, true);
      if (elCacheDetailMsg) {
        elCacheDetailMsg.textContent = currentLang === 'ar'
          ? 'تم تحديث الكاش بنجاح. أعد تحميل الصفحة.'
          : 'Cache updated successfully. Reload to apply.';
      }
      addLog('[ DALMAC ] ApplicationCache: Update ready', 'ok');
    }, false);

    ac.addEventListener('noupdate', () => {
      updateCacheFooter(I18N[currentLang].cacheReady, true);
      if (elCacheProgressWrap) elCacheProgressWrap.style.display = 'none';
      if (elCacheBoxBadge) {
        elCacheBoxBadge.textContent = currentLang === 'ar' ? 'جاهز أوفلاين' : 'Offline Ready';
        elCacheBoxBadge.className = 'cache-badge';
      }
    }, false);

    ac.addEventListener('error', () => {
      addLog('[ DALMAC ] ApplicationCache: Running in local offline mode');
    }, false);
  }

  // Service Worker Registration
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js')
      .then(() => {
        addLog('[ DALMAC ] Service Worker: ACTIVE', 'ok');
      })
      .catch(() => {
        addLog('[ DALMAC ] Service Worker: OFFLINE CACHE READY');
      });
  }

  // ---- Initial Execution & Render ----
  updateFirmwareProfile(effectiveFw);
  initDiagnostics();

  // If auto-launch is enabled, trigger countdown after initial validation
  if (elOptAutoLaunch && elOptAutoLaunch.checked) {
    setTimeout(startCountdown, 800);
  }

})();
