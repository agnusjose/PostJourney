import asyncio
import csv
import threading
from collections import deque
from datetime import datetime
from queue import Queue, Empty
import tkinter as tk
from tkinter import ttk

import matplotlib
matplotlib.use("TkAgg")
from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg
from matplotlib.figure import Figure

from bleak import BleakClient, BleakScanner

# ==============================
# CONFIGURATION
# ==============================

DEVICE_NAME = "HealthMonitor_XIAO"
CHAR_UUID = "6e400003-b5a3-f393-e0a9-e50e24dcca9e"
LOG_TO_CSV = False
DEVICE_ADDRESS = None
SCAN_RETRIES = 5
SCAN_TIMEOUT_SEC = 10.0
CONNECT_TIMEOUT_SEC = 20.0
CONNECT_RETRIES = 3

PLOT_MAX_POINTS = 120
PLOT_UPDATE_MS = 500

# ==============================
# GLOBALS
# ==============================

csv_file = None
csv_writer = None
stop_event = threading.Event()
sample_queue = Queue()


# ==============================
# BLE Notification Handler
# ==============================

def notification_handler(sender, data):
    decoded = data.decode()
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    try:
        values = dict(item.split(":") for item in decoded.split(","))

        hr = int(values.get("HR", 0))
        spo2 = int(values.get("SpO2", 0))
        ax = float(values.get("AX", 0))
        ay = float(values.get("AY", 0))
        az = float(values.get("AZ", 0))

        if LOG_TO_CSV:
            csv_writer.writerow([timestamp, hr, spo2, ax, ay, az])

        sample_queue.put((timestamp, hr, spo2, ax, ay, az, decoded))

    except Exception as e:
        sample_queue.put((timestamp, 0, 0, 0.0, 0.0, 0.0, f"Parse error: {e}"))


# ==============================
# Discover Device Automatically
# ==============================

async def discover_device():
    for attempt in range(1, SCAN_RETRIES + 1):
        if stop_event.is_set():
            return None
        print(f"Scanning for BLE device... (attempt {attempt}/{SCAN_RETRIES})")
        devices = await BleakScanner.discover(timeout=SCAN_TIMEOUT_SEC)

        if DEVICE_ADDRESS:
            for d in devices:
                if d.address == DEVICE_ADDRESS:
                    print("Using configured address:", DEVICE_ADDRESS)
                    return DEVICE_ADDRESS
            print("Configured address not seen in scan.")

        for d in devices:
            if d.name == DEVICE_NAME:
                print("Device found by name:", d.address)
                return d.address

        for d in devices:
            uuids = d.metadata.get("uuids") if hasattr(d, "metadata") else None
            if uuids and CHAR_UUID.lower() in [u.lower() for u in uuids]:
                print("Device found by UUID:", d.address)
                return d.address

        unnamed = [d for d in devices if d.name is None]
        if len(unnamed) == 1:
            print("Device name not visible. Using unnamed device:", unnamed[0].address)
            return unnamed[0].address
        elif len(unnamed) > 1:
            unnamed_sorted = sorted(unnamed, key=lambda d: getattr(d, "rssi", -999), reverse=True)
            best = unnamed_sorted[0]
            print("Multiple unnamed devices found. Using strongest signal:", best.address)
            return best.address

    return None


# ==============================
# Main Async Function
# ==============================

async def ble_main():
    global csv_file, csv_writer

    address = await discover_device()

    if address is None:
        print("Device not found. Make sure ESP32 is advertising.")
        return

    for attempt in range(1, CONNECT_RETRIES + 1):
        if stop_event.is_set():
            return
        print(f"Connecting to device... (attempt {attempt}/{CONNECT_RETRIES})")
        try:
            async with BleakClient(address, timeout=CONNECT_TIMEOUT_SEC) as client:
                if client.is_connected:
                    print("Bluetooth device is connected successfully (Python side)")
                else:
                    print("Failed to connect.")
                    continue

                try:
                    await client.start_notify(CHAR_UUID, notification_handler)
                    print("Notifications started")
                except Exception as e:
                    print("Start notify failed:", e)
                    continue

                if LOG_TO_CSV:
                    filename = "health_data_" + datetime.now().strftime("%Y%m%d_%H%M%S") + ".csv"
                    csv_file = open(filename, mode="w", newline="")
                    csv_writer = csv.writer(csv_file)
                    csv_writer.writerow(["Timestamp", "HeartRate", "SpO2", "AX", "AY", "AZ"])
                    print("Logging to:", filename)

                print("Receiving data... Close window to stop.")

                while not stop_event.is_set():
                    await asyncio.sleep(1)
                    if not client.is_connected:
                        print("Device disconnected.")
                        break

                return
        except Exception as e:
            print("Connection error:", e)
            await asyncio.sleep(1)

    print("Failed to connect after retries.")


def ble_thread_entry():
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        loop.run_until_complete(ble_main())
    finally:
        loop.close()


