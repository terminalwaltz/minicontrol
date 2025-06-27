var parameters = null;
var currentValues = {};
var controller = new MiniChordController();
var tempValues = {};
var bankSettings = {};
var currentPreset = 0;
var presetNames = JSON.parse(localStorage.getItem('presetNames')) || {};
const bankNames = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l"];
let defaultValues = {};
let originalPresetValues = {};
let isLoadingPreset = false;
let isInitializing = false;
let midiResponseQueue = [];
let loadBankSettingsCount = 0;
let lastMidiProcessed = 0;
let openParamGroup = null;

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
            parameters = { global_parameter: [], harp_parameter: [], chord_parameter: [], potentiometer: [] };
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

function updatePresetButtons() {
    const presetButtons = document.querySelectorAll(".preset-button");
    if (presetButtons.length === 0) {
        console.warn("No preset buttons found: .preset-button");
        return;
    }
    presetButtons.forEach((button, index) => {
        button.classList.remove("active");
        if (index === currentPreset) {
            button.classList.add("active");
        }
    });
    console.log(`Updated preset buttons: currentPreset=${currentPreset}`);
}

function updateLEDBankColor() {
    const bankColor = currentValues[20] !== undefined ? currentValues[20] : defaultValues[20] !== undefined ? defaultValues[20] : 120;
    const floatMultiplier = 1;
    const normalizedColor = bankColor / floatMultiplier;
    const colorIndex = Math.min(23, Math.floor(normalizedColor / 15));
    
    console.log(`updateLEDBankColor: bankColor=${bankColor}, floatMultiplier=${floatMultiplier}, normalizedColor=${normalizedColor}, colorIndex=${colorIndex}, currentPreset=${currentPreset}`);
    
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
    
    console.log(`Applied class: color-${colorIndex}, fill: ${colorMap[colorIndex]}`);
}

async function generateGlobalSettingsForm() {
    const params = await loadParameters();
    const form = document.querySelector(".global-settings");
    if (!form) {
        console.error("Global settings form not found: .global-settings");
        return;
    }
    const formBody = document.getElementById("global-settings-form");
    formBody.innerHTML = "";

    const groupParams = (params.global_parameter || []).filter(param => param.group !== "hidden");
    if (groupParams.length === 0) {
        form.innerHTML = "<p>No parameters available.</p>";
        return;
    }

    groupParams.forEach(param => {
        if (!param.ui_type || !["button", "switch", "slider", "select"].includes(param.ui_type)) {
            console.warn(`Invalid ui_type for global parameter: ${param.name || 'unnamed'} (sysex_adress: ${param.sysex_adress})`);
            return;
        }
        const container = document.createElement("div");
        const label = document.createElement("label");
        label.textContent = param.name;
        label.setAttribute("for", `global-param-${param.sysex_adress}`);
        let input;
        const floatMultiplier = param.sysex_adress === 20 ? 1 : (controller.float_multiplier || 1);
        const currentValue = currentValues[param.sysex_adress] !== undefined 
            ? currentValues[param.sysex_adress] 
            : (param.data_type === "float" ? param.default_value * floatMultiplier : param.default_value);
        if (param.ui_type === "button" || param.ui_type === "switch") {
            input = document.createElement("input");
            input.type = "checkbox";
            input.id = `global-param-${param.sysex_adress}`;
            input.name = param.name;
            input.checked = currentValue === 1;
            input.addEventListener("change", (e) => {
                const value = e.target.checked ? 1 : 0;
                currentValues[param.sysex_adress] = value;
                bankSettings[currentPreset] = { ...currentValues };
                console.log(`[GLOBAL] Sending sysex=${param.sysex_adress}, value=${value}, name=${param.name}`);
                controller.sendParameter(parseInt(param.sysex_adress), value);
            });
        } else if (param.ui_type === "slider") {
            input = document.createElement("input");
            input.type = "range";
            input.id = `global-param-${param.sysex_adress}`;
            input.name = param.name;
            input.min = param.min_value;
            input.max = param.max_value;
            input.value = currentValue / (param.data_type === "float" ? floatMultiplier : 1);
            input.step = param.data_type === "float" ? 0.01 : 1;
            input.addEventListener("input", (e) => {
                const value = param.data_type === "float" ? parseFloat(e.target.value) * floatMultiplier : parseInt(e.target.value);
                currentValues[param.sysex_adress] = value;
                bankSettings[currentPreset] = { ...currentValues };
                console.log(`[GLOBAL] Sending sysex=${param.sysex_adress}, value=${value}, name=${param.name}`);
                controller.sendParameter(parseInt(param.sysex_adress), value);
                if (param.sysex_adress === 20) {
                    console.log(`Global slider changed: sysex=20, value=${value}`);
                    updateLEDBankColor();
                }
            });
        } else if (param.ui_type === "select") {
            input = document.createElement("select");
            input.id = `global-param-${param.sysex_adress}`;
            input.name = param.name;
            const isWaveform = param.name.toLowerCase().includes("waveform");
            for (let i = param.min_value; i <= param.max_value; i++) {
                if (isWaveform && i > 11) continue;
                const option = document.createElement("option");
                option.value = i;
                option.textContent = isWaveform ? waveformMap[i] || i : param.name.toLowerCase().includes("octave") ? `Octave ${i}` : i;
                input.appendChild(option);
            }
            input.value = currentValue;
            input.addEventListener("change", (e) => {
                const value = parseInt(e.target.value);
                currentValues[param.sysex_adress] = value;
                bankSettings[currentPreset] = { ...currentValues };
                console.log(`[GLOBAL] Sending sysex=${param.sysex_adress}, value=${value}, name=${param.name}${isWaveform ? `, waveform=${waveformMap[value]}` : ''}`);
                controller.sendParameter(parseInt(param.sysex_adress), value);
                if (param.sysex_adress === 20) {
                    console.log(`Global select changed: sysex=20, value=${value}`);
                    updateLEDBankColor();
                }
            });
        }
        container.appendChild(label);
        container.appendChild(input);
        formBody.appendChild(container);
    });
}

