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
// const NodeMediaServer = require('node-media-server');

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

        rtmpUrl = 'rtmp://rtmp.cdnnow.ru:1940/live/user58272_1?user=user58272.stream@cdnnow.ru&pass=WDomVMUmjjDN';
        console.log(rtmpUrl);

        ffmpeg_process = spawn("ffmpeg", [
            '-re',
            '-i','-',
            '-c:v','libx264','-x264-params','keyint=50:scenecut=0',
            '-c:a','aac',
            '-r','25',
            '-f','flv',
            rtmpUrl,
        ]);

        ffmpeg_process.on("error", function (e) {
            console.error("ffmpeg process error:", e);
            socket.emit("error", `ffmpeg process error! ${e}`);
            socket.disconnect();
        });

        feedStream = function (data) {
            console.log('DATA', data);
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

/*const nms = new NodeMediaServer({
    logType: 3,
    auth: {
        user: 'hsa@media@server',
        password: 'XZY9hZEEZBi9PwKyOv1t'
    },
    rtmp: {
        port: 1935,
        chunk_size: 60000,
        gop_cache: true,
        ping: 30,
        ping_timeout: 60
    },
    http: {
        port: 8033,
        allow_origin: '*'
    },
    https: {
        port: 8533,
        key:'./abels-key.pem',
        cert:'./abels-cert.pem',
    }
});*/

//nms.run();