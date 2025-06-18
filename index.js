// aisurvey-fe/index.js

let mediaRecorder, audioChunks = [];

// Load or init DB in localStorage
let db = JSON.parse(localStorage.getItem("surveyDB") || "[]");

// UI refs
const recordBtn   = document.getElementById("recordButton");
const stopBtn     = document.getElementById("stopButton");
const statusText  = document.getElementById("status");
const coreDiv     = document.getElementById("coreIdeas");
const step2       = document.getElementById("step2");
const step3       = document.getElementById("step3");
const submitBtn   = document.getElementById("submitButton");
const finalStatus = document.getElementById("finalStatus");

// 1️⃣ Record & Transcribe
recordBtn.onclick = async () => {
  recordBtn.disabled = true;
  stopBtn.disabled   = false;
  statusText.textContent = "Recording…";
  coreDiv.innerHTML = "";
  step2.style.display = "none";
  step3.style.display = "none";

  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  mediaRecorder = new MediaRecorder(stream);
  audioChunks = [];

  mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
  mediaRecorder.onstop = async () => {
    const blob = new Blob(audioChunks, { type: "audio/mp3" });
    const fd = new FormData();
    fd.append("file", blob);

    statusText.textContent = "Transcribing…";
    try {
      const res = await fetch("https://whisper-be-78j7.onrender.com/transcribe/", {
        method: "POST",
        body: fd
      });
      const { core_ideas } = await res.json();
      statusText.textContent = "Transcription done!";
      displayCoreIdeas(core_ideas);
    } catch (e) {
      console.error(e);
      statusText.textContent = "Error during transcription.";
    }
  };

  mediaRecorder.start();
  setTimeout(() => {
    if (mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
      stopBtn.disabled = true;
      recordBtn.disabled = false;
    }
  }, 15000);
};

stopBtn.onclick = () => {
  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    mediaRecorder.stop();
    stopBtn.disabled = true;
    recordBtn.disabled = false;
  }
};

// 2️⃣ Show core ideas
function displayCoreIdeas(raw) {
  // raw might be JSON-string or array
  let ideas = Array.isArray(raw) ? raw : JSON.parse(raw);
  coreDiv.innerHTML = "<h3>Core Ideas:</h3>";
  ideas.forEach(i => {
    const lbl = document.createElement("label");
    lbl.innerHTML = `<input type="checkbox" checked> ${i}`;
    coreDiv.appendChild(lbl);
    coreDiv.appendChild(document.createElement("br"));
  });
  step2.style.display = "block";
  step3.style.display = "block";
}

// 3️⃣ Add manual idea
document.getElementById("addIdeaButton").onclick = () => {
  const inp = document.getElementById("newIdeaInput");
  const v = inp.value.trim();
  if (!v) return;
  const li = document.createElement("li");
  li.textContent = v;
  document.getElementById("newIdeasList").appendChild(li);
  inp.value = "";
};

// 4️⃣ Submit & sync
submitBtn.onclick = async () => {
  const selected = Array.from(
    document.querySelectorAll("#coreIdeas input[type=checkbox]")
  )
    .filter(cb => cb.checked)
    .map(cb => cb.parentElement.textContent.trim());

  const added = Array.from(
    document.querySelectorAll("#newIdeasList li")
  ).map(li => li.textContent.trim());

  const allIdeas = selected.concat(added);
  statusText.textContent = "Submitting ideas…";

  try {
    const resp = await fetch("https://aisurvey-be.onrender.com/process-db/", {
      method: "POST",
      headers: { "Content-Type":"application/json" },
      body: JSON.stringify({
        database: db,
        incoming_ideas: allIdeas
      })
    });
    const { database: updated } = await resp.json();
    // overwrite device DB
    db = updated;
    localStorage.setItem("surveyDB", JSON.stringify(db));
    finalStatus.textContent = `✅ Saved! Total distinct ideas: ${db.length}`;
  } catch (e) {
    console.error(e);
    finalStatus.textContent = "❌ Failed to save.";
  }
};