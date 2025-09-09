let video = document.getElementById("camera");
let livesDisplay = document.getElementById("lives");
let scoreDisplay = document.getElementById("score");
let overlay = document.getElementById("overlay");
let ctx = overlay.getContext("2d");

let model;
let lives = 9;
let score = 0;

// ✅ Setup camera
async function startCamera() {
  try {
    let stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" }, // back camera if available
      audio: false
    });
    video.srcObject = stream;
  } catch (err) {
    console.error("Camera error:", err);
  }
}

// ✅ Load face detection model
async function loadModel() {
  model = await blazeface.load();
  console.log("Model loaded");
}

// ✅ Detect faces
async function detectFaces() {
  if (!model) return;
  const predictions = await model.estimateFaces(video, false);

  ctx.clearRect(0, 0, overlay.width, overlay.height);
  overlay.width = video.videoWidth;
  overlay.height = video.videoHeight;

  predictions.forEach(pred => {
    let [x, y, w, h] = [
      pred.topLeft[0],
      pred.topLeft[1],
      pred.bottomRight[0] - pred.topLeft[0],
      pred.bottomRight[1] - pred.topLeft[1]
    ];

    // Draw face box
    ctx.strokeStyle = "red";
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, w, h);
  });

  requestAnimationFrame(detectFaces);
}

// ✅ Shoot action
document.getElementById("shootBtn").addEventListener("click", async () => {
  if (lives <= 0) {
    alert("Game Over! Final Score: " + score);
    return;
  }

  lives--;
  livesDisplay.textContent = lives;

  // Check if face is detected when shooting
  const predictions = await model.estimateFaces(video, false);
  if (predictions.length > 0) {
    score++;
    scoreDisplay.textContent = score;
    alert("Hit! 🐱");
  } else {
    alert("Miss!");
  }
});

// Start game
startCamera();
loadModel().then(() => detectFaces());