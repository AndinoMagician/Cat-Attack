let video = document.getElementById("camera");
let scoreDisplay = document.getElementById("score");
let timerDisplay = document.getElementById("timer");
let overlay = document.getElementById("overlay");
let ctx = overlay.getContext("2d");

let detector;
let score = 0;
let projectiles = [];
let gameRunning = false;
let personCooldown = 1500; // milliseconds between shots per person
let personTrack = []; // stores last seen positions + cooldown

// ✅ Start camera
async function startCamera() {
  try {
    let stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
      audio: false
    });
    video.srcObject = stream;
  } catch (err) {
    console.error("Camera error:", err);
  }
}

// ✅ Load MoveNet model
async function loadModel() {
  detector = await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet);
  console.log("MoveNet loaded");
}

// ✅ Timer
function startTimer() {
  let timeLeft = 30;
  timerDisplay.textContent = timeLeft;
  const interval = setInterval(() => {
    timeLeft--;
    timerDisplay.textContent = timeLeft;
    if (timeLeft <= 0) {
      clearInterval(interval);
      endGame();
    }
  }, 1000);
}

// ✅ Find or create person track (rough matching)
function getPersonTrack(x, y) {
  let now = Date.now();
  // Look for existing person within ~100px radius
  for (let t of personTrack) {
    let dx = t.x - x;
    let dy = t.y - y;
    let dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 100) {
      t.x = x;
      t.y = y;
      return t;
    }
  }
  // If not found, add a new track
  let newTrack = { x, y, lastShot: 0 };
  personTrack.push(newTrack);
  return newTrack;
}

// ✅ Main detection + shooting loop
async function detectLoop() {
  if (!gameRunning) return;

  const poses = await detector.estimatePoses(video);

  ctx.clearRect(0, 0, overlay.width, overlay.height);
  overlay.width = video.videoWidth;
  overlay.height = video.videoHeight;

  if (poses.length > 0) {
    for (let pose of poses) {
      let keypoints = pose.keypoints.filter(k => k.score > 0.5);
      if (keypoints.length === 0) continue;

      // Approximate center of the body
      let centerX = keypoints.reduce((a, b) => a + b.x, 0) / keypoints.length;
      let centerY = keypoints.reduce((a, b) => a + b.y, 0) / keypoints.length;

      // Draw box on detected person
      ctx.strokeStyle = "red";
      ctx.lineWidth = 3;
      ctx.strokeRect(centerX - 50, centerY - 50, 100, 100);

      // Manage shooting cooldown per tracked person
      let track = getPersonTrack(centerX, centerY);
      let now = Date.now();
      if (now - track.lastShot > personCooldown) {
        shootCat(centerX, centerY);
        track.lastShot = now;
      }
    }
  }

  updateProjectiles();
  requestAnimationFrame(detectLoop);
}

// ✅ Shoot cat
function shootCat(targetX, targetY) {
  projectiles.push({
    x: overlay.width / 2,
    y: overlay.height,
    targetX,
    targetY,
    progress: 0
  });
}

// ✅ Update cats
function updateProjectiles() {
  for (let i = 0; i < projectiles.length; i++) {
    let p = projectiles[i];
    p.progress += 0.05;

    p.x = (1 - p.progress) * (overlay.width / 2) + p.progress * p.targetX;
    p.y = (1 - p.progress) * overlay.height + p.progress * p.targetY;

    ctx.fillStyle = "orange";
    ctx.fillRect(p.x - 10, p.y - 10, 20, 20);

    if (p.progress >= 1) {
      projectiles.splice(i, 1);
      i--;
      score++;
      scoreDisplay.textContent = score;
      showMessage("Hit! 🐱");
    }
  }
}

// ✅ Show popup text
function showMessage(text) {
  const msg = document.getElementById("message");
  msg.textContent = text;
  msg.style.display = "block";
  setTimeout(() => (msg.style.display = "none"), 800);
}

// ✅ Start & end game
function startGame() {
  score = 0;
  scoreDisplay.textContent = score;
  personTrack = [];
  projectiles = [];
  gameRunning = true;
  startTimer();
  detectLoop();
}

function endGame() {
  gameRunning = false;
  showMessage("Game Over! Final Score: " + score);
}

// ✅ Init
startCamera();
loadModel().then(() => {
  showMessage("Ready! Starting in 3...");
  setTimeout(startGame, 3000);
});