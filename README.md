# Gameboy Printer Emulator Server

This is a [node.js](https://nodejs.org/) command line interface designed to be used with the [Arduino Gameboy Printer Emulator](https://github.com/mofosyne/arduino-gameboy-printer-emulator) project.

It allows printouts from the emulator to immediately be sent to a bluetooth device such as an Android phone, alongside saving the printouts locally.

## Installation

Run the following commands in a folder of your choice.

```bash
sudo apt install obexftp bluetoothctl build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev
git clone https://github.com/KiwifruitDev/gameboy-printer-emulator-server.git
cd gameboy-printer-emulator-server
npm install
```

## Usage

You must configure the server before it can be used.

Run the following command to start the server.

```bash
node .
```

The server may be stopped by pressing `Ctrl+C`.

## Configuration

The server can be configured by editing the `config.json` file.

An example configuration file is provided in `config-example.json` or below.

```json
{
    "serialPort": "/dev/ttyUSB0",
    "baudRate": 115200,
    "defaultPalette": "grayscale",
    "palettes": [
        "grayscale",
        "dmg",
        "gameboypocket",
        "gameboycoloreuus",
        "gameboycolorjp",
        "bgb",
        "grafixkidgray",
        "grafixkidgreen",
        "blackzero"
    ],
    "saveLocally": true,
    "bluetoothEnabled": true,
    "bluetoothAddress": "74:74:46:D2:32:57",
    "bluetoothPaired": false,
    "obexPushChannel": 7,
    "silent": true
}
```

### serialPort

The serial port that the Arduino is connected to.

### baudRate

The baud rate of the serial connection.

### defaultPalette

The default palette to use as the header file and for bluetooth file transfers.

### palettes

The palettes to be saved. The default palette must be included in this list.

### saveLocally

Whether or not to save the printouts locally.

### bluetoothEnabled

Whether or not to enable bluetooth.

### bluetoothAddress

The bluetooth address of the device to send the printouts to.

### bluetoothPaired

Whether or not the device is already paired with the computer.

If this is set to `false`, the server will attempt to pair with the device using `bluetoothctl`.

### obexPushChannel

The channel to use for the bluetooth connection.

To check which obex PUSH channel is available, run the following command.

```bash
bluetoothctl
# This will open the bluetoothctl console
scan on
# Wait for the device to appear
scan off
pair <MAC address>
trust <MAC address>
quit
# Back to the command line
touch test.txt
obexftp --nopath --noconn --uuid none --bluetooth <MAC address> --channel <channel> --put test.txt
rm test.txt
```

Replace `<MAC address>` with the bluetooth address of the device and `<channel>` with the channel to test.

You may guess by counting the channel up until you recieve a bluetooth file transfer on your device.

### silent

Whether or not to log to the console.

## License

This project is licensed under the GPL v3.0 License, see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Arduino Gameboy Printer Emulator](https://github.com/mofosyne/arduino-gameboy-printer-emulator) (for the Arduino code)
- [RetroSpy Technologies](https://retro-spy.com/) (for providing prebuilt Arduino emulators)
