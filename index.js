let mediaRecorder;
let audioChunks = [];

const recordButton = document.getElementById("recordButton");
const stopButton = document.getElementById("stopButton");
const statusText = document.getElementById("status");
const coreIdeasDiv = document.getElementById("coreIdeas");
const step2 = document.getElementById("step2");
const step3 = document.getElementById("step3");

recordButton.onclick = async () => {
  recordButton.disabled = true;
  stopButton.disabled = false;
  statusText.textContent = "रिकॉर्डिंग शुरू हो गई है...";
  coreIdeasDiv.innerHTML = "";
  step2.style.display = "none";
  step3.style.display = "none";

  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  mediaRecorder = new MediaRecorder(stream);
  audioChunks = [];

  mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data);

  mediaRecorder.onstop = async () => {
    const audioBlob = new Blob(audioChunks, { type: "audio/mp3" });
    const formData = new FormData();
    formData.append("file", audioBlob, "sample.mp3");

    statusText.textContent = "ऑडियो अपलोड हो रहा है...";

    try {
      const response = await fetch("https://whisper-be-78j7.onrender.com/transcribe/", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();
      console.log("प्राप्त JSON:", result);
      statusText.textContent = "उत्तर प्राप्त हुआ ✅";
      displayCoreIdeas(result.core_ideas);
    } catch (error) {
      statusText.textContent = "ऑडियो अपलोड या प्रोसेसिंग में त्रुटि हुई।";
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
    coreIdeasDiv.innerHTML = "<h3>मुख्य समस्याएँ:</h3>";
    ideasJson.forEach((idea) => {
      const label = document.createElement("label");
      label.innerHTML = `<input type="checkbox" checked> ${idea}`;
      coreIdeasDiv.appendChild(label);
      coreIdeasDiv.appendChild(document.createElement("br"));
    });

    step2.style.display = "block";
    step3.style.display = "block";
  } catch {
    coreIdeasDiv.textContent = "समस्याओं को पढ़ा नहीं जा सका।\nप्राप्त JSON:\n" + ideasJson;
  }
}

document.getElementById("addIdeaButton").onclick = () => {
  const newIdeaInput = document.getElementById("newIdeaInput");
  const idea = newIdeaInput.value.trim();
  if (idea) {
    const li = document.createElement("li");
    li.textContent = idea;
    document.getElementById("newIdeasList").appendChild(li);
    newIdeaInput.value = "";
  }
};

document.getElementById("submitButton").onclick = async () => {
  const selectedIdeas = [];
  document.querySelectorAll("#coreIdeas input[type=checkbox]").forEach((checkbox) => {
    if (checkbox.checked) {
      selectedIdeas.push(checkbox.parentElement.textContent.trim());
    }
  });

  const addedIdeas = [];
  document.querySelectorAll("#newIdeasList li").forEach((li) => {
    addedIdeas.push(li.textContent.trim());
  });

  const allIdeas = selectedIdeas.concat(addedIdeas);

  try {
    const response = await fetch("https://aisurvey-be.onrender.com/update-database", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ideas: allIdeas }),
    });

    // 2) Log status and raw text
    console.log("Response status:", response.status);
    const text = await response.text();
    console.log("Response text:", text);

    // 3) Parse JSON safely
    let data;
    try {
      data = JSON.parse(text);
      console.log("Parsed JSON:", data);
    } catch (e) {
      console.error("Failed to parse JSON:", e);
      document.getElementById("finalStatus").textContent =
        "❌ सर्वर ने अपेक्षित JSON नहीं भेजा।";
      return;
    }

    // 4) Handle server‐side errors
    if (data.error) {
      console.error("Server error:", data.error);
      document.getElementById("finalStatus").textContent =
        `❌ त्रुटि: ${data.error}`;
      return;
    }

    // 5) Inspect the execution log
    if (data.log) {
      console.log("Backend execution log:", data.log);
    }

    document.getElementById("finalStatus").textContent = "✅ समस्याएँ सफलतापूर्वक जमा की गईं!";
  } catch (error) {
    console.error("Backend update error:", error);
    document.getElementById("finalStatus").textContent = "❌ सर्वर त्रुटि! कृपया पुनः प्रयास करें।";
  }
};