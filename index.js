// Global variables to store the state of the MIDI controller interface
var parameters = null; // Holds parameter definitions loaded from parameters.json
var currentValues = {}; // Current parameter values for the active bank (e.g., { "32": 54 } for led attenuation = 0.54)
var controller = new MiniChordController(); // Instance of MiniChordController to handle MIDI communication
var tempValues = {}; // Temporary values for parameters being edited before saving (e.g., { "32": 54 })
var bankSettings = {}; // Stores settings for each bank (e.g., bankSettings[1] = { "32": 54, ... })
let currentBankNumber = -1; // Tracks the currently active bank (0-11, or -1 if none)
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

// Maps sysex addresses to human-readable parameter names for UI and logging
const sysexNameMap = {
  20: "Bank Color (Global)",
  21: "Retrigger Chords",
  22: "Change Held Strings",
  23: "Slash Level",
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
  40: "Harp Array Shuffling",
  // ... (rest of sysexNameMap remains unchanged)
  198: "Chord Octave Change"
};

// Maps waveform values to names for select inputs (e.g., oscillator waveform)
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

// Legacy utility function to map values between ranges
function map_value(value, in_min, in_max, out_min, out_max) {
  return (value - in_min) * (out_max - out_min) / (in_max - in_min) + Number(out_min);
}

// Loads parameter definitions from parameters.json
let cachedParameters = null;
async function loadParameters() {
  if (cachedParameters) {
    console.log('[DEBUG] loadParameters: Using cached parameters');
    return cachedParameters;
  }
  try {
    const response = await fetch('parameters.json');
    cachedParameters = await response.json();
    console.log('[DEBUG] loadParameters: Loaded params=', cachedParameters);
    cachedParameters.global_parameter?.forEach(param => {
      console.log(`[DEBUG] Global param: sysex=${param.sysex_adress}, name=${param.name}, data_type=${param.data_type}, default_value=${param.default_value}`);
    });
    return cachedParameters;
  } catch (error) {
    console.error('Failed to load parameters:', error);
    return {};
  }
}

