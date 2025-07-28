// Global variables for MIDI controller interface
let parameters = null;
let currentValues = {};
let controller = new MiniChordController();
let tempValues = {};
let currentBankNumber = -1;
let targetBank = -1;
const bankNames = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l"];
let defaultValues = {};
let notificationTimeout = null;
let rhythmPattern = new Array(16).fill(0);
let minichord_device = false;
const BASE_ADDRESS_RHYTHM = 220;
let notificationQueue = [];
let isShowingNotification = false;

function getFloatMultiplier(param) {
  return parseFloat(param.float_multiplier) || (param.data_type === 'float' ? (controller.float_multiplier || 100.0) : 1);
}

function applyOverrideDefaults(target = defaultValues) {
  [2, 3, 4, 5, 6].forEach(sysex => {
    const param = findParameterBySysex(sysex);
    if (param) {
      const floatMultiplier = getFloatMultiplier(param);
      target[sysex] = (sysex === 2 || sysex === 3) ? 0.5 * floatMultiplier : 512;
    }
  });
}

async function loadParameters() {
  if (parameters) return parameters;
  try {
    const response = await fetch('parameters.json');
    if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
    parameters = await response.json();
    // console.log('[DEBUG] Loaded parameters:', Object.keys(parameters));
    return parameters;
  } catch (error) {
    console.error('[loadParameters] Failed:', error);
    showNotification("Failed to load parameters", "error");
    return {};
  }
}

async function initializeDefaultValues() {
  const params = await loadParameters();
  defaultValues = {};
  Object.keys(params).forEach(group => {
    if (group === 'sysex_name_map') return;
    params[group].forEach(param => {
      const sysex = param.sysex_adress;
      const floatMultiplier = getFloatMultiplier(param);
      defaultValues[sysex] = param.data_type === 'float' ? param.default_value * floatMultiplier : param.default_value;
    });
  });
  applyOverrideDefaults(defaultValues);
  // console.log('[DEBUG] Default values:', defaultValues);
}

function findParameterBySysex(sysex) {
  const params = parameters;
  for (const group of Object.keys(params)) {
    if (group === 'sysex_name_map') continue;
    const param = params[group].find(p => p.sysex_adress === sysex);
    if (param) return param;
  }
  return null;
}

function updateConnectionStatus(connected, message) {
  console.log(`[updateConnectionStatus] Called with connected: ${connected}, message: ${message}`);
  const bubbleElement = document.getElementById("notification-bubble");
  const textElement = document.getElementById("connection-text");
  if (!bubbleElement || !textElement) {
    console.warn("[updateConnectionStatus] Notification elements not found");
    return;
  }
  minichord_device = connected;
  if (!isShowingNotification) {
    bubbleElement.className = connected ? 'connected' : 'disconnected';
    const bankText = currentBankNumber >= 0 ? ` | Bank ${currentBankNumber + 1}` : '';
    textElement.textContent = connected ? `minichord connected${bankText}` : "minichord disconnected";
    bubbleElement.style.display = 'flex';
  }
  if (message && !isShowingNotification) {
    showNotification(message, connected ? "success" : "error");
  }
  if (!connected) {
    document.querySelectorAll('input, button, select').forEach(element => {
      element.classList.add("inactive");
      element.classList.remove("active");
    });
  }
}

function showNotification(message, type = 'info') {
  console.log(`[showNotification] Queuing message: ${message}, type: ${type}`);
  notificationQueue.push({ message, type });
  if (isShowingNotification) return;
  displayNextNotification();
}

function displayNextNotification() {
  if (notificationQueue.length === 0) {
    isShowingNotification = false;
    updateConnectionStatus(controller.isConnected(), null); // Ensure reset when queue is empty
    return;
  }
  isShowingNotification = true;
  const { message, type } = notificationQueue.shift();
  const bubbleElement = document.getElementById("notification-bubble");
  const textElement = document.getElementById("connection-text");
  if (!bubbleElement || !textElement) {
    console.warn("[showNotification] Notification elements not found");
    isShowingNotification = false;
    notificationQueue = []; // Clear queue to prevent infinite loop
    updateConnectionStatus(controller.isConnected(), null);
    return;
  }
  if (notificationTimeout) {
    console.log("[showNotification] Clearing existing timeout");
    clearTimeout(notificationTimeout);
  }
  textElement.textContent = message;
  bubbleElement.className = type === 'success' ? 'connected' : 'disconnected';
  bubbleElement.style.display = 'flex';
  notificationTimeout = setTimeout(() => {
    console.log("[showNotification] Timeout executed");
    isShowingNotification = false; // Set to false before updating connection status
    updateConnectionStatus(controller.isConnected(), null);
    displayNextNotification();
  }, 3000);
}

