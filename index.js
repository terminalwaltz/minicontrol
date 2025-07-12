// Global variables to store the state of the MIDI controller interface
var parameters = null; // Holds parameter definitions loaded from parameters.json
var currentValues = {}; // Current parameter values for the active bank (e.g., { "32": 54 } for led attenuation = 0.54)
var controller = new MiniChordController(); // Instance of MiniChordController to handle MIDI communication
var tempValues = {}; // Temporary values for parameters being edited before saving (e.g., { "32": 54 })
var bankSettings = {}; // Stores settings for each bank (e.g., bankSettings[1] = { "32": 54, ... })
let currentBankNumber = -1; // Tracks the currently active bank (0-11, or -1 if none)
let targetBank = -1; // Tracks the target bank selected in the dropdown
const bankNames = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l"]; // Names for banks 1-12
let defaultValues = {}; // Default parameter values from parameters.json
let originalPresetValues = {}; // Stores original values before editing in a modal
let isLoadingPreset = false; // Prevents multiple preset loads at once
let isInitializing = false; // Tracks if app is initializing
let midiResponseQueue = []; // Queue for processing MIDI responses from the device
let loadBankSettingsCount = 0; // Unused in current code (possibly for tracking load attempts)
let lastMidiProcessed = 0; // Unused in current code (possibly for throttling MIDI processing)
let openParamGroup = null; // Tracks which parameter group modal is open (e.g., "global_parameter")
let notificationTimeout = null; // Timer for clearing notification messages
let rhythmPattern = new Array(16).fill(0); // Stores rhythm data for 16 steps (sysex 220-235)
let lastUpdate = 0; // Tracks last UI update time for throttling
const updateInterval = 50; // Throttle UI updates to every 50ms

// Legacy global variables added for compatibility
let minichord_device = false; // Tracks device connection status (legacy)
let active_bank_number = -1; // Legacy tracking of active bank

const potSysexAddresses = [10,11,12,13,14,15,16,17]; // Waveform-related sysex from sysexNameMap

// Maps sysex addresses to human-readable parameter names for UI and logging
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
  34: "Chord Frame Shift",
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


// Legacy utility function to map values between ranges
function map_value(value, in_min, in_max, out_min, out_max) {
  return (value - in_min) * (out_max - out_min) / (in_max - in_min) + Number(out_min);
}

// Loads parameter definitions from parameters.json
let cachedParameters = null;
async function loadParameters() {
  if (cachedParameters) {
    console.log('[DEBUG] loadParameters: Using cached parameters', cachedParameters);
    return cachedParameters;
  }
  try {
    const response = await fetch('parameters.json');
    if (!response.ok) {
      console.error(`[loadParameters] Failed to fetch parameters.json: ${response.status} ${response.statusText}`);
      throw new Error(`HTTP error: ${response.status}`);
    }
    cachedParameters = await response.json();
    console.log('[DEBUG] loadParameters: Loaded params=', cachedParameters);
    ['global_parameter', 'chord_parameter', 'harp_parameter', 'rhythm_parameter'].forEach(group => {
      console.log(`[DEBUG] ${group}: ${cachedParameters[group]?.length || 0} parameters`, cachedParameters[group] || []);
    });
    return cachedParameters;
  } catch (error) {
    console.error('[loadParameters] Failed to load parameters:', error);
    showNotification("Failed to load parameters", "error");
    return {};
  }
}

// Sets up default values for all parameters from parameters.json
async function initializeDefaultValues() {
  const params = await loadParameters();
  defaultValues = {};
  Object.keys(params).forEach(group => {
    params[group].forEach(param => {
      const floatMultiplier = param.sysex_adress === 20 ? 1 : (param.data_type === "float" ? (controller.float_multiplier || 100.0) : 1);
      defaultValues[param.sysex_adress] = param.data_type === "float" || param.ui_type === "discrete_slider" 
        ? param.default_value * floatMultiplier
        : param.default_value;
    });
  });
  console.log('Default values initialized:', defaultValues);
}

// Updates the ambient backlight gradient based on bank color
function updateAmbientBacklight(color) {
  const backlight = document.getElementById("ambient-backlight");
  if (!backlight) {
    console.warn("Ambient backlight element not found");
    return;
  }
  backlight.style.background = `radial-gradient(circle at center, ${color} 0%, transparent 70%)`;
}

