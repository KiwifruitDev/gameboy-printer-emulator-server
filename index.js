/*
    Gameboy Printer Emulator Server
        Licensed under GPLv3
    Copyright (C) 2023 KiwifruitDev
*/


// Import packages
const { SerialPort, ReadlineParser } = require('serialport');
const { execSync, exec } = require('child_process');
const fs = require('fs');

// Local imports
const gbp = require('./gbp_gameboyprinter2bpp.js');

// Config file
const config = require('./config.json');

// Connect USB serial interface from config.serialPort
const port = new SerialPort({
    path: config.serialPort,
    baudRate: config.baudRate
});

let curData = '';
let init = false;

// Pair with bluetooth device with bluetoothctl
if (config.bluetoothEnabled && !config.bluetoothPaired) {
    if(!config.silent) console.log('Pairing with bluetooth device... Set bluetoothPaired to true in config.json to skip this step');
    // Pair with bluetooth device
    try {
        // Delete bash script if it exists
        if (fs.existsSync('./pair.sh')) fs.unlinkSync('./pair.sh');
        // Write bash script to file
        fs.writeFileSync('./pair.sh',
            `#!/bin/bash\n`
            +`{ printf 'scan on\\n\\n'; `
            +`while ! grep -q '${config.bluetoothAddress}' <(bluetoothctl devices); `
            +`do sleep 1; done; printf 'scan off\\n\\n'; printf 'pair ${config.bluetoothAddress}\\n\\n'; `
            +`sleep 10; printf 'yes\\n\\n'; sleep 5; printf 'trust ${config.bluetoothAddress}\\n\\n'; `
            +`sleep 2; printf 'quit\\n\\n'; } | bluetoothctl`);
        // Make bash script executable
        fs.chmodSync('./pair.sh', 0o777);
        // Run bash script
        execSync('./pair.sh');
        // Delete bash script
        fs.unlinkSync('./pair.sh');
        // Load config file with fs
        let configData = fs.readFileSync('./config.json');
        // Parse config file as JSON
        let configJSON = JSON.parse(configData);
        // Set bluetoothPaired to true
        configJSON.bluetoothPaired = true;
        // Write config file
        fs.writeFileSync('./config.json', JSON.stringify(configJSON, null, 4));
        if(!config.silent) console.log('Paired with bluetooth device');
    } catch (err) {
        if(!config.silent) console.log('Error pairing with bluetooth device');
    }
}

// Continuously parse data from serial port
const parser = port.pipe(new ReadlineParser());

parser.on('data', function (data) {
    // Convert data to string
    var dataString = data.toString();
    // Empty data: return
    if (dataString === '') return;
    // DEBUG: Print data
    if(!config.silent) console.log(`${(init ? 'INIT' : 'DATA')}: ${dataString}`);
    // If init, just add it to curData
    if (init) {
        // Check for "// Timed Out"
        if (dataString.includes('{"command":"INQY", "status":{"LowBat":0,"ER2":0,"ER1":0,"ER0":0,"Untran":0,"Full":1,"Busy":0,"Sum":0}}')) {
            init = false;
            dataString += `${dataString}\n`;
            // Timestamp in format of YYYY-MM-DD_HH-MM-SS
            const timestamp = new Date().toISOString().replace(/:/g, '-').replace('T', '_').split('.')[0];
            for(let p = 0; p < config.palettes.length; p++) {
                // Render image
                const canvases = gbp.render(curData, config.palettes[p]);
                for(let i = 0; i < canvases.length; i++) {
                    const stream = canvases[i].createPNGStream();
                    // Create output folder if it doesn't exist
                    if (!fs.existsSync('./output')) {
                        fs.mkdirSync('./output');
                    }
                    if (!fs.existsSync(`./output/${timestamp}`)) {
                        fs.mkdirSync(`./output/${timestamp}`);
                    }
                    // Write to file
                    const out = fs.createWriteStream(`./output/${timestamp}/${i}_${config.palettes[p]}.png`);
                    stream.pipe(out);
                    // If default, move to output folder
                    if (config.palettes[p] === config.defaultPalette) {
                        fs.rename(`./output/${timestamp}/${i}_${config.palettes[p]}.png`, `./output/${timestamp}_${i}.png`, (err) => {
                            if (err && !config.silent) console.log(err);
                        });
                    }
                }
            }
            // Check if file exists
            if (fs.existsSync(`./output/${timestamp}_0.png`)) {
                // Initiate bluetooth transfer with config.bluetoothAddress using obexftp
                if (config.bluetoothEnabled) {
                    try {
                        exec(`obexftp --nopath --noconn --uuid none --bluetooth ${config.bluetoothAddress} --channel ${config.obexPushChannel} --put ./output/${timestamp}_0.png`, (err, stdout, stderr) => {});
                    }
                    catch (err) {}
                }
                // If saveLocally is not enabled, delete the file after 20 seconds
                if (!config.saveLocally) {
                    exec(`sleep 20 && rm ./output/${timestamp}_0.png && rm -r ./output/${timestamp}`);
                }
            }
            // If folder is empty, delete it
            if (fs.readdirSync(`./output/${timestamp}`).length === 0) {
                fs.rmdir(`./output/${timestamp}`, (err) => {
                    if (err && !config.silent) console.log(err);
                });
            }
            // If output folder is empty after 20 seconds, delete it
            exec(`sleep 20 && rmdir ./output`);
            return;
        }
    }
    // Parse as json
    else if(dataString.includes('"command":"INIT"')) {
        init = true;
        curData = '';
    }
    if (init) {
        curData += `${dataString}\n`;
    }
});

parser.on('error', function (err) {
    if(!config.silent) console.log('Error: ', err.message);
});
