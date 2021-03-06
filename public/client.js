const startPlayBtn = document.getElementById("startPlayBtn");
const localVideo = document.getElementById("localVideo");

startPlayBtn.disabled = true;

let mediaRecorder,
    socket;

startPlayBtn.addEventListener('click', initPlayNow);

socket = io({secure: true});

socket.on("connect_error", function () {
    console.error("CONNECTION FAILED");
});

socket.on("message", function (m) {
    console.log("Server message", m);
});

socket.on("error", function (m) {
    console.error("ERROR: unexpected:", m);
    mediaRecorder.stop();
});

socket.on("disconnect", function () {
    console.error("ERROR: server disconnected!");
    mediaRecorder.stop();
});

socket.connect();

navigator.mediaDevices
    .getUserMedia({audio: true, video: true})
    .then((stream) => {
        localVideo.srcObject = stream;
        socket.emit("start");
        mediaRecorder = new MediaRecorder(stream);
        mediaRecorder.ondataavailable = (e) => socket.emit("stream_binary_data", e.data);
        mediaRecorder.start(250);
        setTimeout(() => initPlayNow(), 5000);
    })
    .catch(function (err) {
        console.error("The following error occurred:", err);
    });
startPlayBtn.disabled = false;

function initPlayNow(){
    new playernow('playerNow', {
        "name": "Test Stream",
        "playback": {
            "hls": {
                "url": "https://user58272.clients-cdnnow.ru/hls/user58272_1.m3u8"
            }
        },
        "lang": "ru",
        "logger": {
            "sentryDSN": "https://8bc71dfcbe19427e851fd22f6c1e69f4@sentry.cdnnow.ru/5",
            "sentryIgnoreErrors": [
                "Error: Network Error",
                "Error: Request failed with status code 403",
                "Error: Request failed with status code 404",
                "AbortError"
            ]
        },
        "viewers": {
            "serverUrl": "wss://counter.playernow.pro/ws",
            "enabled": true,
            "showCounter": true,
            "videoId": "58272daddef02a824f0d6ea0b60102f7641c6"
        },
        "autoplay": true
    });
}