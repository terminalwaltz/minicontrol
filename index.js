// Global variables for MIDI controller interface
let parameters = null;
let currentValues = {};
let controller = new MiniChordController();
let tempValues = {};
let bankSettings = {};
let currentBankNumber = -1;
let targetBank = -1;
const bankNames = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l"];
let defaultValues = {};
let notificationTimeout = null;
let rhythmPattern = new Array(16).fill(0);
let lastUpdate = 0;
const updateInterval = 50;
let minichord_device = false;
const BASE_ADDRESS_RHYTHM = 220;

// Loads parameter definitions from parameters.json
async function loadParameters() {
  if (parameters) return parameters;
  try {
    const response = await fetch('parameters.json');
    if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
    parameters = await response.json();
    console.log('[DEBUG] Loaded parameters:', Object.keys(parameters));
    return parameters;
  } catch (error) {
    console.error('[loadParameters] Failed:', error);
    showNotification("Failed to load parameters", "error");
    return {};
  }
}

// Initializes default values from parameters.json
async function initializeDefaultValues() {
  const params = await loadParameters();
  defaultValues = {};
  Object.keys(params).forEach(group => {
    if (group === 'sysex_name_map') return;
    params[group].forEach(param => {
      const sysex = param.sysex_adress;
      const floatMultiplier = parseFloat(param.float_multiplier) || (param.data_type === 'float' ? 
                             (controller.float_multiplier || 100.0) : 1);
      defaultValues[sysex] = param.data_type === 'float' ? 
                            param.default_value * floatMultiplier : param.default_value;
    });
  });
  const overrideAddresses = [2, 3, 4, 5, 6];
  overrideAddresses.forEach(sysex => {
    const param = findParameterBySysex(sysex);
    if (param) {
      const floatMultiplier = parseFloat(param.float_multiplier) || (param.data_type === 'float' ? 
                             (controller.float_multiplier || 100.0) : 1);
      if (sysex === 2 || sysex === 3) {
        defaultValues[sysex] = 0.5 * floatMultiplier;
      } else if (sysex === 4 || sysex === 5 || sysex === 6) {
        defaultValues[sysex] = 512;
      }
    }
  });
  console.log('[DEBUG] Default values:', defaultValues);
}

// Finds parameter by SysEx address
function findParameterBySysex(sysex) {
  const params = parameters;
  for (const group of Object.keys(params)) {
    if (group === 'sysex_name_map') continue;
    const param = params[group].find(p => p.sysex_adress === sysex);
    if (param) return param;
  }
  return null;
}

// Updates connection status display
function updateConnectionStatus(connected, message) {
  const statusElement = document.getElementById("connection-status");
  if (!statusElement) return;
  minichord_device = connected;
  statusElement.className = `connection-status ${connected ? 'connected' : 'disconnected'}`;
  const bankText = currentBankNumber >= 0 ? ` | Bank ${currentBankNumber + 1}` : '';
  statusElement.textContent = connected ? `minichord connected${bankText}` : "minichord disconnected";
  if (message) showNotification(message, connected ? "success" : "error");
}

// Displays a temporary notification
function showNotification(message, type = 'info') {
  const statusElement = document.getElementById("connection-status");
  if (!statusElement) return;
  if (notificationTimeout) clearTimeout(notificationTimeout);
  statusElement.textContent = message;
  statusElement.className = `connection-status ${type === 'success' ? 'connected' : 'disconnected'}`;
  notificationTimeout = setTimeout(() => {
    updateConnectionStatus(controller.isConnected(), null);
  }, 3000);
}

// Updates page color scheme based on SysEx 20
function updateUIColor() {
  const param = findParameterBySysex(20);
  if (!param) {
    console.warn('[updateUIColor] SysEx 20 not found in parameters.json');
    return;
  }
  const bankColor = currentValues[20] || defaultValues[20] || param.default_value;
  const hue = bankColor % 360;
  document.documentElement.style.setProperty('--primary-color', `hsl(${hue}, 70%, 50%)`);
  console.log(`[DEBUG] UI color updated: hue=${hue}, value=${bankColor}, currentValues[20]=${currentValues[20]}`);
  const sliders = document.querySelectorAll('input[type="range"]');
  sliders.forEach(slider => {
    const value = (slider.value - slider.min) / (slider.max - slider.min) * 100;
    slider.style.background = `linear-gradient(to right, hsl(${hue}, 70%, 50%) 0%, hsl(${hue}, 70%, 50%) ${value}%, #ccc ${value}%, #ccc 100%)`;
  });
}

// Updates rhythm grid checkboxes (SysEx 220–235)
function refreshRhythmGrid() {
  for (let step = 0; step < 16; step++) {
    const sysexAddress = BASE_ADDRESS_RHYTHM + step;
    const patternValue = currentValues[sysexAddress] || 0;
    rhythmPattern[step] = patternValue;
    for (let voice = 0; voice < 7; voice++) {
      const checkbox = document.getElementById(`rhythm-checkbox-${step}-${voice}`);
      if (checkbox) checkbox.checked = !!(patternValue & (1 << voice));
    }
  }
}

