var parameters = null;
var currentValues = {};
var controller = new MiniChordController();
var tempValues = {};
var bankSettings = {};
let currentBankNumber = -1;
const bankNames = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l"];
let defaultValues = {};
let originalPresetValues = {};
let isLoadingPreset = false;
let isInitializing = false;
let midiResponseQueue = [];
let loadBankSettingsCount = 0;
let lastMidiProcessed = 0;
let openParamGroup = null;
let notificationTimeout = null;
let rhythmPattern = new Array(16).fill(0);

const sysexNameMap = {
  20: "Bank Color (Global)",
  21: "Retrigger Chords (Global)",
  22: "Change Held Strings (Global)",
  23: "Slash Level (Global)",
  24: "Reverb Size (Global)",
  25: "Reverb High Damping (Global)",
  26: "Reverb Low Damping (Global)",
  27: "Reverb Low Pass (Global)",
  28: "Reverb Diffusion (Global)",
  29: "Pan (Global)",
  30: "Transpose (Global)",
 31: "Sharp Function (Global)",
  32: "LED Attenuation (Global)",
  33: "Barry Harris Mode (Global)",
  40: "Harp Harp Shuffling",
  41: "Harp Oscillator Amplitude",
  42: "Harp Oscillator Waveform",
  43: "Harp Envelope Attack",
  44: "Harp Envelope Hold",
  45: "Harp Envelope Decay",
  46: "Harp Envelope Sustain",
  47: "Harp Envelope Release",
  48: "Harp Envelope Retrigger Release",
  49: "Harp Low Pass Filter Base Frequency",
  50: "Harp Low Pass Filter Keytrack Value",
  51: "Harp Low Pass Filter Resonance",
  52: "Harp Low Pass Filter Attack",
  53: "Harp Low Pass Filter Hold",
  54: "Harp Low Pass Filter Decay",
  55: "Harp Low Pass Filter Sustain",
  56: "Harp Low Pass Filter Release",
  57: "Harp Low Pass Filter Retrigger Release",
  58: "Harp Low Pass Filter Filter Sensitivity",
  59: "Harp Tremolo Waveform",
  60: "Harp Tremolo Frequency",
  61: "Harp Tremolo Amplitude",
  62: "Harp Vibrato Waveform",
  63: "Harp Vibrato Frequency",
  64: "Harp Vibrato Amplitude",
  65: "Harp Vibrato Attack",
  66: "Harp Vibrato Hold",
  67: "Harp Vibrato Decay",
  68: "Harp Vibrato Sustain",
  69: "Harp Vibrato Release",
  70: "Harp Vibrato Retrigger Release",
  71: "Harp Vibrato Pitch Bend",
  72: "Harp Vibrato Attack Bend",
  73: "Harp Vibrato Hold Bend",
  74: "Harp Vibrato Decay Bend",
  75: "Harp Vibrato Retrigger Release Bend",
  76: "Harp Vibrato Intensity",
  77: "Harp Effects Delay Length",
  78: "Harp Effects Delay Filter Frequency",
  79: "Harp Effects Delay Filter Resonance",
  80: "Harp Effects Delay Lowpass",
  81: "Harp Effects Delay Bandpass",
  82: "Harp Effects Delay Highpass",
  83: "Harp Effects Dry Mix",
  84: "Harp Effects Delay Mix",
  85: "Harp Effects Reverb Level",
  86: "Harp Effects Crunch Level",
  87: "Harp Effects Crunch Type",
  88: "Harp Output Filter Frequency",
  89: "Harp Output Filter Resonance",
  90: "Harp Output Filter Lowpass",
  91: "Harp Output Filter Bandpass",
  92: "Harp Output Filter Highpass",
  93: "Harp Output Filter LFO Waveform",
  94: "Harp Output Filter LFO Frequency",
  95: "Harp Output Filter LFO Amplitude",
  96: "Harp Output Filter Filter LFO Sensitivity",
  97: "Harp Output Filter Output Amplifier",
  98: "Harp Chromatic Mode",
  99: "Harp Octave Change",
  100: "Harp Transient Waveform",
  101: "Harp Transient Amplitude",
  102: "Harp Transient Attack",
  103: "Harp Transient Hold",
  104: "Harp Transient Decay",
  105: "Harp Transient Note Level",
  120: "Chord Chord Shuffling",
  121: "Chord Oscillator Amplitude 1",
  122: "Chord Oscillator Waveform 1",
  123: "Chord Oscillator Frequency Multiplier 1",
  124: "Chord Oscillator Amplitude 2",
  125: "Chord Oscillator Waveform 2",
  126: "Chord Oscillator Frequency Multiplier 2",
  127: "Chord Oscillator Amplitude 3",
  128: "Chord Oscillator Waveform 3",
  129: "Chord Oscillator Frequency Multiplier 3",
  130: "Chord Oscillator Noise",
  131: "Chord Oscillator First Note",
  132: "Chord Oscillator Second Note",
  133: "Chord Oscillator Third Note",
  134: "Chord Oscillator Fourth Note",
  135: "Chord Oscillator Inter-Note Delay",
  136: "Chord Oscillator Random Note Delay",
  137: "Chord Envelope Attack",
  138: "Chord Envelope Hold",
  139: "Chord Envelope Decay",
  140: "Chord Envelope Sustain",
  141: "Chord Envelope Release",
  142: "Chord Envelope Retrigger Release",
  143: "Chord Low Pass Filter Base Frequency",
  144: "Chord Low Pass Filter Keytrack Value",
  145: "Chord Low Pass Filter Resonance",
  146: "Chord Low Pass Filter Attack",
  147: "Chord Low Pass Filter Hold",
  148: "Chord Low Pass Filter Decay",
  149: "Chord Low Pass Filter Sustain",
  150: "Chord Low Pass Filter Release",
  151: "Chord Low Pass Filter Retrigger Release",
  152: "Chord Low Pass Filter LFO Waveform",
  153: "Chord Low Pass Filter LFO Frequency",
  154: "Chord Low Pass Filter LFO Amplitude",
  155: "Chord Low Pass Filter Filter Sensitivity",
  156: "Chord Tremolo Waveform",
  157: "Chord Tremolo Frequency",
  158: "Chord Tremolo Keytrack Value",
  159: "Chord Tremolo Amplitude",
  160: "Chord Vibrato Waveform",
  161: "Chord Vibrato Frequency",
  162: "Chord Vibrato Keytrack Value",
  163: "Chord Vibrato Amplitude",
  164: "Chord Vibrato Attack",
  165: "Chord Vibrato Hold",
  166: "Chord Vibrato Decay",
  167: "Chord Vibrato Sustain",
  168: "Chord Vibrato Release",
  169: "Chord Vibrato Retrigger Release",
  170: "Chord Vibrato Pitch Bend",
  171: "Chord Vibrato Attack Bend",
  172: "Chord Vibrato Hold Bend",
  173: "Chord Vibrato Decay Bend",
  174: "Chord Vibrato Retrigger Release Bend",
  175: "Chord Vibrato Intensity",
  176: "Chord Effects Delay Length",
  177: "Chord Effects Delay Filter Frequency",
  178: "Chord Effects Delay Filter Resonance",
  179: "Chord Effects Delay Lowpass",
  180: "Chord Effects Delay Bandpass",
  181: "Chord Effects Delay Highpass",
  182: "Chord Effects Dry Mix",
  183: "Chord Effects Delay Mix",
  184: "Chord Effects Reverb Level",
  185: "Chord Effects Crunch Level",
  186: "Chord Effects Crunch Type",
  187: "Chord Rythm Default BPM",
  188: "Chord Rythm Cycle Length",
  189: "Chord Rythm Measure Update",
  190: "Chord Rythm Shuffle Value",
  191: "Chord Rythm Note Pushed Duration",
  192: "Chord Output Filter Frequency",
  193: "Chord Output Filter Resonance",
  194: "Chord Output Filter Lowpass",
  195: "Chord Output Filter Bandpass",
  196: "Chord Output Filter Highpass",
  197: "Chord Output Filter Output Amplifier",
  198: "Chord Octave Change"
};