function updateUIColor() {
  const param = findParameterBySysex(20);
  if (!param) return console.warn('[updateUIColor] SysEx 20 not found');
  const bankColor = currentValues[20] ?? defaultValues[20] ?? param.default_value;
  const hue = bankColor % 360;
  const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';
  const primaryColor = isDarkMode ? `hsl(${hue}, 70%, 60%)` : `hsl(${hue}, 70%, 50%)`;
  const textColor = (hue >= 45 && hue <= 75) || (hue >= 90 && hue <= 150) ? '#000000' : '#ffffff';
  document.documentElement.style.setProperty('--primary-color-hue', hue);
  document.documentElement.style.setProperty('--primary-color', primaryColor);
  document.documentElement.style.setProperty('--text-color', textColor);
  document.querySelectorAll('input[type="range"]').forEach(slider => {
    const value = (slider.value - slider.min) / (slider.max - slider.min) * 100;
    const trackColor = isDarkMode ? '#555' : '#ccc';
    slider.style.background = `linear-gradient(to right, var(--primary-color) 0%, var(--primary-color) ${value}%, ${trackColor} ${value}%, ${trackColor} 100%)`;
    // console.log(`[updateUIColor] Slider ${slider.id}, Hue=${hue}, Value=${value}%, Theme=${isDarkMode ? 'dark' : 'light'}`);
  });
  document.querySelectorAll('button, #bank_number_selection').forEach(element => {
    if (element.classList.contains('active')) {
      element.style.backgroundColor = primaryColor;
      element.style.color = textColor;
    }
  });
}

function toggleTheme() {
  const html = document.documentElement;
  const currentTheme = html.getAttribute('data-theme') || 'light';
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  html.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  // console.log(`[toggleTheme] Switched to ${newTheme} mode`);
  updateUIColor();
}

function loadTheme() {
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  // console.log(`[loadTheme] Loaded ${savedTheme} mode`);
}

function refreshRhythmGrid() {
  for (let step = 0; step < 16; step++) {
    const sysexAddress = BASE_ADDRESS_RHYTHM + step;
    const patternValue = currentValues[sysexAddress] ?? 0;
    rhythmPattern[step] = patternValue;
    for (let voice = 0; voice < 7; voice++) {
      const checkbox = document.getElementById(`rhythm-checkbox-${step}-${voice}`);
      if (checkbox) checkbox.checked = !!(patternValue & (1 << voice));
    }
  }
}

function applyUIValue(param, value) {
  const sysex = param.sysex_adress;
  const floatMultiplier = getFloatMultiplier(param);
  const displayValue = param.data_type === 'float' ? (value / floatMultiplier).toFixed(2) : value;
  const element = document.getElementById(`param-${sysex}`);
  const valueDisplay = document.getElementById(`value-${sysex}`);
  if (!element) return;

  if (param.ui_type.includes('slider')) {
    element.value = value;
    if (valueDisplay) valueDisplay.value = displayValue;
  } else if (param.ui_type === 'select') {
    element.value = value;
  } else if (param.ui_type === 'switch') {
    element.checked = value === 1;
  }
}

