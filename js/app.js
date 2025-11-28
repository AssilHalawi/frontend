/*==================*/
/*logout button*/
/*==================*/
document.addEventListener("DOMContentLoaded", () => {
  const navList = document.querySelector(".navbar-nav");
  // make sure the page has a navbar before doing anything
  if (!navList) return;
  const userLoggedIn = !!localStorage.getItem("steam.user");
  // only add the logout button if user exists and button is not already added
  if (userLoggedIn && !document.getElementById("logoutBtn")) {
    const logoutItem = document.createElement("li");
    logoutItem.className = "nav-item";
    logoutItem.innerHTML = `
      <a class="nav-link text-danger fw-bold" href="#" id="logoutBtn">
        <i class="fas fa-sign-out-alt"></i> Sign Out
      </a>
    `;
    navList.appendChild(logoutItem);
    // add the click handler
    document.getElementById("logoutBtn").addEventListener("click", () => {
      localStorage.clear();
      sessionStorage.clear();
      alert("👋 You have been signed out.");
      location.href = "index.html";
    });
  }
});




/*==================*/
/*general*/
/*==================*/

// retrieve saved game state from localStorage (used globally) (load the game's overall stats, or start fresh)
function getState() {
  return JSON.parse(localStorage.getItem("steam.state")) || {
    xp: 0,  //if not created send these defaults
    level: 1,
    completed: 0,
    player: { name: "", class: "" },
    currentCat: ""
  };
}

// saves the current game state to localStorage (used globally)
function saveState(s) {
  localStorage.setItem("steam.state", JSON.stringify(s));
}


/*highlights the “active page” in the navbar*/
document.addEventListener("DOMContentLoaded", function() {
  const navLinks = document.querySelectorAll('.nav-link');
  function updateActiveNav() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    navLinks.forEach(link => {
      link.classList.remove('active');
      const href = link.getAttribute('href');
      if (href === currentPage || (currentPage === '' && href === 'index.html')) {
        link.classList.add('active');
      }
    });
  }
  updateActiveNav();
  navLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      navLinks.forEach(l => l.classList.remove('active'));
      this.classList.add('active');
    });
  });
});
const params = new URLSearchParams(window.location.search);
const cat = params.get("cat");