# ==============================
# GUI + Plot
# ==============================

class HealthMonitorGUI:
    def __init__(self, root):
        self.root = root
        self.root.title("Health Monitor - Live")
        self.root.geometry("980x640")

        self.hr_data = deque(maxlen=PLOT_MAX_POINTS)
        self.spo2_data = deque(maxlen=PLOT_MAX_POINTS)
        self.ax_data = deque(maxlen=PLOT_MAX_POINTS)
        self.ay_data = deque(maxlen=PLOT_MAX_POINTS)
        self.az_data = deque(maxlen=PLOT_MAX_POINTS)
        self.t_data = deque(maxlen=PLOT_MAX_POINTS)

        self.build_ui()
        self.schedule_update()

    def build_ui(self):
        top = ttk.Frame(self.root)
        top.pack(side=tk.TOP, fill=tk.X, padx=10, pady=10)

        self.hr_var = tk.StringVar(value="HR: --")
        self.spo2_var = tk.StringVar(value="SpO2: --")
        self.accel_var = tk.StringVar(value="Accel: --")
        self.raw_var = tk.StringVar(value="Raw: --")

        ttk.Label(top, textvariable=self.hr_var, font=("Segoe UI", 14)).pack(side=tk.LEFT, padx=10)
        ttk.Label(top, textvariable=self.spo2_var, font=("Segoe UI", 14)).pack(side=tk.LEFT, padx=10)
        ttk.Label(top, textvariable=self.accel_var, font=("Segoe UI", 12)).pack(side=tk.LEFT, padx=10)

        raw = ttk.Frame(self.root)
        raw.pack(side=tk.TOP, fill=tk.X, padx=10)
        ttk.Label(raw, textvariable=self.raw_var, font=("Consolas", 10)).pack(side=tk.LEFT)

        fig = Figure(figsize=(9, 4.8), dpi=100)
        self.ax1 = fig.add_subplot(2, 1, 1)
        self.ax2 = fig.add_subplot(2, 1, 2)

        self.ax1.set_title("Heart Rate & SpO2")
        self.ax1.set_ylabel("Value")
        self.ax1.grid(True, alpha=0.3)

        self.ax2.set_title("Accelerometer (m/s^2)")
        self.ax2.set_ylabel("Value")
        self.ax2.set_xlabel("Samples")
        self.ax2.grid(True, alpha=0.3)

        self.hr_line, = self.ax1.plot([], [], label="HR")
        self.spo2_line, = self.ax1.plot([], [], label="SpO2")
        self.ax1.legend(loc="upper right")

        self.ax_line_x, = self.ax2.plot([], [], label="AX")
        self.ax_line_y, = self.ax2.plot([], [], label="AY")
        self.ax_line_z, = self.ax2.plot([], [], label="AZ")
        self.ax2.legend(loc="upper right")

        canvas = FigureCanvasTkAgg(fig, master=self.root)
        canvas.get_tk_widget().pack(side=tk.TOP, fill=tk.BOTH, expand=True)
        self.canvas = canvas

    def schedule_update(self):
        self.update_from_queue()
        self.update_plot()
        self.root.after(PLOT_UPDATE_MS, self.schedule_update)

    def update_from_queue(self):
        updated = False
        while True:
            try:
                ts, hr, spo2, ax, ay, az, raw = sample_queue.get_nowait()
                updated = True
                self.hr_data.append(hr)
                self.spo2_data.append(spo2)
                self.ax_data.append(ax)
                self.ay_data.append(ay)
                self.az_data.append(az)
                self.t_data.append(ts)

                self.hr_var.set(f"HR: {hr} BPM")
                self.spo2_var.set(f"SpO2: {spo2} %")
                self.accel_var.set(f"Accel: X={ax:.2f} Y={ay:.2f} Z={az:.2f}")
                self.raw_var.set(f"Raw: {raw}")
            except Empty:
                break
        return updated

    def update_plot(self):
        x = list(range(len(self.hr_data)))
        self.hr_line.set_data(x, list(self.hr_data))
        self.spo2_line.set_data(x, list(self.spo2_data))

        self.ax_line_x.set_data(x, list(self.ax_data))
        self.ax_line_y.set_data(x, list(self.ay_data))
        self.ax_line_z.set_data(x, list(self.az_data))

        self.ax1.relim()
        self.ax1.autoscale_view()
        self.ax2.relim()
        self.ax2.autoscale_view()

        self.canvas.draw_idle()


# ==============================
# Entry
# ==============================

def main():
    ble_thread = threading.Thread(target=ble_thread_entry, daemon=True)
    ble_thread.start()

    root = tk.Tk()
    gui = HealthMonitorGUI(root)

    def on_close():
        stop_event.set()
        if csv_file:
            csv_file.close()
        root.destroy()

    root.protocol("WM_DELETE_WINDOW", on_close)
    root.mainloop()


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        stop_event.set()
        if csv_file:
            csv_file.close()
