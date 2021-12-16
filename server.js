const express = require('express');
const app = express();
const https = require('https');
const {Server} = require("socket.io");
const {spawn} = require('child_process');
const fs = require("fs");
const server = https.createServer({
    key: fs.readFileSync('abels-key.pem'),
    cert: fs.readFileSync('abels-cert.pem')
}, app);
const io = new Server(server);
const NodeMediaServer = require('node-media-server');

app.use(express.static('public'));

server.listen(443, () => {
    console.log('listening on *:443');
});

spawn("ffmpeg", ["-h"]).on("error", function (m) {
    console.error("FFMpeg not found in system cli; please install ffmpeg properly or make a soft link to ./!");
    console.error(m);
});

io.on("error", function (e) {
    console.error(`socket.io error: ${e}`);
});

io.on("connection", function (socket) {
    socket.emit("message", "Server connecting success!!!");
    socket.emit("start_stream");
    console.log("New connection ID: " + socket.id);

    let ffmpeg_process, feedStream = false;

    socket.on("start", function (rtmpUrl) {

        if (ffmpeg_process || feedStream) {
            socket.emit("message", "stream already started.");
            return;
        }

        if (!rtmpUrl) {
            socket.emit("error", "no RTMP destination given.");
            return;
        }

        socket._rtmpDestination = rtmpUrl;
        socket.emit("message", `rtmp destination set to: ${rtmpUrl}`);

        const ffmpegOptions = ["-i", "-", "-c:v", "libx264", "-preset", "fast", "-tune", "zerolatency", // video codec config: low latency, adaptive bitrate
            "-c:a", "aac", "-ar", "44100", "-b:a", "64k", // audio codec config: sampling frequency (11025, 22050, 44100), bitrate 64 kbits
            "-y", //force to overwrite
            "-use_wallclock_as_timestamps", "1", // used for audio sync
            "-async", "1", // used for audio sync
            // '-filter_complex', 'aresample=44100', // resample audio to 44100Hz, needed if input is not 44100
            // '-strict', 'experimental',
            "-bufsize", "1000", "-f", "flv", socket._rtmpDestination,];

        console.log(socket._rtmpDestination);

        ffmpeg_process = spawn("ffmpeg", ffmpegOptions);

        ffmpeg_process.on("error", function (e) {
            console.error("ffmpeg process error:", e);
            socket.emit("error", `ffmpeg process error! ${e}`);
            socket.disconnect();
        });

        ffmpeg_process.stderr.on('data', function (d) {
            console.log(`ffmpeg_stderr:`, d);
        });

        feedStream = function (data) {
            ffmpeg_process.stdin.write(data);
            ffmpeg_process.stdin.on('error', function (e) {
                console.error("ffmpeg stdin error:", e);
                socket.emit("error", `ffmpeg stdin error! ${e}`);
                socket.disconnect();
            });
        };

        ffmpeg_process.on("exit", function (e) {
            console.log(`child process exit: ${e}`);
            socket.emit("message", `ffmpeg exit! ${e}`);
            socket.disconnect();
        });

    });

    socket.on("stream_binary_data", function (m) {
        if (!feedStream) {
            socket.emit("error", "rtmp not set yet.");
            ffmpeg_process.stdin.end();
            ffmpeg_process.kill("SIGINT");
            return;
        }
        feedStream(m);
    });

    socket.on("disconnect", function () {
        feedStream = false;
        if (ffmpeg_process) try {
            ffmpeg_process.stdin.end();
            ffmpeg_process.kill("SIGINT");
            socket.emit("message", "socket disconnect");
        } catch (e) {
            console.warn("killing ffmoeg process attempt failed...");
            socket.emit("error", "killing ffmoeg process attempt failed...");
        }
    });

    socket.on("error", function (e) {
        console.error("socket.io error:", e);
        socket.emit("error", `socket.io error: ${e}`);
    });

});

const nms = new NodeMediaServer({
    logType: 3,
    rtmp: {
        port: 1935,
        chunk_size: 60000,
        gop_cache: true,
        ping: 30,
        ping_timeout: 60
    },
    http: {
        port: 8000,
        allow_origin: '*'
    },
    https: {
        port: 8443,
        key:'./abels-key.pem',
        cert:'./abels-cert.pem',
    }
});

nms.run();