// Updates the power LED color based on bank color (sysex=20)
function updateLEDBankColor() {
  const bankColor = currentValues[20] !== undefined ? currentValues[20] : defaultValues[20] !== undefined ? defaultValues[20] : 120;
  const floatMultiplier = 1; // Bank color doesn’t scale
  const normalizedColor = bankColor / floatMultiplier;
  const colorIndex = Math.min(23, Math.floor(normalizedColor / 15)); // Map to 0-23 for color palette
  
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

// Displays a temporary notification
function showNotification(message, type = 'info') {
  const statusElement = document.getElementById("connection-status");
  if (!statusElement) {
    console.warn("Status element not found: #connection-status");
    return;
  }

  if (notificationTimeout) {
    clearTimeout(notificationTimeout);
    notificationTimeout = null;
  }

  statusElement.textContent = message;
  statusElement.className = `connection-status ${type === 'success' ? 'connected' : type === 'error' ? 'disconnected' : 'info'}`;

  notificationTimeout = setTimeout(() => {
    notificationTimeout = null;
    updateConnectionStatus(controller.isConnected(), 'notification timeout');
  }, 3000);
}

// Decodes a base64-encoded preset string into parameter values
function decodePresetData(encodedData) {
  try {
    const decodedString = atob(encodedData);
    const parameters = decodedString.split(';').map(param => {
      const num = parseInt(param);
      return isNaN(num) ? 0 : num;
    });
    return parameters;
  } catch (error) {
    console.error('Error decoding preset data:', error);
    showNotification('Invalid preset code', 'error');
    return new Array(controller.parameter_size || 199).fill(0);
  }
}

const BASE_ADDRESS_RHYTHM = 220;

// Creates the rhythm settings modal with a checkbox grid and sliders
async function checkbox_array() {
  const modal = document.getElementById('rhythm-modal');
  if (!modal) {
    console.error("Rhythm modal element not found: #rhythm-modal");
    showNotification("Rhythm modal not found", "error");
    return;
  }

  tempValues = { ...currentValues };

  modal.innerHTML = '';
  const modalContent = document.createElement('div');
  modalContent.className = 'modal-content';

  const closeButton = document.createElement('span');
  closeButton.className = 'close-button';
  closeButton.textContent = '×';
  closeButton.addEventListener('click', () => hideModal('rhythm_parameter'));
  modalContent.appendChild(closeButton);

  const title = document.createElement('h2');
  title.textContent = 'Rhythm Settings';
  modalContent.appendChild(title);

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
      checkbox.id = `rhythm-checkbox-${voice}-${step}`;
      checkbox.dataset.voice = voice;
      checkbox.dataset.step = step;
      checkbox.checked = (rhythmPattern[step] & (1 << voice)) !== 0;
      checkbox.addEventListener('change', () => sendRhythmData(step));
      cell.appendChild(checkbox);
      row.appendChild(cell);
    }
    gridContainer.appendChild(row);
  }
  modalContent.appendChild(gridContainer);

  const params = await loadParameters();
  const rhythmParams = (params.rhythm_parameter || []).filter(
    param => param.group !== "hidden" && !(param.sysex_adress >= 220 && param.sysex_adress <= 235)
  );
  console.log(`[checkbox_array] Loaded ${rhythmParams.length} rhythm parameters`, rhythmParams);

  if (rhythmParams.length > 0) {
    const controlsContainer = document.createElement('div');
    controlsContainer.className = 'parameter-column';
    const controlsHeader = document.createElement('h3');
    controlsHeader.textContent = 'Rhythm Parameters';
    controlsContainer.appendChild(controlsHeader);

    rhythmParams.forEach(param => {
      console.log(`[DEBUG] Rendering rhythm param: sysex=${param.sysex_adress}, name=${param.name}, ui_type=${param.ui_type}`);
      if (!["slider", "select", "discrete_slider"].includes(param.ui_type)) {
        console.warn(`Skipping parameter with unsupported ui_type: ${param.name} (sysex_adress: ${param.sysex_adress}, ui_type: ${param.ui_type})`);
        return;
      }

      const container = document.createElement('div');
      container.className = 'parameter-row';
      const label = document.createElement('label');
      label.textContent = param.name;
      label.setAttribute('for', `param-${param.sysex_adress}`);
      label.title = param.tooltip || param.name;

      const floatMultiplier = param.data_type === 'float' && param.ui_type !== 'discrete_slider' ? (controller.float_multiplier || 100.0) : 1;
      const currentValue = currentValues[param.sysex_adress] !== undefined
        ? currentValues[param.sysex_adress]
        : param.data_type === 'float' || param.ui_type === 'discrete_slider' ? param.default_value * floatMultiplier : param.default_value;
      const scaledValue = param.ui_type === 'discrete_slider' ? Math.round(currentValue) : 
                          param.data_type === "float" ? parseFloat((currentValue / floatMultiplier).toFixed(3)) : Math.round(currentValue);

      if (param.ui_type === 'slider' || param.ui_type === 'discrete_slider') {
        const sliderContainer = document.createElement('div');
        sliderContainer.className = 'slider-container';
        const input = document.createElement('input');
        input.type = 'range';
        input.id = `param-${param.sysex_adress}`;
        input.name = param.name;
        input.className = 'slider';
        input.min = param.min_value;
        input.max = param.max_value;
        input.value = scaledValue;
        input.step = param.ui_type === 'discrete_slider' ? (param.step || 1) : param.step || (param.data_type === 'float' ? 0.01 : 1);
        input.title = param.tooltip || param.name;

        const valueInput = document.createElement('input');
        valueInput.type = 'number';
        valueInput.id = `value-${param.sysex_adress}`;
        valueInput.min = param.min_value;
        valueInput.max = param.max_value;
        valueInput.step = param.ui_type === 'discrete_slider' ? (param.step || 1) : param.step || (param.data_type === 'float' ? 0.01 : 1);
        const step = param.step || (param.data_type === 'float' ? 0.01 : 1);
        const decimals = (step < 1 && step !== 0) ? Math.ceil(-Math.log10(step)) : 0;
        valueInput.value = Number(scaledValue).toFixed(decimals);
        valueInput.className = 'value-input';
        valueInput.title = param.tooltip || param.name;

        input.addEventListener("input", () => {
          let uiValue = param.ui_type === 'discrete_slider' ? parseInt(input.value) : parseFloat(input.value);
          if (isNaN(uiValue)) uiValue = param.min_value;
          uiValue = Math.max(param.min_value, Math.min(param.max_value, uiValue));
          
          const deviceValue = param.ui_type === 'discrete_slider' ? Math.round(uiValue) : 
                             param.data_type === "float" ? uiValue * floatMultiplier : Math.round(uiValue);
          
          const step = param.step || (param.data_type === 'float' ? 0.01 : 1);
          const decimals = (step < 1 && step !== 0) ? Math.ceil(-Math.log10(step)) : 0;
          const displayValue = param.ui_type === 'discrete_slider' ? deviceValue : uiValue.toFixed(decimals);
          
          console.log(`[SLIDER] Sysex=${param.sysex_adress}, uiValue=${uiValue}, deviceValue=${deviceValue}, floatMultiplier=${floatMultiplier}, step=${input.step}, displayValue=${displayValue}`);
          
          tempValues[param.sysex_adress] = deviceValue;
          valueInput.value = displayValue;
          input.value = displayValue;
          
          if (controller.isConnected()) {
            controller.sendParameter(parseInt(param.sysex_adress), deviceValue);
          }
          executeMethod(param.method, deviceValue);
        });

        valueInput.addEventListener("input", (e) => {
          let uiValue = param.ui_type === 'discrete_slider' ? parseInt(e.target.value) : parseFloat(e.target.value);
          if (isNaN(uiValue)) {
            uiValue = scaledValue;
            valueInput.value = param.ui_type === 'discrete_slider' ? Math.round(uiValue) : uiValue.toFixed(decimals);
            input.value = uiValue;
            console.log(`[NUMBER] Sysex=${param.sysex_adress}, invalid input, reverting to ${uiValue}`);
            return;
          }
          uiValue = Math.max(param.min_value, Math.min(param.max_value, uiValue));
          
          const deviceValue = param.ui_type === 'discrete_slider' ? Math.round(uiValue) : 
                             param.data_type === "float" ? uiValue * floatMultiplier : Math.round(uiValue);
          
          const step = param.step || (param.data_type === 'float' ? 0.01 : 1);
          const decimals = (step < 1 && step !== 0) ? Math.ceil(-Math.log10(step)) : 0;
          const displayValue = param.ui_type === 'discrete_slider' ? deviceValue : uiValue.toFixed(decimals);
          
          console.log(`[NUMBER] Sysex=${param.sysex_adress}, uiValue=${uiValue}, deviceValue=${deviceValue}, floatMultiplier=${floatMultiplier}, step=${valueInput.step}, displayValue=${displayValue}`);
          
          tempValues[param.sysex_adress] = deviceValue;
          input.value = displayValue;
          valueInput.value = displayValue;
          
          if (controller.isConnected()) {
            controller.sendParameter(parseInt(param.sysex_adress), deviceValue);
          }
          executeMethod(param.method, deviceValue);
        });

        sliderContainer.appendChild(input);
        sliderContainer.appendChild(valueInput);
        container.appendChild(label);
        container.appendChild(sliderContainer);
      } else if (param.ui_type === 'select') {
        const selectContainer = document.createElement('div');
        selectContainer.className = 'select-container';
        const input = document.createElement('select');
        input.id = `param-${param.sysex_adress}`;
        input.name = param.name;
        input.title = param.tooltip || param.name;

        const options = potSysexAddresses.includes(param.sysex_adress)
          ? Object.entries(sysexNameMap).map(([value, label]) => ({ value, label }))
          : param.options || [];
        console.log(`[DEBUG] Rhythm select options for sysex=${param.sysex_adress}:`, options);

        if (options.length === 0) {
          console.warn(`No options defined for rhythm select parameter ${param.name} (sysex=${param.sysex_adress})`);
          const opt = document.createElement('option');
          opt.value = '';
          opt.text = 'No options available';
          input.appendChild(opt);
        } else {
          options.forEach(option => {
            const opt = document.createElement('option');
            opt.value = option.value;
            opt.text = option.label;
            input.appendChild(opt);
          });
        }

        input.value = String(currentValue);

        input.addEventListener('change', (e) => {
          const value = param.data_type === 'float' && param.ui_type !== 'discrete_slider' ? 
                        parseFloat(e.target.value) * floatMultiplier : parseInt(e.target.value);
          tempValues[param.sysex_adress] = value;
          if (controller.isConnected()) {
            controller.sendParameter(parseInt(param.sysex_adress), value);
          }
          executeMethod(param.method, value);
        });

        selectContainer.appendChild(input);
        container.appendChild(label);
        container.appendChild(selectContainer);
      }

      controlsContainer.appendChild(container);
    });

    modalContent.appendChild(controlsContainer);
  }

  const buttonContainer = document.createElement('div');
  buttonContainer.className = 'modal-buttons';
  const saveButton = document.createElement('button');
  saveButton.className = 'save-btn';
  saveButton.id = 'save-rhythm-btn';
  saveButton.textContent = 'Save';
  saveButton.addEventListener('click', async () => {
    await saveSettings(currentBankNumber, 'rhythm_parameter');
  });
  const cancelButton = document.createElement('button');
  cancelButton.className = 'cancel-btn';
  cancelButton.id = 'cancel-rhythm-btn';
  cancelButton.textContent = 'Cancel';
  cancelButton.addEventListener('click', async () => {
    await cancelSettings(currentBankNumber, 'rhythm_parameter');
  });
  buttonContainer.appendChild(saveButton);
  buttonContainer.appendChild(cancelButton);
  modalContent.appendChild(buttonContainer);

  modal.appendChild(modalContent);
  modal.style.display = 'block';
  await refreshRhythmGrid();
}

// Legacy function to send rhythm data (renamed from send_array_data for clarity)
function sendRhythmData(step) {
  let output_value = 0;
  for (let voice = 0; voice < 7; voice++) {
    const checkbox = document.getElementById(`rhythm-checkbox-${voice}-${step}`);
    if (checkbox && checkbox.checked) {
      output_value |= 1 << voice;
    }
  }
  const sysexAddress = BASE_ADDRESS_RHYTHM + step;
  currentValues[sysexAddress] = output_value;
  tempValues[sysexAddress] = output_value;
  rhythmPattern[step] = output_value;
  console.log(`sendRhythmData: Step ${step + 1}, sysex=${sysexAddress}, value=${output_value}`);
  if (controller.isConnected()) {
    controller.sendParameter(sysexAddress, output_value);
  }
}

// Executes parameter-specific methods
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

// Logs rhythm pattern updates
function updateRhythm() {
  console.log('Rhythm updated:', rhythmPattern);
}

