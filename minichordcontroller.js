class MiniChordController {
  constructor() {
    this.device = false;
    this.parameter_size = 256;
    this.pendingSave = false; // Initialize pendingSave
    this.color_hue_sysex_adress = 20;
    this.base_adress_rythm = 220;
    this.potentiometer_memory_adress = [4, 5, 6];
    this.modulation_adress = [14, 10, 12, 16];
    this.volume_memory_adress = [2, 3];
    this.active_bank_number = -1;
    this.min_firmware_accepted = 0.02;
    this.firmware_adress = 7;
    this.float_multiplier = 100.0;
    this.MIDI_request_option = { sysex: true };
    this.onConnectionChange = null;
    this.onDataReceived = null;
    this.isProcessingData = false;
  }

  async initialize() {
    try {
      const midiAccess = await navigator.requestMIDIAccess(this.MIDI_request_option);
      return this.handleMIDIAccess(midiAccess); // Return the promise from handleMIDIAccess
    } catch (err) {
      console.error("MIDI init failed:", err);
      if (this.onConnectionChange) {
        this.onConnectionChange(false, "MIDI init failed: " + err.message); // Provide error message
      }
      return false; // Indicate failure
    }
  }

  async handleMIDIAccess(midiAccess) { // Make handleMIDIAccess async
    let foundOutput = false;
    let foundInput = false;

    for (const output of midiAccess.outputs.values()) {
      if (output.name.toLowerCase().includes("minichord")) {
        this.device = output;
        try {
          this.device.send([0xF0, 0, 0, 0, 0, 0xF7]); // Send initial message
          foundOutput = true;
        } catch (sendError) {
          console.error("Error sending initial SysEx:", sendError);
          this.device = false; // Reset device if send fails
          if (this.onConnectionChange) {
            this.onConnectionChange(false, "Error sending initial SysEx: " + sendError.message);
          }
          return false; // Indicate failure
        }
        break; // Stop searching after finding the first output
      }
    }

    for (const input of midiAccess.inputs.values()) {
      if (input.name.toLowerCase().includes("minichord")) {
        input.onmidimessage = (msg) => this.processCurrentData(msg);
        foundInput = true;
        break; // Stop searching after finding the first input
      }
    }

    if (!foundOutput || !foundInput) {
      this.device = false; // Ensure device is reset if not found
      if (this.onConnectionChange) {
        this.onConnectionChange(false, "Minichord not found.");
      }
      return false; // Indicate failure
    }

    midiAccess.onstatechange = (e) => this.handleStateChange(e);

    if (this.onConnectionChange) {
      this.onConnectionChange(true, "Minichord connected"); // Notify connection
    }
    return true; // Indicate success
  }

  handleStateChange(event) {
    const name = event.port.name.toLowerCase();
    if (event.port.state === "disconnected" && name.includes("minichord")) {
      this.device = false;
      if (this.onConnectionChange) {
        this.onConnectionChange(false, "Minichord disconnected");
      }
    }

    if (event.port.state === "connected" && !this.device && name.includes("minichord")) {
      this.initialize(); // Re-initialize on connect
    }
  }

processCurrentData(midiMessage) {
  const data = midiMessage.data.slice(1);
  const expectedLength = this.parameter_size * 2 + 1;
  if (data.length !== expectedLength) {
    console.warn(`[processCurrentData] Invalid data length, got ${data.length}, expected ${expectedLength}`);
    this.isProcessingData = false;
    return;
  }
  const processedData = {
    parameters: [],
    rhythmData: [],
    bankNumber: data[2 * 1],
    firmwareVersion: 0
  };
  for (let i = 2; i < this.parameter_size; i++) {
    const sysex_value = data[2 * i] + 128 * data[2 * i + 1];
    if (i === this.firmware_adress) {
      processedData.firmwareVersion = sysex_value / 100.0;
      console.log(`[PROCESS DATA] Firmware version: ${processedData.firmwareVersion}`);
    } else if (i >= this.base_adress_rythm && i < this.base_adress_rythm + 16) {
      const j = i - this.base_adress_rythm;
      const rhythmBits = [];
      for (let k = 0; k < 7; k++) {
        rhythmBits[k] = !!(sysex_value & (1 << k));
      }
      processedData.rhythmData[j] = rhythmBits;
      processedData.parameters[i] = sysex_value;
    } else {
      processedData.parameters[i] = sysex_value;
    }
    if (i === 32 || i === 20 || (i >= 187 && i <= 191) || i === 99 || i === 30) {
      console.log(`[PROCESS DATA] Sysex=${i}, value=${sysex_value}, bank=${processedData.bankNumber}`);
    }
  }
  this.active_bank_number = processedData.bankNumber;
  if (this.pendingSave) {
    console.log(`[processCurrentData] Received settings for bank ${processedData.bankNumber} after save, verifying...`);
    // Assuming index.js has a global currentValues
    if (typeof currentValues !== 'undefined') {
      for (let i = 2; i < this.parameter_size; i++) {
        if (processedData.parameters[i] !== undefined && currentValues[i] !== undefined) {
          if (processedData.parameters[i] !== currentValues[i]) {
            console.warn(`[processCurrentData] Mismatch for Sysex=${i}, device=${processedData.parameters[i]}, currentValues=${currentValues[i]}`);
          }
        }
      }
    }
  }
  if (this.onDataReceived) {
    this.onDataReceived(processedData);
  }
  this.isProcessingData = false;
}


  sendSysEx(bytes) {
    if (!this.device) return;
    const isInvalid = bytes.some(b => b >= 0xF0 && b !== 0xF7);
    if (isInvalid) {
      console.error("Invalid SysEx message:", bytes);
      return;
    }
    this.device.send([0xF0, ...bytes, 0xF7]);
  }
  sendParameter(address, value) {
  if (!this.device) {
    console.warn(`sendParameter: no device connected, address=${address}, value=${value}`);
    return false;
  }
  const finalValue = Math.round(value); // Force integer for all parameters
  const loVal = finalValue % 128;
  const hiVal = Math.floor(finalValue / 128);
  const loAddr = address % 128;
  const hiAddr = Math.floor(address / 128);
  try {
    this.sendSysEx([loAddr, hiAddr, loVal, hiVal]);
    console.log(`[SEND PARAMETER] Sysex=${address}, value=${finalValue}`);
    return true;
  } catch (error) {
    console.error(`sendParameter: failed, address=${address}, value=${finalValue}, error=`, error);
    return false;
  }
}

saveCurrentSettings(bankNumber) {
  if (!this.device) {
    console.warn(`[SAVE] No device connected for bank ${bankNumber}`);
    return false;
  }
  try {
    this.pendingSave = true;
    this.sendSysEx([0, 0, 2, bankNumber]);
    console.log(`[SAVE] Sent sysex=[0, 0, 2, ${bankNumber}] for bank ${bankNumber}`);
    // Simulate device acknowledgment (adjust timeout based on MIDI spec)
    setTimeout(() => {
      this.pendingSave = false;
      console.log(`[SAVE] Cleared pendingSave for bank ${bankNumber}`);
    }, 500); // Adjust based on Minichord save latency
    return true;
  } catch (error) {
    console.error(`[SAVE] Failed to send save command for bank ${bankNumber}:`, error);
    this.pendingSave = false;
    return false;
  }
}

  resetCurrentBank() {
    if (!this.device || this.active_bank_number === -1) return;
    this.sendSysEx([0, 0, 3, this.active_bank_number]);
  }

  resetMemory() {
    this.sendSysEx([0, 0, 1, 0]);
  }

  isConnected() {
    return !!this.device;
  }

  getDeviceInfo() {
    return {
      connected: this.isConnected(),
      activeBankNumber: this.active_bank_number,
      parameterSize: this.parameter_size,
      colorHueAddress: this.color_hue_sysex_adress,
      baseAddressRhythm: this.baseAddressRhythm,
      floatMultiplier: this.float_multiplier
    };
  }
  requestRhythmData() {
    if (!this.device) {
      console.warn('requestRhythmData: No device connected');
      return;
    }
    const sysex_message = [0xF0, 0, 0, 0, 0, 0x01, 0xF7]; // Command 0x01 for rhythm data
    this.device.send(sysex_message);
    console.log('requestRhythmData: Sent SysEx rhythm data request [F0, 0,0,0,0, 01, F7]');
  }

  getButtonState(name) {
    // Optional stub you can implement later for state tracking
    return 0;
  }
}