async function setupParameterControls() {
  const params = await loadParameters();
  Object.keys(params).forEach(group => {
    if (group === 'sysex_name_map') return;
    params[group].forEach(param => {
      const sysex = param.sysex_adress;
      const floatMultiplier = getFloatMultiplier(param);
      const defaultValue = defaultValues[sysex] ?? (param.data_type === 'float' ? param.default_value * floatMultiplier : param.default_value);
      currentValues[sysex] = currentValues[sysex] ?? defaultValue;
      applyUIValue(param, currentValues[sysex]);

      const element = document.getElementById(`param-${sysex}`);
      const valueDisplay = document.getElementById(`value-${sysex}`);
      if (!element) return;

      if (param.ui_type.includes('slider')) {
        element.min = param.min_value * floatMultiplier;
        element.max = param.max_value * floatMultiplier;
        element.step = param.data_type === 'float' ? 0.01 * floatMultiplier : 1;
        element.addEventListener('input', () => {
          const uiValue = parseFloat(element.value) / floatMultiplier;
          const deviceValue = Math.round(parseFloat(element.value));
          tempValues[sysex] = deviceValue;
          currentValues[sysex] = deviceValue;
          if (valueDisplay) valueDisplay.value = param.data_type === 'float' ? uiValue.toFixed(2) : deviceValue;
          controller.sendParameter(sysex, deviceValue);
          const valuePercent = ((element.value - element.min) / (element.max - element.min)) * 100;
          element.style.background = `linear-gradient(to right, var(--primary-color) 0%, var(--primary-color) ${valuePercent}%, #ccc 0%, #ccc 100%)`;
          if (sysex === 20) updateUIColor();
        });
        if (valueDisplay) {
          valueDisplay.addEventListener('input', () => {
            let inputValue = param.data_type === 'float' ? parseFloat(valueDisplay.value) : parseInt(valueDisplay.value);
            if (isNaN(inputValue)) {
              console.warn(`[text-input] Invalid value for ${sysex}: ${valueDisplay.value}`);
              return;
            }
            inputValue = Math.max(param.min_value, Math.min(param.max_value, inputValue));
            const deviceValue = param.data_type === 'float' ? Math.round(inputValue * floatMultiplier) : inputValue;
            element.value = deviceValue;
            tempValues[sysex] = deviceValue;
            currentValues[sysex] = deviceValue;
            valueDisplay.value = param.data_type === 'float' ? inputValue.toFixed(2) : inputValue;
            controller.sendParameter(sysex, deviceValue);
            const valuePercent = ((element.value - element.min) / (element.max - element.min)) * 100;
            element.style.background = `linear-gradient(to right, var(--primary-color) 0%, var(--primary-color) ${valuePercent}%, #ccc 0%, #ccc 100%)`;
            if (sysex === 20) updateUIColor();
            // console.log(`[text-input] Param ${sysex}, Value=${inputValue}`);
          });
        }
      } else if (param.ui_type === 'select') {
        element.addEventListener('change', () => {
          const value = parseInt(element.value);
          tempValues[sysex] = value;
          currentValues[sysex] = value;
          controller.sendParameter(sysex, value);
          if (sysex === 20) updateUIColor();
        });
      } else if (param.ui_type === 'switch') {
        element.addEventListener('input', () => {
          const value = element.checked ? 1 : 0;
          tempValues[sysex] = value;
          currentValues[sysex] = value;
          controller.sendParameter(sysex, value);
        });
      }
    });
  });
  updateUIColor();
}

function handleDataReceived(data) {
  // console.log(`[handleDataReceived] Bank=${data.bankNumber}, parameters.length=${data.parameters.length}`);
  if (data.firmwareVersion === undefined || isNaN(data.firmwareVersion)) {
    console.warn("[handleDataReceived] Invalid or missing firmware version");
    showNotification("Invalid firmware version", "error");
    return;
  }
  currentValues = {};
  data.parameters.forEach((value, sysex) => {
    if (value !== undefined) {
      const param = findParameterBySysex(sysex);
      if (param) currentValues[sysex] = value;
    }
  });
  applyOverrideDefaults(currentValues);
  rhythmPattern = data.rhythmData.map(bits => bits.reduce((acc, bit, i) => acc | (bit ? (1 << i) : 0), 0));
  targetBank = data.bankNumber;
  updateUI(data.bankNumber);
  // Toggle active/inactive based on firmware version
  document.querySelectorAll('input, button, select').forEach(element => {
    const requiredVersion = parseFloat(element.getAttribute('version') || 0.01);
    if (requiredVersion <= data.firmwareVersion) {
      element.classList.add('active');
      element.classList.remove('inactive');
    } else {
      element.classList.add('inactive');
      element.classList.remove('active');
    }
  });
}

async function updateUI(bankNumber) {
  if (bankNumber < 0) {
    console.warn(`[updateUI] Invalid bank number: ${bankNumber}`);
    return;
  }
  console.log(`[updateUI] Bank ${bankNumber + 1}, targetBank=${targetBank + 1}`);
  currentBankNumber = bankNumber;
  const bankSelect = document.getElementById("bank_number_selection");
  if (bankSelect && parseInt(bankSelect.value) !== bankNumber) {
    bankSelect.value = bankNumber;
  }
  const params = await loadParameters();
  if (!params) return;
  Object.keys(params).forEach(group => {
    if (group === 'sysex_name_map') return;
    params[group].forEach(param => {
      const sysex = param.sysex_adress;
      const floatMultiplier = getFloatMultiplier(param);
      const value = currentValues[sysex] ?? (param.data_type === 'float' ? param.default_value * floatMultiplier : param.default_value);
      applyUIValue(param, value);
    });
  });
  updateUIColor();
  refreshRhythmGrid();
    if (!isShowingNotification) {
    updateConnectionStatus(controller.isConnected(), null);
  }
}