/*==================*/
/*game.html*/
/*==================*/
if (document.getElementById("questionText")) {
  let pool = [];  //all available questions
  let used = new Set(); //keeps track of which questions have already been shown
  let xpGain = 0; //current XP earned in this game session
  let doneCount = 0;  //number of answered questions
  let currentIdx = null;  //index of current question in pool being shown  
  let timer;
  let timeLeft = 60;

  //these point to elements updated during quiz
  const timerEl = document.getElementById("timer");
  const xpEl = document.getElementById("xpVal");
  const countEl = document.getElementById("countVal");
  const questionText = document.getElementById("questionText");
  const questionImage = document.getElementById("questionImage");
  const form = document.getElementById("questionForm");
  const feedback = document.getElementById("feedback");
  const submitBtn = document.getElementById("submitBtn");
  const nextBtn = document.getElementById("nextBtn");
  //sounds
  const sfxCorrect = new Audio("sounds/correct.mp3");
  const sfxWrong = new Audio("sounds/wrong.mp3");

  // aminate the XP number when updated
  function animateXP(val) {
    xpEl.classList.add("stat-animate");
    xpEl.textContent = val;
    setTimeout(() => xpEl.classList.remove("stat-animate"), 300);
  }

  // update timer, XP, and question count UI
  function updateStatsUI() {
    timerEl.textContent = timeLeft;
    animateXP(xpGain);
    countEl.textContent = doneCount;
  }

  // Sets the currently available questions and resets stats
  function setQuestionPool(questions = []) {
    pool = Array.isArray(questions) ? questions.slice() : [];
    used = new Set();
    xpGain = 0;
    doneCount = 0;
    timeLeft = 60;
    feedback.textContent = "";
    feedback.className = "";
    submitBtn.disabled = !pool.length;
    nextBtn.disabled = true;
    updateStatsUI();
  }

  // Randomly selects a question not used yet
  function pickQuestion() {
    if (!pool.length) return null;
    if (used.size >= pool.length) used.clear();
    let i;
    do {
      i = Math.floor(Math.random() * pool.length);
    } while (used.has(i) && used.size < pool.length);
    used.add(i);
    return pool[i];
  }

  // Loads a new question into the page
  function loadQuestion() {
    if (!pool.length) {
      questionText.textContent = "No questions available.";
      submitBtn.disabled = true;
      nextBtn.disabled = true;
      return;
    }
    const q = pickQuestion();
    currentIdx = pool.indexOf(q);
    questionText.textContent = q.title;
    questionText.setAttribute("title", q.hint || "");
    
    // Handle image loading with error handling and smaller size
    if (q.img) {
      questionImage.innerHTML = `
        <div class="question-image-container">
          <img src="${q.img}" 
               class="question-image" 
               alt="Question illustration"
               onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
          <div class="image-error" style="display: none; color: #666; font-style: italic; padding: 10px; text-align: center;">
            📷 Image could not be loaded
          </div>
        </div>
      `;
    } else {
      questionImage.innerHTML = "";
    }
    
    // Normalize options: backend may return JSON string, an object, or separate fields.
    let opts = q.options;
    if (typeof opts === "string") {
      try {
        opts = JSON.parse(opts);
      } catch (err) {
        // Fall back: maybe stored as comma-separated values like "A:..,B:.."
        const temp = {};
        opts.split(/\s*,\s*/).forEach(part => {
          const m = part.match(/^([A-Da-d])\s*[:=]\s*(.+)$/);
          if (m) temp[m[1].toUpperCase()] = m[2].trim();
        });
        opts = Object.keys(temp).length ? temp : null;
      }
    }

    // If options still not an object, try to pick fields like optionA / a / choiceA
    if (!opts || typeof opts !== "object") {
      const candidates = {};
      Object.keys(q).forEach(key => {
        const kk = key.toLowerCase();
        if (/^(option|opt|choice)[_\-]?[a-d]$/.test(kk) || /^(a|b|c|d)$/.test(kk)) {
          const letter = kk.slice(-1).toUpperCase();
          candidates[letter] = q[key];
        }
      });
      if (Object.keys(candidates).length) opts = candidates;
    }

    if (!opts || typeof opts !== "object") {
      // No recognizable options — show helpful message and disable submit
      form.innerHTML = `<div class="text-muted">No options available for this question.</div>`;
      submitBtn.disabled = true;
      nextBtn.disabled = false;
      return;
    }

    // Store normalized options back onto the question for consistent lookup
    q._opts = opts;

    // Determine the correct answer key reliably (accepts keys, option text, or numeric index)
    let correctKey = null;
    if (q.answer !== undefined && q.answer !== null) {
      const ans = q.answer;
      const keys = Object.keys(opts);
      // If answer matches a key (A/B/C/D) case-insensitive
      if (typeof ans === 'string' && opts[ans.toUpperCase()]) {
        correctKey = ans.toUpperCase();
      } else if (typeof ans === 'number' || (!isNaN(parseInt(ans, 10)) && String(ans).trim() !== '')) {
        // numeric index -> map to key by order
        const idx = parseInt(ans, 10);
        if (!isNaN(idx) && idx >= 0 && idx < keys.length) correctKey = keys[idx];
      } else if (typeof ans === 'string') {
        // answer might be the option text -> find matching key
        const trimmed = ans.trim();
        for (const k of Object.keys(opts)) {
          if (String(opts[k]).trim() === trimmed) {
            correctKey = k;
            break;
          }
        }
      }
    }
    q._correct = correctKey; // may be null if unknown

    // Build radio inputs from normalized options object
    form.innerHTML = Object.entries(opts).map(([k, v], idx) => `
      <div class="form-check">
        <input class="form-check-input" type="radio" name="choice" id="opt${k}${currentIdx ?? ''}${idx}" value="${k}">
        <label class="form-check-label" for="opt${k}${currentIdx ?? ''}${idx}">${v}</label>
      </div>
    `).join("");
    feedback.textContent = "";
    feedback.className = "";
    submitBtn.disabled = false;
    nextBtn.disabled = true;
  }

  // checks users' answer, gives feedback, and adjusts XP
  function handleAnswer(choice) {
    const q = pool[currentIdx];
    if (!q) {
      feedback.textContent = "No active question.";
      feedback.className = "feedback-wrong";
      return;
    }

    // Compare against normalized correct key if available, otherwise fall back to original field
    const correct = (q._correct ? (choice === q._correct) : (choice === q.answer));

    // Build feedback text. Prefer normalized options mapping for the answer text.
    let answerText = null;
    if (q._opts && q._correct) answerText = q._opts[q._correct];
    else if (q.options && q.answer !== undefined && q.answer !== null) {
      try { answerText = (typeof q.options === 'object') ? q.options[q.answer] : q.options[q.answer]; } catch (e) { answerText = null; }
    }

    feedback.textContent = correct ? "✅ Correct!" : `❌ Incorrect!${answerText ? ' Answer: ' + answerText : ''}`;
    feedback.className = correct ? "feedback-correct" : "feedback-wrong";

    try { if (correct) sfxCorrect.play(); else sfxWrong.play(); } catch (e) { /* ignore audio errors */ }

    xpGain += correct ? 10 : -5;
    doneCount++;
    submitBtn.disabled = true;
    nextBtn.disabled = false;
    updateStatsUI();
  }

  // Submit button => checks user's answer
  submitBtn.addEventListener("click", () => {
    const sel = form.querySelector("input[name='choice']:checked");
    handleAnswer(sel ? sel.value : null);
  });

  // Next button => loads next question
  nextBtn.addEventListener("click", () => {
    loadQuestion();
  });

  // Starts the countdown timer, updates XP/sessionStorage, redirects to finish
  function startTimer() {
    // Always start the timer when requested. Stats will show even if pool is empty.
    updateStatsUI();
    clearInterval(timer);
    timer = setInterval(() => {
      timeLeft--;

      if (timeLeft <= 10) {
        timerEl.classList.add("timer-flicker");
      }

      updateStatsUI();

      if (timeLeft <= 0) {
        clearInterval(timer);
        timeLeft = 0;
        timerEl.classList.remove("timer-flicker");

        sessionStorage.setItem("gamemode.xp", xpGain.toString());
        sessionStorage.setItem("gamemode.count", doneCount.toString());


        location.href = "finish.html";
      }

    }, 1000);
  }

  window.setQuestionPool = setQuestionPool;
  window.loadQuestion = loadQuestion;
  window.startTimer = startTimer;

  setQuestionPool(window.gameQuestions || []);
}