// Creates the global settings form
async function generateGlobalSettingsForm() {
  const globalSettings = document.getElementById("global-settings");
  const settingsForm = document.getElementById("global-settings-form");
  if (!globalSettings || !settingsForm) {
    console.error("Global settings elements not found: #global-settings or #global-settings-form");
    showNotification("Global settings form not found", "error");
    return;
  }
  const params = await loadParameters();
  const globalParams = params.global_parameter || [];
  console.log(`[generateGlobalSettingsForm] Loaded ${globalParams.length} global parameters`, globalParams);

  if (globalParams.length === 0) {
    console.warn("No global parameters found");
    settingsForm.innerHTML = "<p>No global parameters available.</p>";
    return;
  }

  settingsForm.innerHTML = "";
  tempValues = { ...currentValues };

  globalParams.forEach((param) => {
    console.log(`[DEBUG] Rendering global param: sysex=${param.sysex_adress}, name=${param.name}, ui_type=${param.ui_type}, data_type=${param.data_type}, default_value=${param.default_value}, step=${param.step || 'N/A'}`);

    const floatMultiplier = param.ui_type === 'discrete_slider' ? 1 : 
                           param.data_type === "float" ? (controller.float_multiplier || 100.0) : 1;
    
    const currentValue = currentValues[param.sysex_adress] !== undefined
      ? currentValues[param.sysex_adress]
      : param.data_type === "float" || param.ui_type === "discrete_slider" ? param.default_value * floatMultiplier : param.default_value;
    
    const scaledValue = param.ui_type === 'discrete_slider' ? Math.round(currentValue) : 
                        param.data_type === "float" ? parseFloat((currentValue / floatMultiplier).toFixed(3)) : Math.round(currentValue);

    const row = document.createElement("div");
    row.className = "parameter-row";
    const label = document.createElement("label");
    label.textContent = param.name;
    label.setAttribute("for", `param-${param.sysex_adress}`);
    label.title = param.description || param.tooltip || param.name;

    if (param.ui_type === "slider" || param.ui_type === "discrete_slider") {
      const sliderContainer = document.createElement("div");
      sliderContainer.className = "slider-container";
      const input = document.createElement("input");
      input.type = "range";
      input.className = "slider";
      input.id = `param-${param.sysex_adress}`;
      input.min = param.min_value;
      input.max = param.max_value;
      input.step = param.ui_type === 'discrete_slider' ? (param.step || 1) : param.step || (param.data_type === 'float' ? 0.01 : 1);
      input.value = scaledValue;
      input.title = param.tooltip || param.name;

      const valueInput = document.createElement("input");
      valueInput.type = "number";
      valueInput.className = "value-input";
      valueInput.id = `value-${param.sysex_adress}`;
      valueInput.min = param.min_value;
      valueInput.max = param.max_value;
      valueInput.step = param.ui_type === 'discrete_slider' ? (param.step || 1) : param.step || (param.data_type === 'float' ? 0.01 : 1);
      const step = param.step || (param.data_type === 'float' ? 0.01 : 1);
      const decimals = (step < 1 && step !== 0) ? Math.ceil(-Math.log10(step)) : 0;
      valueInput.value = Number(scaledValue).toFixed(decimals);
      if (param.ui_type === 'discrete_slider') {
        valueInput.pattern = "\\d*";
      }

      input.addEventListener("input", () => {
        let uiValue = param.ui_type === 'discrete_slider' ? parseInt(input.value) : parseFloat(input.value);
        if (isNaN(uiValue)) uiValue = param.min_value;
        uiValue = Math.max(param.min_value, Math.min(param.max_value, uiValue));
        
        const deviceValue = param.ui_type === 'discrete_slider' ? Math.round(uiValue) : 
                           param.data_type === "float" ? uiValue * floatMultiplier : Math.round(uiValue);
        
        const step = param.step || (param.data_type === 'float' ? 0.01 : 1);
        const decimals = (step < 1 && step !== 0) ? Math.ceil(-Math.log10(step)) : 0;
        const displayValue = param.ui_type === 'discrete_slider' ? deviceValue : uiValue.toFixed(decimals);
        
        console.log(`[SLIDER] Sysex=${param.sysex_adress}, uiValue=${uiValue}, deviceValue=${deviceValue}, floatMultiplier=${floatMultiplier}, step=${input.step}, displayValue=${displayValue}`);
        
        tempValues[param.sysex_adress] = deviceValue;
        valueInput.value = displayValue;
        input.value = displayValue;
        
        if (controller.isConnected()) {
          controller.sendParameter(parseInt(param.sysex_adress), deviceValue);
        }
        if (param.method) {
          executeMethod(param.method, deviceValue);
        }
        if (param.sysex_adress === 20) {
          updateLEDBankColor();
        }
      });

      valueInput.addEventListener("input", (e) => {
        let uiValue = param.ui_type === 'discrete_slider' ? parseInt(e.target.value) : parseFloat(e.target.value);
        if (isNaN(uiValue)) {
          uiValue = scaledValue;
          valueInput.value = param.ui_type === 'discrete_slider' ? Math.round(uiValue) : uiValue.toFixed(decimals);
          input.value = uiValue;
          console.log(`[NUMBER] Sysex=${param.sysex_adress}, invalid input, reverting to ${uiValue}`);
          return;
        }
        uiValue = Math.max(param.min_value, Math.min(param.max_value, uiValue));
        
        const deviceValue = param.ui_type === 'discrete_slider' ? Math.round(uiValue) : 
                           param.data_type === "float" ? uiValue * floatMultiplier : Math.round(uiValue);
        
        const step = param.step || (param.data_type === 'float' ? 0.01 : 1);
        const decimals = (step < 1 && step !== 0) ? Math.ceil(-Math.log10(step)) : 0;
        const displayValue = param.ui_type === 'discrete_slider' ? deviceValue : uiValue.toFixed(decimals);
        
        console.log(`[NUMBER] Sysex=${param.sysex_adress}, uiValue=${uiValue}, deviceValue=${deviceValue}, floatMultiplier=${floatMultiplier}, step=${valueInput.step}, displayValue=${displayValue}`);
        
        tempValues[param.sysex_adress] = deviceValue;
        input.value = displayValue;
        valueInput.value = displayValue;
        
        if (controller.isConnected()) {
          controller.sendParameter(parseInt(param.sysex_adress), deviceValue);
        }
        if (param.method) {
          executeMethod(param.method, deviceValue);
        }
        if (param.sysex_adress === 20) {
          updateLEDBankColor();
        }
      });

      sliderContainer.appendChild(input);
      sliderContainer.appendChild(valueInput);
      row.appendChild(label);
      row.appendChild(sliderContainer);
    } else if (param.ui_type === "select") {
      const selectContainer = document.createElement("div");
      selectContainer.className = "select-container";
      const input = document.createElement("select");
      input.id = `param-${param.sysex_adress}`;
      input.name = param.name;
      input.title = param.tooltip || param.name;

      const options = potSysexAddresses.includes(param.sysex_adress)
        ? Object.entries(sysexNameMap).map(([value, label]) => ({ value, label }))
        : param.options || [];

      if (options.length === 0) {
        console.warn(`No options defined for select parameter ${param.name} (sysex=${param.sysex_adress})`);
        const opt = document.createElement("option");
        opt.value = "";
        opt.text = "No options available";
        input.appendChild(opt);
      } else {
        options.forEach(option => {
          const opt = document.createElement("option");
          opt.value = option.value;
          opt.text = option.label;
          input.appendChild(opt);
        });
      }

      input.value = String(currentValue);

      input.addEventListener("change", (e) => {
        const newValue = param.data_type === "float" && param.ui_type !== 'discrete_slider' ? 
                        parseFloat(e.target.value) * floatMultiplier : parseInt(e.target.value);
        tempValues[param.sysex_adress] = newValue;
        if (controller.isConnected()) {
          console.log(`[SELECT] Sysex=${param.sysex_adress}, value=${newValue}`);
          controller.sendParameter(parseInt(param.sysex_adress), newValue);
        }
        if (param.method) {
          executeMethod(param.method, newValue);
        }
      });

      selectContainer.appendChild(input);
      row.appendChild(label);
      row.appendChild(selectContainer);
    } else if (param.ui_type === "switch") {
      const switchContainer = document.createElement("div");
      switchContainer.className = "switch-container";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.id = `param-${param.sysex_adress}`;
      input.checked = currentValue === 1;
      input.addEventListener("change", (e) => {
        const newValue = e.target.checked ? 1 : 0;
        tempValues[param.sysex_adress] = newValue;
        if (controller.isConnected()) {
          console.log(`[SWITCH] Sysex=${param.sysex_adress}, value=${newValue}`);
          controller.sendParameter(parseInt(param.sysex_adress), newValue);
        }
        if (param.method) {
          executeMethod(param.method, newValue);
        }
      });
      switchContainer.appendChild(input);
      row.appendChild(label);
      row.appendChild(switchContainer);
    } else {
      console.warn(`Unsupported ui_type for param ${param.name}: ${param.ui_type}`);
    }

    settingsForm.appendChild(row);
  });

  const saveBtn = document.getElementById("save-global-btn");
  const cancelBtn = document.getElementById("cancel-global-btn");

  if (!saveBtn || !cancelBtn) {
    console.error("Global settings buttons not found: #save-global-btn or #cancel-global-btn");
    showNotification("Global settings buttons not found", "error");
    return;
  }

  saveBtn.onclick = async () => {
    console.log(`[DEBUG] Save global button clicked, bankNumber=${currentBankNumber}, paramGroup=global_parameter`);
    await saveSettings(currentBankNumber, "global_parameter");
  };

  cancelBtn.onclick = async () => {
    console.log("[DEBUG] Cancel global button clicked");
    await cancelSettings(currentBankNumber, "global_parameter");
  };

  globalSettings.style.display = "block";
}

