const pdfjsLib = window["pdfjs-dist/build/pdf"];

pdfjsLib.GlobalWorkerOptions.workerSrc =
  "//mozilla.github.io/pdf.js/build/pdf.worker.js";

let pdfDoc = null,
  pageNum = 1,
  pageRendering = false,
  pageNumPending = null,
  pdfData,
  scale = 1.5;

const canvas = document.getElementById("pdf-viewer"),
  ctx = canvas.getContext("2d");

/**
 * Get page info from document, resize canvas accordingly, and render page.
 * @param num Page number.
 */
function renderPage(num) {
  pageRendering = true;
  // Using promise to fetch the page
  pdfDoc.getPage(num).then(page => {
    const viewport = page.getViewport({ scale: scale });
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    // Render PDF page into canvas context
    const renderContext = {
      canvasContext: ctx,
      viewport: viewport
    };

    // Wait for rendering to finish
    page.render(renderContext).promise.then(() => {
      pageRendering = false;
      localStorage.removeItem("pageNum");
      localStorage.setItem("pageNum", `${pageNum}`);
      if (pageNumPending !== null) {
        // New page rendering is pending
        renderPage(pageNumPending);
        pageNumPending = null;
      }
    });
  });

  // Update page counters
  document.getElementById("page_num").textContent = num;
}

/**
 * If another page rendering in progress, waits until the rendering is
 * finished. Otherwise, executes rendering immediately.
 */
function queueRenderPage(num) {
  if (pageRendering) {
    pageNumPending = num;
  } else {
    renderPage(num);
  }
}

/**
 * Displays previous page.
 */
function onPrevPage() {
  if (pageNum <= 1) {
    return;
  }
  pageNum--;
  queueRenderPage(pageNum);
}
document.getElementById("prev").addEventListener("click", onPrevPage);

/**
 * Displays next page.
 */
function onNextPage() {
  if (pageNum >= pdfDoc.numPages) {
    return;
  }
  pageNum++;
  queueRenderPage(pageNum);
}
document.getElementById("next").addEventListener("click", onNextPage);

/**
 * Zooms in page.
 */
function zoomInPage() {
  scale += 0.25;
  queueRenderPage(pageNum);
}
document.getElementById("zoom-in").addEventListener("click", zoomInPage);

/**
 * Zooms out page
 */
function zoomOutPage() {
  if (scale <= 0.25) {
    return;
  }
  scale = scale - 0.25;
  queueRenderPage(pageNum);
}
document.getElementById("zoom-out").addEventListener("click", zoomOutPage);

/**
 * Asynchronously downloads PDF.
 */
function downloadPDF(data) {
  pdfjsLib.getDocument({ data: pdfData }).promise.then(pdfDoc_ => {
    pdfDoc = pdfDoc_;
    console.log(pdfDoc);
    document.getElementById("page_count").textContent = pdfDoc.numPages;

    if (localStorage.getItem("pageNum") !== null) {
      pageNum = parseInt(localStorage.getItem("pageNum"), 10);
    }

    // Initial/first page rendering
    renderPage(pageNum);
  });
}

if (localStorage.getItem("pdfData") !== null) {
  pdfData = localStorage.getItem("pdfData");
  downloadPDF(pdfData);
}
const input = document.querySelector('input[type="file"]');
input.addEventListener(
  "change",
  e => {
    if (/\.(pdf)$/i.test(input.files[0].name)) {
      const reader = new FileReader();
      reader.onload = () => {
        const base64result = reader.result.split(",")[1];
        pdfData = atob(base64result);
        localStorage.removeItem("pdfData");
        localStorage.setItem("pdfData", `${pdfData}`);
        downloadPDF(pdfData);
      };
      reader.readAsDataURL(input.files[0]);
    } else {
      alert("Please select a pdf file...");
    }
  },
  false
);