function loadBankSettings(bankNumber) {
  if (!controller.isConnected()) return console.warn(`[loadBankSettings] No device connected for bank ${bankNumber}`);
  tempValues = {};
  controller.sendSysEx([0, 0, 0, bankNumber]);
  // console.log(`[loadBankSettings] Requesting settings for bank ${bankNumber}`);
}

async function loadParameterRanges() {
  try {
    const [parametersResponse, presetsResponse] = await Promise.all([
      fetch('parameters.json'),
      fetch('shared_presets.json').catch(() => null)
    ]);
    
    const parametersData = await parametersResponse.json();
    const presetsData = presetsResponse ? await presetsResponse.json() : null;
    
    const parameterRanges = {};
    
    let randomPreset = null;
    if (presetsData?.shared_presets?.length) {
      randomPreset = presetsData.shared_presets[Math.floor(Math.random() * presetsData.shared_presets.length)];
      console.log(`[loadParameterRanges] Using random preset: "${randomPreset.name}" by ${randomPreset.author}`);
    }
    
    const decodedPreset = randomPreset ? atob(randomPreset.value).split(';').map(v => parseFloat(v)) : null;
    
    ['global_parameter', 'harp_parameter', 'chord_parameter', 'rhythm_parameter'].forEach(category => {
      if (!parametersData[category]) return;
      parametersData[category].forEach(param => {
        const sysex = param.sysex_adress;
        const presetValue = decodedPreset ? decodedPreset[sysex] : null;
        let defaultValue = param.default_value;
        
        if (presetValue !== undefined && presetValue !== null && !isNaN(presetValue)) {
          defaultValue = param.data_type === 'float' ? presetValue / 100 : presetValue;
        }
        
        parameterRanges[sysex] = {
          min: param.min_value,
          max: param.max_value,
          type: param.data_type,
          default: defaultValue,
          original_default: param.default_value
        };
      });
    });
    
    return parameterRanges;
  } catch (error) {
    console.error('[loadParameterRanges] Error:', error);
    try {
      const response = await fetch('parameters.json');
      const parametersData = await response.json();
      
      const parameterRanges = {};
      
      ['global_parameter', 'harp_parameter', 'chord_parameter', 'rhythm_parameter'].forEach(category => {
        if (!parametersData[category]) return;
        parametersData[category].forEach(param => {
          parameterRanges[param.sysex_adress] = {
            min: param.min_value,
            max: param.max_value,
            type: param.data_type,
            default: param.default_value,
            original_default: param.default_value
          };
        });
      });
      
      return parameterRanges;
    } catch (fallbackError) {
      console.error('[loadParameterRanges] Fallback error:', fallbackError);
      return {};
    }
  }
}

function normalRandom(mean, sigma) {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return z * sigma + mean;
}

async function generateRandomPreset() {
  if (!controller.isConnected()) {
    document.getElementById("information_zone")?.focus();
    showNotification("No device connected", "error");
    return;
  }
  
  const parameterRanges = await loadParameterRanges();
  const weirdness_factor = 0.10;
  const preset = Array(256).fill(0);
  const fixedValues = [32, 33, 34, 41, 97, 197];
  
  Object.entries(parameterRanges).forEach(([sysex, params]) => {
    const idx = parseInt(sysex);
    
    if (idx < 19 || fixedValues.includes(idx)) {
      preset[idx] = params.original_default;
    } else {
      const minVal = params.min;
      const maxVal = params.max;
      const center = params.default;
      const range = maxVal - minVal;
      const sigma = range * weirdness_factor;
      
      let value = normalRandom(center, sigma);
      value = Math.max(minVal, Math.min(maxVal, value));
      
      preset[idx] = params.type === 'float' ? Math.round(value * 100) / 100 : Math.round(value);
    }
  });
  
  for (let i = 2; i < 256; i++) {
    if (preset[i] !== undefined && parameterRanges[i]) {
      const param = findParameterBySysex(i);
      if (!param) continue;
      const floatMultiplier = getFloatMultiplier(param);
      const valueToSend = param.data_type === 'float' ? Math.round(preset[i] * floatMultiplier) : preset[i];
      controller.sendParameter(i, valueToSend);
      currentValues[i] = valueToSend;
    }
  }
  
  controller.sendParameter(0, 0);
  console.log("[generateRandomPreset] Random preset applied");
  showNotification("Random preset applied", "success");
}