async function generateSettingsForm(paramGroup) {
    if (paramGroup === "global_parameter") return;
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

        if (groupName === "Rhythm") {
            const rhythmContainer = document.createElement("div");
            rhythmContainer.className = "rhythm-grid";
            groupedParams[groupName].forEach(param => {
                if (!param.ui_type || !["slider"].includes(param.ui_type)) {
                    console.warn(`Invalid ui_type for rhythm parameter: ${param.name || 'unnamed'} (sysex_adress: ${param.sysex_adress})`);
                    return;
                }
                const container = document.createElement("div");
                const label = document.createElement("label");
                label.textContent = param.name.replace("rhythm pattern step ", "Step ");
                label.setAttribute("for", `param-${param.sysex_adress}`);
                const input = document.createElement("input");
                input.type = "range";
                input.id = `param-${param.sysex_adress}`;
                input.name = param.name;
                input.min = param.min_value;
                input.max = param.max_value;
                const floatMultiplier = param.data_type === "float" ? (controller.float_multiplier || 1) : 1;
                const currentValue = tempValues[param.sysex_adress] !== undefined 
                    ? tempValues[param.sysex_adress] 
                    : (param.data_type === "float" ? param.default_value * floatMultiplier : param.default_value);
                input.value = currentValue / floatMultiplier;
                input.step = param.data_type === "float" ? 0.01 : 1;
                input.addEventListener("input", (e) => {
                    const value = param.data_type === "float" ? parseFloat(e.target.value) * floatMultiplier : parseInt(e.target.value);
                    tempValues[param.sysex_adress] = value;
                    console.log(`[MODAL] Sending sysex=${param.sysex_adress}, value=${value}, name=${param.name}`);
                    controller.sendParameter(parseInt(param.sysex_adress), value);
                });
                container.appendChild(label);
                container.appendChild(input);
                rhythmContainer.appendChild(container);
            });
            column.appendChild(rhythmContainer);
        } else {
            groupedParams[groupName].forEach(param => {
                if (!param.ui_type || !["button", "switch", "slider", "select"].includes(param.ui_type)) {
                    console.warn(`Invalid ui_type for parameter: ${param.name || 'unnamed'} (sysex_adress: ${param.sysex_adress})`);
                    return;
                }
                const container = document.createElement("div");
                const label = document.createElement("label");
                label.textContent = param.name;
                label.setAttribute("for", `param-${param.sysex_adress}`);
                let input;
                const floatMultiplier = param.data_type === "float" ? (controller.float_multiplier || 1) : 1;
                const currentValue = tempValues[param.sysex_adress] !== undefined 
                    ? tempValues[param.sysex_adress] 
                    : (param.data_type === "float" ? param.default_value * floatMultiplier : param.default_value);
                if (param.ui_type === "button" || param.ui_type === "switch") {
                    input = document.createElement("input");
                    input.type = "checkbox";
                    input.id = `param-${param.sysex_adress}`;
                    input.name = param.name;
                    input.checked = currentValue === 1;
                    input.addEventListener("change", (e) => {
                        const value = e.target.checked ? 1 : 0;
                        tempValues[param.sysex_adress] = value;
                        console.log(`[MODAL] Sending sysex=${param.sysex_adress}, value=${value}, name=${param.name}`);
                        controller.sendParameter(parseInt(param.sysex_adress), value);
                    });
                } else if (param.ui_type === "slider") {
                    input = document.createElement("input");
                    input.type = "range";
                    input.id = `param-${param.sysex_adress}`;
                    input.name = param.name;
                    input.min = param.min_value;
                    input.max = param.max_value;
                    input.value = currentValue / floatMultiplier;
                    input.step = param.data_type === "float" ? 0.01 : 1;
                    input.addEventListener("input", (e) => {
                        const value = param.data_type === "float" ? parseFloat(e.target.value) * floatMultiplier : parseInt(e.target.value);
                        tempValues[param.sysex_adress] = value;
                        console.log(`[MODAL] Sending sysex=${param.sysex_adress}, value=${value}, name=${param.name}`);
                        controller.sendParameter(parseInt(param.sysex_adress), value);
                    });
                } else if (param.ui_type === "select") {
                    input = document.createElement("select");
                    input.id = `param-${param.sysex_adress}`;
                    input.name = param.name;
                    const isWaveform = param.name.toLowerCase().includes("waveform");
                    for (let i = param.min_value; i <= param.max_value; i++) {
                        if (isWaveform && i > 11) continue;
                        const option = document.createElement("option");
                        option.value = isWaveform ? waveformMap[i] : i;
                        option.textContent = isWaveform ? waveformMap[i] || i : param.name.toLowerCase().includes("octave") ? `Octave ${i}` : i;
                        input.appendChild(option);
                    }
                    input.value = isWaveform ? waveformMap[currentValue] || currentValue : currentValue;
                    input.addEventListener("change", (e) => {
                        const value = isWaveform 
                            ? parseInt(Object.keys(waveformMap).find(key => waveformMap[key] === e.target.value) || e.target.value)
                            : parseInt(e.target.value);
                        tempValues[param.sysex_adress] = value;
                        console.log(`[MODAL] Sending sysex=${param.sysex_adress}, value=${value}, name=${param.name}${isWaveform ? `, waveform=${waveformMap[value]}` : ''}`);
                        controller.sendParameter(parseInt(param.sysex_adress), value);
                    });
                }
                container.appendChild(label);
                container.appendChild(input);
                column.appendChild(container);
            });
        }
        form.appendChild(column);
    });
}

