let omrImage = null;
let answerKey = [];
//Login Function
function login() {
    let username = document.getElementById("username").value.trim();
    let errorMsg = document.getElementById("error-message");

    if (username === "") {
        errorMsg.style.display = "block"; // Show error message
        return;
    }

    // Hide login and show app
    document.getElementById("loginSection").style.display = "none";
    document.getElementById("appSection").style.display = "block";

    // Show Username
    document.getElementById("userDisplay").innerText = username;
}

// Logout Function
function logout() {
    document.getElementById("loginSection").style.display = "block";
    document.getElementById("appSection").style.display = "none";
    document.getElementById("username").value = "";
    document.getElementById("error-message").style.display = "none"; // Hide error message
}




// Load Answer Key
function loadAnswerKey() {
    let file = document.getElementById("answerKey").files[0];
    if (!file) {
        alert("Please upload an answer key file!");
        return;
    }

    let reader = new FileReader();
    reader.onload = function(event) {
        answerKey = event.target.result.trim().split("\n");
        alert("Answer key loaded successfully!");
    };
    reader.readAsText(file);
}

// Handle OMR Upload
document.getElementById('omrInput').addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (file) {
        omrImage = file;

        // Show image preview
        const reader = new FileReader();
        reader.onload = function(e) {
            const imgElement = document.getElementById('preview');
            imgElement.src = e.target.result;
            imgElement.style.display = "block";
        };
        reader.readAsDataURL(file);
    }
});

// Process OMR Sheet
function processOMR() {
    if (!omrImage) {
        alert("Please upload an OMR sheet first!");
        return;
    }
    if (answerKey.length === 0) {
        alert("Please upload an answer key first!");
        return;
    }

    let imgElement = document.getElementById('preview');
    let canvas = document.getElementById('canvas');
    let ctx = canvas.getContext('2d');

    // Fix Image Scaling: Match to original image size
    canvas.width = imgElement.naturalWidth;
    canvas.height = imgElement.naturalHeight;
    ctx.drawImage(imgElement, 0, 0, canvas.width, canvas.height);

    // Convert to OpenCV Mat
    let src = cv.imread(canvas);
    let gray = new cv.Mat();
    let threshold = new cv.Mat();

    // Convert to grayscale & apply Gaussian blur
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
    cv.GaussianBlur(gray, gray, new cv.Size(5, 5), 0, 0);

    // Adaptive Threshold for better bubble detection
    cv.adaptiveThreshold(gray, threshold, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY_INV, 11, 2);

    // Detect contours
    let contours = new cv.MatVector();
    let hierarchy = new cv.Mat();
    cv.findContours(threshold, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

    let detectedAnswers = [];

    // Loop through contours to find bubbles
    for (let i = 0; i < contours.size(); i++) {
        let contour = contours.get(i);
        let rect = cv.boundingRect(contour);

        // Filter based on expected bubble size
        if (rect.width > 15 && rect.height > 15) {  
            detectedAnswers.push({x: rect.x, y: rect.y, w: rect.width, h: rect.height});
        }
    }

    // Sort detected bubbles properly
    detectedAnswers.sort((a, b) => (a.y - b.y) || (a.x - b.x));

    let score = 0;
    let totalQuestions = answerKey.length;

    // Compare detected answers with answer key
    for (let i = 0; i < totalQuestions; i++) {
        if (!detectedAnswers[i]) continue;  // Skip if no bubble found
        let correct = answerKey[i].trim();
        let detected = detectedAnswers[i] ? "A" : "X"; // Assume 'A' if marked

        let color = (correct === detected) ? "green" : "red";
        let mark = (correct === detected) ? "✔️" : "❌";

        ctx.fillStyle = color;
        ctx.fillText(mark, detectedAnswers[i].x + 10, detectedAnswers[i].y + 10);
        if (correct === detected) score++;
    }

    // Show Final Score
    document.getElementById("result").innerHTML = `Your Score: ${score} / ${totalQuestions}`;

    // Cleanup
    gray.delete();
    threshold.delete();
    src.delete();
    contours.delete();
    hierarchy.delete();
}





//Function preview OMR
function previewOMR(event) {
    let reader = new FileReader();
    reader.onload = function () {
        let imgElement = document.getElementById("preview");
        imgElement.src = reader.result;
        imgElement.style.display = "block";

        // ✅ Fix: Resize Image for Better Viewing
        imgElement.style.maxWidth = "90%";  // Responsive image size
        imgElement.style.height = "auto"; 
    };
    reader.readAsDataURL(event.target.files[0]);
}


// Update leaderboard
function updateLeaderboard(score) {
    let leaderboard = document.getElementById("leaderboard");
    let newRow = leaderboard.insertRow();
    newRow.innerHTML = `<td>1</td><td>${score}</td>`;
}

// Capture Photo
function capturePhoto() {
    let video = document.getElementById("videoElement");
    let canvas = document.getElementById("canvas");
    let ctx = canvas.getContext("2d");

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
}

// Download PDF
function downloadPDF() {
    const { jsPDF } = window.jspdf;
    let doc = new jsPDF();
    doc.text("OMR Result", 10, 10);
    doc.text(document.getElementById("result").innerText, 10, 20);
    doc.save("OMR_Result.pdf");
}