const waveformMap = {
  0: "Sine",
  1: "Sawtooth",
  2: "Square",
  3: "Triangle",
  4: "Bandlimited Pulse",
  5: "Pulse",
  6: "Reverse Sawtooth",
  7: "Noise",
  8: "Variable Triangle",
  9: "Bandlimited Sawtooth",
  10: "Reverse Bandlimited Sawtooth",
  11: "Bandlimited Square"
};

async function loadParameters() {
  if (!parameters) {
    try {
      const response = await fetch('parameters.json');
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      parameters = await response.json();
    } catch (error) {
      console.error('Error loading parameters.json:', error);
      parameters = { global_parameter: [], harp_parameter: [], chord_parameter: [], potentiometer: [], rhythm_button_parameters: [] };
    }
  }
  return parameters;
}

async function initializeDefaultValues() {
  const params = await loadParameters();
  defaultValues = {};
  Object.keys(params).forEach(group => {
    params[group].forEach(param => {
      defaultValues[param.sysex_adress] = param.data_type === "float" 
        ? param.default_value * (controller.float_multiplier || 1)
        : param.default_value;
    });
  });
  console.log('Default values initialized:', defaultValues);
}

function updateAmbientBacklight(color) {
  const backlight = document.getElementById("ambient-backlight");
  if (!backlight) {
    console.warn("Ambient backlight element not found");
    return;
  }
  backlight.style.background = `radial-gradient(circle at center, ${color} 0%, transparent 70%)`;
}

function updateLEDBankColor() {
  const bankColor = currentValues[20] !== undefined ? currentValues[20] : defaultValues[20] !== undefined ? defaultValues[20] : 120;
  const floatMultiplier = 1;
  const normalizedColor = bankColor / floatMultiplier;
  const colorIndex = Math.min(23, Math.floor(normalizedColor / 15));
  
  console.log(`updateLEDBankColor: bankColor=${bankColor}, floatMultiplier=${floatMultiplier}, normalizedColor=${normalizedColor}, colorIndex=${colorIndex}, currentBankNumber=${currentBankNumber}`);
  
  const led = document.getElementById("power_led");
  if (!led) {
    console.error("Power LED element not found: #power_led");
    return;
  }
  
  const colorMap = {
    0: 'hsl(0, 70%, 50%)',
    1: 'hsl(15, 70%, 50%)',
    2: 'hsl(30, 70%, 50%)',
    3: 'hsl(45, 70%, 50%)',
    4: 'hsl(60, 70%, 50%)',
    5: 'hsl(75, 70%, 50%)',
    6: 'hsl(90, 70%, 50%)',
    7: 'hsl(105, 70%, 50%)',
    8: 'hsl(120, 70%, 50%)',
    9: 'hsl(135, 70%, 50%)',
    10: 'hsl(150, 70%, 50%)',
    11: 'hsl(165, 70%, 50%)',
    12: 'hsl(180, 70%, 50%)',
    13: 'hsl(195, 70%, 50%)',
    14: 'hsl(210, 70%, 50%)',
    15: 'hsl(225, 70%, 50%)',
    16: 'hsl(240, 70%, 50%)',
    17: 'hsl(255, 70%, 50%)',
    18: 'hsl(270, 70%, 50%)',
    19: 'hsl(285, 70%, 50%)',
    20: 'hsl(300, 70%, 50%)',
    21: 'hsl(315, 70%, 50%)',
    22: 'hsl(330, 70%, 50%)',
    23: 'hsl(345, 70%, 50%)'
  };
  
  led.removeAttribute('fill');
  led.classList.remove(...Array.from({ length: 24 }, (_, i) => `color-${i}`));
  led.classList.add(`color-${colorIndex}`);
  led.setAttribute('fill', colorMap[colorIndex]);
  
  led.style.display = 'none';
  led.offsetHeight;
  led.style.display = '';
  updateAmbientBacklight(colorMap[colorIndex]);
  
  console.log(`Applied class: color-${colorIndex}, fill: ${colorMap[colorIndex]}`);
}

function showNotification(message, type = 'info') {
  const statusElement = document.getElementById("connection-status");
  if (!statusElement) {
    console.warn("Status element not found: #connection-status");
    return;
  }

  if (notificationTimeout) {
    clearTimeout(notificationTimeout);
  }

  statusElement.textContent = message;
  statusElement.className = `connection-status ${type === 'success' ? 'connected' : 'disconnected'}`;

  notificationTimeout = setTimeout(() => {
    notificationTimeout = null;
    updateConnectionStatus(controller.isConnected(), 'notification timeout');
  }, 3000);
}

function decodePresetData(encodedData) {
  try {
    const decodedString = atob(encodedData);
    const parameters = decodedString.split(';');
    return parameters.map(param => {
      const num = parseInt(param);
      return isNaN(num) ? 0 : num;
    });
  } catch (error) {
    console.error('Error decoding preset data:', error);
    showNotification('Invalid preset code', 'error');
    return new Array(controller.parameter_size || 199).fill(0);
  }
}

const BASE_ADDRESS_RHYTHM = 220;