async function loadBankSettings(bankIndex) {
    if (isLoadingPreset) {
        console.log(`loadBankSettings: skipped, already loading preset ${currentPreset}, count=${++loadBankSettingsCount}, time=${new Date().toISOString()}`);
        return;
    }
    if (bankIndex === currentPreset && !isInitializing && bankIndex === controller.active_bank_number) {
        console.log(`loadBankSettings: skipped, already on preset ${bankIndex}, active_bank_number=${controller.active_bank_number}, count=${++loadBankSettingsCount}, time=${new Date().toISOString()}`);
        return;
    }

    isLoadingPreset = true;
    console.log(`loadBankSettings: starting for bankIndex=${bankIndex}, count=${++loadBankSettingsCount}, active_bank_number=${controller.active_bank_number}, time=${new Date().toISOString()}`);
    
    currentPreset = bankIndex;
    const prevValues = { ...currentValues };
    currentValues = { ...defaultValues, ...(bankSettings[bankIndex] || {}) };

    console.log(`loadBankSettings: bankIndex=${bankIndex}, currentValues=`, JSON.stringify(currentValues));
    
    controller.sendParameter(0, bankIndex);
    console.log(`loadBankSettings: sent bank select sysex=0, value=${bankIndex}`);
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    await generateGlobalSettingsForm();

    for (let address in currentValues) {
        if (currentValues[address] !== prevValues[address]) {
            controller.sendParameter(parseInt(address), currentValues[address]);
            console.log(`loadBankSettings: sent sysex=${address}, value=${currentValues[address]}`);
        }
    }

    const modal = document.getElementById("settings-modal");
    controller.saveCurrentSettings(bankIndex);
    updateLEDBankColor();
    updatePresetButtons();

    if (modal && modal.style.display === "block" && openParamGroup && openParamGroup !== "global_parameter") {
        originalPresetValues = { ...currentValues };
        tempValues = { ...originalPresetValues };
        await generateSettingsForm(openParamGroup);
        console.log(`loadBankSettings: refreshed modal UI for paramGroup=${openParamGroup}, currentPreset=${currentPreset}`);
    }

    isLoadingPreset = false;
    console.log(`loadBankSettings: completed for bankIndex=${bankIndex}, count=${loadBankSettingsCount}`);
    
    await processMidiQueue();
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
        if (bankNumber !== currentPreset && bankNumber !== controller.active_bank_number && !isLoadingPreset) {
            console.log(`processMidiQueue: triggering loadBankSettings for bank ${bankNumber}, currentPreset=${currentPreset}`);
            await loadBankSettings(bankNumber);
        } else {
            console.log(`processMidiQueue: skipped loadBankSettings: bankNumber=${bankNumber}, currentPreset=${currentPreset}, active_bank_number=${controller.active_bank_number}, isLoadingPreset=${isLoadingPreset}`);
        }
    }
}