// Creates modals for chord, harp, or potentiometer parameters
async function generateSettingsForm(paramGroup) {
  if (paramGroup === "global_parameter") {
    await generateGlobalSettingsForm();
    return;
  }
  if (paramGroup === "rhythm_parameter") {
    await checkbox_array();
    return;
  }
  const params = await loadParameters();
  const form = document.getElementById("settings-form");
  if (!form) {
    console.error("Settings form not found: #settings-form");
    showNotification("Settings form not found", "error");
    return;
  }
  form.innerHTML = "";
  document.getElementById("settings-title").textContent = paramGroup.replace(/_/g, " ").toUpperCase();

  const groupParams = (params[paramGroup] || []).filter(param => param.group !== "hidden");
  console.log(`[generateSettingsForm] Rendering ${groupParams.length} parameters for ${paramGroup}:`, groupParams.map(p => ({ sysex: p.sysex_adress, name: p.name, ui_type: p.ui_type })));

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
      console.log(`[DEBUG] Rendering param: sysex=${param.sysex_adress}, name=${param.name}, ui_type=${param.ui_type}, data_type=${param.data_type}, step=${param.step || 'N/A'}`);
      const container = document.createElement("div");
      container.className = "parameter-row";
      const label = document.createElement("label");
      label.textContent = param.name;
      label.setAttribute("for", `param-${param.sysex_adress}`);
      label.title = param.tooltip || param.name;

      const floatMultiplier = param.ui_type === 'discrete_slider' ? 1 : 
                             param.data_type === "float" ? (controller.float_multiplier || 100.0) : 1;
      const currentValue = tempValues[param.sysex_adress] !== undefined
        ? tempValues[param.sysex_adress]
        : currentValues[param.sysex_adress] !== undefined
          ? currentValues[param.sysex_adress]
          : param.data_type === "float" || param.ui_type === "discrete_slider" ? param.default_value * floatMultiplier : param.default_value;
      const scaledValue = param.ui_type === 'discrete_slider' ? Math.round(currentValue) : 
                          param.data_type === "float" ? parseFloat((currentValue / floatMultiplier).toFixed(3)) : Math.round(currentValue);

      if (param.ui_type === "slider" || param.ui_type === "discrete_slider") {
        const sliderContainer = document.createElement("div");
        sliderContainer.className = "slider-container";
        const input = document.createElement("input");
        input.type = "range";
        input.className = "slider";
        input.id = `param-${param.sysex_adress}`;
        input.min = param.min_value;
        input.max = param.max_value;
        input.step = param.ui_type === 'discrete_slider' ? (param.step || 1) : param.step || (param.data_type === 'float' ? 0.01 : 1);
        input.value = scaledValue;
        input.title = param.tooltip || param.name;

        const valueInput = document.createElement("input");
        valueInput.type = "number";
        valueInput.className = "value-input";
        valueInput.id = `value-${param.sysex_adress}`;
        valueInput.min = param.min_value;
        valueInput.max = param.max_value;
        valueInput.step = param.ui_type === 'discrete_slider' ? (param.step || 1) : param.step || (param.data_type === 'float' ? 0.01 : 1);
        const step = param.step || (param.data_type === 'float' ? 0.01 : 1);
        const decimals = (step < 1 && step !== 0) ? Math.ceil(-Math.log10(step)) : 0;
        valueInput.value = Number(scaledValue).toFixed(decimals);

        input.addEventListener("input", () => {
          let uiValue = param.ui_type === 'discrete_slider' ? parseInt(input.value) : parseFloat(input.value);
          if (isNaN(uiValue)) uiValue = param.min_value;
          uiValue = Math.max(param.min_value, Math.min(param.max_value, uiValue));
          
          const deviceValue = param.ui_type === 'discrete_slider' ? Math.round(uiValue) : 
                             param.data_type === "float" ? uiValue * floatMultiplier : Math.round(uiValue);
          
          const step = param.step || (param.data_type === 'float' ? 0.01 : 1);
          const decimals = (step < 1 && step !== 0) ? Math.ceil(-Math.log10(step)) : 0;
          const displayValue = param.ui_type === 'discrete_slider' ? deviceValue : uiValue.toFixed(decimals);
          
          console.log(`[SLIDER] Sysex=${param.sysex_adress}, uiValue=${uiValue}, deviceValue=${deviceValue}, floatMultiplier=${floatMultiplier}, step=${input.step}, displayValue=${displayValue}`);
          
          tempValues[param.sysex_adress] = deviceValue;
          valueInput.value = displayValue;
          input.value = displayValue;
          
          if (controller.isConnected()) {
            controller.sendParameter(parseInt(param.sysex_adress), deviceValue);
          }
          if (param.method) {
            executeMethod(param.method, deviceValue);
          }
        });

        valueInput.addEventListener("input", (e) => {
          let uiValue = param.ui_type === 'discrete_slider' ? parseInt(e.target.value) : parseFloat(e.target.value);
          if (isNaN(uiValue)) {
            uiValue = scaledValue;
            valueInput.value = param.ui_type === 'discrete_slider' ? Math.round(uiValue) : uiValue.toFixed(decimals);
            input.value = uiValue;
            console.log(`[NUMBER] Sysex=${param.sysex_adress}, invalid input, reverting to ${uiValue}`);
            return;
          }
          uiValue = Math.max(param.min_value, Math.min(param.max_value, uiValue));
          
          const deviceValue = param.ui_type === 'discrete_slider' ? Math.round(uiValue) : 
                             param.data_type === "float" ? uiValue * floatMultiplier : Math.round(uiValue);
          
          const step = param.step || (param.data_type === 'float' ? 0.01 : 1);
          const decimals = (step < 1 && step !== 0) ? Math.ceil(-Math.log10(step)) : 0;
          const displayValue = param.ui_type === 'discrete_slider' ? deviceValue : uiValue.toFixed(decimals);
          
          console.log(`[NUMBER] Sysex=${param.sysex_adress}, uiValue=${uiValue}, deviceValue=${deviceValue}, floatMultiplier=${floatMultiplier}, step=${valueInput.step}, displayValue=${displayValue}`);
          
          tempValues[param.sysex_adress] = deviceValue;
          input.value = displayValue;
          valueInput.value = displayValue;
          
          if (controller.isConnected()) {
            controller.sendParameter(parseInt(param.sysex_adress), deviceValue);
          }
          if (param.method) {
            executeMethod(param.method, deviceValue);
          }
        });

        sliderContainer.appendChild(input);
        sliderContainer.appendChild(valueInput);
        container.appendChild(label);
        container.appendChild(sliderContainer);
      } else if (param.ui_type === "select") {
        const selectContainer = document.createElement("div");
        selectContainer.className = "select-container";
        const input = document.createElement("select");
        input.id = `param-${param.sysex_adress}`;
        input.name = param.name;
        input.title = param.tooltip || param.name;

        const options = potSysexAddresses.includes(param.sysex_adress)
          ? Object.entries(sysexNameMap).map(([value, label]) => ({ value, label }))
          : param.options || [];
        
        if (options.length === 0) {
          console.warn(`No options defined for select parameter ${param.name} (sysex=${param.sysex_adress})`);
          const opt = document.createElement("option");
          opt.value = "";
          opt.text = "No options available";
          input.appendChild(opt);
        } else {
          options.forEach(option => {
            const opt = document.createElement("option");
            opt.value = option.value;
            opt.text = option.label;
            input.appendChild(opt);
          });
        }

        input.value = String(currentValue);

        input.addEventListener("change", (e) => {
          const newValue = param.data_type === "float" && param.ui_type !== 'discrete_slider' ? 
                          parseFloat(e.target.value) * floatMultiplier : parseInt(e.target.value);
          tempValues[param.sysex_adress] = newValue;
          if (controller.isConnected()) {
            console.log(`[SELECT] Sysex=${param.sysex_adress}, value=${newValue}`);
            controller.sendParameter(parseInt(param.sysex_adress), newValue);
          }
          if (param.method) {
            executeMethod(param.method, newValue);
          }
        });

        selectContainer.appendChild(input);
        container.appendChild(label);
        container.appendChild(selectContainer);
      } else if (param.ui_type === "switch") {
        const switchContainer = document.createElement("div");
        switchContainer.className = "switch-container";
        const input = document.createElement("input");
        input.type = "checkbox";
        input.id = `param-${param.sysex_adress}`;
        input.checked = currentValue === 1;
        input.addEventListener("change", (e) => {
          const newValue = e.target.checked ? 1 : 0;
          tempValues[param.sysex_adress] = newValue;
          if (controller.isConnected()) {
            console.log(`[SWITCH] Sysex=${param.sysex_adress}, value=${newValue}`);
            controller.sendParameter(parseInt(param.sysex_adress), newValue);
          }
          if (param.method) {
            executeMethod(param.method, newValue);
          }
        });
        switchContainer.appendChild(input);
        container.appendChild(label);
        container.appendChild(switchContainer);
      } else {
        console.warn(`[DEBUG] Unsupported ui_type for param ${param.name}: ${param.ui_type}, sysex=${param.sysex_adress}`);
      }

      column.appendChild(container);
    });
    form.appendChild(column);
  });

  const saveBtn = document.getElementById("save-settings-btn");
  const cancelBtn = document.getElementById("cancel-settings-btn");

  if (!saveBtn || !cancelBtn) {
    console.error("Save or cancel button not found");
    showNotification("Modal buttons not found", "error");
    return;
  }

  saveBtn.onclick = async () => {
    console.log(`[DEBUG] Save button clicked for paramGroup=${paramGroup}, bankNumber=${currentBankNumber}`);
    await saveSettings(currentBankNumber, paramGroup);
  };

  cancelBtn.onclick = async () => {
    console.log(`[DEBUG] Cancel button clicked for paramGroup=${paramGroup}`);
    await cancelSettings(currentBankNumber, paramGroup);
  };

  const modal = document.getElementById("settings-modal");
  if (modal) {
    modal.style.display = "block";
  }
}