async function checkbox_array() {
  const modal = document.getElementById('rhythm-modal');
  if (!modal) {
    console.error("Rhythm modal element not found: #rhythm-modal");
    showNotification("Rhythm modal not found", "error");
    return;
  }
  modal.innerHTML = ''; // Clear modal content

  const modalContent = document.createElement('div');
  modalContent.className = 'modal-content';

  const closeButton = document.createElement('span');
  closeButton.className = 'close-button';
  closeButton.textContent = '×';
  closeButton.addEventListener('click', () => hideModal('rhythm_button_parameters'));
  modalContent.appendChild(closeButton);

  const title = document.createElement('h2');
  title.textContent = 'Rhythm Settings';
  modalContent.appendChild(title);

  // Checkbox grid for rhythm_button_parameters
  const gridContainer = document.createElement('div');
  gridContainer.className = 'rhythm-grid';

  const headerRow = document.createElement('div');
  headerRow.className = 'rhythm-row header';
  const emptyCell = document.createElement('div');
  emptyCell.className = 'rhythm-cell';
  headerRow.appendChild(emptyCell);
  for (let step = 1; step <= 16; step++) {
    const stepHeader = document.createElement('div');
    stepHeader.className = 'rhythm-cell';
    stepHeader.textContent = step;
    headerRow.appendChild(stepHeader);
  }
  gridContainer.appendChild(headerRow);

  for (let voice = 0; voice < 7; voice++) {
    const row = document.createElement('div');
    row.className = 'rhythm-row';
    const rowLabel = document.createElement('div');
    rowLabel.className = 'rhythm-cell';
    rowLabel.textContent = `Voice ${voice + 1}`;
    row.appendChild(rowLabel);

    for (let step = 0; step < 16; step++) {
      const cell = document.createElement('div');
      cell.className = 'rhythm-cell';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = `checkbox${voice}${step}`; // Match refreshRhythmGrid format
      checkbox.dataset.voice = voice;
      checkbox.dataset.step = step;
      checkbox.addEventListener('change', () => sendRhythmData(step));
      cell.appendChild(checkbox);
      row.appendChild(cell);
    }
    gridContainer.appendChild(row);
  }
  modalContent.appendChild(gridContainer);

  // Sliders for rhythm_parameter
  const params = await loadParameters();
  console.log('checkbox_array: Loaded parameters=', params); // Debug log
  const rhythmParams = (params.rhythm_parameter || []).filter(param => param.group !== "hidden");
  console.log('checkbox_array: rhythmParams=', rhythmParams); // Debug log
  if (rhythmParams.length > 0) {
    const slidersContainer = document.createElement('div');
    slidersContainer.className = 'parameter-column';
    const slidersHeader = document.createElement('h3');
    slidersHeader.textContent = 'Rhythm Parameters';
    slidersContainer.appendChild(slidersHeader);

    rhythmParams.forEach(param => {
      if (param.ui_type !== 'slider') {
        console.warn(`Skipping non-slider parameter: ${param.name} (sysex_adress: ${param.sysex_adress})`);
        return;
      }

      const container = document.createElement('div');
      container.className = 'parameter-row';
      const label = document.createElement('label');
      label.textContent = param.name;
      label.setAttribute('for', `param-${param.sysex_adress}`);
      label.title = param.tooltip || param.name;

      const sliderContainer = document.createElement('div');
      sliderContainer.className = 'slider-container';
      const input = document.createElement('input');
      input.type = 'range';
      input.id = `param-${param.sysex_adress}`;
      input.name = param.name;
      input.className = 'slider';
      input.min = param.min_value;
      input.max = param.max_value;
      const floatMultiplier = param.data_type === 'float' ? (controller.float_multiplier || 100.0) : 1;
      const currentValue = tempValues[param.sysex_adress] !== undefined
        ? tempValues[param.sysex_adress]
        : (param.data_type === 'float' ? param.default_value * floatMultiplier : param.default_value);
      input.value = param.data_type === 'float' ? Number((currentValue / floatMultiplier).toFixed(2)) : currentValue;
      input.step = param.data_type === 'float' ? 0.01 : 1;
      input.title = param.tooltip || param.name;

      const valueInput = document.createElement('input');
      valueInput.type = 'number';
      valueInput.id = `value-${param.sysex_adress}`;
      valueInput.min = param.min_value;
      valueInput.max = param.max_value;
      valueInput.step = param.data_type === 'float' ? 0.01 : 1;
      valueInput.value = param.data_type === 'float' ? Number((currentValue / floatMultiplier).toFixed(2)) : currentValue;
      valueInput.className = 'value-input';
      valueInput.title = param.tooltip || param.name;

      console.log(`[SLIDER] sysex=${param.sysex_adress}, name=${param.name}, currentValue=${currentValue}, floatMultiplier=${floatMultiplier}, input.value=${input.value}`);

      input.addEventListener('input', (e) => {
        const value = param.data_type === 'float' ? parseFloat(e.target.value) * floatMultiplier : parseInt(e.target.value);
        tempValues[param.sysex_adress] = value;
        valueInput.value = param.data_type === 'float' ? Number((value / floatMultiplier).toFixed(2)) : value;
        console.log(`[RHYTHM] Sending sysex=${param.sysex_adress}, value=${value}, name=${param.name}`);
        controller.sendParameter(parseInt(param.sysex_adress), value);
        executeMethod(param.method, value);
      });

      valueInput.addEventListener('change', (e) => {
        let value = parseFloat(e.target.value) || 0;
        value = Math.max(param.min_value, Math.min(param.max_value, value));
        if (param.data_type === 'float') value *= floatMultiplier;
        tempValues[param.sysex_adress] = value;
        input.value = param.data_type === 'float' ? Number((value / floatMultiplier).toFixed(2)) : value;
        valueInput.value = param.data_type === 'float' ? Number((value / floatMultiplier).toFixed(2)) : value;
        console.log(`[RHYTHM] Sending sysex=${param.sysex_adress}, value=${value}, name=${param.name}`);
        controller.sendParameter(parseInt(param.sysex_adress), value);
        executeMethod(param.method, value);
      });

      sliderContainer.appendChild(input);
      sliderContainer.appendChild(valueInput);
      container.appendChild(label);
      container.appendChild(sliderContainer);
      slidersContainer.appendChild(container);
    });

    modalContent.appendChild(slidersContainer);
  } else {
    console.warn('No rhythm_parameter found in parameters.json');
  }

  // Buttons
  const buttonContainer = document.createElement('div');
  buttonContainer.className = 'modal-buttons';
  const saveButton = document.createElement('button');
  saveButton.className = 'save-btn';
  saveButton.textContent = 'Save';
  saveButton.addEventListener('click', () => {
    saveSettings(currentBankNumber, 'rhythm_button_parameters');
    saveSettings(currentBankNumber, 'rhythm_parameter');
    hideModal('rhythm_button_parameters');
  });
  const cancelButton = document.createElement('button');
  cancelButton.className = 'cancel-btn';
  cancelButton.textContent = 'Cancel';
  cancelButton.addEventListener('click', () => {
    tempValues = { ...currentValues }; // Restore values
    hideModal('rhythm_button_parameters'); // Close modal
  });
  buttonContainer.appendChild(saveButton);
  buttonContainer.appendChild(cancelButton);
  modalContent.appendChild(buttonContainer);

  modal.appendChild(modalContent);
  modal.style.display = 'block';

  // Initialize rhythm data
  for (let step = 0; step < 16; step++) {
    const sysexAddress = BASE_ADDRESS_RHYTHM + step;
    if (!(sysexAddress in currentValues)) {
      currentValues[sysexAddress] = 0;
      rhythmPattern[step] = 0;
    }
  }

  // Ensure modal is in DOM before refreshing grid
  await new Promise(resolve => setTimeout(resolve, 0)); // Allow DOM update
  await refreshRhythmGrid();
  console.log('checkbox_array: Generated rhythm grid and sliders, currentValues[187-191,220-235]=', 
    Object.fromEntries(Object.entries(currentValues).filter(([k]) => (k >= 187 && k <= 191) || (k >= 220 && k <= 235))));
}

function sendRhythmData(step) {
  let output_value = 0;
  for (let voice = 0; voice < 7; voice++) {
    const checkbox = document.getElementById(`checkbox${voice}${step}`);
    if (checkbox && checkbox.checked) {
      output_value |= 1 << voice;
    }
  }
  const sysexAddress = BASE_ADDRESS_RHYTHM + step;
  currentValues[sysexAddress] = output_value;
  tempValues[sysexAddress] = output_value;
  rhythmPattern[step] = output_value;
  console.log(`sendRhythmData: Step ${step + 1}, sysex=${sysexAddress}, value=${output_value}, voices=${output_value.toString(2).padStart(7, '0')}`);
  controller.sendParameter(sysexAddress, output_value);
}

function executeMethod(method, value) {
  if (!method) return;
  const methodParts = method.split(';').map(part => part.trim());
  methodParts.forEach(part => {
    if (part.includes('rhythm_pattern')) {
      const index = parseInt(part.match(/\[(\d+)\]/)?.[1]);
      if (!isNaN(index)) rhythmPattern[index] = value;
    } else if (part === 'update_rhythm()') {
      updateRhythm();
    }
  });
}

function updateRhythm() {
  console.log('Rhythm updated:', rhythmPattern);
  // Add synthesizer update logic if needed
}