async function init() {
    isInitializing = true;
    console.log('init: starting, time=', new Date().toISOString());
    await initializeDefaultValues();
    controller.initialize();
    // Check initial connection state
    if (controller.isConnected()) {
        console.log('init: minichord is connected, updating status');
        updateConnectionStatus(true, 'initial check');
    } else {
        console.log('init: minichord not connected');
        updateConnectionStatus(false, 'initial check: not connected');
    }
    await loadBankSettings(0);
    isInitializing = false;
    console.log('init: completed, processing queued MIDI responses, time=', new Date().toISOString());
    await processMidiQueue();
}

function updateConnectionStatus(connected, message) {
    const statusElement = document.getElementById("connection-status");
    const body = document.body;
    if (connected) {
        statusElement.className = "connection-status connected";
        body.classList.remove("control_full");
        console.log(`updateConnectionStatus: connected, message=${message}`);
    } else {
        statusElement.className = "connection-status disconnected";
        body.classList.add("control_full");
        const elements = document.getElementsByClassName("active");
        while (elements.length > 0) {
            elements[0].classList.add("inactive");
            elements[0].classList.remove("active");
        }
        window.scrollTo(0, 0);
        console.log(`updateConnectionStatus: disconnected, message=${message}`);
    }
}

async function openModal(paramGroup) {
    openParamGroup = paramGroup;
    const modal = document.getElementById("settings-modal");

    if (paramGroup === "global_parameter") {
        modal.style.display = "block";
        await generateGlobalSettingsForm();
        return;
    }

    originalPresetValues = { ...currentValues, ...(bankSettings[currentPreset] || {}) };
    tempValues = { ...originalPresetValues };
    console.log(`openModal: paramGroup=${paramGroup}, originalPresetValues=`, JSON.stringify(originalPresetValues));

    await generateSettingsForm(paramGroup);

    if (!modal.querySelector(".settings-buttons")) {
        const buttonsContainer = document.createElement("div");
        buttonsContainer.className = "settings-buttons";
        const saveBtn = document.createElement("button");
        saveBtn.id = "save-btn";
        saveBtn.className = "save-btn";
        saveBtn.textContent = "Save";
        const cancelBtn = document.createElement("button");
        cancelBtn.id = "cancel-btn";
        cancelBtn.className = "cancel-btn";
        cancelBtn.textContent = "Cancel";
        buttonsContainer.appendChild(saveBtn);
        buttonsContainer.appendChild(cancelBtn);
        modal.querySelector(".settings-content").prepend(buttonsContainer);
    }

    modal.style.display = "block";

    const saveBtn = document.getElementById("save-btn");
    const cancelBtn = document.getElementById("cancel-btn");

    saveBtn.removeEventListener("click", saveSettings);
    cancelBtn.removeEventListener("click", cancelSettings);

    saveBtn.addEventListener("click", () => {
        saveSettings(currentPreset, paramGroup);
        modal.style.display = "none";
        openParamGroup = null;
    });

    cancelBtn.addEventListener("click", () => {
        cancelSettings(currentPreset, paramGroup);
        modal.style.display = "none";
        openParamGroup = null;
    });
}

