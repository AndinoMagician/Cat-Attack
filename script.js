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
const catImg = new Image();
catImg.src = "images/Cat.png";

// ✅ CAMERA
async function startCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user" }, // "environment" for rear camera
      audio: false
    });
    video.srcObject = stream;
    await new Promise(resolve => {
      video.onloadeddata = () => {
        console.log("🎥 Camera ready:", video.videoWidth, video.videoHeight);
        resolve();
      };
    });
  } catch (err) {
    console.error("Camera error:", err);
  }
}

// ✅ WORKING MODEL (MoveNet)
async function loadModel() {
  const model = poseDetection.SupportedModels.MoveNet;
  const detectorConfig = {
    modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING
  };
  detector = await poseDetection.createDetector(model, detectorConfig);
  console.log("✅ MoveNet loaded");
}

// ✅ COUNTDOWN
async function startCountdown() {
  if (countdownActive) return;
  countdownActive = true;

  let count = 3;
  startBtn.disabled = true;
  startBtn.style.transition = "transform 0.3s ease, opacity 0.5s ease";
  startBtn.textContent = count;

  const doCountdown = () => {
    if (count > 0) {
      startBtn.textContent = count;
      startBtn.style.transform = "translate(-50%, -50%) scale(1.3)";
      setTimeout(() => {
        startBtn.style.transform = "translate(-50%, -50%) scale(1)";
      }, 200);

      count--;
      setTimeout(doCountdown, 1000);
    } else {
      startBtn.textContent = "CAT!";
      startBtn.style.transform = "translate(-50%, -50%) scale(1.4)";

      setTimeout(() => {
        startBtn.style.opacity = "0";
        startBtn.style.transform = "translate(-50%, -50%) scale(0.5)";
      }, 500);

      setTimeout(() => {
        startBtn.style.display = "none";
        countdownActive = false;
        startBtn.textContent = "Start";
        startBtn.style.opacity = "1";
        startBtn.style.transform = "translate(-50%, -50%) scale(1)";
        startGame();
      }, 1200);
    }
  };

  doCountdown();
}

// ✅ TIMER
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

// ✅ DETECTION LOOP (the older working style)
async function detectLoop() {
  if (!detector) return requestAnimationFrame(detectLoop);

  overlay.width = video.videoWidth;
  overlay.height = video.videoHeight;

  const poses = await detector.estimatePoses(video);
  ctx.clearRect(0, 0, overlay.width, overlay.height);

  if (poses.length > 0) {
    const keypoints = poses[0].keypoints.filter(k => k.score > 0.5);

    if (keypoints.length > 0) {
      const centerX = keypoints.reduce((a, b) => a + b.x, 0) / keypoints.length;
      const centerY = keypoints.reduce((a, b) => a + b.y, 0) / keypoints.length;

      // draw box for debugging
      ctx.strokeStyle = "red";
      ctx.lineWidth = 3;
      ctx.strokeRect(centerX - 50, centerY - 50, 100, 100);

      if (gameRunning) {
        const now = Date.now();
        if (now - lastShotTime > cooldown) {
          shootCat(centerX, centerY);
          lastShotTime = now;
        }
      }
    }
  }

  updateProjectiles();
  requestAnimationFrame(detectLoop);
}

// ✅ SHOOT CAT
function shootCat(targetX, targetY) {
  projectiles.push({
    x: overlay.width / 2,
    y: overlay.height,
    targetX,
    targetY,
    progress: 0
  });
}

// ✅ UPDATE PROJECTILES
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

// ✅ MESSAGES
function showMessage(text) {
  message.textContent = text;
  message.style.display = "block";
  setTimeout(() => (message.style.display = "none"), 800);
}

// ✅ START / END GAME
function startGame() {
  score = 0;
  scoreDisplay.textContent = score;
  projectiles = [];
  gameRunning = true;
  startBtn.style.display = "none";
  startTimer();
}

function endGame() {
  gameRunning = false;
  startBtn.style.display = "block";
  showMessage("Game Over! Final Score: " + score);
}

// ✅ INIT (proper load order)
async function init() {
  await startCamera();
  await loadModel();
  detectLoop();
}

init();
startBtn.addEventListener("click", startCountdown);