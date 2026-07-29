(function () {
  "use strict";
  var total = window.NARRATIONS.length;
  var current = 0;
  var speaking = false;
  var speechRun = 0;
  var visited = new Array(total).fill(false);
  var voices = [];

  var image = document.getElementById('slideImage');
  var statusText = document.getElementById('statusText');
  var languageText = document.getElementById('languageText');
  var progressBar = document.getElementById('progressBar');
  var captionText = document.getElementById('captionText');
  var captionPanel = document.getElementById('captionPanel');
  var captionsBtn = document.getElementById('captionsBtn');
  var playBtn = document.getElementById('playBtn');
  var prevBtn = document.getElementById('prevBtn');
  var nextBtn = document.getElementById('nextBtn');
  var autoNext = document.getElementById('autoNext');
  var rateSelect = document.getElementById('rateSelect');
  var englishVoiceSelect = document.getElementById('englishVoiceSelect');
  var vietnameseVoiceSelect = document.getElementById('vietnameseVoiceSelect');
  var startEnglishVoiceSelect = document.getElementById('startEnglishVoiceSelect');
  var startVietnameseVoiceSelect = document.getElementById('startVietnameseVoiceSelect');
  var startOverlay = document.getElementById('startOverlay');
  var supportMessage = document.getElementById('supportMessage');

  function slideSrc(index) {
    return 'assets/slides/slide-' + String(index + 1).padStart(2, '0') + '.jpg';
  }

  function currentNarration() { return window.NARRATIONS[current]; }

  function saveProgress() {
    var pct = Math.round(((current + 1) / total) * 100);
    SCORM.set('cmi.core.lesson_location', String(current + 1));
    SCORM.set('cmi.core.score.min', '0');
    SCORM.set('cmi.core.score.max', '100');
    SCORM.set('cmi.core.score.raw', String(pct));
    SCORM.set('cmi.suspend_data', visited.map(function (v) { return v ? '1' : '0'; }).join(''));
    if (current === total - 1) SCORM.set('cmi.core.lesson_status', 'completed');
    SCORM.commit();
  }

  function restoreProgress() {
    var loc = parseInt(SCORM.get('cmi.core.lesson_location'), 10);
    if (Number.isFinite(loc) && loc >= 1 && loc <= total) current = loc - 1;
    var data = SCORM.get('cmi.suspend_data');
    if (data && data.length === total) visited = data.split('').map(function (c) { return c === '1'; });
  }

  function stopSpeech() {
    speechRun += 1;
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    speaking = false;
    playBtn.textContent = 'Phát lời đọc';
  }

  function render() {
    stopSpeech();
    var item = currentNarration();
    image.src = slideSrc(current);
    image.alt = 'Trang ' + (current + 1) + ' trên ' + total;
    statusText.textContent = 'Trang ' + (current + 1) + ' / ' + total;
    languageText.textContent = item.lang.toLowerCase().indexOf('vi') === 0 ? 'Tiếng Việt' : 'English';
    captionText.textContent = item.text;
    progressBar.style.width = (((current + 1) / total) * 100) + '%';
    prevBtn.disabled = current === 0;
    nextBtn.disabled = current === total - 1;
    visited[current] = true;
    saveProgress();
  }

  function isVietnamese(lang) { return /^vi[-_]/i.test(lang || ''); }
  function isEnglish(lang) { return /^en[-_]/i.test(lang || ''); }

  function choosePreferred(list, language) {
    var pattern = language === 'vi' ? /(HoaiMy|NamMinh|Vietnam|Vietnamese|vi-VN)/i : /(Aria|Jenny|Sonia|Guy|Natural|Google US English|Zira|David)/i;
    return list.find(function (v) { return pattern.test(v.name + ' ' + v.lang); }) || list[0] || null;
  }

  function fillSelect(select, list, preferredName, emptyLabel) {
    select.innerHTML = '';
    if (!list.length) {
      var empty = document.createElement('option');
      empty.value = '';
      empty.textContent = emptyLabel;
      select.appendChild(empty);
      return;
    }
    list.forEach(function (v) {
      var option = document.createElement('option');
      option.value = v.name;
      option.textContent = v.name + ' (' + v.lang + ')' + (v.default ? ' - mặc định' : '');
      select.appendChild(option);
    });
    if (preferredName && list.some(function (v) { return v.name === preferredName; })) select.value = preferredName;
    else {
      var preferred = choosePreferred(list, isVietnamese(list[0].lang) ? 'vi' : 'en');
      if (preferred) select.value = preferred.name;
    }
  }

  function populateVoices() {
    if (!('speechSynthesis' in window)) {
      supportMessage.textContent = 'Trình duyệt này không hỗ trợ Speech Synthesis. Hãy dùng Microsoft Edge hoặc Google Chrome.';
      return;
    }
    voices = window.speechSynthesis.getVoices().slice().sort(function (a, b) { return a.name.localeCompare(b.name); });
    var enVoices = voices.filter(function (v) { return isEnglish(v.lang); });
    var viVoices = voices.filter(function (v) { return isVietnamese(v.lang); });
    var oldEn = englishVoiceSelect.value || startEnglishVoiceSelect.value;
    var oldVi = vietnameseVoiceSelect.value || startVietnameseVoiceSelect.value;
    fillSelect(englishVoiceSelect, enVoices, oldEn, 'Dùng giọng mặc định của trình duyệt');
    fillSelect(startEnglishVoiceSelect, enVoices, englishVoiceSelect.value, 'Dùng giọng mặc định của trình duyệt');
    fillSelect(vietnameseVoiceSelect, viVoices, oldVi, 'Dùng giọng mặc định của trình duyệt');
    fillSelect(startVietnameseVoiceSelect, viVoices, vietnameseVoiceSelect.value, 'Dùng giọng mặc định của trình duyệt');
    supportMessage.textContent = viVoices.length ? 'Voice sẽ tự đổi giữa tiếng Anh và tiếng Việt theo từng trang.' : 'Không tìm thấy giọng Việt riêng. Trình duyệt sẽ dùng giọng mặc định cho các trang tiếng Việt.';
  }

  function selectedVoice(lang) {
    var name = isVietnamese(lang) ? vietnameseVoiceSelect.value : englishVoiceSelect.value;
    return voices.find(function (v) { return v.name === name; }) ||
      voices.find(function (v) { return isVietnamese(lang) ? isVietnamese(v.lang) : isEnglish(v.lang); }) || null;
  }

  function splitLongPart(part, maxLen) {
    var words = part.split(/\s+/);
    var chunks = [];
    var currentChunk = '';
    words.forEach(function (word) {
      if (!word) return;
      if ((currentChunk + ' ' + word).trim().length > maxLen && currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = word;
      } else currentChunk = (currentChunk + ' ' + word).trim();
    });
    if (currentChunk) chunks.push(currentChunk.trim());
    return chunks;
  }

  function speechChunks(text, maxLen) {
    var sentences = text.match(/[^.!?…]+[.!?…]+|[^.!?…]+$/g) || [text];
    var chunks = [];
    var buffer = '';
    sentences.forEach(function (sentence) {
      sentence = sentence.trim();
      if (!sentence) return;
      if (sentence.length > maxLen) {
        if (buffer) { chunks.push(buffer); buffer = ''; }
        chunks = chunks.concat(splitLongPart(sentence, maxLen));
      } else if ((buffer + ' ' + sentence).trim().length <= maxLen) {
        buffer = (buffer + ' ' + sentence).trim();
      } else {
        if (buffer) chunks.push(buffer);
        buffer = sentence;
      }
    });
    if (buffer) chunks.push(buffer);
    return chunks;
  }

  function speakCurrent() {
    if (!('speechSynthesis' in window)) {
      window.alert('Trình duyệt không hỗ trợ đọc văn bản. Hãy dùng Microsoft Edge hoặc Google Chrome.');
      return;
    }
    if (speaking) { stopSpeech(); return; }

    window.speechSynthesis.cancel();
    var run = ++speechRun;
    var item = currentNarration();
    var chunks = speechChunks(item.text, 230);
    var voice = selectedVoice(item.lang);
    var rate = parseFloat(rateSelect.value || '1');
    var position = 0;
    speaking = true;
    playBtn.textContent = 'Dừng lời đọc';

    function speakNext() {
      if (run !== speechRun) return;
      if (position >= chunks.length) {
        speaking = false;
        playBtn.textContent = 'Phát lời đọc';
        if (autoNext.checked && current < total - 1) {
          current += 1;
          render();
          window.setTimeout(speakCurrent, 400);
        }
        return;
      }
      var utterance = new SpeechSynthesisUtterance(chunks[position++]);
      if (voice) utterance.voice = voice;
      utterance.lang = item.lang;
      utterance.rate = rate;
      utterance.pitch = 1;
      utterance.volume = 1;
      utterance.onend = speakNext;
      utterance.onerror = function (event) {
        if (run !== speechRun || event.error === 'interrupted' || event.error === 'canceled') return;
        speaking = false;
        playBtn.textContent = 'Phát lời đọc';
        supportMessage.textContent = 'Không thể phát voice trên trình duyệt này. Hãy thử Microsoft Edge hoặc Google Chrome.';
      };
      window.speechSynthesis.speak(utterance);
    }
    speakNext();
  }

  function go(delta) {
    var next = Math.max(0, Math.min(total - 1, current + delta));
    if (next !== current) { current = next; render(); }
  }

  SCORM.init();
  restoreProgress();
  populateVoices();
  if ('speechSynthesis' in window) window.speechSynthesis.onvoiceschanged = populateVoices;
  render();

  document.getElementById('startBtn').addEventListener('click', function () {
    englishVoiceSelect.value = startEnglishVoiceSelect.value;
    vietnameseVoiceSelect.value = startVietnameseVoiceSelect.value;
    startOverlay.hidden = true;
    speakCurrent();
  });
  startEnglishVoiceSelect.addEventListener('change', function () { englishVoiceSelect.value = startEnglishVoiceSelect.value; });
  startVietnameseVoiceSelect.addEventListener('change', function () { vietnameseVoiceSelect.value = startVietnameseVoiceSelect.value; });
  englishVoiceSelect.addEventListener('change', function () { startEnglishVoiceSelect.value = englishVoiceSelect.value; stopSpeech(); });
  vietnameseVoiceSelect.addEventListener('change', function () { startVietnameseVoiceSelect.value = vietnameseVoiceSelect.value; stopSpeech(); });
  playBtn.addEventListener('click', speakCurrent);
  prevBtn.addEventListener('click', function () { go(-1); });
  nextBtn.addEventListener('click', function () { go(1); });
  captionsBtn.addEventListener('click', function () {
    var show = captionPanel.hidden;
    captionPanel.hidden = !show;
    captionsBtn.setAttribute('aria-pressed', String(show));
  });
  document.getElementById('fullscreenBtn').addEventListener('click', function () {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen && document.documentElement.requestFullscreen();
    else document.exitFullscreen && document.exitFullscreen();
  });
  document.addEventListener('keydown', function (e) {
    if (e.target && /SELECT|INPUT|TEXTAREA/.test(e.target.tagName)) return;
    if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); go(1); }
    if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); go(-1); }
    if (e.key === ' ') { e.preventDefault(); speakCurrent(); }
  });
  window.addEventListener('pagehide', function () { saveProgress(); stopSpeech(); SCORM.finish(); });
})();