// Sets up default values for all parameters from parameters.json
async function initializeDefaultValues() {
  const params = await loadParameters();
  defaultValues = {};
  Object.keys(params).forEach(group => {
    params[group].forEach(param => {
      const floatMultiplier = param.sysex_adress === 20 ? 1 : (controller.float_multiplier || 100.0);
      defaultValues[param.sysex_adress] = param.data_type === "float" 
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
  statusElement.className = `connection-status ${type === 'success' ? 'connected' : 'disconnected'}`;

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

  if (!modal.querySelector('.modal-content')) {
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
        checkbox.id = `checkbox${voice}${step}`;
        checkbox.dataset.voice = voice;
        checkbox.dataset.step = step;
        checkbox.addEventListener('change', () => sendRhythmData(step));
        cell.appendChild(checkbox);
        row.appendChild(cell);
      }
      gridContainer.appendChild(row);
    }
    modalContent.appendChild(gridContainer);

    const params = await loadParameters();
    const rhythmParams = (params.rhythm_parameter || []).filter(param => param.group !== "hidden");
    if (rhythmParams.length > 0) {
      const controlsContainer = document.createElement('div');
      controlsContainer.className = 'parameter-column';
      const controlsHeader = document.createElement('h3');
      controlsHeader.textContent = 'Rhythm Parameters';
      controlsContainer.appendChild(controlsHeader);

      rhythmParams.forEach(param => {
        if (!["slider", "select"].includes(param.ui_type)) {
          console.warn(`Skipping parameter with unsupported ui_type: ${param.name} (sysex_adress: ${param.sysex_adress}, ui_type: ${param.ui_type})`);
          return;
        }

        const container = document.createElement('div');
        container.className = 'parameter-row';
        const label = document.createElement('label');
        label.textContent = param.name;
        label.setAttribute('for', `param-${param.sysex_adress}`);
        label.title = param.tooltip || param.name;

        const floatMultiplier = param.data_type === 'float' ? (controller.float_multiplier || 100.0) : 1;
        const currentValue = tempValues[param.sysex_adress] !== undefined
          ? tempValues[param.sysex_adress]
          : currentValues[param.sysex_adress] !== undefined
            ? currentValues[param.sysex_adress]
            : param.data_type === 'float' ? param.default_value * floatMultiplier : param.default_value;

        if (param.ui_type === 'slider') {
          const sliderContainer = document.createElement('div');
          sliderContainer.className = 'slider-container';
          const input = document.createElement('input');
          input.type = 'range';
          input.id = `param-${param.sysex_adress}`;
          input.name = param.name;
          input.className = 'slider';
          input.min = param.min_value;
          input.max = param.max_value;
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

          input.addEventListener('input', (e) => {
            const value = param.data_type === 'float' ? parseFloat(e.target.value) * floatMultiplier : parseInt(e.target.value);
            tempValues[param.sysex_adress] = value;
            valueInput.value = param.data_type === 'float' ? Number((value / floatMultiplier).toFixed(2)) : value;
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
            controller.sendParameter(parseInt(param.sysex_adress), value);
            executeMethod(param.method, value);
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

          const options = param.options || [];
          options.forEach(option => {
            const opt = document.createElement('option');
            opt.value = option.value;
            opt.text = option.label;
            input.appendChild(opt);
          });

          input.value = String(currentValue);

          input.addEventListener('change', (e) => {
            const value = param.data_type === 'float' ? parseFloat(e.target.value) * floatMultiplier : parseInt(e.target.value);
            tempValues[param.sysex_adress] = value;
            controller.sendParameter(parseInt(param.sysex_adress), value);
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
    const saveButton = BOLDdocument.createElement('button');
    saveButton.className = 'save-btn';
    saveButton.id = 'save-rhythm-btn';
    saveButton.textContent = 'Save';
    saveButton.addEventListener('click', () => {
      saveSettings(currentBankNumber, 'rhythm_parameter');
      hideModal('rhythm_parameter');
    });
    const cancelButton = document.createElement('button');
    cancelButton.className = 'cancel-btn';
    cancelButton.id = 'cancel-rhythm-btn';
    cancelButton.textContent = 'Cancel';
    cancelButton.addEventListener('click', () => {
      tempValues = { ...currentValues };
      hideModal('rhythm_parameter');
    });
    buttonContainer.appendChild(saveButton);
    buttonContainer.appendChild(cancelButton);
    modalContent.appendChild(buttonContainer);

    modal.appendChild(modalContent);
  }

  modal.style.display = 'block';

  for (let step = 0; step < 16; step++) {
    const sysexAddress = BASE_ADDRESS_RHYTHM + step;
    if (!(sysexAddress in currentValues)) {
      currentValues[sysexAddress] = 0;
      rhythmPattern[step] = 0;
    }
  }

  await new Promise(resolve => setTimeout(resolve, 0));
  await refreshRhythmGrid();
}

// Legacy function to send rhythm data (renamed from send_array_data for clarity)
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
  console.log(`sendRhythmData: Step ${step + 1}, sysex=${sysexAddress}, value=${output_value}`);
  controller.sendParameter(sysexAddress, output_value);
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

// Creates the global settings modal
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

  settingsForm.innerHTML = "";

  globalParams.forEach((param) => {
    const floatMultiplier = param.sysex_adress === 20 ? 1 : (controller.float_multiplier || 100.0);
    const currentValue = currentValues[param.sysex_adress] !== undefined
      ? currentValues[param.sysex_adress]
      : tempValues[param.sysex_adress] !== undefined
        ? tempValues[param.sysex_adress]
        : param.data_type === "float" ? param.default_value * floatMultiplier : param.default_value;
    const scaledValue = param.data_type === "float" ? Number((currentValue / floatMultiplier).toFixed(2)) : currentValue;

    const row = document.createElement("div");
    row.className = "parameter-row";
    row.innerHTML = `
      <label for="param-${param.sysex_adress}" data-tooltip="${param.description || param.tooltip || param.name}">${param.name}</label>
      <div class="slider-container">
        <input type="range" class="slider" id="param-${param.sysex_adress}"
          min="${param.min_value * floatMultiplier}" max="${param.max_value * floatMultiplier}"
          value="${currentValue}" step="${param.step * floatMultiplier || (param.data_type === 'float' ? 1 : 1)}">
        <input type="number" class="value-input" value="${param.data_type === 'float' ? scaledValue.toFixed(2) : scaledValue}"
          step="${param.step || (param.data_type === 'float' ? 0.01 : 1)}"
          min="${param.min_value}" max="${param.max_value}">
      </div>
    `;
    settingsForm.appendChild(row);

    const slider = row.querySelector(".slider");
    const valueInput = row.querySelector(".value-input");

    slider.value = currentValue;

    slider.addEventListener("input", () => {
      const newValue = parseFloat(slider.value);
      tempValues[param.sysex_adress] = newValue;
      valueInput.value = param.data_type === "float" ? (newValue / floatMultiplier).toFixed(2) : Math.round(newValue / floatMultiplier);
      if (controller.isConnected()) {
        controller.sendParameter(parseInt(param.sysex_adress), newValue);
      }
      if (param.method) {
        executeMethod(param.method, newValue);
      }
    });

    valueInput.addEventListener("change", (e) => {
      const currentValue = tempValues[param.sysex_adress] !== undefined
        ? tempValues[param.sysex_adress]
        : currentValues[param.sysex_adress] !== undefined
          ? currentValues[param.sysex_adress]
          : param.data_type === "float" ? param.default_value * floatMultiplier : param.default_value;

      let newValue = parseFloat(e.target.value);
      if (isNaN(newValue)) {
        newValue = currentValue / (param.data_type === "float" ? floatMultiplier : 1);
        valueInput.value = param.data_type === "float" ? Number(newValue.toFixed(2)) : Math.round(newValue);
        slider.value = param.data_type === "float" ? newValue * floatMultiplier : newValue;
        return;
      }

      newValue = Math.max(param.min_value, Math.min(param.max_value, newValue));
      if (param.data_type === "float") {
        newValue *= floatMultiplier;
      } else {
        newValue = Math.round(newValue);
      }

      tempValues[param.sysex_adress] = newValue;
      slider.value = newValue;
      valueInput.value = param.data_type === "float" ? Number((newValue / floatMultiplier).toFixed(2)) : newValue;

      if (controller.isConnected()) {
        controller.sendParameter(parseInt(param.sysex_adress), newValue);
      }
      if (param.method) {
        executeMethod(param.method, newValue);
      }
    });
  });

  const saveBtn = document.getElementById("save-global-btn");
  const cancelBtn = document.getElementById("cancel-global-btn");

  const saveBtnClone = saveBtn.cloneNode(true);
  const cancelBtnClone = cancelBtn.cloneNode(true);
  saveBtn.parentNode.replaceChild(saveBtnClone, saveBtn);
  cancelBtn.parentNode.replaceChild(cancelBtnClone, cancelBtn);

  saveBtnClone.addEventListener("click", () => {
    Object.assign(currentValues, tempValues);
    bankSettings[currentBankNumber] = { ...currentValues };
    if (controller.isConnected()) {
      Object.keys(tempValues).forEach(sysex => {
        controller.sendParameter(parseInt(sysex), tempValues[sysex]);
      });
    }
    updateUIAfterSave(currentBankNumber, "global_parameter");
    showNotification("Global settings saved", "success");
  });

  cancelBtnClone.addEventListener("click", () => {
    tempValues = { ...currentValues };
    generateGlobalSettingsForm();
    if (currentValues[20] !== undefined) {
      updateLEDBankColor();
    }
    showNotification("Changes discarded", "info");
  });

  globalSettings.style.display = "block";
}

// Creates modals for chord, harp, or potentiometer parameters
async function generateSettingsForm(paramGroup) {
  if (paramGroup === "global_parameter") return;
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
  if (groupParams.length === 0) {
    form.innerHTML = "<p>No parameters available for this group.</p>";
    return;
  }

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
        : currentValues[param.sysex_adress] !== undefined 
          ? currentValues[param.sysex_adress] 
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
          controller.sendParameter(parseInt(param.sysex_adress), value);
          if (param.method) executeMethod(param.method, value);
        });
        container.appendChild(label);
        container.appendChild(input);
      } else if (param.ui_type === "slider") {
        const sliderContainer = document.createElement("div");
        sliderContainer.className = "slider-container";
        input = document.createElement("input");
        input.type = "range";
        input.id = `param-${param.sysex_adress}`;
        input.name = param.name;
        input.className = "slider";
        input.min = param.min_value.toString();
        input.max = param.max_value.toString();
        input.step = param.data_type === "float" ? "0.01" : "1";
        const sliderValue = param.data_type === "float" 
          ? Number((currentValue / floatMultiplier).toFixed(2)) 
          : currentValue;
        input.value = sliderValue.toString();
        input.title = param.tooltip || param.name;
        const valueInput = document.createElement("input");
        valueInput.type = "number";
        valueInput.id = `value-${param.sysex_adress}`;
        valueInput.min = param.min_value.toString();
        valueInput.max = param.max_value.toString();
        valueInput.step = param.data_type === "float" ? "0.01" : "1";
        valueInput.value = sliderValue.toString();
        valueInput.className = "value-input";
        valueInput.title = param.tooltip || param.name;

        input.addEventListener("input", (e) => {
          const value = param.data_type === "float" ? parseFloat(e.target.value) * floatMultiplier : parseInt(e.target.value);
          tempValues[param.sysex_adress] = value;
          valueInput.value = param.data_type === "float" ? Number((value / floatMultiplier).toFixed(2)).toString() : value.toString();
          controller.sendParameter(parseInt(param.sysex_adress), value);
          if (param.method) executeMethod(param.method, value);
        });

        input.addEventListener("touchend", (e) => {
          const value = param.data_type === "float" ? parseFloat(e.target.value) * floatMultiplier : parseInt(e.target.value);
          tempValues[param.sysex_adress] = value;
          valueInput.value = param.data_type === "float" ? Number((value / floatMultiplier).toFixed(2)).toString() : value.toString();
          controller.sendParameter(parseInt(param.sysex_adress), value);
          if (param.method) executeMethod(param.method, value);
        });

        valueInput.addEventListener("change", (e) => {
          const currentValue = tempValues[param.sysex_adress] !== undefined
            ? tempValues[param.sysex_adress]
            : currentValues[param.sysex_adress] !== undefined
              ? currentValues[param.sysex_adress]
              : param.data_type === "float" ? param.default_value * floatMultiplier : param.default_value;

          let value = parseFloat(e.target.value);
          if (isNaN(value)) {
            value = currentValue / (param.data_type === "float" ? floatMultiplier : 1);
            valueInput.value = param.data_type === "float" ? Number(value.toFixed(2)) : Math.round(value);
            input.value = param.data_type === "float" ? value * floatMultiplier : value;
            return;
          }

          value = Math.max(param.min_value, Math.min(param.max_value, value));
          if (param.data_type === "float") {
            value *= floatMultiplier;
          }

          tempValues[param.sysex_adress] = value;
          const scaledValue = param.data_type === "float" ? Number((value / floatMultiplier).toFixed(2)) : value;
          input.value = param.data_type === "float" ? value : scaledValue;
          valueInput.value = scaledValue;

          controller.sendParameter(parseInt(param.sysex_adress), value);
          if (param.method) {
            executeMethod(param.method, value);
          }
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
        const isWaveform = param.name.toLowerCase().includes("waveform");
        let options = isWaveform 
          ? Object.entries(waveformMap).map(([value, label]) => ({ value: parseInt(value), label })) 
          : (param.options || []);
        options.forEach(option => {
          const opt = document.createElement("option");
          opt.value = option.value;
          opt.text = option.label;
          input.appendChild(opt);
        });
        input.value = String(currentValue);
        input.addEventListener("change", (e) => {
          const value = param.data_type === "float" ? parseFloat(e.target.value) * floatMultiplier : parseInt(e.target.value);
          tempValues[param.sysex_adress] = value;
          controller.sendParameter(parseInt(param.sysex_adress), value);
          if (param.method) executeMethod(param.method, value);
        });
        container.appendChild(label);
        container.appendChild(input);
      }
      column.appendChild(container);
    });
    form.appendChild(column);
  });

  const saveBtn = document.getElementById("save-settings-btn");
  const cancelBtn = document.getElementById("cancel-settings-btn");

  const saveBtnClone = saveBtn.cloneNode(true);
  const cancelBtnClone = cancelBtn.cloneNode(true);
  saveBtn.parentNode.replaceChild(saveBtnClone, saveBtn);
  cancelBtn.parentNode.replaceChild(cancelBtnClone, cancelBtn);

  saveBtnClone.addEventListener("click", () => {
    saveSettings(currentBankNumber, paramGroup);
  });

  cancelBtnClone.addEventListener("click", () => {
    cancelSettings(currentBankNumber, paramGroup);
    hideModal(paramGroup);
  });
}

// Updates the entire UI for a given bank
async function updateUI(bankIndex) {
  console.log(`updateUI: Updating UI for bank ${bankIndex}`);
  currentBankNumber = bankIndex;
  active_bank_number = bankIndex; // Sync legacy variable

  const bankSelect = document.getElementById('bank_number_selection');
  if (bankSelect) bankSelect.value = bankIndex;

  await generateGlobalSettingsForm();
  updateLEDBankColor();

  const modal = document.getElementById("settings-modal");
  const rhythmModal = document.getElementById("rhythm-modal");

  if (modal && modal.style.display === "block" && openParamGroup && openParamGroup !== "global_parameter") {
    tempValues = { ...currentValues };
    await generateSettingsForm(openParamGroup);
  }

  if (rhythmModal && rhythmModal.style.display === "block") {
    tempValues = { ...currentValues };
    await checkbox_array();
    await refreshRhythmGrid();
  }

  const bankValue = document.getElementById('current-bank-value');
  if (bankValue) {
    bankValue.textContent = (bankIndex + 1).toString();
  }
}

// Loads settings for a specific bank
async function loadBankSettings(bankNumber) {
  try {
    console.log(`loadBankSettings: bankNumber=${bankNumber}`);
    
    // Validate bank number
    if (bankNumber < 0 || bankNumber > 11) {
      console.warn(`Invalid bank number ${bankNumber}, defaulting to 0`);
      bankNumber = 0;
    }

    currentBankNumber = bankNumber;
    active_bank_number = bankNumber;

    // Initialize bankSettings[bankNumber] if it doesn't exist
    if (!bankSettings[bankNumber]) {
      bankSettings[bankNumber] = { ...defaultValues };
    }

    // Update currentValues with stored settings or defaults
    currentValues = { ...defaultValues, ...bankSettings[bankNumber] };

    if (!controller.isConnected()) {
      minichord_device = false;
      await updateUI(bankNumber);
      return;
    }

    minichord_device = true;
    const params = await loadParameters();
    
    // Send parameters to the device only if they differ from defaults or stored values
    const paramGroups = ['global_parameter', 'harp_parameter', 'chord_parameter', 'rhythm_parameter'];
    for (const group of paramGroups) {
      if (params[group]) {
        for (const param of params[group]) {
          const floatMultiplier = param.sysex_adress === 20 ? 1 : (controller.float_multiplier || 100.0);
          const value = currentValues[param.sysex_adress] !== undefined 
            ? currentValues[param.sysex_adress] 
            : (param.data_type === "float" ? param.default_value * floatMultiplier : param.default_value);
          currentValues[param.sysex_adress] = value;
          controller.sendParameter(param.sysex_adress, value);
        }
      }
    }

    bankSettings[bankNumber] = { ...currentValues };
    await updateUI(bankNumber);
    showNotification(`Bank ${bankNumber + 1} loaded`, "success");
  } catch (error) {
    console.error(`loadBankSettings: Error loading bank ${bankNumber}`, error);
    showNotification(`Error loading bank ${bankNumber}`, "error");
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
      currentValues = { ...defaultValues };
      await updateUI(0);
    } else {
      midiResponseQueue = [];
      const activeBankNumber = controller.active_bank_number !== undefined ? controller.active_bank_number : 0;
      active_bank_number = activeBankNumber;
      await loadBankSettings(activeBankNumber);
    }
  } catch (error) {
    console.error("Error during initialization:", error);
    showNotification("Initialization failed.", "error");
    currentBankNumber = 0;
    active_bank_number = 0;
    currentValues = { ...defaultValues };
    await updateUI(0);
  } finally {
    isInitializing = false;
  }
}

// Updates the connection status display
function updateConnectionStatus(connected, message) {
  const statusElement = document.getElementById("connection-status");
  const body = document.body;
  if (!statusElement) return;

  minichord_device = connected; // Sync legacy variable
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
    document.getElementById("rhythm-modal").style.display = 'block';
    return;
  }

  const modal = document.getElementById("settings-modal");
  if (!modal) {
    showNotification("Settings modal not found", "error");
    return;
  }

  const params = await loadParameters();
  originalPresetValues = {};
  const groupParams = params[paramGroup] || [];
  groupParams.forEach(param => {
    const address = param.sysex_adress;
    originalPresetValues[address] = currentValues[address] !== undefined 
      ? currentValues[address] 
      : (param.data_type === "float" ? param.default_value * (controller.float_multiplier || 100.0) : param.default_value);
  });
  tempValues = { ...originalPresetValues };

  await generateSettingsForm(paramGroup);
  modal.style.display = "block";

  const closeButton = modal.querySelector(".close-button");
  if (closeButton) {
    closeButton.addEventListener("click", () => {
      cancelSettings(currentBankNumber, paramGroup);
      hideModal(paramGroup);
    });
  }
}

// Saves parameter changes to the device and UI
function saveSettings(presetId, paramGroup) {
  const tempCopy = { ...tempValues };
  currentValues = { ...currentValues, ...tempValues };
  bankSettings[presetId] = { ...currentValues };
  if (controller.isConnected()) {
    Object.keys(tempValues).forEach(sysex => {
      const value = Math.round(tempValues[sysex]);
      controller.sendParameter(parseInt(sysex), value);
    });
    const success = controller.saveCurrentSettings(presetId);
    if (!success) {
      showNotification(`Failed to save bank ${presetId + 1}.`, "error");
      currentValues = { ...currentValues, ...tempCopy };
      return;
    }
    const checkSave = setInterval(() => {
      if (!controller.pendingSave) {
        clearInterval(checkSave);
        controller.sendSysEx([0, 0, 0, 0]);
        updateUIAfterSave(presetId, paramGroup);
      }
    }, 100);
  } else {
    showNotification("Device not connected", "error");
    currentValues = { ...currentValues, ...tempCopy };
    updateUIAfterSave(presetId, paramGroup);
  }
}

// Updates UI after saving settings
async function updateUIAfterSave(presetId, paramGroup) {
  tempValues = {};
  if (paramGroup === "global_parameter") {
    await generateGlobalSettingsForm();
  } else if (paramGroup === "rhythm_parameter") {
    await checkbox_array();
    await refreshRhythmGrid();
  } else {
    await generateSettingsForm(paramGroup);
  }

  if (paramGroup !== "global_parameter") {
    hideModal(paramGroup);
  }

  if (currentValues[20] !== undefined) {
    updateLEDBankColor();
  }

  showNotification(`Saved settings to bank ${presetId + 1}`, 'success');
}

// Reverts changes and restores original values
async function cancelSettings(bankNumber, paramGroup) {
  const params = await loadParameters();
  const groupParams = params[paramGroup] || [];

  groupParams.forEach(param => {
    const address = param.sysex_adress;
    if (originalPresetValues[address] !== undefined) {
      currentValues[address] = originalPresetValues[address];
      if (controller.isConnected()) {
        controller.sendParameter(parseInt(address), currentValues[address]);
      }
    }
  });

  bankSettings[bankNumber] = { ...currentValues };
  tempValues = {};

  if (paramGroup === "global_parameter") {
    await generateGlobalSettingsForm();
    hideModal(paramGroup);
  } else if (paramGroup === "rhythm_parameter") {
    if (document.getElementById('rhythm-modal').style.display === 'block') {
      await checkbox_array();
      await refreshRhythmGrid();
    }
    hideModal("rhythm_parameter");
  } else {
    await generateSettingsForm(paramGroup);
    hideModal(paramGroup);
  }

  if (currentValues[20] !== undefined) {
    updateLEDBankColor();
  }

  showNotification(`Cancelled changes for ${paramGroup.replace(/_/g, " ")}`, "info");
}

// Shows a modal based on the parameter group
function showModal(section) {
  const modalMap = {
    'rhythm_parameter': 'rhythm-modal',
    'global_parameter': 'global-settings-modal',
    'harp_parameter': 'settings-modal',
    'chord_parameter': 'settings-modal',
    'chord_potentiometer': 'settings-modal',
    'harp_potentiometer': 'settings-modal',
    'modulation_potentiometer': 'settings-modal'
  };
  const modalId = modalMap[section];
  if (!modalId) return;

  const modal = document.getElementById(modalId);
  if (!modal) return;

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
  if (section === 'rhythm_parameter') {
    checkbox_array();
  } else {
    generateSettingsForm(section);
  }
}

// Hides a modal based on the parameter group
function hideModal(section) {
  const modalMap = {
    'rhythm_parameter': 'rhythm-modal',
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
      const checkbox = document.getElementById(`checkbox${voice}${step}`);
      if (!checkbox) continue;
      const bit = (patternValue >> voice) & 1;
      checkbox.checked = !!bit;
    }
  }
}

// Updates the bank number display
function updateBankIndicator() {
  const bankValue = document.getElementById('current-bank-value');
  if (bankValue) {
    bankValue.textContent = (currentBankNumber + 1).toString();
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

  // Ensure currentValues are stored in bankSettings for the target bank
  bankSettings[bankNumber] = { ...currentValues };

  // Send all current parameters to the device for the target bank
  Object.keys(currentValues).forEach(sysex => {
    controller.sendParameter(parseInt(sysex), currentValues[sysex]);
  });

  // Send the save command
  const success = controller.saveCurrentSettings(bankNumber);
  if (!success) {
    showNotification(`Failed to save bank ${bankNumber + 1}`, "error");
    return false;
  }

  showNotification(`Saving to bank ${bankNumber + 1}`, "success");
  return true;
}

// Legacy function to reset the current bank
function reset_current_bank() {
  if (controller.isConnected()) {
    const targetBank = parseInt(document.getElementById('bank_number_selection').value);
    showNotification(`Reset bank ${targetBank + 1}`, "success");
    return controller.resetCurrentBank();
  } else {
    showNotification("Device not connected", "error");
    return false;
  }
}

// Adds tooltips to SVG elements
function addSvgTooltip(element, tooltipText) {
  const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
  title.textContent = tooltipText;
  element.appendChild(title);
}

// Handles data received from the device
async function handleDataReceived(processedData) {
  const now = Date.now();
  if (now - lastUpdate > updateInterval) {
    lastUpdate = now;
    const { bankNumber, parameters } = processedData;
    if (!bankSettings[bankNumber]) bankSettings[bankNumber] = {};
    parameters.forEach((value, index) => {
      if (value !== undefined && index !== controller.firmware_adress) {
        if (bankSettings[bankNumber][index] === undefined) {
          bankSettings[bankNumber][index] = value;
        }
        if (bankNumber === currentBankNumber) {
          currentValues[index] = bankSettings[bankNumber][index];
          if (index >= BASE_ADDRESS_RHYTHM && index < BASE_ADDRESS_RHYTHM + 16) {
            rhythmPattern[index - BASE_ADDRESS_RHYTHM] = value;
          }
        }
      }
    });
    if (bankNumber !== currentBankNumber && !isLoadingPreset) {
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

    if (modal && e.target === modal) {
      const paramGroup = openParamGroup || "chord_parameter";
      cancelSettings(currentBankNumber, paramGroup);
      modal.style.display = "none";
      tempValues = {};
      openParamGroup = null;
    }
    if (rhythmModal && e.target === rhythmModal && !e.target.closest('.modal-content')) {
      cancelSettings(currentBankNumber, "rhythm_parameter");
      rhythmModal.style.display = "none";
      tempValues = {};
      openParamGroup = null;
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
        bankSettings[currentBankNumber] = { ...currentValues };
        sharpButton.classList.toggle("active", newState === 1);
        showNotification(`Switched to ${newState === 1 ? 'Flat' : 'Sharp'}`, 'success');
      }
    });
  }

  const rhythmButton = document.getElementById("rhythm-button");
  if (rhythmButton) {
    addSvgTooltip(rhythmButton, "Open rhythm settings");
    rhythmButton.addEventListener("click", async () => {
      if (!controller.isConnected()) {
        showNotification("Device not connected", "error");
        return;
      }
      openParamGroup = 'rhythm_parameter';
      originalPresetValues = { ...currentValues };
      tempValues = { ...originalPresetValues };
      await checkbox_array();
      document.getElementById("rhythm-modal").style.display = 'block';
    });
  }

 const saveToBankBtn = document.getElementById('save-to-bank-btn');
  if (saveToBankBtn) {
    saveToBankBtn.addEventListener('click', async () => {
      const targetBank = parseInt(document.getElementById('bank_number_selection').value);
      if (save_current_settings(targetBank)) {
        // Wait for save to complete before loading the bank
        const checkSave = setInterval(async () => {
          if (!controller.pendingSave) {
            clearInterval(checkSave);
            await loadBankSettings(targetBank);
          }
        }, 100);
      }
    });
  }

  const exportSettingsBtn = document.getElementById('export-settings-btn');
  if (exportSettingsBtn) {
    exportSettingsBtn.addEventListener('click', () => {
      if (controller.isConnected()) {
        var sysex_array = Array(controller.parameter_size || 199).fill(0);
        for (let address = 0; address < sysex_array.length; address++) {
          const value = currentValues[address] !== undefined ? currentValues[address] : defaultValues[address] || 0;
          sysex_array[address] = value;
        }
        let output_base64 = sysex_array.join(";");
        const encoded = btoa(output_base64);
        navigator.clipboard.writeText(encoded);
        showNotification("Preset code copied to clipboard", "success");
      } else {
        showNotification("Device not connected", "error");
      }
    });
  }

  const loadSettingsBtn = document.getElementById('load-settings-btn');
  if (loadSettingsBtn) {
    loadSettingsBtn.addEventListener('click', async () => {
      if (controller.isConnected()) {
        let preset_code = prompt('Paste preset code');
        if (preset_code != null) {
          const presetParameters = decodePresetData(preset_code);
          if (presetParameters.length !== (controller.parameter_size || 199)) {
            showNotification("Malformed preset code", "error");
            return;
          }
          for (let i = 2; i < presetParameters.length; i++) {
            controller.sendParameter(i, presetParameters[i]);
          }
          controller.sendParameter(0, 0);
          currentValues = { ...defaultValues, ...presetParameters.reduce((acc, val, idx) => ({ ...acc, [idx]: val }), {}) };
          bankSettings[currentBankNumber] = { ...currentValues };
          await generateGlobalSettingsForm();
          updateLEDBankColor();
          showNotification("Preset loaded successfully", "success");
        }
      } else {
        showNotification("Device not connected", "error");
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
    });
  }

  init();
});