/**
 * WristbandBLEService.js
 * BLE connection service for HealthMonitor_XIAO wristband.
 * Uses react-native-ble-plx to scan, connect, and read health data.
 *
 * Data format from device: "HR:<val>,SpO2:<val>,AX:<val>,AY:<val>,AZ:<val>"
 * Characteristic UUID (Nordic UART TX): 6e400003-b5a3-f393-e0a9-e50e24dcca9e
 * Service UUID (Nordic UART):           6e400001-b5a3-f393-e0a9-e50e24dcca9e
 */

import { Platform, PermissionsAndroid } from "react-native";

const DEVICE_NAME = "HealthMonitor_XIAO";
const DEVICE_ADDRESS = "B0:A6:04:05:13:C2"; // Known MAC address of the wristband
const SERVICE_UUID = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
const CHAR_UUID = "6e400003-b5a3-f393-e0a9-e50e24dcca9e";

let BleManager = null;

// Lazy-load BLE manager (so app doesn't crash if library not installed yet)
const getBleManager = () => {
  if (!BleManager) {
    try {
      const { BleManager: BM } = require("react-native-ble-plx");
      BleManager = new BM();
    } catch (e) {
      console.log("react-native-ble-plx not available, BLE disabled:", e.message);
      return null;
    }
  }
  return BleManager;
};

// Request Android BLE permissions
export const requestBLEPermissions = async () => {
  if (Platform.OS === "android") {
    const apiLevel = Platform.Version;
    if (apiLevel >= 31) {
      const granted = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ]);
      return Object.values(granted).every(
        (v) => v === PermissionsAndroid.RESULTS.GRANTED
      );
    } else {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
  }
  return true;
};

// Parse the data string from the wristband
export const parseHealthData = (rawString) => {
  try {
    const values = {};
    rawString.split(",").forEach((item) => {
      const [key, val] = item.split(":");
      if (key && val) values[key.trim()] = val.trim();
    });
    return {
      heartRate: parseInt(values.HR || "0", 10),
      spo2: parseInt(values.SpO2 || "0", 10),
      ax: parseFloat(values.AX || "0"),
      ay: parseFloat(values.AY || "0"),
      az: parseFloat(values.AZ || "0"),
      raw: rawString,
    };
  } catch (e) {
    return { heartRate: 0, spo2: 0, ax: 0, ay: 0, az: 0, raw: rawString };
  }
};

// Decode base64 characteristic value to string
const decodeBase64 = (base64) => {
  try {
    // atob equivalent for React Native
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
    let output = "";
    let i = 0;
    const str = base64.replace(/[^A-Za-z0-9+/=]/g, "");
    while (i < str.length) {
      const enc1 = chars.indexOf(str.charAt(i++));
      const enc2 = chars.indexOf(str.charAt(i++));
      const enc3 = chars.indexOf(str.charAt(i++));
      const enc4 = chars.indexOf(str.charAt(i++));
      const chr1 = (enc1 << 2) | (enc2 >> 4);
      const chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
      const chr3 = ((enc3 & 3) << 6) | enc4;
      output += String.fromCharCode(chr1);
      if (enc3 !== 64) output += String.fromCharCode(chr2);
      if (enc4 !== 64) output += String.fromCharCode(chr3);
    }
    return output;
  } catch (e) {
    return "";
  }
};

/**
 * Scan and connect to the HealthMonitor wristband.
 * First tries to connect directly by known MAC address (fast).
 * Falls back to name-based scan if direct connect fails.
 * @param {Function} onData - Called with parsed health data: { heartRate, spo2, ax, ay, az }
 * @param {Function} onStatus - Called with status updates: { connected, scanning, error, message }
 * @returns {{ disconnect: Function }} - Call disconnect() to stop
 */