function saveSettings(presetId, paramGroup) {
    console.log(`saveSettings: before save, preset=${presetId}, tempValues=`, JSON.stringify(tempValues));
    currentValues = { ...tempValues };
    bankSettings[presetId] = { ...currentValues };
    controller.saveCurrentSettings(presetId);
    localStorage.setItem('presetNames', JSON.stringify(presetNames));
    document.getElementById("settings-modal").style.display = "none";
    tempValues = {};
    console.log(`saveSettings: after save, preset=${presetId}, currentValues=`, JSON.stringify(currentValues));
    if (currentValues[20] !== undefined) {
        updateLEDBankColor();
    }
}

function cancelSettings(presetId, paramGroup) {
    console.log(`cancelSettings: before revert, preset=${presetId}, currentValues=`, JSON.stringify(currentValues));
    tempValues = { ...originalPresetValues };
    const modal = document.getElementById("settings-form");
    const params = parameters[paramGroup] || [];
    params.forEach(param => {
        const input = document.getElementById(`param-${param.sysex_adress}`);
        if (input) {
            const floatMultiplier = param.data_type === "float" ? (controller.float_multiplier || 1) : 1;
            const isWaveform = param.name.toLowerCase().includes("waveform");
            const presetValue = originalPresetValues[param.sysex_adress] !== undefined 
                ? originalPresetValues[param.sysex_adress] 
                : (param.data_type === "float" ? param.default_value * floatMultiplier : param.default_value);
            if (param.ui_type === "button" || param.ui_type === "switch") {
                input.checked = presetValue === 1;
            } else if (param.ui_type === "slider") {
                input.value = presetValue / floatMultiplier;
            } else if (param.ui_type === "select") {
                input.value = isWaveform ? waveformMap[presetValue] || presetValue : presetValue;
            }
            controller.sendParameter(parseInt(param.sysex_adress), presetValue);
            console.log(`cancelSettings: restored sysex=${param.sysex_adress}, value=${presetValue}, name=${param.name}`);
        }
    });
    controller.sendParameter(8, 0);
    controller.saveCurrentSettings(presetId);
    document.getElementById("settings-modal").style.display = "none";
    tempValues = {};
    console.log(`cancelSettings: after revert, preset=${presetId}, currentValues=`, JSON.stringify(currentValues));
}

