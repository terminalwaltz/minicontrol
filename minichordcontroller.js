class MiniChordController {
  constructor() {
    this.device = false;
    this.parameter_size = 256;
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
      this.handleMIDIAccess(midiAccess);
      midiAccess.onstatechange = (e) => this.handleStateChange(e);
      return true;
    } catch (err) {
      console.error("MIDI init failed:", err);
      return false;
    }
  }

  handleMIDIAccess(midiAccess) {
    for (const entry of midiAccess.outputs) {
      const output = entry[1];
      if (output.name.toLowerCase().includes("minichord")) {
        this.device = output;
        this.device.send([0xF0, 0, 0, 0, 0, 0xF7]);
      }
    }

    for (const entry of midiAccess.inputs) {
      const input = entry[1];
      if (input.name.toLowerCase().includes("minichord")) {
        input.onmidimessage = (msg) => this.processCurrentData(msg);
      }
    }

    if (!this.device && this.onConnectionChange) {
      this.onConnectionChange(false, "minichord not found.");
    }
  }

  handleStateChange(event) {
    const name = event.port.name.toLowerCase();
    if (event.port.state === "disconnected" && name.includes("minichord")) {
      this.device = false;
      if (this.onConnectionChange) {
        this.onConnectionChange(false, "minichord disconnected");
      }
    }

    if (event.port.state === "connected" && !this.device && name.includes("minichord")) {
      this.handleMIDIAccess(event.target);
    }
  }

processCurrentData(midiMessage) {
  const data = midiMessage.data.slice(1);
  const expectedLength = this.parameter_size * 2 + 1;

  if (data.length !== expectedLength) {
    console.warn(`processCurrentData: Insufficient data length for parameters, got ${data.length}, expected ${expectedLength}`);
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
      processedData.firmwareVersion = sysex_value;
      if (processedData.firmwareVersion < this.min_firmware_accepted) {
        alert("Please update the minichord firmware");
      }
    } else if (i >= this.base_adress_rythm && i < this.base_adress_rythm + 16) {
      // Rhythm data: unpack to boolean array
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
  }

  // Override potentiometer and volume values for safety
  for (const i of this.potentiometer_memory_adress) {
    this.sendParameter(i, 512);
    processedData.parameters[i] = 512;
  }

  for (const i of this.volume_memory_adress) {
    this.sendParameter(i, 0.5 * this.float_multiplier);
    processedData.parameters[i] = 0.5 * this.float_multiplier;
  }

  this.active_bank_number = processedData.bankNumber;

  if (this.onDataReceived) {
    this.onDataReceived(processedData);
  }
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
  const loVal = value % 128;
  const hiVal = Math.floor(value / 128);
  const loAddr = address % 128;
  const hiAddr = Math.floor(address / 128);
  try {
    this.sendSysEx([loAddr, hiAddr, loVal, hiVal]);
    return true;
  } catch (error) {
    console.error(`sendParameter: failed, address=${address}, value=${value}, error=`, error);
    return false;
  }
}

  saveCurrentSettings(bankNumber) {
    if (!this.device) return;
    this.sendSysEx([0, 0, 2, bankNumber]);
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
      baseAddressRhythm: this.base_adress_rythm,
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
