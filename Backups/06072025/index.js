let mediaRecorder;
let audioChunks = [];

const recordButton = document.getElementById("recordButton");
const stopButton = document.getElementById("stopButton");
const statusText = document.getElementById("status");
const coreIdeasDiv = document.getElementById("coreIdeas");

recordButton.onclick = async () => {
  recordButton.disabled = true;
  stopButton.disabled = false;
  coreIdeasDiv.innerHTML = "";
  statusText.textContent = "Recording...";

  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  mediaRecorder = new MediaRecorder(stream);

  audioChunks = [];

  mediaRecorder.ondataavailable = (e) => {
    audioChunks.push(e.data);
  };

  mediaRecorder.onstop = async () => {
    const audioBlob = new Blob(audioChunks, { type: "audio/mp3" });
    const formData = new FormData();
    formData.append("file", audioBlob, "sample.mp3");

    statusText.textContent = "Uploading...";

    try {
      	const response = await fetch("https://whisper-be-78j7.onrender.com/transcribe/", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();
      console.log("Received JSON response:", result);
      
      statusText.textContent = "Response received:";
      displayCoreIdeas(result.core_ideas);
    } catch (error) {
      statusText.textContent = "Error uploading or processing audio.";
      console.error(error);
    }
  };

  mediaRecorder.start();

  setTimeout(() => {
    if (mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
      stopButton.disabled = true;
      recordButton.disabled = false;
    }
  }, 15000);
};

stopButton.onclick = () => {
  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    mediaRecorder.stop();
    stopButton.disabled = true;
    recordButton.disabled = false;
  }
};

function displayCoreIdeas(ideasJson) {
  try {
    const ideas = JSON.parse(ideasJson);
    coreIdeasDiv.innerHTML = "<h3>Core Ideas:</h3>";
    ideas.forEach((idea, idx) => {
      const label = document.createElement("label");
      label.innerHTML = `<input type="checkbox" checked> ${idea}`;
      coreIdeasDiv.appendChild(label);
      coreIdeasDiv.appendChild(document.createElement("br"));
    });
  } catch {
    coreIdeasDiv.textContent = "Could not parse ideas.";
  }
}