async function generateGlobalSettingsForm() {
  const params = await loadParameters();
  const form = document.querySelector(".global-settings");
  if (!form) {
    console.error("Global settings form not found: .global-settings");
    return;
  }
  const formBody = document.getElementById("global-settings-form");
  if (!formBody) {
    console.error("Global settings form body not found: #global-settings-form");
    return;
  }
  formBody.innerHTML = "";

  const groupParams = (params.global_parameter || []).filter(param => param.group !== "hidden");
  if (groupParams.length === 0) {
    formBody.innerHTML = "<p>No parameters available.</p>";
    return;
  }

  groupParams.forEach(param => {
    if (!param.ui_type || !["button", "switch", "slider", "select"].includes(param.ui_type)) {
      console.warn(`Invalid ui_type for global parameter: ${param.name || 'unnamed'} (sysex_adress: ${param.sysex_adress})`);
      return;
    }
    const container = document.createElement("div");
    container.className = "parameter-row";
    const label = document.createElement("label");
    label.textContent = param.name;
    label.setAttribute("for", `global-param-${param.sysex_adress}`);
    label.title = param.tooltip || param.name; // Add tooltip
    let input;
    const floatMultiplier = param.sysex_adress === 20 ? 1 : (controller.float_multiplier || 100.0);
    const currentValue = currentValues[param.sysex_adress] !== undefined 
      ? currentValues[param.sysex_adress] 
      : (param.data_type === "float" ? param.default_value * floatMultiplier : param.default_value);

    if (param.ui_type === "button" || param.ui_type === "switch") {
      if (param.sysex_adress === 31) {
        const toggleContainer = document.createElement("div");
        toggleContainer.className = "toggle-switch";
        input = document.createElement("input");
        input.type = "switch";
        input.id = `global-param-${param.sysex_adress}`;
        input.name = param.name;
        input.checked = currentValue === 1;
        input.title = param.tooltip || param.name; // Add tooltip
        const toggleLabel = document.createElement("label");
        toggleLabel.className = "toggle-label";
        toggleLabel.setAttribute("for", input.id);
        toggleLabel.dataset.flat = "Flat";
        toggleLabel.dataset.sharp = "Sharp";
        toggleContainer.appendChild(input);
        toggleContainer.appendChild(toggleLabel);

        input.addEventListener("change", (e) => {
          const value = e.target.checked ? 1 : 0;
          tempValues[param.sysex_adress] = value;
          currentValues[param.sysex_adress] = value;
          console.log(`[GLOBAL] Sending sysex=${param.sysex_adress}, value=${value}, name=${param.name}, state=${value === 1 ? 'Flat' : 'Sharp'}`);
          if (controller.isConnected()) {
            const success = controller.sendParameter(parseInt(param.sysex_adress), value);
            if (success) {
              bankSettings[currentBankNumber] = { ...currentValues };
              const sharpButton = document.getElementById("sharp-button");
              if (sharpButton) {
                sharpButton.classList.toggle("active", value === 1);
              }
              input.checked = value === 1;
              toggleLabel.classList.toggle("checked", value === 1);
              toggleContainer.style.display = 'none';
              toggleContainer.offsetHeight;
              toggleContainer.style.display = '';
              showNotification(`Switched to ${value === 1 ? 'Flat' : 'Sharp'}`, 'success');
            } else {
              console.error(`[GLOBAL] Failed to send sysex=${param.sysex_adress}, value=${value}`);
              e.target.checked = currentValue === 1;
              showNotification("Failed to switch Sharp/Flat", "error");
            }
          } else {
            console.warn("[GLOBAL] Device not connected, cannot send sysex");
            e.target.checked = currentValue === 1;
            showNotification("Device not connected", "error");
          }
        });

        container.appendChild(label);
        container.appendChild(toggleContainer);
      } else {
        input = document.createElement("input");
        input.type = "checkbox";
        input.id = `global-param-${param.sysex_adress}`;
        input.name = param.name;
        input.checked = currentValue === 1;
        input.title = param.tooltip || param.name; // Add tooltip
        input.addEventListener("change", (e) => {
          const value = e.target.checked ? 1 : 0;
          tempValues[param.sysex_adress] = value;
          currentValues[param.sysex_adress] = value;
          console.log(`[GLOBAL] Sending sysex=${param.sysex_adress}, value=${value}, name=${param.name}`);
          controller.sendParameter(parseInt(param.sysex_adress), value);
        });
        container.appendChild(label);
        container.appendChild(input);
      }
    } else if (param.ui_type === "slider") {
      const sliderContainer = document.createElement("div");
      sliderContainer.className = "slider-container";
      input = document.createElement("input");
      input.type = "range";
      input.id = `global-param-${param.sysex_adress}`;
      input.name = param.name;
      input.className = "slider";
      input.min = param.min_value;
      input.max = param.max_value;
      const sliderValue = param.data_type === "float" 
        ? Number((currentValue / floatMultiplier).toFixed(2)) 
        : currentValue;
      input.value = sliderValue;
      input.step = param.data_type === "float" ? 0.01 : 1;
      input.title = param.tooltip || param.name; // Add tooltip
      const valueInput = document.createElement("input");
      valueInput.type = "number";
      valueInput.id = `value-${param.sysex_adress}`;
      valueInput.min = param.min_value;
      valueInput.max = param.max_value;
      valueInput.step = param.data_type === "float" ? 0.01 : 1;
      valueInput.value = param.data_type === "float" ? Number((currentValue / floatMultiplier).toFixed(2)) : currentValue;
      valueInput.title = param.tooltip || param.name; // Add tooltip
      console.log(`[SLIDER] sysex=${param.sysex_adress}, name=${param.name}, currentValue=${currentValue}, floatMultiplier=${floatMultiplier}, sliderValue=${sliderValue}, input.value=${input.value}`);
      valueInput.className = "value-input";

      input.addEventListener("input", (e) => {
        const value = param.data_type === "float" ? parseFloat(e.target.value) * floatMultiplier : parseInt(e.target.value);
        tempValues[param.sysex_adress] = value;
        valueInput.value = param.data_type === "float" ? Number((value / floatMultiplier).toFixed(2)) : value;
        console.log(`[GLOBAL] Sending sysex=${param.sysex_adress}, value=${value}, name=${param.name}`);
        controller.sendParameter(parseInt(param.sysex_adress), value);
        if (param.sysex_adress === 20) updateLEDBankColor();
      });

      valueInput.addEventListener("change", (e) => {
        let value = parseFloat(e.target.value) || 0;
        value = Math.max(param.min_value, Math.min(param.max_value, value));
        if (param.data_type === "float") value *= floatMultiplier;
        tempValues[param.sysex_adress] = value;
        input.value = param.data_type === "float" ? Number((value / floatMultiplier).toFixed(2)) : value;
        valueInput.value = param.data_type === "float" ? Number((value / floatMultiplier).toFixed(2)) : value;
        console.log(`[GLOBAL] Sending sysex=${param.sysex_adress}, value=${value}, name=${param.name}`);
        controller.sendParameter(parseInt(param.sysex_adress), value);
        if (param.sysex_adress === 20) updateLEDBankColor();
      });

      sliderContainer.appendChild(valueInput);
      sliderContainer.appendChild(input);
      container.appendChild(label);
      container.appendChild(sliderContainer);
    } else if (param.ui_type === "select") {
        input = document.createElement("select");
        input.id = `global-param-${param.sysex_adress}`;
        input.name = param.name;
        input.title = param.tooltip || param.name;
        const isWaveform = param.name.toLowerCase().includes("waveform");
        for (let i = param.min_value; i <= param.max_value; i++) {
          if (isWaveform && i > 11) continue;
          const option = document.createElement("option");
          option.value = String(i);
          option.textContent = isWaveform ? waveformMap[i] || i : param.name.toLowerCase().includes("octave") ? `Octave ${i}` : i;
          input.appendChild(option);
        }
        console.log(`Setting ${param.name} to value: ${currentValue}, type: ${typeof currentValue}`);
        input.value = String(currentValue);
        // Send sysex on initialization
        if (isWaveform) {
          const value = parseInt(currentValue);
          tempValues[param.sysex_adress] = value;
          currentValues[param.sysex_adress] = value;
          console.log(`[MODAL] Sending sysex=${param.sysex_adress}, value=${value}, name=${param.name}, waveform=${waveformMap[value]}`);
          controller.sendParameter(parseInt(param.sysex_adress), value);
        }
        input.addEventListener("change", (e) => {
          const value = parseInt(e.target.value);
          tempValues[param.sysex_adress] = value;
          currentValues[param.sysex_adress] = value;
          console.log(`[GLOBAL] Sending sysex=${param.sysex_adress}, value=${value}, name=${param.name}${isWaveform ? `, waveform=${waveformMap[value]}` : ''}`);
          controller.sendParameter(parseInt(param.sysex_adress), value);
          if (param.sysex_adress === 20) updateLEDBankColor();
        });
        container.appendChild(label);
        container.appendChild(input);
      }
      formBody.appendChild(container);
  });

  if (!form.querySelector(".settings-buttons")) {
    const buttonsContainer = document.createElement("div");
    buttonsContainer.className = "settings-buttons";
    const saveBtn = document.createElement("button");
    saveBtn.id = "global-save-btn";
    saveBtn.className = "save-btn";
    saveBtn.textContent = "Save";
    const cancelBtn = document.createElement("button");
    cancelBtn.id = "global-cancel-btn";
    cancelBtn.className = "cancel-btn";
    cancelBtn.textContent = "Cancel";
    buttonsContainer.appendChild(saveBtn);
    buttonsContainer.appendChild(cancelBtn);
    form.prepend(buttonsContainer);

    saveBtn.addEventListener("click", () => {
      saveSettings(currentBankNumber, "global_parameter");
      document.getElementById("settings-modal").style.display = "none";
      openParamGroup = null;
    });

    cancelBtn.addEventListener("click", () => {
      cancelSettings(currentBankNumber, "global_parameter");
      document.getElementById("settings-modal").style.display = "none";
      openParamGroup = null;
    });
  }
}

