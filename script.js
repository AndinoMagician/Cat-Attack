let currentFacingMode = "environment"; 
let detector;
let videoElement = document.getElementById("camera");
let canvas = document.getElementById("overlay");
let ctx = canvas.getContext("2d");
let scoreboard = document.getElementById("scoreboard");

let cats = []; // flying cats
let score = 0;

async function startCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: currentFacingMode }
    });
    videoElement.srcObject = stream;

    videoElement.onloadedmetadata = () => {
      canvas.width = videoElement.videoWidth;
      canvas.height = videoElement.videoHeight;
    };
  } catch (error) {
    console.error("Error accessing camera:", error);
    alert("Camera access is required to play Cat Attack!");
  }
}

document.getElementById("switchCamera").addEventListener("click", () => {
  currentFacingMode = currentFacingMode === "user" ? "environment" : "user";
  startCamera();
});

document.getElementById("shootCat").addEventListener("click", () => {
  shootCat();
});

// Load face detection model
async function loadModel() {
  detector = await faceDetection.createDetector(faceDetection.SupportedModels.MediaPipeFaceDetector, {
    runtime: "tfjs",
  });
  detectFaces();
}

// Face detection loop
async function detectFaces() {
  if (!detector) return;
  const faces = await detector.estimateFaces(videoElement);

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw faces
  faces.forEach(face => {
    const box = face.box;
    ctx.strokeStyle = "lime";
    ctx.lineWidth = 3;
    ctx.strokeRect(box.xMin, box.yMin, box.width, box.height);

    // Check collisions with cats
    cats.forEach(cat => {
      if (
        cat.x < box.xMin + box.width &&
        cat.x + cat.size > box.xMin &&
        cat.y < box.yMin + box.height &&
        cat.y + cat.size > box.yMin
      ) {
        cat.hit = true;
        score++;
        scoreboard.textContent = `Score: ${score}`;
      }
    });
  });

  // Draw and move cats
  cats.forEach(cat => {
    ctx.drawImage(cat.img, cat.x, cat.y, cat.size, cat.size);
    cat.y -= 5; // move upward
  });

  // Remove offscreen or hit cats
  cats = cats.filter(cat => !cat.hit && cat.y > -cat.size);

  requestAnimationFrame(detectFaces);
}

// Shoot a cat
function shootCat() {
  const img = new Image();
  img.src = "https://cdn-icons-png.flaticon.com/512/616/616408.png"; 

  cats.push({
    img: img,
    x: canvas.width / 2 - 40,
    y: canvas.height - 100,
    size: 80,
    hit: false,
  });
}

startCamera();
loadModel();