export const connectToWristband = (onData, onStatus) => {
  const manager = getBleManager();
  let device = null;
  let subscription = null;
  let stopped = false;

  if (!manager) {
    onStatus({ connected: false, scanning: false, error: true, message: "BLE not available" });
    return { disconnect: () => {} };
  }

  const connectToDevice = async (targetDevice) => {
    try {
      onStatus({ connected: false, scanning: false, error: false, message: "Connecting..." });
      device = await targetDevice.connect({ timeout: 20000 });
      await device.discoverAllServicesAndCharacteristics();

      onStatus({ connected: true, scanning: false, error: false, message: "Connected!" });

      // Subscribe to notifications
      subscription = device.monitorCharacteristicForService(
        SERVICE_UUID,
        CHAR_UUID,
        (err, characteristic) => {
          if (stopped) return;
          if (err) {
            console.log("BLE notification error:", err.message);
            onStatus({ connected: false, scanning: false, error: true, message: "Connection lost" });
            return;
          }
          if (characteristic?.value) {
            const decoded = decodeBase64(characteristic.value);
            const parsed = parseHealthData(decoded);
            onData(parsed);
          }
        }
      );

      device.onDisconnected(() => {
        if (!stopped) {
          onStatus({ connected: false, scanning: false, error: false, message: "Device disconnected" });
        }
      });

      return true;
    } catch (e) {
      console.log("Connect error:", e.message);
      return false;
    }
  };

  const startConnect = async () => {
    if (stopped) return;

    const hasPermission = await requestBLEPermissions();
    if (!hasPermission) {
      onStatus({ connected: false, scanning: false, error: true, message: "BLE permissions denied" });
      return;
    }

    // ── STEP 1: Try direct connection by known MAC address ──────────
    try {
      onStatus({ connected: false, scanning: true, error: false, message: "Connecting to wristband..." });
      const knownDevice = await manager.connectToDevice(DEVICE_ADDRESS, { timeout: 10000 });
      await knownDevice.discoverAllServicesAndCharacteristics();

      if (!stopped) {
        device = knownDevice;
        onStatus({ connected: true, scanning: false, error: false, message: "Connected!" });

        subscription = device.monitorCharacteristicForService(
          SERVICE_UUID,
          CHAR_UUID,
          (err, characteristic) => {
            if (stopped) return;
            if (err) {
              console.log("BLE notification error:", err.message);
              onStatus({ connected: false, scanning: false, error: true, message: "Connection lost" });
              return;
            }
            if (characteristic?.value) {
              const decoded = decodeBase64(characteristic.value);
              const parsed = parseHealthData(decoded);
              onData(parsed);
            }
          }
        );

        device.onDisconnected(() => {
          if (!stopped) {
            onStatus({ connected: false, scanning: false, error: false, message: "Device disconnected" });
          }
        });
        return; // ✅ Direct connect succeeded
      }
    } catch (directErr) {
      console.log("Direct connect failed, falling back to scan:", directErr.message);
    }

    if (stopped) return;

    // ── STEP 2: Fallback — Scan by device name ───────────────────────
    onStatus({ connected: false, scanning: true, error: false, message: "Scanning for wristband..." });

    manager.startDeviceScan(null, null, async (error, scannedDevice) => {
      if (stopped) return;
      if (error) {
        onStatus({ connected: false, scanning: false, error: true, message: error.message });
        return;
      }

      const isMatch =
        scannedDevice?.name === DEVICE_NAME ||
        scannedDevice?.id === DEVICE_ADDRESS;

      if (isMatch) {
        manager.stopDeviceScan();
        await connectToDevice(scannedDevice);
      }
    });

    // Stop scan after 15 seconds if no device found
    setTimeout(() => {
      if (!stopped && !device) {
        manager.stopDeviceScan();
        onStatus({ connected: false, scanning: false, error: true, message: "Device not found. Make sure it's turned on." });
      }
    }, 15000);
  };

  startConnect();

  return {
    disconnect: () => {
      stopped = true;
      manager.stopDeviceScan();
      if (subscription) {
        subscription.remove();
        subscription = null;
      }
      if (device) {
        device.cancelConnection().catch(() => {});
        device = null;
      }
      onStatus({ connected: false, scanning: false, error: false, message: "Disconnected" });
    },
  };
};