// Updates the entire UI for a given bank
async function updateUI(bankNumber) {
  console.log(`updateUI: Updating UI for bank ${bankNumber + 1}, targetBank=${targetBank + 1}`);
  try {
    currentBankNumber = bankNumber;
    active_bank_number = bankNumber;
    
    // Only update bankSelect if it doesn't match targetBank
    const bankSelect = document.getElementById("bank_number_selection");
    if (bankSelect && parseInt(bankSelect.value) !== targetBank) {
      bankSelect.value = targetBank;
      console.log(`[DEBUG] updateUI: Set bankSelect.value to targetBank=${targetBank}`);
    } else {
      console.log(`[DEBUG] updateUI: bankSelect.value already matches targetBank=${targetBank}`);
    }

    updateBankIndicator();

    if (currentValues[20] !== undefined) {
      updateLEDBankColor();
    }

    await generateGlobalSettingsForm();

    const modal = document.getElementById("settings-modal");
    if (modal && modal.style.display === "block" && openParamGroup && openParamGroup !== "global_parameter" && openParamGroup !== "rhythm_parameter") {
      console.log(`[DEBUG] updateUI: Re-rendering modal for ${openParamGroup}`);
      await generateSettingsForm(openParamGroup);
    }

    const rhythmModal = document.getElementById("rhythm-modal");
    if (rhythmModal && rhythmModal.style.display === "block") {
      await checkbox_array();
    }
  } catch (error) {
    console.error(`updateUI: Error updating UI for bank ${bankNumber}`, error);
    showNotification("Error updating UI", "error");
  }
}

// Loads settings for a specific bank
async function loadBankSettings(bankNumber) {
  try {
    console.log(`loadBankSettings: bankNumber=${bankNumber + 1}, targetBank=${targetBank + 1}`);
    
    if (bankNumber < 0 || bankNumber > 11) {
      console.warn(`Invalid bank number ${bankNumber}, defaulting to 0`);
      bankNumber = 0;
    }

    // Clear tempValues for harp_potentiometer parameters to ensure modal uses currentValues
    if (openParamGroup === "harp_potentiometer") {
      const params = await loadParameters();
      const harpPotParams = (params.harp_potentiometer || []).map(p => p.sysex_adress);
      harpPotParams.forEach(sysex => delete tempValues[sysex]);
      console.log(`[loadBankSettings] Cleared tempValues for harp_potentiometer:`, tempValues);
    }

    currentBankNumber = bankNumber;
    active_bank_number = bankNumber;
    targetBank = bankNumber;

    if (!bankSettings[bankNumber]) {
      bankSettings[bankNumber] = { ...defaultValues };
    }

    currentValues = { ...defaultValues, ...bankSettings[bankNumber] };

    if (!controller.isConnected()) {
      minichord_device = false;
      await updateUI(bankNumber);
      showNotification(`Bank ${bankNumber + 1} loaded (device not connected)`, "warning");
      return;
    }

    minichord_device = true;

    controller.sendSysEx([0, 0, 0, 0]);

    const maxWaitTime = 5000;
    const startTime = Date.now();
    await new Promise((resolve, reject) => {
      const checkResponse = setInterval(async () => {
        if (!controller.pendingSave || Date.now() - startTime > maxWaitTime) {
          clearInterval(checkResponse);
          if (Date.now() - startTime > maxWaitTime) {
            console.warn(`loadBankSettings: Timeout waiting for device response for bank ${bankNumber + 1}`);
            showNotification(`Timeout loading bank ${bankNumber + 1}`, "error");
            reject(new Error("Timeout waiting for device response"));
            return;
          }
          bankSettings[bankNumber] = { ...currentValues };
          await updateUI(bankNumber);
          showNotification(`Bank ${bankNumber + 1} loaded`, "success");
          resolve();
        }
      }, 100);
    });
  } catch (error) {
    console.error(`loadBankSettings: Error loading bank ${bankNumber}`, error);
    showNotification(`Error loading bank ${bankNumber + 1}`, "error");
  }
}

// Processes queued MIDI responses from the device
async function processMidiQueue() {
  while (midiResponseQueue.length > 0) {
    const processedData = midiResponseQueue.shift();
    const bankNumber = processedData.bankNumber;
    if (!bankSettings[bankNumber]) {
      bankSettings[bankNumber] = {};
      processedData.parameters.forEach((value, index) => {
        if (value !== undefined) bankSettings[bankNumber][index] = value;
      });
    }
    if (bankNumber !== currentBankNumber && !isLoadingPreset && !isInitializing) {
      await loadBankSettings(bankNumber);
    }
  }
}

// Initializes the entire application
async function init() {
  isInitializing = true;
  showNotification("Connecting...", "info");
  try {
    if (!parameters) {
      parameters = await loadParameters();
    }
    await initializeDefaultValues();
    
    const isInitialized = await controller.initialize();
    minichord_device = controller.isConnected();
    
    if (!isInitialized || !controller.isConnected()) {
      showNotification("Failed to connect to MiniChord device", "error");
      currentBankNumber = 0;
      active_bank_number = 0;
      targetBank = 0;
      bankSettings[0] = bankSettings[0] || { ...defaultValues };
      currentValues = { ...defaultValues, ...bankSettings[0] };
      const bankSelect = document.getElementById("bank_number_selection");
      if (bankSelect) {
        bankSelect.value = 0;
        console.log(`[init] Set bankSelect.value and targetBank to 0 at start`);
      }
      await updateUI(0);
    } else {
      midiResponseQueue = [];
      const activeBankNumber = await new Promise((resolve) => {
        const checkBank = setInterval(() => {
          if (controller.active_bank_number !== undefined && controller.active_bank_number >= 0 && controller.active_bank_number <= 11) {
            clearInterval(checkBank);
            resolve(controller.active_bank_number);
          } else if (midiResponseQueue.length > 0) {
            const queuedData = midiResponseQueue[0];
            if (queuedData.bankNumber >= 0 && queuedData.bankNumber <= 11) {
              clearInterval(checkBank);
              controller.active_bank_number = queuedData.bankNumber;
              resolve(queuedData.bankNumber);
            }
          }
        }, 100);
        setTimeout(() => {
          clearInterval(checkBank);
          console.warn(`[init] Timeout waiting for active_bank_number, defaulting to 0`);
          resolve(0);
        }, 6000);
      });
      currentBankNumber = activeBankNumber;
      active_bank_number = activeBankNumber;
      targetBank = activeBankNumber;
      const bankSelect = document.getElementById("bank_number_selection");
      if (bankSelect) {
        bankSelect.value = activeBankNumber;
        console.log(`[init] Set bankSelect.value and targetBank to ${activeBankNumber}`);
      }
      await processMidiQueue(); // Process queued data before UI update
      await loadBankSettings(activeBankNumber);
    }
  } catch (error) {
    console.error("Error during initialization:", error);
    showNotification("Initialization failed.", "error");
    currentBankNumber = 0;
    active_bank_number = 0;
    targetBank = 0;
    bankSettings[0] = bankSettings[0] || { ...defaultValues };
    currentValues = { ...defaultValues, ...bankSettings[0] };
    const bankSelect = document.getElementById("bank_number_selection");
    if (bankSelect) {
      bankSelect.value = 0;
      console.log(`[init] Set bankSelect.value and targetBank to 0 due to error`);
    }
    await updateUI(0);
  } finally {
    isInitializing = false;
    await processMidiQueue();
  }
}

