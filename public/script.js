// -----------------------------------------------------------------------
// AI PDF Ingestion Pipeline — frontend logic
// Pure vanilla JS. No build step, no frameworks.
// -----------------------------------------------------------------------

const STAGES = [
  { key: 'upload', label: 'Uploading PDF...' },
  { key: 'parse', label: 'Parsing PDF...' },
  { key: 'markdown', label: 'Converting to Markdown...' },
  { key: 'metadata', label: 'Extracting Metadata...' },
  { key: 'clean', label: 'Cleaning Document...' },
  { key: 'gemini', label: 'Asking Gemini AI...' },
  { key: 'done', label: 'AI Analysis Complete' },
];

// Elements
const form = document.getElementById('upload-form');
const fileInput = document.getElementById('file-input');
const dropzone = document.getElementById('dropzone');
const dropzoneContent = document.getElementById('dropzone-content');
const uploadBtn = document.getElementById('upload-btn');
const uploadBtnText = document.getElementById('upload-btn-text');

const statusCard = document.getElementById('status-card');
const statusStages = document.getElementById('status-stages');

const errorBanner = document.getElementById('error-banner');
const errorMessage = document.getElementById('error-message');
const successBanner = document.getElementById('success-banner');

const results = document.getElementById('results');
const metadataGrid = document.getElementById('metadata-grid');
const markdownOutput = document.getElementById('markdown-output');
const summaryOutput = document.getElementById('summary-output');
const topicsOutput = document.getElementById('topics-output');
const keyPointsOutput = document.getElementById('key-points-output');

let selectedFile = null;
let stageTimer = null;

// ---------- File selection ----------

fileInput.addEventListener('change', () => {
  const file = fileInput.files[0];
  handleFileSelected(file);
});

['dragover', 'dragenter'].forEach((evt) => {
  dropzone.addEventListener(evt, (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  });
});

['dragleave', 'drop'].forEach((evt) => {
  dropzone.addEventListener(evt, (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
  });
});

dropzone.addEventListener('drop', (e) => {
  const file = e.dataTransfer.files[0];
  if (file) {
    fileInput.files = e.dataTransfer.files;
    handleFileSelected(file);
  }
});

function handleFileSelected(file) {
  if (!file) return;

  if (file.type !== 'application/pdf') {
    showError('Please select a PDF file.');
    return;
  }

  selectedFile = file;
  hideError();

  dropzoneContent.innerHTML = `
    <span class="dropzone-icon">📄</span>
    <p class="dropzone-title">${escapeHtml(file.name)}</p>
    <p class="dropzone-hint">${formatBytes(file.size)} — click to choose a different file</p>
  `;

  uploadBtn.disabled = false;
  uploadBtnText.textContent = 'Analyze PDF';
}

// ---------- Form submit ----------

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!selectedFile) return;

  resetUiForNewUpload();
  startStageAnimation();

  const formData = new FormData();
  formData.append('file', selectedFile);

  try {
    const response = await fetch('/ai/upload', {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (!response.ok || data.success === false) {
      throw new Error(data.message || 'Something went wrong while processing the PDF.');
    }

    finishStageAnimation();
    renderResults(data);
    successBanner.classList.remove('hidden');
  } catch (err) {
    stopStageAnimation();
    statusCard.classList.add('hidden');
    showError(err.message || 'Unexpected error. Please try again.');
  } finally {
    uploadBtn.disabled = false;
    uploadBtnText.textContent = 'Analyze another PDF';
  }
});

function resetUiForNewUpload() {
  hideError();
  successBanner.classList.add('hidden');
  results.classList.add('hidden');
  uploadBtn.disabled = true;
  uploadBtnText.textContent = 'Processing...';
}

// ---------- Staged processing animation ----------

function startStageAnimation() {
  statusStages.innerHTML = STAGES.map(
    (stage, i) => `
      <div class="stage" data-key="${stage.key}">
        <div class="stage-dot"></div>
        <div class="stage-label">${stage.label}</div>
      </div>
    `,
  ).join('');

  statusCard.classList.remove('hidden');

  let index = 0;
  const stageEls = statusStages.querySelectorAll('.stage');

  const advance = () => {
    if (index > 0) stageEls[index - 1].classList.replace('active', 'done');
    if (index < stageEls.length - 1) {
      stageEls[index].classList.add('active');
      index += 1;
    }
  };

  advance();
  // Cycle through the intermediate stages while the real request is in
  // flight. The final "AI Analysis Complete" stage is only activated once
  // the actual server response arrives (see finishStageAnimation).
  stageTimer = setInterval(() => {
    if (index < stageEls.length - 1) {
      advance();
    } else {
      clearInterval(stageTimer);
    }
  }, 650);
}

function finishStageAnimation() {
  clearInterval(stageTimer);
  const stageEls = statusStages.querySelectorAll('.stage');
  stageEls.forEach((el, i) => {
    el.classList.remove('active');
    el.classList.add('done');
  });
  const last = stageEls[stageEls.length - 1];
  if (last) {
    last.classList.remove('done');
    last.classList.add('active');
  }
  setTimeout(() => statusCard.classList.add('hidden'), 500);
}

function stopStageAnimation() {
  clearInterval(stageTimer);
}

// ---------- Rendering results ----------

function renderResults(data) {
  renderMetadata(data.metadata);
  markdownOutput.textContent = data.markdown || '(no content extracted)';
  summaryOutput.textContent = data.summary || 'No summary available.';
  renderTopics(data.topics || []);
  renderKeyPoints(data.keyPoints || []);
  results.classList.remove('hidden');
  results.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderMetadata(metadata) {
  if (!metadata) {
    metadataGrid.innerHTML = '';
    return;
  }

  const items = [
    { label: 'File Name', value: metadata.fileName },
    { label: 'Pages', value: metadata.pageCount },
    { label: 'Word Count', value: metadata.wordCount?.toLocaleString?.() ?? metadata.wordCount },
    { label: 'File Size', value: metadata.fileSizeReadable },
  ];

  metadataGrid.innerHTML = items
    .map(
      (item) => `
      <div class="metadata-item">
        <div class="label">${escapeHtml(item.label)}</div>
        <div class="value">${escapeHtml(String(item.value ?? '-'))}</div>
      </div>
    `,
    )
    .join('');
}

function renderTopics(topics) {
  if (!topics.length) {
    topicsOutput.innerHTML = '<p class="dropzone-hint">No topics were extracted.</p>';
    return;
  }
  topicsOutput.innerHTML = topics
    .map((topic) => `<span class="badge">${escapeHtml(topic)}</span>`)
    .join('');
}

function renderKeyPoints(keyPoints) {
  if (!keyPoints.length) {
    keyPointsOutput.innerHTML = '<li>No key points were extracted.</li>';
    return;
  }
  keyPointsOutput.innerHTML = keyPoints
    .map((point) => `<li>${escapeHtml(point)}</li>`)
    .join('');
}

// ---------- Helpers ----------

function showError(message) {
  errorMessage.textContent = message;
  errorBanner.classList.remove('hidden');
}

function hideError() {
  errorBanner.classList.add('hidden');
  errorMessage.textContent = '';
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