document.addEventListener('DOMContentLoaded', () => {
    controller.onDataReceived = async (processedData) => {
        const bankNumber = processedData.bankNumber;
        console.log(">> onDataReceived from hardware, bank:", bankNumber);

        if (!bankSettings[bankNumber]) {
            bankSettings[bankNumber] = {};
        }

        processedData.parameters.forEach((value, index) => {
            if (value !== undefined) {
                bankSettings[bankNumber][index] = value;
            }
        });

        currentPreset = bankNumber;
        currentValues = { ...defaultValues, ...bankSettings[bankNumber] };

        await generateGlobalSettingsForm();
        updateLEDBankColor();
        updatePresetButtons();

        const modal = document.getElementById("settings-modal");
        if (modal && modal.style.display === "block" && openParamGroup && openParamGroup !== "global_parameter") {
            originalPresetValues = { ...currentValues };
            tempValues = { ...originalPresetValues };
            await generateSettingsForm(openParamGroup);
            console.log(`onDataReceived: refreshed modal UI for paramGroup=${openParamGroup}, currentPreset=${currentPreset}`);
        }

        console.log(">> UI updated to reflect new bank:", bankNumber);
    };

    controller.onConnectionChange = function(connected, message) {
        console.log(`onConnectionChange: connected=${connected}, message=${message}, isConnected=${controller.isConnected()}`);
        updateConnectionStatus(connected, message);
    };

    // Check connection state after a short delay to ensure controller is initialized
    setTimeout(() => {
        const isConnected = controller.isConnected();
        console.log(`Delayed check: minichord isConnected=${isConnected}`);
        updateConnectionStatus(isConnected, `delayed check: ${isConnected ? 'connected' : 'not connected'}`);
    }, 1000);

    const modal = document.getElementById("settings-modal");
    window.addEventListener("click", (e) => {
        if (e.target === modal) {
            cancelSettings(currentPreset, openParamGroup || document.getElementById("settings-title").textContent.toLowerCase().replace(/ /g, "_"));
            modal.style.display = "none";
            tempValues = {};
            openParamGroup = null;
        }
    });

    document.querySelectorAll(".preset-button").forEach((button, index) => {
        button.addEventListener("click", () => {
            console.log(`Preset button clicked: index=${index}`);
            loadBankSettings(index);
        });
    });

    document.querySelectorAll(".chord-button").forEach(button => {
        button.addEventListener("click", () => openModal("chord_parameter"));
    });

    const harpPlate = document.getElementById("harp-plate");
    harpPlate.addEventListener("click", () => openModal("harp_parameter"));

    const potMappings = {
        "chord-volume-pot": { paramGroup: "chord_potentiometer" },
        "harp-volume-pot": { paramGroup: "harp_potentiometer" },
        "mod-pot": { paramGroup: "modulation_potentiometer" }
    };
    document.querySelectorAll(".pot").forEach(pot => {
        pot.addEventListener("click", () => openModal(potMappings[pot.id].paramGroup));
    });

    document.getElementById("preset-up").addEventListener("click", () => {
        currentPreset = (currentPreset + 1) % 12;
        loadBankSettings(currentPreset);
    });
    document.getElementById("preset-down").addEventListener("click", () => {
        currentPreset = (currentPreset - 1 + 12) % 12;
        loadBankSettings(currentPreset);
    });

    const sharpButton = document.getElementById("sharp-button");
    sharpButton.addEventListener("click", () => {
        const currentState = currentValues[31] || 0;
        const newState = currentState === 0 ? 1 : 0;
        controller.sendParameter(31, newState);
        currentValues[31] = newState;
        bankSettings[currentPreset] = { ...currentValues };
        sharpButton.textContent = newState === 1 ? "Sharp" : "Flat";
        sharpButton.classList.toggle("active", newState === 1);
        console.log(`Sharp button: sent sysex=31, value=${newState}`);
    });
    document.getElementById("rhythm-button").addEventListener("click", () => controller.sendParameter(17, 127));

    init();
});