async function generateSettingsForm(paramGroup) {
  if (paramGroup === "global_parameter") return;
  if (paramGroup === "rhythm_button_parameters") {
    await checkbox_array();
    return;
  }
  const params = await loadParameters();
  const form = document.getElementById("settings-form");
  if (!form) {
    console.error("Settings form not found: #settings-form");
    return;
  }
  form.innerHTML = "";
  document.getElementById("settings-title").textContent = paramGroup.replace(/_/g, " ").toUpperCase();

  const groupParams = (params[paramGroup] || []).filter(param => param.group !== "hidden");
  if (groupParams.length === 0) {
    form.innerHTML = "<p>No parameters available for this group.</p>";
    return;
  }

  // Log parameters for debugging
  console.log(`[DEBUG] Parameters for ${paramGroup}:`, groupParams);

  const groupedParams = {};
  groupParams.forEach(param => {
    const groupName = param.group || "Other";
    if (!groupedParams[groupName]) groupedParams[groupName] = [];
    groupedParams[groupName].push(param);
  });

  Object.keys(groupedParams).forEach(groupName => {
    const column = document.createElement("div");
    column.className = "parameter-column";
    const header = document.createElement("h3");
    header.textContent = groupName;
    column.appendChild(header);

    groupedParams[groupName].forEach(param => {
      if (!param.ui_type || !["button", "switch ostensiblyswitch", "slider", "select"].includes(param.ui_type)) {
        console.warn(`Invalid ui_type for parameter: ${param.name || 'unnamed'} (sysex_adress: ${param.sysex_adress})`);
        return;
      }
      const container = document.createElement("div");
      container.className = "parameter-row";
      const label = document.createElement("label");
      label.textContent = param.name;
      label.setAttribute("for", `param-${param.sysex_adress}`);
      label.title = param.tooltip || param.name;
      let input;
      const floatMultiplier = param.data_type === "float" ? (controller.float_multiplier || 100.0) : 1;
      const currentValue = tempValues[param.sysex_adress] !== undefined 
        ? tempValues[param.sysex_adress] 
        : (param.data_type === "float" ? param.default_value * floatMultiplier : param.default_value);
      if (param.ui_type === "button" || param.ui_type === "switch") {
        input = document.createElement("input");
        input.type = "checkbox";
        input.id = `param-${param.sysex_adress}`;
        input.name = param.name;
        input.checked = currentValue === 1;
        input.title = param.tooltip || param.name;
        input.addEventListener("change", (e) => {
          const value = e.target.checked ? 1 : 0;
          tempValues[param.sysex_adress] = value;
          console.log(`[MODAL] Sending sysex=${param.sysex_adress}, value=${value}, name=${param.name}`);
          controller.sendParameter(parseInt(param.sysex_adress), value);
        });
      } else if (param.ui_type === "slider") {
        const sliderContainer = document.createElement("div");
        sliderContainer.className = "slider-container";
        input = document.createElement("input");
        input.type = "range";
        input.id = `param-${param.sysex_adress}`;
        input.name = param.name;
        input.className = "slider";
        input.min = param.min_value;
        input.max = param.max_value;
        input.value = Number((currentValue / floatMultiplier).toFixed(2));
        input.step = param.data_type === "float" ? 0.01 : 1;
        input.title = param.tooltip || param.name;
        const valueInput = document.createElement("input");
        valueInput.type = "number";
        valueInput.id = `value-${param.sysex_adress}`;
        valueInput.min = param.min_value;
        valueInput.max = param.max_value;
        valueInput.step = param.data_type === "float" ? 0.01 : 1;
        valueInput.value = param.data_type === "float" ? Number((currentValue / floatMultiplier).toFixed(2)) : currentValue;
        valueInput.title = param.tooltip || param.name;
        console.log(`[SLIDER] sysex=${param.sysex_adress}, name=${param.name}, currentValue=${currentValue}, floatMultiplier=${floatMultiplier}, input.value=${input.value}`);
        valueInput.className = "value-input";

        input.addEventListener("input", (e) => {
          const value = param.data_type === "float" ? parseFloat(e.target.value) * floatMultiplier : parseInt(e.target.value);
          tempValues[param.sysex_adress] = value;
          valueInput.value = param.data_type === "float" ? Number((value / floatMultiplier).toFixed(2)) : value;
          console.log(`[MODAL] Sending sysex=${param.sysex_adress}, value=${value}, name=${param.name}`);
          controller.sendParameter(parseInt(param.sysex_adress), value);
        });

        valueInput.addEventListener("change", (e) => {
          let value = parseFloat(e.target.value) || 0;
          value = Math.max(param.min_value, Math.min(param.max_value, value));
          if (param.data_type === "float") value *= floatMultiplier;
          tempValues[param.sysex_adress] = value;
          input.value = param.data_type === "float" ? Number((value / floatMultiplier).toFixed(2)) : value;
          valueInput.value = param.data_type === "float" ? Number((value / floatMultiplier).toFixed(2)) : value;
          console.log(`[MODAL] Sending sysex=${param.sysex_adress}, value=${value}, name=${param.name}`);
          controller.sendParameter(parseInt(param.sysex_adress), value);
        });

        sliderContainer.appendChild(input);
        sliderContainer.appendChild(valueInput);
        container.appendChild(label);
        container.appendChild(sliderContainer);
      } else if (param.ui_type === "select") {
        input = document.createElement("select");
        input.id = `param-${param.sysex_adress}`;
        input.name = param.name;
        input.title = param.tooltip || param.name;
        const isAlternateControl = [10, 12, 16].includes(param.sysex_adress);
        if (isAlternateControl) {
          for (let i = param.min_value; i <= param.max_value; i++) {
            if (sysexNameMap[i]) {
              const option = document.createElement("option");
              option.value = i;
              option.textContent = sysexNameMap[i];
              input.appendChild(option);
            }
          }
          input.value = String(currentValue);
          input.addEventListener("change", (e) => {
            const value = parseInt(e.target.value);
            tempValues[param.sysex_adress] = value;
            console.log(`[MODAL] Sending sysex=${param.sysex_adress}, value=${value}, name=${param.name}, display=${sysexNameMap[value] || value}`);
            controller.sendParameter(parseInt(param.sysex_adress), value);
          });
        } else {
          const isWaveform = param.name.toLowerCase().includes("waveform");
          for (let i = param.min_value; i <= param.max_value; i++) {
            if (isWaveform && i > 11) continue;
            const option = document.createElement("option");
            option.value = String(i);
            option.textContent = isWaveform ? waveformMap[i] || i : param.name.toLowerCase().includes("octave") ? `Octave ${i}` : i;
            input.appendChild(option);
          }
          console.log(`[SELECT] sysex=${param.sysex_adress}, name=${param.name}, currentValue=${currentValue}, input.value=${String(currentValue)}`);
          input.value = String(currentValue);
          console.log(`Selected option text: ${input.options[input.selectedIndex]?.textContent || 'None'}`);
          input.addEventListener("change", (e) => {
            const value = parseInt(e.target.value);
            tempValues[param.sysex_adress] = value;
            console.log(`[MODAL] Sending sysex=${param.sysex_adress}, value=${value}, name=${param.name}${isWaveform ? `, waveform=${waveformMap[value]}` : ''}`);
            controller.sendParameter(parseInt(param.sysex_adress), value);
          });
          // Send initial value
          controller.sendParameter(parseInt(param.sysex_adress), currentValue);
        }
        container.appendChild(label);
        if (input) container.appendChild(input);
      }
      column.appendChild(container);
    });
    form.appendChild(column);
  });
}
/**
 * Updates the UI elements based on the current state.
 * @param {number} bankIndex - The index of the currently loaded bank.
 */
