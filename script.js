let currentFacingMode = "environment"; // start with back camera

async function startCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: currentFacingMode }
    });
    const videoElement = document.getElementById("camera");
    videoElement.srcObject = stream;
  } catch (error) {
    console.error("Error accessing camera:", error);
    alert("Camera access is required to play Cat Attack!");
  }
}

document.getElementById("switchCamera").addEventListener("click", () => {
  currentFacingMode = currentFacingMode === "user" ? "environment" : "user";
  startCamera();
});

startCamera();
