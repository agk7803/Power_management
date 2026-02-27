const express = require("express");
const SerialPort = require("serialport");
const ReadlineParser = require("@serialport/parser-readline");

const app = express();
const PORT = 5050;

// CHANGE COM PORT
const serial = new SerialPort.SerialPort({
    path: "/dev/cu.usbserial-0001",   // Windows: COM3, Mac: /dev/tty.usbserial...
    baudRate: 115200,
});

const parser = serial.pipe(new ReadlineParser.ReadlineParser({ delimiter: "\n" }));

let latestData = "{}";

parser.on("data", (line) => {
    console.log("ESP:", line);
    latestData = line;
});

app.get("/data", (req, res) => {
    res.json(JSON.parse(latestData));
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});