async function updateUI(bankIndex) {
  await generateGlobalSettingsForm();
  updateLEDBankColor();
  updateBankIndicator();

  const modal = document.getElementById("settings-modal");
  const rhythmModal = document.getElementById("rhythm-modal");

  if (modal && modal.style.display === "block" && openParamGroup && openParamGroup !== "global_parameter") {
    tempValues = { ...currentValues };
    await generateSettingsForm(openParamGroup);
  }

  if (rhythmModal && rhythmModal.style.display === "block") {
    tempValues = { ...currentValues };
    await refreshRhythmGrid();
  }

  const bankSelect = document.getElementById('bank_number_selection');
  if (bankSelect) bankSelect.value = bankIndex;
}


async function loadBankSettings(bankIndex) {
      if (isLoadingPreset) {
        console.log(`loadBankSettings: Skipped, already loading preset ${currentBankNumber}`);
        return;
      }

      isLoadingPreset = true;
      console.log(`loadBankSettings: Loading bank ${bankIndex}`);
      currentBankNumber = bankIndex;
      currentValues = { ...defaultValues, ...(bankSettings[bankIndex] || {}) };

      // Initialize rhythm data
      for (let step = 0; step < 16; step++) {
        const sysexAddress = BASE_ADDRESS_RHYTHM + step;
        if (!(sysexAddress in currentValues)) {
          currentValues[sysexAddress] = 0;
          rhythmPattern[step] = 0;
        }
      }

      if (bankIndex !== controller.active_bank_number && controller.isConnected()) {
        controller.sendParameter(0, bankIndex);
        console.log(`loadBankSettings: Sent bank select sysex=0, value=${bankIndex}`);
      }

      await updateUI(bankIndex);

      isLoadingPreset = false;
      console.log(`loadBankSettings: Completed for bank ${bankIndex}, currentValues[220-235]=`, 
        Object.fromEntries(Object.entries(currentValues).filter(([k]) => k >= 220 && k <= 235)));
    }



async function processMidiQueue() {
  while (midiResponseQueue.length > 0) {
    const processedData = midiResponseQueue.shift();
    const bankNumber = processedData.bankNumber;
    console.log(`processMidiQueue: processing bank ${bankNumber}, active_bank_number=${controller.active_bank_number}, time=${new Date().toISOString()}`);
    if (!bankSettings[bankNumber]) {
      bankSettings[bankNumber] = {};
      processedData.parameters.forEach((value, index) => {
        if (value !== undefined) bankSettings[bankNumber][index] = value;
      });
    }
    if (bankNumber !== currentBankNumber && !isLoadingPreset && !isInitializing) {
      console.log(`processMidiQueue: triggering loadBankSettings for bank ${bankNumber}, currentBankNumber=${currentBankNumber}`);
      await loadBankSettings(bankNumber);
    } else {
      console.log(`processMidiQueue: skipped loadBankSettings: bankNumber=${bankNumber}, currentBankNumber=${currentBankNumber}, active_bank_number=${controller.active_bank_number}, isLoadingPreset=${isLoadingPreset}, isInitializing=${isInitializing}`);
    }
  }
}

async function init() {
  isInitializing = true;
  console.log('init: starting, time=', new Date().toISOString());

  // Show loading indicator (example - implement your own showNotification function)
  showNotification("Connecting...", "info");

  try {
    await initializeDefaultValues();
    controller.initialize();
    midiResponseQueue = [];
    console.log('init: cleared midiResponseQueue');

    await loadBankSettings(0); // Load bank 0 on initialization

    // The delayed check in DOMContentLoaded handles the connection status
    // No need to duplicate it here

  } catch (error) {
    console.error("Error during initialization:", error);
    showNotification("Initialization failed.  Check console for details.", "error");
  } finally {
    isInitializing = false;
    console.log('init: completed, time=', new Date().toISOString());
  }
}

function updateConnectionStatus(connected, message) {
  if (notificationTimeout) return;
  const statusElement = document.getElementById("connection-status");
  const body = document.body;
  if (connected) {
    statusElement.className = "connection-status connected";
    body.classList.remove("control_full");
    const bankText = currentBankNumber >= 0 ? ` | Bank ${currentBankNumber + 1}` : '';
    statusElement.textContent = `minichord connected${bankText}`;
    console.log(`updateConnectionStatus: connected, message=${message}`);
  } else {
    statusElement.className = "connection-status disconnected";
    body.classList.add("control_full");
    const elements = document.getElementsByClassName("active");
    while (elements.length > 0) {
      elements[0].classList.add("inactive");
      elements[0].classList.remove("active");
    }
    statusElement.textContent = "minichord disconnected";
    console.log(`updateConnectionStatus: disconnected, message=${message}`);
    window.scrollTo(0, 0);
  }
}

let modalEventListenersAdded = false; // Flag to prevent multiple event listeners

async function openModal(paramGroup) {
  console.log(`Opening modal for paramGroup=${paramGroup}`);
  openParamGroup = paramGroup;
  const modal = document.getElementById("settings-modal");
  if (!modal) {
    console.error("Settings modal element not found: #settings-modal");
    showNotification("Settings modal not found", "error");
    return;
  }

  originalPresetValues = { ...currentValues, ...(bankSettings[currentBankNumber] || {}) };
  tempValues = { ...originalPresetValues };
  console.log(`openModal: paramGroup=${paramGroup}, originalPresetValues=`, JSON.stringify(originalPresetValues));

  if (paramGroup === "global_parameter") {
    await generateGlobalSettingsForm();
    modal.style.display = "block";
    if (originalPresetValues["42"] !== undefined) {
      const value = parseInt(originalPresetValues["42"]);
      console.log(`[MODAL] Sending sysex=42, value=${value}, name=waveform, waveform=${waveformMap[value] || value}`);
      controller.sendParameter(42, value);
    }
    return;
  }

  if (paramGroup === "rhythm_button_parameters") {
    const rhythmModal = document.getElementById('rhythm-modal');
    if (!rhythmModal) {
      console.error("Rhythm modal element not found: #rhythm-modal");
      showNotification("Rhythm modal not found", "error");
      return;
    }
    if (!controller.isConnected()) {
      console.warn("Rhythm modal: device not connected");
      showNotification("Device not connected", "error");
      return;
    }
    await checkbox_array(); // This now includes sliders
    rhythmModal.style.display = 'block';
    return;
  }

  await generateSettingsForm(paramGroup);
  modal.style.display = "block";

  const saveBtn = document.getElementById("save-btn");
  const cancelBtn = document.getElementById("cancel-btn");

  if (!saveBtn || !cancelBtn) {
    console.error("Save or cancel button not found");
    showNotification("Modal buttons not found", "error");
    return;
  }

  // Add event listeners only once
  if (!modalEventListenersAdded) {
    saveBtn.addEventListener("click", () => {
      saveSettings(currentBankNumber, paramGroup);
      modal.style.display = "none";
      openParamGroup = null;
    });

    cancelBtn.addEventListener("click", () => {
      cancelSettings(currentBankNumber, paramGroup);
      modal.style.display = "none";
      openParamGroup = null;
    });
    modalEventListenersAdded = true;
  }
}

function saveSettings(presetId, paramGroup) {
  console.log(`saveSettings: before save, preset=${presetId}, tempValues=`, JSON.stringify(tempValues));
  currentValues = { ...tempValues };
  bankSettings[presetId] = { ...currentValues };
  
  setTimeout(() => {
    controller.saveCurrentSettings(presetId);
    tempValues = {};
    console.log(`saveSettings: after save, preset=${presetId}, currentValues=`, JSON.stringify(currentValues));
    
    if (paramGroup === "global_parameter") {
      generateGlobalSettingsForm();
    } else if (document.getElementById("settings-modal")?.style.display === "block") {
      generateSettingsForm(paramGroup);
    }

    const modal = document.getElementById("settings-modal");
    const rhythmModal = document.getElementById("rhythm-modal");
    if (modal) modal.style.display = "none";
    if (rhythmModal) rhythmModal.style.display = "none";
    openParamGroup = null;
    if (currentValues[20] !== undefined) updateLEDBankColor();
    showNotification(`Saved settings to bank ${presetId + 1}`, 'success');
  }, 100);
}