// Sets up parameter controls (sliders and value displays)
async function setupParameterControls() {
  const params = await loadParameters();
  Object.keys(params).forEach(group => {
    if (group === 'sysex_name_map') return;
    params[group].forEach(param => {
      if (param.ui_type !== 'slider' && param.ui_type !== 'discrete_slider') return;
      const sysex = param.sysex_adress;
      const element = document.getElementById(`param-${sysex}`);
      const valueDisplay = document.getElementById(`value-${sysex}`);
      if (!element) {
        console.warn(`[setupParameterControls] Slider param-${sysex} not found`);
        return;
      }
      if (!valueDisplay) {
        console.error(`[setupParameterControls] Value display value-${sysex} not found`);
        return;
      }
      const floatMultiplier = parseFloat(param.float_multiplier) || (param.data_type === 'float' ? 
                             (controller.float_multiplier || 100.0) : 1);
      element.min = param.min_value * floatMultiplier;
      element.max = param.max_value * floatMultiplier;
      element.step = param.data_type === 'float' ? 0.01 * floatMultiplier : 1;
      const defaultValue = defaultValues[sysex] !== undefined ? defaultValues[sysex] : 
                          (param.data_type === 'float' ? param.default_value * floatMultiplier : param.default_value);
      currentValues[sysex] = currentValues[sysex] || defaultValue;
      element.value = currentValues[sysex];
      valueDisplay.value = param.data_type === 'float' ? 
                          (currentValues[sysex] / floatMultiplier).toFixed(2) : currentValues[sysex];
      console.log(`[setupParameterControls] Sysex=${sysex}, initial value=${element.value}, display=${valueDisplay.value}`);
      element.addEventListener('input', () => {
        const uiValue = parseFloat(element.value) / floatMultiplier;
        const deviceValue = Math.round(parseFloat(element.value));
        console.log(`[Slider Input] Sysex=${sysex}, uiValue=${uiValue.toFixed(2)}, deviceValue=${deviceValue}, floatMultiplier=${floatMultiplier}`);
        tempValues[sysex] = deviceValue;
        currentValues[sysex] = deviceValue;
        valueDisplay.value = param.data_type === 'float' ? uiValue.toFixed(2) : deviceValue;
        controller.sendParameter(sysex, deviceValue);
      });
    });
  });
}

// Handles incoming MIDI data
function handleDataReceived(data) {
  console.log(`[handleDataReceived] Bank=${data.bankNumber}, parameters.length=${data.parameters.length}`);
  currentValues = {};
  data.parameters.forEach((value, sysex) => {
    if (value !== undefined) {
      const param = findParameterBySysex(sysex);
      if (param) {
        currentValues[sysex] = value;
        console.log(`[handleDataReceived] Sysex=${sysex}, value=${value}`);
      }
    }
  });
  const overrideAddresses = [2, 3, 4, 5, 6];
  overrideAddresses.forEach(sysex => {
    const param = findParameterBySysex(sysex);
    if (param) {
      const floatMultiplier = parseFloat(param.float_multiplier) || (param.data_type === 'float' ? 
                             (controller.float_multiplier || 100.0) : 1);
      if (sysex === 2 || sysex === 3) {
        currentValues[sysex] = 0.5 * floatMultiplier;
      } else if (sysex === 4 || sysex === 5 || sysex === 6) {
        currentValues[sysex] = 512;
      }
      controller.sendParameter(sysex, currentValues[sysex]);
    }
  });
  rhythmPattern = data.rhythmData.map(bits => {
    let value = 0;
    bits.forEach((bit, i) => { if (bit) value |= (1 << i); });
    return value;
  });
  targetBank = data.bankNumber;
  updateUI(data.bankNumber);
}

// Updates all UI controls based on currentValues
async function updateUI(bankNumber) {
  console.log(`[updateUI] Bank ${bankNumber + 1}, targetBank=${targetBank + 1}`);
  currentBankNumber = bankNumber;
  const bankSelect = document.getElementById("bank_number_selection");
  if (bankSelect && parseInt(bankSelect.value) !== targetBank) {
    bankSelect.value = targetBank;
  }
  const params = await loadParameters();
  Object.keys(params).forEach(group => {
    if (group === 'sysex_name_map') return;
    params[group].forEach(param => {
      if (param.ui_type !== 'slider' && param.ui_type !== 'discrete_slider') return;
      const sysex = param.sysex_adress;
      const element = document.getElementById(`param-${sysex}`);
      const valueDisplay = document.getElementById(`value-${sysex}`);
      if (!element) {
        console.warn(`[updateUI] Slider param-${sysex} not found`);
        return;
      }
      if (!valueDisplay) {
        console.error(`[updateUI] Value display value-${sysex} not found`);
        return;
      }
      const floatMultiplier = parseFloat(param.float_multiplier) || (param.data_type === 'float' ? 
                             (controller.float_multiplier || 100.0) : 1);
      const value = currentValues[sysex] !== undefined ? currentValues[sysex] : 
                    (param.data_type === 'float' ? param.default_value * floatMultiplier : param.default_value);
      element.value = value;
      valueDisplay.value = param.data_type === 'float' ? (value / floatMultiplier).toFixed(2) : value;
      console.log(`[updateUI] Sysex=${sysex}, value=${value}, display=${valueDisplay.value}, element exists=${!!element}, valueDisplay exists=${!!valueDisplay}`);
    });
  });
  updateUIColor();
  refreshRhythmGrid();
  updateConnectionStatus(controller.isConnected(), null);
}

// Loads settings for a specific bank
function loadBankSettings(bankNumber) {
  if (!controller.isConnected()) {
    console.warn(`[loadBankSettings] No device connected for bank ${bankNumber}`);
    return;
  }
  tempValues = {};
  controller.sendSysEx([0, 0, 0, bankNumber]);
  console.log(`[loadBankSettings] Requesting settings for bank ${bankNumber}`);
}

// Initializes the app
async function initialize() {
  await initializeDefaultValues();
  await setupParameterControls();
  controller.onConnectionChange = updateConnectionStatus;
  controller.onDataReceived = handleDataReceived;
  const connected = await controller.initialize();
  if (connected) {
    loadBankSettings(0);
  }
}

// Event listener for bank selection
document.getElementById("bank_number_selection")?.addEventListener("change", (e) => {
  targetBank = parseInt(e.target.value);
  loadBankSettings(targetBank);
});

// Start the app
initialize();