function setupRhythmGridControls() {
  for (let step = 0; step < 16; step++) {
    for (let voice = 0; voice < 7; voice++) {
      const checkbox = document.getElementById(`rhythm-checkbox-${step}-${voice}`);
      if (checkbox) {
        checkbox.addEventListener('input', () => {
          const sysexAddress = BASE_ADDRESS_RHYTHM + step;
          let patternValue = currentValues[sysexAddress] ?? 0;
          if (checkbox.checked) {
            patternValue |= (1 << voice);
          } else {
            patternValue &= ~(1 << voice);
          }
          rhythmPattern[step] = patternValue;
          currentValues[sysexAddress] = patternValue;
          controller.sendParameter(sysexAddress, patternValue);
          // console.log(`[rhythm-checkbox] Step ${step}, Voice ${voice}, Pattern ${patternValue}`);
        });
      }
    }
  }
}

async function initialize() {
  await initializeDefaultValues();
  await setupParameterControls();
  setupRhythmGridControls();
  controller.onConnectionChange = updateConnectionStatus;
  controller.onDataReceived = handleDataReceived;
  const connected = await controller.initialize();
  if (connected) loadBankSettings(0);
  loadTheme();
  document.getElementById("toggle-theme-btn")?.addEventListener("click", toggleTheme);
}

document.getElementById("bank_number_selection")?.addEventListener("change", (e) => {
  targetBank = parseInt(e.target.value);
  console.log(`[bank_number_selection] Selected target bank ${targetBank + 1}`);
});

document.getElementById("save-to-bank-btn")?.addEventListener("click", () => {
  if (!controller.isConnected()) {
    console.warn("[save-to-bank-btn] No device connected");
    document.getElementById("information_zone")?.focus();
    return;
  }
  const bankSelect = document.getElementById("bank_number_selection");
  const saveBank = parseInt(bankSelect.value);
  console.log(`[save-to-bank-btn] Saving to bank ${saveBank + 1}`);
  controller.saveCurrentSettings(saveBank);
  showNotification(`Saved to bank ${saveBank + 1}`, "success");
});

document.getElementById("reset-bank-btn")?.addEventListener("click", () => {
  if (!controller.isConnected()) {
    console.warn("[reset-bank-btn] No device connected");
    document.getElementById("information_zone")?.focus();
    return;
  }
  console.log(`[reset-bank-btn] Resetting bank ${currentBankNumber + 1}`);
  controller.resetCurrentBank();
  showNotification(`Reset bank ${currentBankNumber + 1}`, "success");
});

document.getElementById("reset-all-banks-btn")?.addEventListener("click", () => {
  if (!controller.isConnected()) {
    console.warn("[reset-all-banks-btn] No device connected");
    document.getElementById("information_zone")?.focus();
    return;
  }
  console.log("[reset-all-banks-btn] Resetting all banks");
  controller.resetMemory();
  showNotification("Reset all banks", "success");
});

document.getElementById("export-settings-btn")?.addEventListener("click", () => {
  if (!controller.isConnected()) {
    console.warn("[export-settings-btn] No device connected");
    document.getElementById("information_zone")?.focus();
    return;
  }
  const sysexArray = Array(256).fill(0);
  Object.entries(currentValues).forEach(([sysex, value]) => {
    sysexArray[parseInt(sysex)] = value;
  });
  for (let i = 0; i < 16; i++) {
    sysexArray[BASE_ADDRESS_RHYTHM + i] = rhythmPattern[i] || 0;
  }
  const outputBase64 = sysexArray.join(";");
  const encoded = btoa(outputBase64);
  navigator.clipboard.writeText(encoded);
  console.log(`[export-settings-btn] Exported settings: ${encoded}`);
  showNotification("Preset code copied to clipboard", "success");
});

document.getElementById("load-settings-btn")?.addEventListener("click", () => {
  if (!controller.isConnected()) {
    console.warn("[load-settings-btn] No device connected");
    document.getElementById("information_zone")?.focus();
    return;
  }
  const presetCode = prompt("Paste preset code");
  if (!presetCode) return;
  try {
    const parameters = atob(presetCode).split(";").map(v => parseFloat(v));
    if (parameters.length !== 256) {
      console.warn("[load-settings-btn] Malformed preset code");
      showNotification("Malformed preset code", "error");
      return;
    }
    for (let i = 2; i < parameters.length; i++) {
      const param = findParameterBySysex(i);
      if (param) {
        const value = param.data_type === "float" ? Math.round(parameters[i]) : Math.round(parameters[i]);
        controller.sendParameter(i, value);
        currentValues[i] = value;
      }
    }
    controller.sendParameter(0, 0);
    console.log("[load-settings-btn] Loaded settings");
    showNotification("Preset loaded", "success");
  } catch (error) {
    console.warn("[load-settings-btn] Invalid preset code:", error);
    showNotification("Invalid preset code", "error");
  }
});

document.getElementById("randomise_btn")?.addEventListener("click", generateRandomPreset);

initialize();