function cancelSettings(bankNumber, paramGroup) {
  console.log(`Cancel settings for bank ${bankNumber}, paramGroup: ${paramGroup}`);
  tempValues = { ...currentValues };
  if (paramGroup === "global_parameter") {
    generateGlobalSettingsForm();
    hideModal(paramGroup);
  } else if (paramGroup === "rhythm_button_parameters" || paramGroup === "rhythm_parameter") {
    // Only refresh grid if modal is open
    if (document.getElementById('rhythm-modal').style.display === 'block') {
      checkbox_array();
    }
    hideModal("rhythm_button_parameters");
  } else {
    generateSettingsForm(paramGroup);
    hideModal(paramGroup);
  }
}

function showModal(section) {
  const modalMap = {
    'rhythm_parameter': 'rhythm-modal',
    'global_parameter': 'global-settings-modal',
    'harp_parameter': 'harp-settings-modal',
    'chord_parameter': 'chord-settings-modal'
  };
  const modalId = modalMap[section];
  if (!modalId) return;

  const modal = document.getElementById(modalId);
  if (!modal) return;

  // Save current values as original preset
  const config = loadParameters();
  config.then((data) => {
    const parameters = data[section] || [];
    for (const param of parameters) {
      const address = param.sysex_adress;
      originalPresetValues[address] = currentValues[address] !== undefined 
        ? currentValues[address] 
        : param.default_value;
    }
  });

  modal.style.display = 'block';
  if (section === 'rhythm_button_parameters') {
    checkbox_array();
  } else {
    generateSettingsForm(section);
  }
}

function hideModal(section) {
  const modalMap = {
    'rhythm_button_parameters': 'rhythm-modal',
    'rhythm_parameter': 'rhythm-modal',
    'global_parameter': 'global-settings-modal',
    'harp_parameter': 'harp-settings-modal',
    'chord_parameter': 'chord-settings-modal'
  };
  const modalId = modalMap[section];
  if (!modalId) {
    console.error(`No modal mapped for section: ${section}`);
    return;
  }
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = 'none';
    openParamGroup = null;
    tempValues = {};
    console.log(`hideModal: Closed modal for section=${section}, modalId=${modalId}`);
  } else {
    console.error(`Modal element not found: #${modalId}`);
  }
}

async function refreshRhythmGrid() {
  for (let step = 0; step < 16; step++) {
    const sysexAddress = BASE_ADDRESS_RHYTHM + step; // e.g., 220 + step
    const patternValue = currentValues[sysexAddress] || 0;
    rhythmPattern[step] = patternValue;
    for (let voice = 0; voice < 7; voice++) {
      const checkbox = document.getElementById(`checkbox${voice}${step}`);
      if (!checkbox) {
        console.error(`refreshRhythmGrid: Checkbox not found: checkbox${voice}${step}`);
        continue;
      }
      const bit = (patternValue >> voice) & 1;
      checkbox.checked = !!bit;
    }
  }
  console.log('refreshRhythmGrid: Updated grid with currentValues[220-235]=', 
    Object.fromEntries(Object.entries(currentValues).filter(([k]) => k >= 220 && k <= 235)));
}

function updateBankIndicator() {
  const bankValue = document.getElementById('current-bank-value');
  if (bankValue) {
    bankValue.textContent = (currentBankNumber + 1).toString();
  }
}

function map_value(value, in_min, in_max, out_min, out_max) {
  return (value - in_min) * (out_max - out_min) / (in_max - in_min) + Number(out_min);
}

function reset_memory() {
  if (controller.isConnected()) {
    showNotification("Resetting all banks", "success");
    return controller.resetMemory();
  } else {
    showNotification("Device not connected", "error");
    document.getElementById("information_zone")?.focus();
    return false;
  }
}

function save_current_settings() {
  if (controller.isConnected()) {
    var e = document.getElementById("bank_number_selection");
    var bank_number = e ? parseInt(e.value) : currentBankNumber;
    console.log(`save_current_settings: bank=${bank_number}`);
    showNotification(`Saving to bank ${bank_number + 1}`, "success");
    return controller.saveCurrentSettings(bank_number);
  } else {
    showNotification("Device not connected", "error");
    document.getElementById("information_zone")?.focus();
    return false;
  }
}

function reset_current_bank() {
  if (controller.isConnected()) {
    const targetBank = parseInt(document.getElementById('bank_number_selection').value);
    console.log(`reset_current_bank: bank=${targetBank}`);
    showNotification(`Reset bank ${targetBank + 1}`, "success");
    return controller.resetCurrentBank();
  } else {
    showNotification("Device not connected", "error");
    document.getElementById("information_zone")?.focus();
    return false;
  }
}

  function addSvgTooltip(element, tooltipText) {
    const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
    title.textContent = tooltipText;
    element.appendChild(title);
  }

