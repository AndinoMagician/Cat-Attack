const video = document.getElementById("camera");
const overlay = document.getElementById("overlay");
const ctx = overlay.getContext("2d");
const scoreDisplay = document.getElementById("score");
const timerDisplay = document.getElementById("timer");
const message = document.getElementById("message");
const startBtn = document.getElementById("startBtn");

let detector;
let gameRunning = false;
let projectiles = [];
let score = 0;
let countdownActive = false;
let cooldown = 2000; // ms between shots
let lastShotTime = 0;
let timerInterval;
let detectionLoopRunning = false;
const catImg = new Image();
catImg.src = "images/Cat.png";

// ✅ Initialize camera
async function startCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
      audio: false
    });
    video.srcObject = stream;
  } catch (err) {
    console.error("Camera error:", err);
  }
}

// ✅ Load BlazePose for better accuracy
async function loadModel() {
  detector = await poseDetection.createDetector(
    poseDetection.SupportedModels.BlazePose,
    { runtime: "tfjs" }
  );
  console.log("BlazePose loaded");
}

// ✅ Countdown before starting
async function startCountdown() {
  if (countdownActive) return;
  countdownActive = true;
  let count = 3;

  const showCount = () => {
    if (count > 0) {
      showMessage(count);
      count--;
      setTimeout(showCount, 1000);
    } else {
      showMessage("GO!");
      setTimeout(() => {
        message.style.display = "none";
        countdownActive = false;
        startGame();
      }, 800);
    }
  };

  showCount();
}

// ✅ Timer
function startTimer() {
  let timeLeft = 30;
  timerDisplay.textContent = timeLeft;

  timerInterval = setInterval(() => {
    timeLeft--;
    timerDisplay.textContent = timeLeft;
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      endGame();
    }
  }, 1000);
}

// ✅ Main detection + shooting loop
async function detectLoop() {
  if (!gameRunning || detectionLoopRunning) return;
  detectionLoopRunning = true;

  overlay.width = video.videoWidth;
  overlay.height = video.videoHeight;

  const poses = await detector.estimatePoses(video);

  ctx.clearRect(0, 0, overlay.width, overlay.height);

  if (poses.length > 0) {
    // Sort by pose score to pick the most confident one
    poses.sort((a, b) => (b.score || 0) - (a.score || 0));
    const bestPose = poses[0];
    const keypoints = bestPose.keypoints.filter(k => k.score > 0.5);

    if (keypoints.length > 0) {
      const centerX = keypoints.reduce((a, b) => a + b.x, 0) / keypoints.length;
      const centerY = keypoints.reduce((a, b) => a + b.y, 0) / keypoints.length;

      // Draw detection box
      ctx.strokeStyle = "red";
      ctx.lineWidth = 3;
      ctx.strokeRect(centerX - 50, centerY - 50, 100, 100);

      // Shoot only if enough time has passed
      const now = Date.now();
      if (now - lastShotTime > cooldown) {
        shootCat(centerX, centerY);
        lastShotTime = now;
      }
    }
  }

  updateProjectiles();

  detectionLoopRunning = false;
  if (gameRunning) requestAnimationFrame(detectLoop);
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

// ✅ Update projectiles
function updateProjectiles() {
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    p.progress += 0.05;

    p.x = (1 - p.progress) * (overlay.width / 2) + p.progress * p.targetX;
    p.y = (1 - p.progress) * overlay.height + p.progress * p.targetY;

    const size = 40;

    if (catImg.complete) {
      ctx.drawImage(catImg, p.x - size / 2, p.y - size / 2, size, size);
    } else {
      // fallback if image not loaded yet
      ctx.fillStyle = "orange";
      ctx.fillRect(p.x - 10, p.y - 10, 20, 20);
    }

    if (p.progress >= 1) {
      projectiles.splice(i, 1);
      score++;
      scoreDisplay.textContent = score;
      showMessage("Hit! 🐱");
    }
  }
}

// ✅ Messages
function showMessage(text) {
  message.textContent = text;
  message.style.display = "block";
  setTimeout(() => (message.style.display = "none"), 800);
}

// ✅ Start / End game
function startGame() {
  score = 0;
  scoreDisplay.textContent = score;
  projectiles = [];
  gameRunning = true;
  startBtn.style.display = "none";
  startTimer();
  detectLoop();
}

function endGame() {
  gameRunning = false;
  startBtn.style.display = "block";
  showMessage("Game Over! Final Score: " + score);
}

// ✅ Init
startCamera();
loadModel();
startBtn.addEventListener("click", startCountdown);