// Updates the connection status display
function updateConnectionStatus(connected, message) {
  const statusElement = document.getElementById("connection-status");
  const body = document.body;
  if (!statusElement) return;

  minichord_device = connected;
  if (connected) {
    statusElement.className = "connection-status connected";
    body.classList.remove("control_full");
    const bankText = currentBankNumber >= 0 ? ` | Bank ${currentBankNumber + 1}` : '';
    statusElement.textContent = `minichord connected${bankText}`;
  } else {
    statusElement.className = "connection-status disconnected";
    body.classList.add("control_full");
    const elements = document.getElementsByClassName("active");
    while (elements.length > 0) {
      elements[0].classList.add("inactive");
      elements[0].classList.remove("active");
    }
    statusElement.textContent = "minichord disconnected";
    window.scrollTo(0, 0);
  }
}

// Opens a modal for editing parameters
async function openModal(paramGroup) {
  openParamGroup = paramGroup;
  originalPresetValues = { ...currentValues };
  tempValues = { ...currentValues };

  if (paramGroup === "global_parameter") {
    await generateGlobalSettingsForm();
    return;
  }

  if (paramGroup === "rhythm_parameter") {
    if (!controller.isConnected()) {
      showNotification("Device not connected", "error");
      return;
    }
    await checkbox_array();
    return;
  }

  const modal = document.getElementById("settings-modal");
  if (!modal) {
    showNotification("Settings modal not found", "error");
    return;
  }

  await generateSettingsForm(paramGroup);
}

// Saves parameter changes to the device and UI
async function saveSettings(presetId, paramGroup) {
  console.log(`[saveSettings] Saving for bank ${presetId + 1}, paramGroup=${paramGroup}, currentBankNumber=${currentBankNumber + 1}, targetBank=${targetBank + 1}, tempValues=`, tempValues);
  const tempCopy = { ...tempValues };

  if (presetId < 0 || presetId > 11 || isNaN(presetId)) {
    console.warn(`[saveSettings] Invalid presetId ${presetId}, using targetBank=${targetBank}`);
    presetId = targetBank;
  }

  try {
    currentValues = { ...currentValues, ...tempValues };
    bankSettings[presetId] = { ...currentValues };
    console.log(`[saveSettings] Updated currentValues=`, currentValues);

    if (controller.isConnected()) {
      const sendPromises = Object.keys(tempValues).map(sysex => {
        const value = Math.round(tempValues[sysex]);
        console.log(`[saveSettings] Sending Sysex=${sysex}, value=${value}`);
        return controller.sendParameter(parseInt(sysex), value);
      });

      await Promise.all(sendPromises);

      console.log(`[saveSettings] Sending save command for bank ${presetId + 1}`);
      const success = controller.saveCurrentSettings(presetId);
      if (!success) {
        console.error(`[saveSettings] Failed to send save command for bank ${presetId + 1}`);
        showNotification(`Failed to save bank ${presetId + 1}`, "error");
        currentValues = { ...currentValues, ...tempCopy };
        return;
      }

      const maxWaitTime = 5000;
      const startTime = Date.now();
      await new Promise((resolve, reject) => {
        const checkSave = setInterval(() => {
          if (!controller.pendingSave || Date.now() - startTime > maxWaitTime) {
            clearInterval(checkSave);
            if (Date.now() - startTime > maxWaitTime) {
              console.warn(`[saveSettings] Save timeout for bank ${presetId + 1}`);
              showNotification(`Save timeout for bank ${presetId + 1}`, "error");
              reject(new Error("Save timeout"));
              return;
            }
            console.log(`[saveSettings] Save confirmed for bank ${presetId + 1}`);
            resolve();
          }
        }, 100);
      });

      console.log(`[saveSettings] Requesting settings for bank ${presetId + 1}`);
      controller.sendSysEx([0, 0, 0, 0]);

      await new Promise(resolve => setTimeout(resolve, 500));

      // Update currentBankNumber and targetBank after successful save
      currentBankNumber = presetId;
      active_bank_number = presetId;
      targetBank = presetId;
      const bankSelect = document.getElementById("bank_number_selection");
      if (bankSelect) {
        bankSelect.value = presetId;
        console.log(`[saveSettings] Set bankSelect.value and targetBank to ${presetId}`);
      }

      if (paramGroup !== "global_parameter") {
        const modal = paramGroup === "rhythm_parameter"
          ? document.getElementById("rhythm-modal")
          : document.getElementById("settings-modal");
        if (modal) {
          modal.style.display = "none";
          openParamGroup = null;
          tempValues = {};
          console.log(`[saveSettings] Cleared openParamGroup, closed modal for paramGroup=${paramGroup}`);
        } else {
          console.error(`[saveSettings] Modal element not found: #${paramGroup === "rhythm_parameter" ? "rhythm-modal" : "settings-modal"}`);
          showNotification("Modal not found, cannot close", "error");
        }
      } else {
        await generateGlobalSettingsForm();
      }

      await updateUI(presetId);
      showNotification(`Saved to bank ${presetId + 1}`, "success");
    } else {
      console.warn(`[saveSettings] Device not connected, cannot save to bank ${presetId + 1}`);
      showNotification("Device not connected, cannot save", "error");
      currentValues = { ...currentValues, ...tempCopy };
    }
  } catch (error) {
    console.error(`[saveSettings] Error saving bank ${presetId + 1}:`, error);
    showNotification(`Error saving bank ${presetId + 1}`, "error");
    currentValues = { ...currentValues, ...tempCopy };
  }
}

// Reverts changes and restores original values
async function cancelSettings(bankNumber, paramGroup) {
  console.log(`[cancelSettings] Cancelling for bank ${bankNumber + 1}, paramGroup=${paramGroup}`);
  const params = await loadParameters();
  const groupParams = params[paramGroup] || [];

  try {
    groupParams.forEach(param => {
      const address = param.sysex_adress;
      if (originalPresetValues[address] !== undefined) {
        currentValues[address] = originalPresetValues[address];
        if (controller.isConnected()) {
          console.log(`[cancelSettings] Sending Sysex=${address}, value=${currentValues[address]}`);
          controller.sendParameter(parseInt(address), currentValues[address]);
        }
      }
    });

    bankSettings[bankNumber] = { ...currentValues };
    tempValues = {};

    if (paramGroup === "global_parameter") {
      await generateGlobalSettingsForm(); // Refresh form without closing
    } else if (paramGroup === "rhythm_parameter") {
      await checkbox_array();
      await refreshRhythmGrid();
      hideModal(paramGroup);
    } else {
      await generateSettingsForm(paramGroup);
      hideModal(paramGroup);
    }

    if (currentValues[20] !== undefined) {
      updateLEDBankColor();
    }

    showNotification(`Changes cancelled for ${paramGroup.replace(/_/g, " ")}`, "info");
  } catch (error) {
    console.error(`[cancelSettings] Error cancelling for bank ${bankNumber + 1}:`, error);
    showNotification(`Error cancelling changes for ${paramGroup.replace(/_/g, " ")}`, "error");
  }
}

// Shows a modal based on the parameter group
function showModal(section) {
  const modalMap = {
    'rhythm_parameter': 'rhythm-modal',
    'global_parameter': 'global-settings',
    'harp_parameter': 'settings-modal',
    'chord_parameter': 'settings-modal',
    'chord_potentiometer': 'settings-modal',
    'harp_potentiometer': 'settings-modal',
    'modulation_potentiometer': 'settings-modal'
  };
  const modalId = modalMap[section];
  if (!modalId) return;

  const modal = document.getElementById(modalId);
  if (!modal) {
    console.warn(`Modal not found: #${modalId}`);
    return;
  }

  modal.style.display = 'block';
}