document.addEventListener('DOMContentLoaded', () => {
  const svgTooltips = {
    //"chord-button": index => `Open settings for Chord ${Math.floor(index / 7) + 1}-${(index % 7) + 1}`,
    "chord-button": "Open settings for chords",
    "sharp-button": "Toggle sharp/flat mode",
    "rhythm-button": "Open rhythm settings",
    "harp-plate": "Open harp settings",
    "chord-volume-pot": "Assign parameters to chord pot",
    "harp-volume-pot": "Assign parameters to harp pot",
    "mod-pot": "Assign parameters to mod pot",
    // "preset-up": "Select next preset",
    // "preset-down": "Select previous preset",
    "power_led": "Indicates power status"
  };

  function addSvgTooltip(element, tooltipText) {
    const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
    title.textContent = tooltipText;
    element.appendChild(title);
  }

  // Define onDataReceived here, inside the DOMContentLoaded event listener
  let lastUpdate = 0;
    const updateInterval = 50; // milliseconds

    controller.onDataReceived = async (processedData) => {
      const now = Date.now();
      if (now - lastUpdate > updateInterval) {
        lastUpdate = now;
        const { bankNumber, parameters, rhythmData } = processedData;
        console.log(`onDataReceived: Bank ${bankNumber}, rhythmData=`, rhythmData, 
          `parameters[220-235]=`, parameters.slice(220, 236));

        if (!bankSettings[bankNumber]) bankSettings[bankNumber] = {};

        // Update all parameters, including rhythm
        parameters.forEach((value, index) => {
          if (value !== undefined) {
            bankSettings[bankNumber][index] = value;
            currentValues[index] = value;
            if (index >= BASE_ADDRESS_RHYTHM && index < BASE_ADDRESS_RHYTHM + 16) {
              rhythmPattern[index - BASE_ADDRESS_RHYTHM] = value;
            }
          }
        });

        if (bankNumber !== currentBankNumber) {
          currentBankNumber = bankNumber;
          const bankSelect = document.getElementById('bank_number_selection');
          if (bankSelect) bankSelect.value = bankNumber;
        }

        await updateUI(bankNumber);
        updateConnectionStatus(true);

        const sharpButton = document.getElementById("sharp-button");
        if (sharpButton) {
          sharpButton.classList.toggle("active", currentValues[31] === 1);
        }
        console.log(`onDataReceived: UI updated for bank ${bankNumber}, currentValues[220-235]=`, 
          Object.fromEntries(Object.entries(currentValues).filter(([k]) => k >= 220 && k <= 235)));
      } else {
        console.log("onDataReceived: throttled");
      }
    };

  controller.onConnectionChange = function(connected, message) {
    console.log(`onConnectionChange: connected=${connected}, message=${message}, isConnected=${controller.isConnected()}`);
    updateConnectionStatus(connected, message);
  };

  setTimeout(() => {
    const isConnected = controller.isConnected();
    console.log(`Delayed check: minichord isConnected=${isConnected}`);
    updateConnectionStatus(isConnected, `delayed check: ${isConnected ? 'connected' : 'not connected'}`);
  }, 500);

  const modal = document.getElementById("settings-modal");
  window.addEventListener("click", (e) => {
    if (e.target === modal) {
      cancelSettings(currentBankNumber, openParamGroup || document.getElementById("settings-title").textContent.toLowerCase().replace(/ /g, "_"));
      modal.style.display = "none";
      tempValues = {};
      openParamGroup = null;
    } else if (e.target === document.getElementById("rhythm-modal")) {
      cancelSettings(currentBankNumber, "rhythm_button_parameters");
      document.getElementById("rhythm-modal").style.display = "none";
      tempValues = {};
      openParamGroup = null;
    }
  });

  // Chord buttons
  document.querySelectorAll(".chord-button").forEach((button, index) => {
    //addSvgTooltip(button, svgTooltips["chord-button"](index));
    addSvgTooltip(button, svgTooltips["chord-button"]);
    button.addEventListener("click", () => openModal("chord_parameter"));
  });

  // Harp plate
  const harpPlate = document.getElementById("harp-plate");
  if (harpPlate) {
    addSvgTooltip(harpPlate, svgTooltips["harp-plate"]);
    harpPlate.addEventListener("click", () => openModal("harp_parameter"));
  }

  // Pots
  const potMappings = {
    "chord-volume-pot": { paramGroup: "chord_potentiometer" },
    "harp-volume-pot": { paramGroup: "harp_potentiometer" },
    "mod-pot": { paramGroup: "modulation_potentiometer" }
  };
  document.querySelectorAll(".pot").forEach(pot => {
    addSvgTooltip(pot, svgTooltips[pot.id] || "Adjust parameter");
    pot.addEventListener("click", () => openModal(potMappings[pot.id].paramGroup));
  });

  // Sharp button
  const sharpButton = document.getElementById("sharp-button");
  if (sharpButton) {
    addSvgTooltip(sharpButton, svgTooltips["sharp-button"]);
    sharpButton.addEventListener("click", () => {
      if (!controller.isConnected()) {
        console.warn("Sharp button: device not connected");
        showNotification("Device not connected", "error");
        return;
      }
      const currentState = currentValues[31] || 0;
      const newState = currentState === 0 ? 1 : 0;
      if (controller.sendParameter(31, newState)) {
        currentValues[31] = newState;
        bankSettings[currentBankNumber] = { ...currentValues };
        sharpButton.classList.toggle("active", newState === 1);
        const toggleInput = document.getElementById("global-param-31");
        if (toggleInput) {
          toggleInput.checked = newState === 1;
          toggleInput.nextElementSibling.classList.toggle("checked", newState === 1);
          toggleInput.parentElement.style.display = 'none';
          toggleInput.parentElement.offsetHeight;
          toggleInput.parentElement.style.display = '';
          console.log(`Sharp button: synced toggle switch to state=${newState === 1 ? 'Flat' : 'Sharp'}`);
        }
        console.log(`Sharp button: sent sysex=31, value=${newState}, state=${newState === 1 ? 'Flat' : 'Sharp'}`);
        showNotification(`Switched to ${newState === 1 ? 'Flat' : 'Sharp'}`, 'success');
      } else {
        console.error("Sharp button: failed to send parameter");
        showNotification("Failed to switch Sharp/Flat", "error");
      }
    });
  }

  // Rhythm button
const rhythmButton = document.getElementById("rhythm-button");
if (rhythmButton) {
  addSvgTooltip(rhythmButton, "Open rhythm settings");
  rhythmButton.addEventListener("click", async () => {
    if (!controller.isConnected()) {
      console.warn("Rhythm button: device not connected");
      showNotification("Device not connected", "error");
      return;
    }
    openParamGroup = 'rhythm_button_parameters';
    originalPresetValues = { ...currentValues };
    tempValues = { ...originalPresetValues };
    await checkbox_array();
    document.getElementById("rhythm-modal").style.display = 'block';
  });
}

  // Preset buttons
  document.querySelectorAll(".preset-button").forEach(button => {
    addSvgTooltip(button, svgTooltips[button.id] || "Select preset");
    button.addEventListener("click", () => {
      console.log(`Preset ${button.id} clicked`);
    });
  });

  // Power LED
  const powerLed = document.getElementById("power_led");
  if (powerLed) {
    addSvgTooltip(powerLed, svgTooltips["power_led"]);
    // Add any existing LED event listeners if applicable
  }

  const bankSelect = document.getElementById('bank_number_selection');
  if (bankSelect) {
    bankSelect.value = currentBankNumber;
  }

  const saveToBankBtn = document.getElementById('save-to-bank-btn');
  if (saveToBankBtn) {
    saveToBankBtn.addEventListener('click', () => {
      const targetBank = parseInt(document.getElementById('bank_number_selection').value);
      console.log(`Saving to target bank ${targetBank + 1}`);
      save_current_settings(targetBank);
      loadBankSettings(targetBank);
      console.log(`Switched to bank ${targetBank + 1}`);
    });
  }

  const exportSettingsBtn = document.getElementById('export-settings-btn');
  if (exportSettingsBtn) {
    exportSettingsBtn.addEventListener('click', () => {
      if (controller.isConnected()) {
        var sysex_array = Array(controller.parameter_size || 199).fill(0);
        for (let address = 0; address < sysex_array.length; address++) {
          const value = currentValues[address] !== undefined ? currentValues[address] : defaultValues[address] || 0;
          if (parameters.global_parameter.some(param => param.sysex_adress == address) || 
              parameters.harp_parameter.some(param => param.sysex_adress == address) || 
              parameters.chord_parameter.some(param => param.sysex_adress == address) ||
              parameters.rhythm_button_parameters.some(param => param.sysex_adress == address)) {
            sysex_array[address] = value;
          }
        }
        let output_base64 = "";
        for (let i = 0; i < sysex_array.length - 1; i++) {
          output_base64 += sysex_array[i] + ";";
        }
        output_base64 += sysex_array[sysex_array.length - 1];
        const encoded = btoa(output_base64);
        console.log(encoded);
        navigator.clipboard.writeText(encoded);
        showNotification("Preset code copied to clipboard", "success");
        console.log(atob(encoded));
        document.getElementById("output_zone") && (document.getElementById("output_zone").innerHTML = `{${sysex_array.join(",")}},`);
      } else {
        showNotification("Device not connected", "error");
        document.getElementById("information_zone")?.focus();
      }
    });
  }

  const loadSettingsBtn = document.getElementById('load-settings-btn');
  if (loadSettingsBtn) {
    loadSettingsBtn.addEventListener('click', () => {
      if (controller.isConnected()) {
        let preset_code = prompt('Paste preset code');
        if (preset_code != null) {
          const parameters = decodePresetData(preset_code);
          if (parameters.length !== (controller.parameter_size || 199)) {
            showNotification("Malformed preset code", "error");
            return;
          }
          try {
            for (let i = 2; i < parameters.length; i++) {
              controller.sendParameter(i, parameters[i]);
            }
            controller.sendParameter(0, 0);
                        currentValues = { ...defaultValues, ...parameters.reduce((acc, val, idx) => ({ ...acc, [idx]: val }), {}) };
            bankSettings[currentBankNumber] = { ...currentValues };
            generateGlobalSettingsForm();
            updateLEDBankColor();
            showNotification("Preset loaded successfully", "success");
          } catch (error) {
            console.error('Error loading preset:', error);
            showNotification("Error loading preset", "error");
          }
        }
      } else {
        showNotification("Device not connected", "error");
        document.getElementById("information_zone")?.focus();
      }
    });
  }

  const resetBankBtn = document.getElementById('reset-bank-btn');
  if (resetBankBtn) {
    resetBankBtn.addEventListener('click', () => {
      const targetBank = parseInt(document.getElementById('bank_number_selection').value);
      reset_current_bank(targetBank);
      if (targetBank === currentBankNumber) {
        currentValues = { ...defaultValues };
        generateGlobalSettingsForm();
      }
      console.log(`Reset bank ${targetBank + 1}`);
    });
  }

  const resetAllBanksBtn = document.getElementById('reset-all-banks-btn');
  if (resetAllBanksBtn) {
    resetAllBanksBtn.addEventListener('click', () => {
      reset_memory();
      bankSettings = {};
      currentValues = { ...defaultValues };
      for (let i = 0; i < 12; i++) {
        bankSettings[i] = { ...defaultValues };
      }
      generateGlobalSettingsForm();
      console.log('Reset all banks');
    });
  }

  init();
});