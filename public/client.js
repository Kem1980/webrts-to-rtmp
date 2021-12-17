const id = Date.now();
const host = location.host.split(":")[0];
const rtmpUrl = `rtmp://${host}:1935/live/stream_${id}`;
const startStreamBtn = document.getElementById("startStreamBtn");
const stopStreamBtn = document.getElementById("stopStreamBtn");
const localVideo = document.getElementById("localVideo");
const rtmpLink = document.getElementById("rtmpLink");

stopStreamBtn.disabled = true;

let mediaRecorder,
    socket;

startStreamBtn.addEventListener('click', startStream);

stopStreamBtn.addEventListener('click', stopStream);

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

function startStream(){
    socket.connect();

    navigator.mediaDevices
        .getUserMedia({audio: true, video: true})
        .then((stream) => {
            localVideo.srcObject = stream;
            socket.emit("start", rtmpUrl);
            mediaRecorder = new MediaRecorder(stream);
            mediaRecorder.ondataavailable = (e) => socket.emit("stream_binary_data", e.data);
            mediaRecorder.start(10000);
            rtmpLink.innerText = rtmpUrl;
        })
        .catch(function (err) {
            console.error("The following error occurred:", err);
        });
    startStreamBtn.disabled = true;
    stopStreamBtn.disabled = false;
}

function stopStream(){
    socket.disconnect();
    localVideo.srcObject = null;
    startStreamBtn.disabled = false;
    stopStreamBtn.disabled = true;
    rtmpLink.innerText = '';
}