// Hides a modal based on the parameter group
function hideModal(section) {
  const modalMap = {
    'rhythm_parameter': 'rhythm-modal',
    'global_parameter': 'global-settings',
    'harp_parameter': 'settings-modal',
    'chord_parameter': 'settings-modal',
    'chord_potentiometer': 'settings-modal',
    'harp_potentiometer': 'settings-modal',
    'modulation_potentiometer': 'settings-modal'
  };
  const modalId = modalMap[section];
  if (!modalId) return;
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = 'none';
    openParamGroup = null;
    tempValues = {};
  }
}

// Updates the rhythm grid checkboxes based on current values
async function refreshRhythmGrid() {
  for (let step = 0; step < 16; step++) {
    const sysexAddress = BASE_ADDRESS_RHYTHM + step;
    const patternValue = currentValues[sysexAddress] || 0;
    rhythmPattern[step] = patternValue;
    for (let voice = 0; voice < 7; voice++) {
      const checkbox = document.getElementById(`rhythm-checkbox-${voice}-${step}`);
      if (!checkbox) continue;
      const bit = (patternValue >> voice) & 1;
      checkbox.checked = !!bit;
    }
  }
}

// Updates the bank number display
function updateBankIndicator() {
  const bankSelect = document.getElementById('bank_number_selection');
  if (bankSelect) {
    bankSelect.value = currentBankNumber;
  }
}

// Legacy function to reset all banks
function reset_memory() {
  if (controller.isConnected()) {
    showNotification("Resetting all banks", "success");
    return controller.resetMemory();
  } else {
    showNotification("Device not connected", "error");
    return false;
  }
}

// Legacy function to save settings to the current or target bank
function save_current_settings(targetBank) {
  if (!controller.isConnected()) {
    showNotification("Device not connected", "error");
    return false;
  }

  const bankNumber = targetBank !== undefined ? targetBank : currentBankNumber;
  console.log(`[SAVE] Saving to bank ${bankNumber + 1}`);

  bankSettings[bankNumber] = { ...currentValues };

  Object.keys(currentValues).forEach(sysex => {
    const value = currentValues[sysex];
    console.log(`[SAVE] Sending Sysex=${sysex}, value=${value}`);
    controller.sendParameter(parseInt(sysex), value);
  });

  const success = controller.saveCurrentSettings(bankNumber);
  if (!success) {
    showNotification(`Failed to save bank ${bankNumber + 1}`, "error");
    return false;
  }

  const checkSave = setInterval(async () => {
    if (!controller.pendingSave) {
      clearInterval(checkSave);
      controller.sendSysEx([0, 0, 0, 0]);
      await new Promise(resolve => setTimeout(resolve, 200));
      if (bankSettings[bankNumber]) {
        Object.keys(bankSettings[bankNumber]).forEach(sysex => {
          if (currentValues[sysex] !== bankSettings[bankNumber][sysex]) {
            console.warn(`[SAVE] Mismatch for bank ${bankNumber}, sysex=${sysex}: current=${currentValues[sysex]}, stored=${bankSettings[bankNumber][sysex]}`);
            currentValues[sysex] = bankSettings[bankNumber][sysex];
          }
        });
      }
      await updateUI(bankNumber);
      showNotification(`Saved to bank ${bankNumber + 1}`, "success");
    }
  }, 100);

  return true;
}

// Legacy function to reset the current bank
function reset_current_bank() {
  if (!controller.isConnected()) {
    showNotification("Device not connected", "error");
    return false;
  }

  const targetBank = parseInt(document.getElementById('bank_number_selection').value);
  console.log(`[RESET] Resetting bank ${targetBank + 1}`);

  const success = controller.resetCurrentBank(targetBank);
  if (!success) {
    showNotification(`Failed to reset bank ${targetBank + 1}`, "error");
    return false;
  }

  bankSettings[targetBank] = { ...defaultValues };
  if (targetBank === currentBankNumber) {
    currentValues = { ...defaultValues };
  }

  controller.sendSysEx([0, 0, 0, 0]);

  const checkReset = setInterval(async () => {
    if (!controller.pendingSave) {
      clearInterval(checkReset);
      await loadBankSettings(targetBank);
      showNotification(`Bank ${targetBank + 1} reset`, "success");
    }
  }, 100);

  return true;
}

// Adds tooltips to SVG elements
function addSvgTooltip(element, tooltipText) {
  const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
  title.textContent = tooltipText;
  element.appendChild(title);
}

// Handles data received from the device
async function handleDataReceived(processedData) {
  if (!processedData) {
    console.warn("[handleDataReceived] Received null data, skipping.");
    return;
  }

  const { bankNumber, parameters } = processedData;
  if (bankNumber < 0 || bankNumber > 11) {
    console.warn(`[handleDataReceived] Invalid bankNumber ${bankNumber}, skipping update`);
    return;
  }

    // Handle bank desync
  if (bankNumber !== targetBank && !isInitializing && !isLoadingPreset) {
    console.log(`[handleDataReceived] Bank mismatch: received ${bankNumber}, expected ${targetBank}. Retrying...`);
    controller.sendSysEx([0, 0, 0, targetBank]);
    midiResponseQueue.push(processedData); // Re-queue data to process after correct bank load
    return;
  }

  if (isInitializing || currentBankNumber === -1) {
    console.log(`[handleDataReceived] Queuing data for bank ${bankNumber} as initialization incomplete or currentBankNumber=-1`);
    midiResponseQueue.push(processedData);
    return;
  }

  const now = Date.now();
  if (now - lastUpdate < updateInterval) {
    console.log(`[handleDataReceived] Throttling update, lastUpdate=${lastUpdate}, now=${now}`);
    return;
  }
  lastUpdate = now;

  // Detect bank switch
  const isBankSwitch = bankNumber !== currentBankNumber;

  if (!bankSettings[bankNumber]) bankSettings[bankNumber] = {};

  parameters.forEach((value, index) => {
    if (value !== undefined && index !== controller.firmware_adress) {
      // Allow updates during bank switch, skip only for user edits in same bank
      if (openParamGroup && tempValues[index] !== undefined && !isBankSwitch) {
        console.log(`[handleDataReceived] Skipping Sysex=${index} update (user editing, tempValues=${tempValues[index]})`);
        return;
      }
      if (bankNumber === currentBankNumber && tempValues[index] !== undefined && tempValues[index] !== value) {
        console.warn(`[handleDataReceived] Mismatch for Sysex=${index}: sent=${tempValues[index]}, received=${value}`);
      }
      bankSettings[bankNumber][index] = value;
      if (bankNumber === currentBankNumber) {
        currentValues[index] = value;
        if (index >= BASE_ADDRESS_RHYTHM && index < BASE_ADDRESS_RHYTHM + 16) {
          rhythmPattern[index - BASE_ADDRESS_RHYTHM] = value;
        }
      }
      console.log(`[handleDataReceived] Sysex=${index}, value=${value}, bank=${bankNumber}, currentBankNumber=${currentBankNumber}`);
    }
  });

  console.log(`[handleDataReceived] Updated bank ${bankNumber}, currentValues:`, currentValues);
  if (bankNumber !== currentBankNumber && !isLoadingPreset && !isInitializing) {
    await loadBankSettings(bankNumber);
  } else if (bankNumber === currentBankNumber) {
    await updateUI(bankNumber);
  }
  updateConnectionStatus(true);
  const sharpButton = document.getElementById("sharp-button");
  if (sharpButton) {
    sharpButton.classList.toggle("active", currentValues[31] === 1);
  }
}

