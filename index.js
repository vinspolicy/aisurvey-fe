// aisurvey-fe/index.js

let mediaRecorder;
let audioChunks = [];

// Load or initialize the DB in localStorage
let db = JSON.parse(localStorage.getItem("aiSurveyDB") || "[]");

const recordButton   = document.getElementById("recordButton");
const stopButton     = document.getElementById("stopButton");
const statusText     = document.getElementById("status");
const coreIdeasDiv   = document.getElementById("coreIdeas");
const step2          = document.getElementById("step2");
const step3          = document.getElementById("step3");
const submitButton   = document.getElementById("submitButton");
const finalStatus    = document.getElementById("finalStatus");

// 1️⃣ Record audio and transcribe
recordButton.onclick = async () => {
  recordButton.disabled = true;
  stopButton.disabled   = false;
  statusText.textContent = "रिकॉर्डिंग...";
  coreIdeasDiv.innerHTML = "";
  step2.style.display    = "none";
  step3.style.display    = "none";

  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  mediaRecorder = new MediaRecorder(stream);
  audioChunks  = [];

  mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
  mediaRecorder.onstop = async () => {
    const blob    = new Blob(audioChunks, { type: "audio/mp3" });
    const form    = new FormData();
    form.append("file", blob, "sample.mp3");

    statusText.textContent = "ट्रांसक्रिप्शन हो रहा है...";
    try {
      const resp   = await fetch("https://whisper-be-78j7.onrender.com/transcribe/", {
        method: "POST",
        body: form
      });
      const result = await resp.json();
      statusText.textContent = "ट्रांसक्रिप्शन प्राप्त!";
      displayCoreIdeas(result.core_ideas);
    } catch (err) {
      statusText.textContent = "त्रुटि हुई!";
      console.error(err);
    }
  };

  mediaRecorder.start();
  // Auto-stop after 15s
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

// 2️⃣ Show checkboxes for core ideas
function displayCoreIdeas(ideas) {
  coreIdeasDiv.innerHTML = "<h3>मुख्य समस्याएँ:</h3>";
  ideas.forEach(idea => {
    const label = document.createElement("label");
    label.innerHTML = `<input type="checkbox" checked> ${idea}`;
    coreIdeasDiv.appendChild(label);
    coreIdeasDiv.appendChild(document.createElement("br"));
  });
  step2.style.display = "block";
  step3.style.display = "block";
}

// 3️⃣ Add a manual idea
document.getElementById("addIdeaButton").onclick = () => {
  const input = document.getElementById("newIdeaInput");
  const val   = input.value.trim();
  if (val) {
    const li = document.createElement("li");
    li.textContent = val;
    document.getElementById("newIdeasList").appendChild(li);
    input.value = "";
  }
};

// 4️⃣ Submit & sync DB
submitButton.onclick = async () => {
  // Gather selected + added
  const selected = Array.from(
    document.querySelectorAll("#coreIdeas input[type=checkbox]")
  )
    .filter(cb => cb.checked)
    .map(cb => cb.parentElement.textContent.trim());

  const added = Array.from(
    document.querySelectorAll("#newIdeasList li")
  ).map(li => li.textContent.trim());

  const allIdeas = selected.concat(added);
  statusText.textContent = "डेटा सर्वर भेज रहे हैं...";

  try {
    const updatedDb = await syncDatabase(allIdeas);
    console.log("Updated DB:", updatedDb);
    finalStatus.textContent = "✅ सफलतापूर्वक अपडेट किया!";
  } catch (err) {
    console.error(err);
    finalStatus.textContent = "❌ अपडेट विफल!";
  }
};

// Core function: upload DB + ideas, download and overwrite in localStorage
async function syncDatabase(coreIdeas) {
  // Build payload
  const payload = {
    incoming_ideas: coreIdeas,
    database: db
  };

  // Send as JSON
  const resp = await fetch("https://aisurvey-be.onrender.com/process-db/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!resp.ok) {
    throw new Error("Server error " + resp.status);
  }
  const json = await resp.json();

  // Overwrite localStorage DB
  db = json.database;
  localStorage.setItem("aiSurveyDB", JSON.stringify(db));
  return db;
}