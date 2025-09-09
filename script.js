let video = document.getElementById("camera");
let livesDisplay = document.getElementById("lives");
let scoreDisplay = document.getElementById("score");
let overlay = document.getElementById("overlay");
let ctx = overlay.getContext("2d");

let model;
let lives = 9;
let score = 0;
let projectiles = [];

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

  // Draw faces
  predictions.forEach(pred => {
    let [x, y, w, h] = [
      pred.topLeft[0],
      pred.topLeft[1],
      pred.bottomRight[0] - pred.topLeft[0],
      pred.bottomRight[1] - pred.topLeft[1]
    ];

    ctx.strokeStyle = "red";
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, w, h);
  });

  // Draw & update projectiles
  for (let i = 0; i < projectiles.length; i++) {
    let p = projectiles[i];
    p.progress += 0.05; // speed

    p.x = (1 - p.progress) * (overlay.width / 2) + p.progress * p.targetX;
    p.y = (1 - p.progress) * overlay.height + p.progress * p.targetY;

    ctx.fillStyle = "orange";
    ctx.fillRect(p.x - 10, p.y - 10, 20, 20); // placeholder cat box

    // Check if reached target
    if (p.progress >= 1) {
      projectiles.splice(i, 1);
      i--;

      score++;
      scoreDisplay.textContent = score;
      showMessage("Hit! 🐱");
    }
  }

  requestAnimationFrame(detectFaces);
}

// ✅ Shoot action
document.getElementById("shootBtn").addEventListener("click", async () => {
  if (lives <= 0) {
    showMessage("Game Over! Final Score: " + score);
    return;
  }

  lives--;
  livesDisplay.textContent = lives;

  const predictions = await model.estimateFaces(video, false);

  if (predictions.length > 0) {
    // Pick the first detected face (center point)
    let face = predictions[0];
    let targetX = (face.topLeft[0] + face.bottomRight[0]) / 2;
    let targetY = (face.topLeft[1] + face.bottomRight[1]) / 2;

    // Add projectile starting from bottom center
    projectiles.push({
      x: overlay.width / 2,
      y: overlay.height,
      targetX,
      targetY,
      progress: 0
    });
  } else {
    showMessage("Miss!");
  }
});

function showMessage(text) {
const msg = document.getElementById("message");
msg.textContent = text;
msg.style.display = "block";

setTimeout(() => {
  msg.style.display = "none";
}, 1000); // hides after 1s
}

// Start game
startCamera();
loadModel().then(() => detectFaces());