// Main event listener for when the page loads
document.addEventListener('DOMContentLoaded', () => {
  const svgTooltips = {
    "chord-button": "Open settings for chords",
    "sharp-button": "Toggle sharp/flat mode",
    "rhythm-button": "Open rhythm settings",
    "harp-plate": "Open harp settings",
    "chord-volume-pot": "Assign parameters to chord pot",
    "harp-volume-pot": "Assign parameters to harp pot",
    "mod-pot": "Assign parameters to mod pot",
    "power_led": "Indicates power status"
  };

  controller.onDataReceived = handleDataReceived;

  controller.onConnectionChange = function(connected, message) {
    updateConnectionStatus(connected, message);
  };

  setTimeout(() => {
    updateConnectionStatus(controller.isConnected(), `delayed check`);
  }, 1000);

  window.addEventListener("click", (e) => {
    const modal = document.getElementById("settings-modal");
    const rhythmModal = document.getElementById("rhythm-modal");

    if (modal && e.target === modal && openParamGroup && openParamGroup !== "global_parameter") {
      cancelSettings(currentBankNumber, openParamGroup);
      hideModal(openParamGroup);
    }
    if (rhythmModal && e.target === rhythmModal && !e.target.closest('.modal-content')) {
      cancelSettings(currentBankNumber, "rhythm_parameter");
      hideModal("rhythm_parameter");
    }
  });

  document.querySelectorAll(".chord-button").forEach((button) => {
    addSvgTooltip(button, svgTooltips["chord-button"]);
    button.addEventListener("click", () => openModal("chord_parameter"));
  });

  const harpPlate = document.getElementById("harp-plate");
  if (harpPlate) {
    addSvgTooltip(harpPlate, svgTooltips["harp-plate"]);
    harpPlate.addEventListener("click", () => openModal("harp_parameter"));
  }

  const potMappings = {
    "chord-volume-pot": { paramGroup: "chord_potentiometer" },
    "harp-volume-pot": { paramGroup: "harp_potentiometer" },
    "mod-pot": { paramGroup: "modulation_potentiometer" }
  };
  document.querySelectorAll(".pot").forEach(pot => {
    addSvgTooltip(pot, svgTooltips[pot.id] || "Adjust parameter");
    pot.addEventListener("click", () => openModal(potMappings[pot.id].paramGroup));
  });

    const sharpButton = document.getElementById("sharp-button");
  if (sharpButton) {
    addSvgTooltip(sharpButton, svgTooltips["sharp-button"]);
    sharpButton.addEventListener("click", () => {
      if (!controller.isConnected()) {
        showNotification("Device not connected", "error");
        return;
      }
      const currentState = currentValues[31] || 0;
      const newState = currentState === 0 ? 1 : 0;
      if (controller.sendParameter(31, newState)) {
        currentValues[31] = newState;
        bankSettings[currentBankNumber][31] = newState;
        sharpButton.classList.toggle("active", newState === 1);
        showNotification(`Button set to ${newState === 1 ? "Flat" : "Sharp"}`, "success");
      } else {
        showNotification("Failed to toggle sharp mode", "error");
      }
    });
  }

  const rhythmButton = document.getElementById("rhythm-button");
  if (rhythmButton) {
    addSvgTooltip(rhythmButton, svgTooltips["rhythm-button"]);
    rhythmButton.addEventListener("click", () => {
      openModal("rhythm_parameter");
    });
  }

  const presetUp = document.getElementById("preset-up");
  if (presetUp) {
    addSvgTooltip(presetUp, "Switch to previous preset");
    presetUp.addEventListener("click", async () => {
      if (!controller.isConnected()) {
        showNotification("Device not connected", "error");
        return;
      }
      let newBank = currentBankNumber - 1;
      if (newBank < 0) newBank = 11;
      await loadBankSettings(newBank);
    });
  }

  const presetDown = document.getElementById("preset-down");
  if (presetDown) {
    addSvgTooltip(presetDown, "Switch to next preset");
    presetDown.addEventListener("click", async () => {
      if (!controller.isConnected()) {
        showNotification("Device not connected", "error");
        return;
      }
      let newBank = currentBankNumber + 1;
      if (newBank > 11) newBank = 0;
      await loadBankSettings(newBank);
    });
  }

const bankSelect = document.getElementById("bank_number_selection");
if (bankSelect) {
  bankSelect.addEventListener("change", async (e) => {
    const newBank = parseInt(e.target.value);
    console.log(`[DEBUG] Bank select changed to bank ${newBank + 1}, currentBankNumber=${currentBankNumber + 1}`);
    if (newBank >= 0 && newBank <= 11 && !isNaN(newBank)) {
      targetBank = newBank;
      console.log(`[DEBUG] Set targetBank to ${newBank + 1}`);
    } else {
      console.warn(`[DEBUG] Invalid bank selected: ${newBank}, reverting to currentBankNumber=${currentBankNumber}`);
      bankSelect.value = currentBankNumber;
      targetBank = currentBankNumber;
    }
  });
}

const saveToBankBtn = document.getElementById("save-to-bank-btn");
if (saveToBankBtn) {
  saveToBankBtn.addEventListener("click", async () => {
    console.log(`[save-to-bank] Save to bank button clicked, targetBank=${targetBank + 1}, currentBankNumber=${currentBankNumber + 1}`);
    if (targetBank < 0 || targetBank > 11 || isNaN(targetBank)) {
      console.warn(`[save-to-bank] Invalid targetBank ${targetBank}, using currentBankNumber=${currentBankNumber}`);
      targetBank = currentBankNumber;
      const bankSelect = document.getElementById("bank_number_selection");
      if (bankSelect) {
        bankSelect.value = currentBankNumber;
      }
    }
    await saveSettings(targetBank, "all");
  });
}

  const resetBankBtn = document.getElementById("reset-bank-btn");
  if (resetBankBtn) {
    resetBankBtn.addEventListener("click", async () => {
      console.log(`[DEBUG] Reset bank button clicked`);
      await reset_current_bank();
    });
  }

  const resetAllBanksBtn = document.getElementById("reset-all-banks-btn");
  if (resetAllBanksBtn) {
    resetAllBanksBtn.addEventListener("click", async () => {
      console.log(`[DEBUG] Reset all banks button clicked`);
      await reset_memory();
    });
  }

  const exportSettingsBtn = document.getElementById("export-settings-btn");
  if (exportSettingsBtn) {
    exportSettingsBtn.addEventListener("click", () => {
      console.log(`[DEBUG] Export settings button clicked`);
      const parameters = new Array(199).fill(0);
      Object.keys(currentValues).forEach(sysex => {
        parameters[sysex] = currentValues[sysex];
      });
      const encodedData = btoa(parameters.join(';'));
      const outputZone = document.getElementById("output_zone");
      if (outputZone) {
        outputZone.textContent = `Preset code: ${encodedData}`;
        outputZone.style.display = "block";
        navigator.clipboard.writeText(encodedData).then(() => {
          showNotification("Preset code copied to clipboard", "success");
        }).catch(err => {
          console.error("Failed to copy preset code:", err);
          showNotification("Failed to copy preset code", "error");
        });
      } else {
        console.warn("Output zone element not found: #output_zone");
        showNotification("Export failed: UI element missing", "error");
      }
    });
  }

  const loadSettingsBtn = document.getElementById("load-settings-btn");
  if (loadSettingsBtn) {
    loadSettingsBtn.addEventListener("click", async () => {
      console.log(`[DEBUG] Load settings button clicked`);
      const presetCode = prompt("Enter preset code:");
      if (presetCode) {
        isLoadingPreset = true;
        try {
          const parameters = decodePresetData(presetCode);
          console.log(`[DEBUG] Decoded preset parameters:`, parameters);
          currentValues = {};
          parameters.forEach((value, index) => {
            if (value !== 0 && index !== controller.firmware_adress) {
              currentValues[index] = value;
            }
          });
          bankSettings[currentBankNumber] = { ...currentValues };
          if (controller.isConnected()) {
            Object.keys(currentValues).forEach(sysex => {
              console.log(`[LOAD] Sending Sysex=${sysex}, value=${currentValues[sysex]}`);
              controller.sendParameter(parseInt(sysex), currentValues[sysex]);
            });
            controller.saveCurrentSettings(currentBankNumber);
          }
          await updateUI(currentBankNumber);
          showNotification("Preset loaded successfully", "success");
        } catch (error) {
          console.error("Error loading preset:", error);
          showNotification("Failed to load preset", "error");
        } finally {
          isLoadingPreset = false;
        }
      }
    });
  }

  const settingsClose = document.getElementById("settings-modal")?.querySelector(".close-button");
  if (settingsClose) {
    settingsClose.addEventListener("click", () => {
      if (openParamGroup) {
        cancelSettings(currentBankNumber, openParamGroup);
        hideModal(openParamGroup);
      }
    });
  }

  init();
});

// Handles window resize to adjust UI layout
/* window.addEventListener("resize", () => {
  const container = document.querySelector(".container");
  if (container) {
    const width = window.innerWidth;
    container.style.transform = width < 600 ? "scale(0.8)" : "scale(1)";
  }
}); */

// Ensures modals close when clicking outside
document.addEventListener("click", (e) => {
  const rhythmModal = document.getElementById("rhythm-modal");
  if (rhythmModal && e.target === rhythmModal && !e.target.closest(".modal-content")) {
    cancelSettings(currentBankNumber, "rhythm_parameter");
    hideModal("rhythm_parameter");
  }
});

// Periodically process MIDI queue
setInterval(processMidiQueue, 100);
