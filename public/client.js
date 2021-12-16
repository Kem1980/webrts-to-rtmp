const rtmpUrl = "rtmp://" + location.host.split(":")[0] + ":1935/live";
const localVideo = document.getElementById("localVideo");

let mediaRecorder,
    socket;

socket = io({secure: true});

socket.on("connect", ()=>{
    navigator.mediaDevices
        .getUserMedia({audio: true, video: true})
        .then((stream) => {
            localVideo.srcObject = stream;
            localVideo.addEventListener(
                "loadedmetadata",
                () => console.log(`LOCAL VIDEO SOURCE SIZE: ${localVideo.videoWidth} x ${localVideo.videoHeight}`),
                false
            );
            socket.emit("start", rtmpUrl);
            mediaRecorder = new MediaRecorder(stream);
            mediaRecorder.ondataavailable = (e) => socket.emit("stream_binary_data", e.data);
            mediaRecorder.start(0);
        })
        .catch(function (err) {
            console.error("The following error occurred:", err);
        });
});

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