(() => {
  'use strict';

  const MAX_FILE_SIZE = 40 * 1024 * 1024;
  const PDFJS_VERSION = '3.4.120';
  const LOCAL_SIGNATURE_KEY = 'pdf-signer-pro.signature.v2';
  const MIN_ZOOM = 0.25;
  const MAX_ZOOM = 3;
  const ZOOM_STEP = 0.15;

  const state = {
    pdfBytes: null,
    pdfFile: null,
    pdfDoc: null,
    loadingTask: null,
    passwordUpdate: null,
    numPages: 0,
    currentPage: 1,
    zoom: 1,
    zoomMode: 'fit-width',
    currentScale: 1,
    renderTask: null,
    renderToken: 0,
    thumbnailToken: 0,
    elements: [],
    selectedId: null,
    pendingTool: null,
    signatureImage: null,
    signatureAspect: 2.8,
    history: [],
    historyIndex: -1,
    activeSignatureTab: 'draw',
    uploadedSignatureData: null,
    uploadedSignatureAspect: 2.8,
    signatureStrokeHistory: [],
    isDrawingSignature: false,
    textModalMode: 'text',
    lastFocusedElement: null,
    activeModalId: null,
    deferredInstallPrompt: null,
    lastExportBlob: null,
    lastExportName: null,
    lastExportHash: null,
    resizeTimer: null,
    interactionChanged: false,
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  const refs = {};

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    cacheRefs();

    if (!window.pdfjsLib || !window.PDFLib) {
      showToast('As bibliotecas do editor não foram carregadas. Verifique a internet e recarregue a página.', 'error', 7000);
      refs.uploadZone.classList.add('disabled-panel');
      return;
    }

    window.pdfjsLib.GlobalWorkerOptions.workerSrc = './pdf.worker.min.js?v=2.1.1';

    configureSignatureCanvas();
    bindEvents();
    loadSavedSignature();
    resetHistory();
    updateUI();
    initPro();
    registerServiceWorker();
  }

  function cacheRefs() {
    Object.assign(refs, {
      pdfInput: $('#pdf-input'),
      uploadZone: $('#upload-zone'),
      fileInfo: $('#file-info'),
      fileName: $('#file-name'),
      fileMeta: $('#file-meta'),
      outputName: $('#output-name'),
      removeFile: $('#btn-remove-file'),
      emptyUpload: $('#btn-empty-upload'),
      emptyState: $('#empty-state'),
      pdfViewer: $('#pdf-viewer'),
      toolsPanel: $('#tools-panel'),
      downloadButton: $('#btn-download'),
      downloadText: $('#btn-download-text'),
      shareButton: $('#btn-share'),
      installButton: $('#btn-install'),
      undoButton: $('#btn-undo'),
      redoButton: $('#btn-redo'),
      donateButton: $('#btn-donate'),
      pdfCanvas: $('#pdf-canvas'),
      viewportContainer: $('#viewport-container'),
      renderWrapper: $('#pdf-render-wrapper'),
      overlayLayer: $('#overlay-layer'),
      prevPage: $('#btn-prev-page'),
      nextPage: $('#btn-next-page'),
      pageInput: $('#page-input'),
      pageTotal: $('#page-total'),
      zoomOut: $('#btn-zoom-out'),
      zoomIn: $('#btn-zoom-in'),
      zoomLabel: $('#btn-zoom-label'),
      fitWidth: $('#btn-fit-width'),
      fitPage: $('#btn-fit-page'),
      toggleThumbnails: $('#btn-toggle-thumbnails'),
      thumbnailsPanel: $('#thumbnails-panel'),
      thumbnailsList: $('#thumbnails-list'),
      renderStatus: $('#render-status'),
      signatureTool: $('#tool-signature'),
      textTool: $('#tool-text'),
      dateTool: $('#tool-date'),
      initialsTool: $('#tool-initials'),
      checkboxTool: $('#tool-checkbox'),
      stampTool: $('#tool-stamp'),
      signatureCard: $('#signature-card'),
      signaturePreview: $('#signature-preview'),
      editSignature: $('#btn-edit-signature'),
      forgetSignature: $('#btn-forget-signature'),
      placementTip: $('#placement-tip'),
      placementTipText: $('#placement-tip-text'),
      cancelTool: $('#btn-cancel-tool'),
      propertiesPanel: $('#properties-panel'),
      selectedTypeTitle: $('#selected-type-title'),
      propertyTextRow: $('#property-text-row'),
      propertyText: $('#property-text'),
      propertyColorRow: $('#property-color-row'),
      propertyColor: $('#property-color'),
      propertyOpacity: $('#property-opacity'),
      opacityOutput: $('#opacity-output'),
      propertyFontRow: $('#property-font-row'),
      propertyFontScale: $('#property-font-scale'),
      fontOutput: $('#font-output'),
      deleteSelected: $('#btn-delete-selected'),
      rotateLeft: $('#btn-rotate-left'),
      rotateRight: $('#btn-rotate-right'),
      duplicate: $('#btn-duplicate'),
      elementsPanel: $('#elements-panel'),
      elementsList: $('#elements-list'),
      elementsCount: $('#elements-count'),
      signatureModal: $('#signature-modal'),
      signaturePad: $('#signature-pad'),
      signatureColor: $('#signature-color'),
      signatureWidth: $('#signature-width'),
      signatureUndoStroke: $('#btn-signature-undo-stroke'),
      clearSignatureCanvas: $('#btn-clear-canvas'),
      saveSignature: $('#btn-save-signature'),
      typedSignatureText: $('#typed-signature-text'),
      typedSignatureFont: $('#typed-signature-font'),
      typedSignatureColor: $('#typed-signature-color'),
      typedSignaturePreview: $('#typed-signature-preview'),
      signatureImageInput: $('#signature-image-input'),
      uploadedSignaturePreviewWrap: $('#uploaded-signature-preview-wrap'),
      uploadedSignaturePreview: $('#uploaded-signature-preview'),
      removeWhiteBackground: $('#remove-white-background'),
      saveSignatureLocally: $('#save-signature-locally'),
      textModal: $('#text-modal'),
      textModalTitle: $('#text-modal-title'),
      textModalLabel: $('#text-modal-label'),
      newTextValue: $('#new-text-value'),
      newTextColor: $('#new-text-color'),
      addText: $('#btn-add-text'),
      passwordModal: $('#password-modal'),
      passwordMessage: $('#password-message'),
      pdfPassword: $('#pdf-password'),
      submitPassword: $('#btn-submit-password'),
      cancelPassword: $('#btn-cancel-password'),
      donateModal: $('#donate-modal'),
      copyPix: $('#btn-copy-pix'),
      pixKey: $('#pix-key'),
      loadingOverlay: $('#loading-overlay'),
      loadingTitle: $('#loading-title'),
      loadingDetail: $('#loading-detail'),
      toastRegion: $('#toast-region'),
    });

    refs.pdfCtx = refs.pdfCanvas.getContext('2d', { alpha: false });
    refs.signatureCtx = refs.signaturePad.getContext('2d');
  }

  function bindEvents() {
    refs.pdfInput.addEventListener('change', (event) => {
      const file = event.target.files?.[0];
      if (file) loadPdfFile(file);
    });

    refs.emptyUpload.addEventListener('click', () => refs.pdfInput.click());
    refs.removeFile.addEventListener('click', () => resetDocument(true));

    ['dragenter', 'dragover'].forEach((name) => {
      refs.uploadZone.addEventListener(name, (event) => {
        event.preventDefault();
        refs.uploadZone.classList.add('dragover');
      });
    });
    ['dragleave', 'drop'].forEach((name) => {
      refs.uploadZone.addEventListener(name, (event) => {
        event.preventDefault();
        refs.uploadZone.classList.remove('dragover');
      });
    });
    refs.uploadZone.addEventListener('drop', (event) => {
      const file = event.dataTransfer?.files?.[0];
      if (file) loadPdfFile(file);
    });

    refs.prevPage.addEventListener('click', () => goToPage(state.currentPage - 1));
    refs.nextPage.addEventListener('click', () => goToPage(state.currentPage + 1));
    refs.pageInput.addEventListener('change', () => goToPage(Number(refs.pageInput.value)));
    refs.pageInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        goToPage(Number(refs.pageInput.value));
      }
    });

    refs.zoomOut.addEventListener('click', () => setManualZoom(state.currentScale - ZOOM_STEP));
    refs.zoomIn.addEventListener('click', () => setManualZoom(state.currentScale + ZOOM_STEP));
    refs.zoomLabel.addEventListener('click', () => setManualZoom(1));
    refs.fitWidth.addEventListener('click', () => {
      state.zoomMode = 'fit-width';
      renderPage(state.currentPage);
    });
    refs.fitPage.addEventListener('click', () => {
      state.zoomMode = 'fit-page';
      renderPage(state.currentPage);
    });
    refs.toggleThumbnails.addEventListener('click', () => refs.thumbnailsPanel.classList.toggle('collapsed'));

    refs.signatureTool.addEventListener('click', handleSignatureTool);
    refs.textTool.addEventListener('click', () => openTextModal('text'));
    refs.dateTool.addEventListener('click', () => addTextLikeElement('date', formatDate(new Date()), '#111827'));
    refs.initialsTool.addEventListener('click', () => openTextModal('initials'));
    refs.checkboxTool.addEventListener('click', () => addElementAtCenter('checkbox'));
    refs.stampTool.addEventListener('click', () => openTextModal('stamp'));
    refs.editSignature.addEventListener('click', () => openSignatureModal());
    refs.forgetSignature.addEventListener('click', forgetSavedSignature);
    refs.cancelTool.addEventListener('click', cancelPendingTool);

    refs.renderWrapper.addEventListener('click', handlePageClick);
    refs.viewportContainer.addEventListener('click', (event) => {
      if (event.target === refs.viewportContainer) selectElement(null);
    });

    refs.propertyText.addEventListener('input', updateSelectedTextFromProperties);
    refs.propertyText.addEventListener('change', commitHistory);
    refs.propertyColor.addEventListener('input', updateSelectedColorFromProperties);
    refs.propertyColor.addEventListener('change', commitHistory);
    refs.propertyOpacity.addEventListener('input', updateSelectedOpacityFromProperties);
    refs.propertyOpacity.addEventListener('change', commitHistory);
    refs.propertyFontScale.addEventListener('input', updateSelectedFontFromProperties);
    refs.propertyFontScale.addEventListener('change', commitHistory);
    refs.deleteSelected.addEventListener('click', () => deleteElement(state.selectedId));
    refs.rotateLeft.addEventListener('click', () => rotateSelected(-15));
    refs.rotateRight.addEventListener('click', () => rotateSelected(15));
    refs.duplicate.addEventListener('click', duplicateSelected);

    refs.undoButton.addEventListener('click', undo);
    refs.redoButton.addEventListener('click', redo);
    refs.downloadButton.addEventListener('click', exportPdf);
    refs.shareButton.addEventListener('click', shareLastExport);
    refs.donateButton.addEventListener('click', () => openModal('donate-modal'));
    refs.copyPix.addEventListener('click', copyPixKey);

    $$('[data-close-modal]').forEach((button) => {
      button.addEventListener('click', () => closeModal(button.dataset.closeModal));
    });

    $$('[data-signature-tab]').forEach((button) => {
      button.addEventListener('click', () => switchSignatureTab(button.dataset.signatureTab));
    });

    refs.clearSignatureCanvas.addEventListener('click', clearSignatureCanvas);
    refs.signatureUndoStroke.addEventListener('click', undoSignatureStroke);
    refs.saveSignature.addEventListener('click', saveSignatureFromActiveTab);
    refs.typedSignatureText.addEventListener('input', updateTypedSignaturePreview);
    refs.typedSignatureFont.addEventListener('change', updateTypedSignaturePreview);
    refs.typedSignatureColor.addEventListener('input', updateTypedSignaturePreview);
    refs.signatureImageInput.addEventListener('change', handleSignatureImageUpload);
    refs.removeWhiteBackground.addEventListener('change', refreshUploadedSignatureProcessing);

    refs.addText.addEventListener('click', addTextFromModal);
    refs.newTextValue.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        addTextFromModal();
      }
    });

    refs.submitPassword.addEventListener('click', submitPdfPassword);
    refs.pdfPassword.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') submitPdfPassword();
    });
    refs.cancelPassword.addEventListener('click', cancelPasswordRequest);

    document.addEventListener('keydown', handleGlobalKeyboard);
    window.addEventListener('resize', handleWindowResize);

    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      state.deferredInstallPrompt = event;
      refs.installButton.classList.remove('hidden');
    });
    refs.installButton.addEventListener('click', installPwa);
  }

  async function loadPdfFile(file) {
    if (!file) return;
    if (!pro.restoring && !state.pdfDoc && pro.pendingDraft && !confirm('Existe um rascunho salvo. Abrir outro PDF substituirá esse rascunho. Continuar?')) return;
    if (!pro.restoring && isDirty() && !confirm('Há alterações ainda não baixadas. Deseja trocar o documento?')) return;
    clearTimeout(pro.saveTimer);
    pro.documentEpoch += 1;
    if (file.size > MAX_FILE_SIZE) {
      showToast('O PDF excede o limite de 40 MB.', 'error');
      return;
    }

    showLoading('Abrindo PDF…', 'Validando e preparando o documento.');

    try {
      const buffer = await file.arrayBuffer();
      if (!hasPdfHeader(buffer)) throw new Error('O arquivo não possui um cabeçalho PDF válido.');

      if (state.pdfDoc) {
        try { await state.pdfDoc.destroy(); } catch (_) { /* noop */ }
      }

      state.pdfBytes = buffer;
      state.pdfFile = file;
      state.elements = [];
      state.selectedId = null;
      state.pendingTool = null;
      state.currentPage = 1;
      state.zoomMode = 'fit-width';
      state.lastExportBlob = null;
      state.lastExportHash = null;
      refs.shareButton.classList.add('hidden');

      const loadingTask = window.pdfjsLib.getDocument({ data: buffer.slice(0) });
      state.loadingTask = loadingTask;

      loadingTask.onPassword = (updatePassword, reason) => {
        state.passwordUpdate = updatePassword;
        hideLoading();
        refs.passwordMessage.textContent = reason === window.pdfjsLib.PasswordResponses.INCORRECT_PASSWORD
          ? 'A senha informada está incorreta. Tente novamente.'
          : 'Este arquivo exige senha para ser aberto.';
        refs.pdfPassword.value = '';
        openModal('password-modal');
      };

      state.pdfDoc = await loadingTask.promise;
      state.numPages = state.pdfDoc.numPages;
      pro.plan = Array.from({length:state.numPages},(_,i)=>({source:i+1,rotation:0,included:true}));
      pro.exported = null;
      state.loadingTask = null;
      state.passwordUpdate = null;

      refs.fileName.textContent = file.name;
      refs.fileMeta.textContent = `${state.numPages} ${state.numPages === 1 ? 'página' : 'páginas'} • ${formatBytes(file.size)}`;
      refs.outputName.value = buildOutputName(file.name);

      resetHistory();
      pro.baseline = serializeElements();
      updateUI();
      if (!pro.restoring) scheduleDraft();
      await renderPage(1);
      hideLoading();
      renderThumbnails();
      showToast('PDF carregado. Agora adicione os elementos desejados.', 'success');
    } catch (error) {
      console.error(error);
      hideLoading();
      if (error?.name !== 'PasswordException') {
        showToast(humanizePdfError(error), 'error', 6500);
        resetDocument(false);
      }
    }
  }

  function hasPdfHeader(buffer) {
    const bytes = new Uint8Array(buffer, 0, Math.min(8, buffer.byteLength));
    return new TextDecoder('ascii').decode(bytes).startsWith('%PDF-');
  }

  function humanizePdfError(error) {
    const message = String(error?.message || error || '');
    if (/password/i.test(message)) return 'Não foi possível abrir o PDF protegido.';
    if (/invalid|malformed|corrupt/i.test(message)) return 'O PDF parece estar corrompido ou fora do padrão.';
    if (/Missing PDF/i.test(message)) return 'O arquivo selecionado não é um PDF válido.';
    return message || 'Não foi possível abrir o PDF.';
  }

  async function resetDocument(showMessage) {
    if (showMessage && isDirty() && !confirm("Há alterações ainda não baixadas. Remover o documento?")) return;
    clearTimeout(pro.saveTimer); pro.documentEpoch += 1; pro.plan=[]; pro.baseline=null;
    state.renderToken += 1;
    state.thumbnailToken += 1;
    if (state.renderTask) {
      try { state.renderTask.cancel(); } catch (_) { /* noop */ }
    }
    if (state.loadingTask) {
      try { await state.loadingTask.destroy(); } catch (_) { /* noop */ }
    }
    if (state.pdfDoc) {
      try { await state.pdfDoc.destroy(); } catch (_) { /* noop */ }
    }

    state.pdfBytes = null;
    state.pdfFile = null;
    state.pdfDoc = null;
    state.loadingTask = null;
    state.passwordUpdate = null;
    state.numPages = 0;
    state.currentPage = 1;
    state.elements = [];
    state.selectedId = null;
    state.pendingTool = null;
    state.lastExportBlob = null;
    state.lastExportHash = null;
    state.lastExportName = null;
    refs.pdfInput.value = '';
    refs.pdfCanvas.width = 1;
    refs.pdfCanvas.height = 1;
    refs.pdfCanvas.style.width = '1px';
    refs.pdfCanvas.style.height = '1px';
    refs.overlayLayer.innerHTML = '';
    refs.thumbnailsList.innerHTML = '';
    resetHistory();
    updateUI();
    if (showMessage) showToast('Documento removido.');
  }

  function submitPdfPassword() {
    if (!state.passwordUpdate) return;
    const password = refs.pdfPassword.value;
    closeModal('password-modal');
    showLoading('Abrindo PDF protegido…', 'Verificando a senha informada.');
    const callback = state.passwordUpdate;
    state.passwordUpdate = null;
    callback(password);
  }

  async function cancelPasswordRequest() {
    const task = state.loadingTask;
    state.passwordUpdate = null;
    closeModal('password-modal');
    if (task) {
      try { await task.destroy(); } catch (_) { /* noop */ }
    }
    hideLoading();
    resetDocument(false);
    showToast('A abertura do PDF protegido foi cancelada.');
  }

  async function renderPage(pageNumber) {
    if (!state.pdfDoc || pageNumber < 1 || pageNumber > state.numPages) return;

    state.currentPage = pageNumber;
    state.selectedId = null;
    state.renderToken += 1;
    const token = state.renderToken;

    if (state.renderTask) {
      try { state.renderTask.cancel(); } catch (_) { /* noop */ }
    }

    refs.renderWrapper.classList.add('rendering');
    refs.renderStatus.textContent = 'Renderizando…';
    updateNavigationUI();

    try {
      const page = await state.pdfDoc.getPage(pageNumber);
      const baseViewport = page.getViewport({ scale: 1 });
      const cssScale = computeRenderScale(baseViewport);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const renderViewport = page.getViewport({ scale: cssScale * dpr });
      const cssWidth = baseViewport.width * cssScale;
      const cssHeight = baseViewport.height * cssScale;

      refs.pdfCanvas.width = Math.max(1, Math.floor(renderViewport.width));
      refs.pdfCanvas.height = Math.max(1, Math.floor(renderViewport.height));
      refs.pdfCanvas.style.width = `${cssWidth}px`;
      refs.pdfCanvas.style.height = `${cssHeight}px`;
      refs.renderWrapper.style.width = `${cssWidth}px`;
      refs.renderWrapper.style.height = `${cssHeight}px`;

      state.currentScale = cssScale;
      state.renderTask = page.render({ canvasContext: refs.pdfCtx, viewport: renderViewport });
      await state.renderTask.promise;

      if (token !== state.renderToken) return;
      refs.renderStatus.textContent = `${Math.round(cssScale * 100)}%`;
      refs.renderWrapper.classList.remove('rendering');
      renderOverlays();
      updateNavigationUI();
      updateThumbnailSelection();
    } catch (error) {
      if (error?.name !== 'RenderingCancelledException') {
        console.error(error);
        showToast('Não foi possível renderizar esta página.', 'error');
      }
    } finally {
      if (token === state.renderToken) refs.renderWrapper.classList.remove('rendering');
    }
  }

  function computeRenderScale(baseViewport) {
    const availableWidth = Math.max(260, refs.viewportContainer.clientWidth - 64);
    const availableHeight = Math.max(360, refs.viewportContainer.clientHeight - 64);

    if (state.zoomMode === 'fit-width') return clamp(availableWidth / baseViewport.width, MIN_ZOOM, MAX_ZOOM);
    if (state.zoomMode === 'fit-page') {
      return clamp(Math.min(availableWidth / baseViewport.width, availableHeight / baseViewport.height), MIN_ZOOM, MAX_ZOOM);
    }
    return clamp(state.zoom, MIN_ZOOM, MAX_ZOOM);
  }

  function setManualZoom(value) {
    state.zoomMode = 'manual';
    state.zoom = clamp(value, MIN_ZOOM, MAX_ZOOM);
    renderPage(state.currentPage);
  }

  function goToPage(page) {
    if (!state.pdfDoc) return;
    const next = clamp(Math.round(page || 1), 1, state.numPages);
    renderPage(next);
  }

  async function renderThumbnails() {
    if (!state.pdfDoc) return;
    const token = ++state.thumbnailToken;
    refs.thumbnailsList.innerHTML = '';

    for (let pageNumber = 1; pageNumber <= state.numPages; pageNumber += 1) {
      if (token !== state.thumbnailToken || !state.pdfDoc) return;

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'thumbnail-button';
      button.dataset.page = String(pageNumber);
      button.setAttribute('aria-label', `Ir para a página ${pageNumber}`);

      const canvas = document.createElement('canvas');
      const label = document.createElement('span');
      label.textContent = `Página ${pageNumber}`;
      button.append(canvas, label);
      button.addEventListener('click', () => goToPage(pageNumber));
      refs.thumbnailsList.appendChild(button);

      try {
        const page = await state.pdfDoc.getPage(pageNumber);
        const base = page.getViewport({ scale: 1 });
        const cssWidth = 118;
        const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
        const scale = (cssWidth / base.width) * dpr;
        const viewport = page.getViewport({ scale });
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        canvas.style.width = `${cssWidth}px`;
        canvas.style.height = `${(base.height / base.width) * cssWidth}px`;
        await page.render({ canvasContext: canvas.getContext('2d', { alpha: false }), viewport }).promise;
      } catch (error) {
        console.warn(`Miniatura da página ${pageNumber} não renderizada`, error);
      }

      if (pageNumber % 2 === 0) await nextFrame();
    }

    updateThumbnailSelection();
    updateProUI();
  }

  function updateThumbnailSelection() {
    $$('.thumbnail-button', refs.thumbnailsList).forEach((button) => {
      const active = Number(button.dataset.page) === state.currentPage;
      button.classList.toggle('active', active);
      button.setAttribute('aria-current', active ? 'page' : 'false');
      if (active) button.scrollIntoView({ block: 'nearest' });
    });
  }

  function handleSignatureTool() {
    if (!state.signatureImage) {
      openSignatureModal();
      return;
    }
    setPendingTool('signature', 'Clique na página para posicionar a assinatura.');
  }

  function setPendingTool(tool, message) {
    state.pendingTool = tool;
    $$('.tool-button').forEach((button) => button.classList.remove('active'));
    if (tool === 'signature') refs.signatureTool.classList.add('active');
    refs.placementTipText.textContent = message;
    refs.placementTip.classList.remove('hidden');
    refs.renderWrapper.classList.add('placing');
  }

  function cancelPendingTool() {
    state.pendingTool = null;
    refs.placementTip.classList.add('hidden');
    refs.renderWrapper.classList.remove('placing');
    $$('.tool-button').forEach((button) => button.classList.remove('active'));
  }

  function handlePageClick(event) {
    if (event.target.closest('.pdf-element')) return;

    if (!state.pendingTool) {
      selectElement(null);
      return;
    }

    const rect = refs.renderWrapper.getBoundingClientRect();
    const x = clamp((event.clientX - rect.left) / rect.width, 0, 1);
    const y = clamp((event.clientY - rect.top) / rect.height, 0, 1);

    if (state.pendingTool === 'signature') {
      addElement('signature', x, y, { image: state.signatureImage, aspect: state.signatureAspect });
    }
    cancelPendingTool();
  }

  function addElement(type, centerX, centerY, options = {}) {
    if (!state.pdfDoc) return;
    const dimensions = getDefaultElementDimensions(type, options.aspect);
    const element = {
      id: makeId(),
      type,
      page: state.currentPage,
      x: clamp(centerX - dimensions.w / 2, 0, 1 - dimensions.w),
      y: clamp(centerY - dimensions.h / 2, 0, 1 - dimensions.h),
      w: dimensions.w,
      h: dimensions.h,
      rotation: 0,
      opacity: 1,
      color: options.color || '#111827',
      fontScale: 1,
      text: options.text || '',
      image: options.image || null,
      aspect: options.aspect || null,
      checked: options.checked ?? true,
    };

    state.elements.push(element);
    state.selectedId = element.id;
    commitHistory();
    renderOverlays();
    updateUI();
  }

  function addElementAtCenter(type, options = {}) {
    addElement(type, 0.5, 0.5, options);
  }

  function addTextLikeElement(type, text, color) {
    addElementAtCenter(type, {
      text,
      color,
    });
  }

  function getDefaultElementDimensions(type, aspect = 2.8) {
    const wrapperWidth = Math.max(refs.renderWrapper.clientWidth, 1);
    const wrapperHeight = Math.max(refs.renderWrapper.clientHeight, 1);

    if (type === 'signature') {
      const w = 0.28;
      return { w, h: clamp((w * wrapperWidth / aspect) / wrapperHeight, 0.035, 0.18) };
    }
    if (type === 'checkbox') {
      const w = 0.055;
      return { w, h: clamp((w * wrapperWidth) / wrapperHeight, 0.025, 0.12) };
    }
    if (type === 'initials') return { w: 0.13, h: 0.055 };
    if (type === 'stamp') return { w: 0.25, h: 0.075 };
    return { w: 0.30, h: 0.055 };
  }

  function openTextModal(mode) {
    state.textModalMode = mode;
    const config = {
      text: { title: 'Adicionar texto', label: 'Texto', placeholder: 'Digite o conteúdo', value: '' },
      initials: { title: 'Adicionar iniciais', label: 'Iniciais', placeholder: 'Ex.: MV', value: '' },
      stamp: { title: 'Adicionar carimbo', label: 'Texto do carimbo', placeholder: 'Ex.: APROVADO', value: 'APROVADO' },
    }[mode];

    refs.textModalTitle.textContent = config.title;
    refs.textModalLabel.textContent = config.label;
    refs.newTextValue.placeholder = config.placeholder;
    refs.newTextValue.value = config.value;
    refs.newTextColor.value = mode === 'stamp' ? '#b42318' : '#111827';
    openModal('text-modal');
    setTimeout(() => refs.newTextValue.focus(), 0);
  }

  function addTextFromModal() {
    const value = refs.newTextValue.value.trim();
    if (!value) {
      showToast('Digite o conteúdo antes de adicionar.', 'error');
      refs.newTextValue.focus();
      return;
    }

    addElementAtCenter(state.textModalMode, {
      text: value,
      color: refs.newTextColor.value,
    });
    closeModal('text-modal');
  }

  function renderOverlays() {
    refs.overlayLayer.innerHTML = '';
    const pageElements = state.elements.filter((element) => element.page === state.currentPage);
    const wrapperWidth = Math.max(refs.renderWrapper.clientWidth, 1);
    const wrapperHeight = Math.max(refs.renderWrapper.clientHeight, 1);

    pageElements.forEach((element) => {
      const node = document.createElement('div');
      node.className = `pdf-element ${element.type}-element`;
      node.dataset.id = element.id;
      node.style.left = `${element.x * 100}%`;
      node.style.top = `${element.y * 100}%`;
      node.style.width = `${element.w * 100}%`;
      node.style.height = `${element.h * 100}%`;
      node.style.opacity = String(element.opacity);
      node.style.color = element.color || '#111827';
      node.style.transform = `rotate(${element.rotation || 0}deg)`;
      node.classList.toggle('selected', element.id === state.selectedId);
      node.classList.toggle('position-locked', Boolean(element.locked));
      node.setAttribute('tabindex', '0');
      node.setAttribute('role', 'button');
      node.setAttribute('aria-label', `${typeLabel(element.type)} na página ${element.page}`);

      const content = document.createElement('div');
      content.className = 'element-content';

      if (element.type === 'signature') {
        const image = document.createElement('img');
        image.src = element.image;
        image.alt = '';
        content.appendChild(image);
      } else if (element.type === 'checkbox') {
        content.textContent = element.checked ? '✓' : '';
        const fontSize = Math.max(12, Math.min(element.w * wrapperWidth, element.h * wrapperHeight) * 0.85);
        content.style.fontSize = `${fontSize}px`;
        content.style.border = `${Math.max(1, fontSize * 0.08)}px solid currentColor`;
      } else {
        content.textContent = element.text;
        const naturalFontSize = Math.max(10, element.h * wrapperHeight * 0.65 * (element.fontScale || 1));
        const availableWidth = Math.max(18, element.w * wrapperWidth * (element.type === 'stamp' ? 0.82 : 0.92));
        const estimatedTextWidthAtOnePixel = Math.max(1, String(element.text || '').length * (element.type === 'stamp' ? 0.64 : 0.56));
        const fittedFontSize = availableWidth / estimatedTextWidthAtOnePixel;
        const fontSize = Math.max(8, Math.min(naturalFontSize, fittedFontSize));
        content.style.fontSize = `${fontSize}px`;
        if (element.type === 'stamp') content.style.borderWidth = `${Math.max(1, fontSize * 0.08)}px`;
      }

      const deleteControl = createElementControl('delete-control', '×', 'Excluir elemento');
      const rotateControl = createElementControl('rotate-control', '↻', 'Girar elemento');
      const resizeControl = createElementControl('resize-control', '↘', 'Redimensionar elemento');

      node.append(content, deleteControl, rotateControl, resizeControl);
      refs.overlayLayer.appendChild(node);

      node.addEventListener('click', (event) => {
        event.stopPropagation();
        selectElement(element.id);
      });
      node.addEventListener('pointerdown', (event) => {
        if (event.target.closest('.element-control')) return;
        beginElementInteraction(event, element.id, 'drag');
      });
      deleteControl.addEventListener('pointerdown', (event) => event.stopPropagation());
      deleteControl.addEventListener('click', (event) => {
        event.stopPropagation();
        deleteElement(element.id);
      });
      resizeControl.addEventListener('pointerdown', (event) => {
        event.stopPropagation();
        beginElementInteraction(event, element.id, 'resize');
      });
      rotateControl.addEventListener('pointerdown', (event) => {
        event.stopPropagation();
        beginElementInteraction(event, element.id, 'rotate');
      });
    });

    updatePropertiesPanel();
    updateElementsList();
    updateProUI();
  }

  function createElementControl(className, text, label) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `element-control ${className}`;
    button.textContent = text;
    button.setAttribute('aria-label', label);
    return button;
  }

  function beginElementInteraction(event, id, mode) {
    const element = findElement(id);
    if (!element) return;
    if (element.locked || pro.pan) { selectElement(id); return; }
    event.preventDefault();
    event.stopPropagation();
    selectElement(id);

    const wrapperRect = refs.renderWrapper.getBoundingClientRect();
    const start = {
      clientX: event.clientX,
      clientY: event.clientY,
      x: element.x,
      y: element.y,
      w: element.w,
      h: element.h,
      rotation: element.rotation || 0,
      centerX: wrapperRect.left + (element.x + element.w / 2) * wrapperRect.width,
      centerY: wrapperRect.top + (element.y + element.h / 2) * wrapperRect.height,
    };
    const startPointerAngle = Math.atan2(event.clientY - start.centerY, event.clientX - start.centerX) * 180 / Math.PI;
    state.interactionChanged = false;

    const onMove = (moveEvent) => {
      moveEvent.preventDefault();
      const dx = moveEvent.clientX - start.clientX;
      const dy = moveEvent.clientY - start.clientY;

      if (mode === 'drag') {
        element.x = clamp(start.x + dx / wrapperRect.width, 0, 1 - element.w);
        element.y = clamp(start.y + dy / wrapperRect.height, 0, 1 - element.h);
        snapToCenter(element, wrapperRect);
      } else if (mode === 'resize') {
        const angle = (start.rotation || 0) * Math.PI / 180;
        const localDx = Math.cos(angle) * dx + Math.sin(angle) * dy;
        const localDy = -Math.sin(angle) * dx + Math.cos(angle) * dy;

        if (element.type === 'signature' && element.aspect) {
          const newWidthPx = Math.max(48, start.w * wrapperRect.width + localDx);
          const newHeightPx = newWidthPx / element.aspect;
          element.w = clamp(newWidthPx / wrapperRect.width, 0.04, 1 - element.x);
          element.h = clamp(newHeightPx / wrapperRect.height, 0.025, 1 - element.y);
        } else if (element.type === 'checkbox') {
          const newSizePx = Math.max(24, Math.max(start.w * wrapperRect.width + localDx, start.h * wrapperRect.height + localDy));
          element.w = clamp(newSizePx / wrapperRect.width, 0.025, 1 - element.x);
          element.h = clamp(newSizePx / wrapperRect.height, 0.025, 1 - element.y);
        } else {
          element.w = clamp(start.w + localDx / wrapperRect.width, 0.05, 1 - element.x);
          element.h = clamp(start.h + localDy / wrapperRect.height, 0.025, 1 - element.y);
        }
      } else if (mode === 'rotate') {
        const pointerAngle = Math.atan2(moveEvent.clientY - start.centerY, moveEvent.clientX - start.centerX) * 180 / Math.PI;
        element.rotation = normalizeAngle(start.rotation + pointerAngle - startPointerAngle);
      }

      state.interactionChanged = true;
      renderOverlays();
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      refs.renderWrapper.classList.remove("guide-x","guide-y");
      if (state.interactionChanged) commitHistory();
      state.interactionChanged = false;
    };

    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp, { once: true });
    window.addEventListener('pointercancel', onUp, { once: true });
  }

  function selectElement(id) {
    state.selectedId = id;
    const element = findElement(id);
    if (element && element.page !== state.currentPage) {
      state.currentPage = element.page;
      renderPage(element.page).then(() => {
        state.selectedId = id;
        renderOverlays();
      });
      return;
    }
    renderOverlays();
    updateUI();
  }

  function deleteElement(id) {
    if (!id) return;
    const previousLength = state.elements.length;
    state.elements = state.elements.filter((element) => element.id !== id);
    if (state.elements.length === previousLength) return;
    if (state.selectedId === id) state.selectedId = null;
    commitHistory();
    renderOverlays();
    updateUI();
  }

  function duplicateSelected() {
    const selected = findElement(state.selectedId);
    if (!selected) return;
    const copy = structuredCloneSafe(selected);
    copy.id = makeId();
    copy.x = clamp(copy.x + 0.025, 0, 1 - copy.w);
    copy.y = clamp(copy.y + 0.025, 0, 1 - copy.h);
    state.elements.push(copy);
    state.selectedId = copy.id;
    commitHistory();
    renderOverlays();
    updateUI();
  }

  function rotateSelected(delta) {
    const selected = findElement(state.selectedId);
    if (!selected || selected.locked) return;
    selected.rotation = normalizeAngle((selected.rotation || 0) + delta);
    commitHistory();
    renderOverlays();
  }

  function updateSelectedTextFromProperties() {
    const selected = findElement(state.selectedId);
    if (!selected || !['text', 'date', 'initials', 'stamp'].includes(selected.type)) return;
    selected.text = refs.propertyText.value.slice(0, 140);
    renderOverlays();
  }

  function updateSelectedColorFromProperties() {
    const selected = findElement(state.selectedId);
    if (!selected || selected.type === 'signature') return;
    selected.color = refs.propertyColor.value;
    renderOverlays();
  }

  function updateSelectedOpacityFromProperties() {
    const selected = findElement(state.selectedId);
    if (!selected) return;
    selected.opacity = Number(refs.propertyOpacity.value) / 100;
    refs.opacityOutput.value = `${refs.propertyOpacity.value}%`;
    renderOverlays();
  }

  function updateSelectedFontFromProperties() {
    const selected = findElement(state.selectedId);
    if (!selected || !['text', 'date', 'initials', 'stamp'].includes(selected.type)) return;
    selected.fontScale = Number(refs.propertyFontScale.value) / 100;
    refs.fontOutput.value = `${refs.propertyFontScale.value}%`;
    renderOverlays();
  }

  function updatePropertiesPanel() {
    const selected = findElement(state.selectedId);
    refs.propertiesPanel.classList.toggle('hidden', !selected);
    if (!selected) return;

    refs.selectedTypeTitle.textContent = typeLabel(selected.type);
    const hasText = ['text', 'date', 'initials', 'stamp'].includes(selected.type);
    refs.propertyTextRow.classList.toggle('hidden', !hasText);
    refs.propertyFontRow.classList.toggle('hidden', !hasText);
    refs.propertyColorRow.classList.toggle('hidden', selected.type === 'signature');

    if (hasText) {
      refs.propertyText.value = selected.text || '';
      refs.propertyFontScale.value = String(Math.round((selected.fontScale || 1) * 100));
      refs.fontOutput.value = `${refs.propertyFontScale.value}%`;
    }
    if (selected.type !== 'signature') refs.propertyColor.value = selected.color || '#111827';
    refs.propertyOpacity.value = String(Math.round((selected.opacity ?? 1) * 100));
    refs.opacityOutput.value = `${refs.propertyOpacity.value}%`;
  }

  function updateElementsList() {
    refs.elementsList.innerHTML = '';
    refs.elementsPanel.classList.toggle('hidden', state.elements.length === 0);
    refs.elementsCount.textContent = String(state.elements.length);

    state.elements
      .slice()
      .sort((a, b) => a.page - b.page)
      .forEach((element) => {
        const row = document.createElement('div');
        row.className = 'element-list-item';
        row.classList.toggle('selected', element.id === state.selectedId);
        row.tabIndex = 0;
        row.setAttribute('role', 'button');

        const icon = document.createElement('span');
        icon.className = 'type-icon';
        icon.textContent = typeIcon(element.type);

        const info = document.createElement('div');
        const title = document.createElement('strong');
        title.textContent = element.type === 'signature' ? 'Assinatura' : (element.text || typeLabel(element.type));
        const subtitle = document.createElement('span');
        subtitle.textContent = `Página ${element.page}`;
        info.append(title, subtitle);

        const remove = document.createElement('button');
        remove.type = 'button';
        remove.textContent = '×';
        remove.setAttribute('aria-label', `Excluir ${typeLabel(element.type)}`);
        remove.addEventListener('click', (event) => {
          event.stopPropagation();
          deleteElement(element.id);
        });

        row.append(icon, info, remove);
        row.addEventListener('click', () => selectElement(element.id));
        row.addEventListener('keydown', (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            selectElement(element.id);
          }
        });
        refs.elementsList.appendChild(row);
      });
  }

  function configureSignatureCanvas() {
    const ctx = refs.signatureCtx;
    ctx.clearRect(0, 0, refs.signaturePad.width, refs.signaturePad.height);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    refs.signaturePad.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      refs.signaturePad.setPointerCapture(event.pointerId);
      state.signatureStrokeHistory.push(ctx.getImageData(0, 0, refs.signaturePad.width, refs.signaturePad.height));
      state.isDrawingSignature = true;
      const point = signaturePointerPosition(event);
      ctx.beginPath();
      ctx.moveTo(point.x, point.y);
    });

    refs.signaturePad.addEventListener('pointermove', (event) => {
      if (!state.isDrawingSignature) return;
      event.preventDefault();
      const point = signaturePointerPosition(event);
      ctx.strokeStyle = refs.signatureColor.value;
      ctx.lineWidth = Number(refs.signatureWidth.value);
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
    });

    const stopDrawing = () => { state.isDrawingSignature = false; };
    refs.signaturePad.addEventListener('pointerup', stopDrawing);
    refs.signaturePad.addEventListener('pointercancel', stopDrawing);
    refs.signaturePad.addEventListener('pointerleave', stopDrawing);
  }

  function signaturePointerPosition(event) {
    const rect = refs.signaturePad.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * (refs.signaturePad.width / rect.width),
      y: (event.clientY - rect.top) * (refs.signaturePad.height / rect.height),
    };
  }

  function openSignatureModal() {
    state.uploadedSignatureData = null;
    refs.signatureImageInput.value = '';
    refs.uploadedSignaturePreviewWrap.classList.add('hidden');
    refs.removeWhiteBackground.checked = false;
    refs.saveSignatureLocally.checked = hasSavedSignature();
    clearSignatureCanvas();
    updateTypedSignaturePreview();
    switchSignatureTab('draw');
    openModal('signature-modal');
  }

  function switchSignatureTab(tab) {
    state.activeSignatureTab = tab;
    $$('[data-signature-tab]').forEach((button) => {
      const active = button.dataset.signatureTab === tab;
      button.classList.toggle('active', active);
      button.setAttribute('aria-selected', String(active));
    });
    $('#signature-draw-panel').classList.toggle('hidden', tab !== 'draw');
    $('#signature-type-panel').classList.toggle('hidden', tab !== 'type');
    $('#signature-upload-panel').classList.toggle('hidden', tab !== 'upload');
  }

  function clearSignatureCanvas() {
    refs.signatureCtx.clearRect(0, 0, refs.signaturePad.width, refs.signaturePad.height);
    state.signatureStrokeHistory = [];
  }

  function undoSignatureStroke() {
    const previous = state.signatureStrokeHistory.pop();
    if (!previous) {
      refs.signatureCtx.clearRect(0, 0, refs.signaturePad.width, refs.signaturePad.height);
      return;
    }
    refs.signatureCtx.putImageData(previous, 0, 0);
  }

  function updateTypedSignaturePreview() {
    const text = refs.typedSignatureText.value.trim() || 'Sua assinatura';
    refs.typedSignaturePreview.textContent = text;
    refs.typedSignaturePreview.style.fontFamily = refs.typedSignatureFont.value;
    refs.typedSignaturePreview.style.fontStyle = refs.typedSignatureFont.value === 'serif' ? 'italic' : 'normal';
    refs.typedSignaturePreview.style.color = refs.typedSignatureColor.value;
  }

  async function handleSignatureImageUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) {
      showToast('Selecione uma imagem PNG, JPG ou WebP.', 'error');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      showToast('A imagem da assinatura deve ter no máximo 8 MB.', 'error');
      return;
    }

    try {
      const dataUrl = await fileToDataUrl(file);
      const processed = await processUploadedSignature(dataUrl, refs.removeWhiteBackground.checked);
      state.uploadedSignatureData = processed.dataUrl;
      state.uploadedSignatureAspect = processed.aspect;
      refs.uploadedSignaturePreview.src = processed.dataUrl;
      refs.uploadedSignaturePreviewWrap.classList.remove('hidden');
    } catch (error) {
      console.error(error);
      showToast('Não foi possível processar a imagem.', 'error');
    }
  }

  async function refreshUploadedSignatureProcessing() {
    const file = refs.signatureImageInput.files?.[0];
    if (!file) return;
    handleSignatureImageUpload({ target: refs.signatureImageInput });
  }

  async function saveSignatureFromActiveTab() {
    try {
      let result;
      if (state.activeSignatureTab === 'draw') {
        result = trimCanvas(refs.signaturePad, 14);
        if (!result) throw new Error('Desenhe a assinatura antes de continuar.');
      } else if (state.activeSignatureTab === 'type') {
        const text = refs.typedSignatureText.value.trim();
        if (!text) throw new Error('Digite o nome ou a assinatura.');
        result = createTypedSignatureImage(text, refs.typedSignatureFont.value, refs.typedSignatureColor.value);
      } else {
        if (!state.uploadedSignatureData) throw new Error('Selecione uma imagem de assinatura.');
        result = { dataUrl: state.uploadedSignatureData, aspect: state.uploadedSignatureAspect };
      }

      state.signatureImage = result.dataUrl;
      state.signatureAspect = result.aspect;

      if (refs.saveSignatureLocally.checked) {
        try {
          safeSetSavedSignature({ image: result.dataUrl, aspect: result.aspect });
        } catch (error) {
          console.warn(error);
          showToast('A assinatura foi usada, mas não pôde ser salva neste dispositivo.', 'error');
        }
      } else {
        safeRemoveSavedSignature();
      }

      closeModal('signature-modal');
      updateUI();
      setPendingTool('signature', 'Clique na página para posicionar a assinatura.');
    } catch (error) {
      showToast(error.message || 'Não foi possível criar a assinatura.', 'error');
    }
  }

  function createTypedSignatureImage(text, fontFamily, color) {
    const canvas = document.createElement('canvas');
    canvas.width = 1600;
    canvas.height = 420;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const style = fontFamily === 'serif' ? 'italic ' : '';
    ctx.font = `${style}190px ${fontFamily}`;
    const fittedSize = Math.min(190,190*(canvas.width-96)/Math.max(1,ctx.measureText(text).width));
    ctx.font = `${style}${fittedSize}px ${fontFamily}`;
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    const result = trimCanvas(canvas, 24);
    if (!result) throw new Error('Não foi possível gerar a assinatura digitada.');
    return result;
  }

  async function processUploadedSignature(dataUrl, removeWhite) {
    const image = await loadImage(dataUrl);
    const maxDimension = 1800;
    const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    if (removeWhite) {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
        if (brightness >= 246) data[i + 3] = 0;
        else if (brightness > 225) data[i + 3] = Math.round(255 * (246 - brightness) / 21);
      }
      ctx.putImageData(imageData, 0, 0);
    }

    const result = trimCanvas(canvas, 12);
    if (!result) throw new Error('A imagem ficou vazia após o processamento.');
    return result;
  }

  function trimCanvas(sourceCanvas, padding = 8) {
    const sourceCtx = sourceCanvas.getContext('2d');
    const { width, height } = sourceCanvas;
    const pixels = sourceCtx.getImageData(0, 0, width, height).data;
    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const alpha = pixels[(y * width + x) * 4 + 3];
        if (alpha > 8) {
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
      }
    }

    if (maxX < minX || maxY < minY) return null;

    minX = Math.max(0, minX - padding);
    minY = Math.max(0, minY - padding);
    maxX = Math.min(width - 1, maxX + padding);
    maxY = Math.min(height - 1, maxY + padding);

    const output = document.createElement('canvas');
    output.width = maxX - minX + 1;
    output.height = maxY - minY + 1;
    output.getContext('2d').drawImage(sourceCanvas, minX, minY, output.width, output.height, 0, 0, output.width, output.height);

    return {
      dataUrl: output.toDataURL('image/png'),
      aspect: output.width / output.height,
    };
  }

  function loadSavedSignature() {
    try {
      const raw = localStorage.getItem(LOCAL_SIGNATURE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (typeof saved.image === 'string' && saved.image.startsWith('data:image/')) {
        state.signatureImage = saved.image;
        state.signatureAspect = Number(saved.aspect) || 2.8;
      }
    } catch (error) {
      console.warn('Assinatura local inválida', error);
      safeRemoveSavedSignature();
    }
  }


  function safeSetSavedSignature(value) {
    localStorage.setItem(LOCAL_SIGNATURE_KEY, JSON.stringify(value));
  }

  function safeRemoveSavedSignature() {
    try {
      localStorage.removeItem(LOCAL_SIGNATURE_KEY);
    } catch (_) {
      // Storage may be unavailable in strict privacy contexts.
    }
  }

  function hasSavedSignature() {
    try {
      return Boolean(localStorage.getItem(LOCAL_SIGNATURE_KEY));
    } catch (_) {
      return false;
    }
  }

  function forgetSavedSignature() {
    safeRemoveSavedSignature();
    refs.forgetSignature.classList.add('hidden');
    showToast('A assinatura salva neste dispositivo foi apagada.');
  }

  function resetHistory() {
    state.history = [serializeElements()];
    state.historyIndex = 0;
    updateHistoryButtons();
  }

  function commitHistory() {
    const snapshot = serializeElements();
    if (state.history[state.historyIndex] === snapshot) return;
    state.history = state.history.slice(0, state.historyIndex + 1);
    state.history.push(snapshot);
    if (state.history.length > 60) state.history.shift();
    else state.historyIndex += 1;
    if (state.history.length === 60) state.historyIndex = 59;
    updateHistoryButtons();
    proChanged();
    updateUI();
  }

  function undo() {
    if (state.historyIndex <= 0) return;
    state.historyIndex -= 1;
    restoreHistorySnapshot();
  }

  function redo() {
    if (state.historyIndex >= state.history.length - 1) return;
    state.historyIndex += 1;
    restoreHistorySnapshot();
  }

  function restoreHistorySnapshot() {
    const snapshot = JSON.parse(state.history[state.historyIndex]);
    state.elements = snapshot.elements; pro.plan = snapshot.plan;
    proChanged();
    state.selectedId = null;
    renderOverlays();
    updateUI();
  }

  function serializeElements() {
    return JSON.stringify({elements:state.elements,plan:pro.plan});
  }

  async function exportPdf(mode) {
    if (!state.pdfBytes || !state.pdfDoc) return;

    refs.downloadButton.disabled = true;
    refs.downloadText.textContent = 'Processando…';
    showLoading('Gerando PDF…', 'Aplicando os elementos com as coordenadas corretas de cada página.');

    try {
      const pdfDocument = await window.PDFLib.PDFDocument.load(state.pdfBytes.slice(0));
      const pages = pdfDocument.getPages();
      const regularFont = await pdfDocument.embedFont(window.PDFLib.StandardFonts.Helvetica);
      const boldFont = await pdfDocument.embedFont(window.PDFLib.StandardFonts.HelveticaBold);
      const imageCache = new Map();

      const grouped = groupElementsByPage(state.elements);
      for (const [pageNumberString, elements] of Object.entries(grouped)) {
        const pageNumber = Number(pageNumberString);
        const pdfPage = pages[pageNumber - 1];
        const pdfJsPage = await state.pdfDoc.getPage(pageNumber);
        const viewport = pdfJsPage.getViewport({ scale: 1 });

        for (const element of elements) {
          const geometry = mapElementToPdfGeometry(element, viewport);
          const color = hexToPdfColor(element.color || '#111827');
          const opacity = clamp(element.opacity ?? 1, 0.2, 1);

          if (element.type === 'signature') {
            let image = imageCache.get(element.image);
            if (!image) {
              const bytes = dataUrlToUint8Array(element.image);
              image = await pdfDocument.embedPng(bytes);
              imageCache.set(element.image, image);
            }
            pdfPage.drawImage(image, {
              x: geometry.bl.x,
              y: geometry.bl.y,
              width: geometry.width,
              height: geometry.height,
              rotate: window.PDFLib.degrees(geometry.angle),
              opacity,
            });
          } else if (element.type === 'checkbox') {
            drawCheckbox(pdfPage, geometry, color, opacity, element.checked !== false);
          } else if (element.type === 'stamp') {
            drawStamp(pdfPage, geometry, sanitizePdfText(element.text), color, opacity, boldFont, element.fontScale || 1);
          } else {
            drawTextElement(pdfPage, geometry, sanitizePdfText(element.text), color, opacity, element.type === 'initials' ? boldFont : regularFont, element.fontScale || 1);
          }
        }
      }

      const plan = pro.plan.filter(p=>p.included);
      if (!plan.length) throw new Error('Selecione pelo menos uma página para exportar.');
      let result = pdfDocument;
      const organizationChanged = plan.length !== pages.length || plan.some((p,i)=>p.source!==i+1 || p.rotation!==0);
      if (organizationChanged) {
        result = await window.PDFLib.PDFDocument.create();
        result.setTitle(state.pdfFile.name.replace(/\.pdf$/i,''));
        const copied = await result.copyPages(pdfDocument, plan.map(p=>p.source-1));
        copied.forEach((page,i)=> { page.setRotation(window.PDFLib.degrees((page.getRotation().angle+plan[i].rotation)%360)); result.addPage(page); });
      }
      const finalBytes = await result.save({useObjectStreams:false});
      await validateExport(finalBytes, plan.length);
      const blob = new Blob([finalBytes], { type: 'application/pdf' });
      const filename = sanitizeOutputName(refs.outputName.value || buildOutputName(state.pdfFile.name));
      const hash = await sha256Hex(finalBytes);

      state.lastExportBlob = blob;
      state.lastExportName = filename;
      state.lastExportHash = hash;

      pro.exported = serializeElements();
      if (mode === 'preview') await showExportPreview(finalBytes);
      else { downloadBlob(blob, filename); pro.baseline = pro.exported; updateProUI(); }
      refs.renderStatus.textContent = hash ? `SHA-256: ${hash.slice(0, 16)}…` : 'PDF gerado';
      if (canShareFiles()) refs.shareButton.classList.remove('hidden');
      showToast(`PDF gerado com sucesso${hash ? ` • hash ${hash.slice(0, 12)}…` : ''}.`, 'success', 5200);
    } catch (error) {
      console.error(error);
      showToast(`${humanizeExportError(error)} Suas alterações continuam no editor.`, 'error', 9000);
    } finally {
      refs.downloadButton.disabled = false;
      refs.downloadText.textContent = 'Baixar PDF';
      hideLoading();
    }
  }

  function mapElementToPdfGeometry(element, viewport) {
    const x = element.x * viewport.width;
    const y = element.y * viewport.height;
    const width = element.w * viewport.width;
    const height = element.h * viewport.height;
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    const angle = element.rotation || 0;

    const screenBL = rotateScreenPoint(x, y + height, centerX, centerY, angle);
    const screenBR = rotateScreenPoint(x + width, y + height, centerX, centerY, angle);
    const screenTL = rotateScreenPoint(x, y, centerX, centerY, angle);
    const inverse = invertTransform(viewport.transform);
    const bl = applyTransform(screenBL, inverse);
    const br = applyTransform(screenBR, inverse);
    const tl = applyTransform(screenTL, inverse);

    const widthVector = { x: br.x - bl.x, y: br.y - bl.y };
    const heightVector = { x: tl.x - bl.x, y: tl.y - bl.y };
    const pdfWidth = Math.hypot(widthVector.x, widthVector.y);
    const pdfHeight = Math.hypot(heightVector.x, heightVector.y);

    return {
      bl,
      br,
      tl,
      width: pdfWidth,
      height: pdfHeight,
      ux: { x: widthVector.x / pdfWidth, y: widthVector.y / pdfWidth },
      uy: { x: heightVector.x / pdfHeight, y: heightVector.y / pdfHeight },
      angle: Math.atan2(widthVector.y, widthVector.x) * 180 / Math.PI,
    };
  }

  function drawTextElement(page, geometry, text, color, opacity, font, fontScale) {
    if (!text) return;
    let fontSize = geometry.height * 0.66 * fontScale;
    const maxWidth = geometry.width * 0.92;
    const measured = font.widthOfTextAtSize(text, fontSize);
    if (measured > maxWidth && measured > 0) fontSize *= maxWidth / measured;
    fontSize = Math.max(4, fontSize);

    const textWidth = font.widthOfTextAtSize(text, fontSize);
    const offsetX = Math.max(0, (geometry.width - textWidth) / 2);
    const offsetY = Math.max(0, (geometry.height - fontSize) / 2 + fontSize * 0.16);
    const origin = localPoint(geometry, offsetX, offsetY);

    page.drawText(text, {
      x: origin.x,
      y: origin.y,
      size: fontSize,
      font,
      color,
      opacity,
      rotate: window.PDFLib.degrees(geometry.angle),
    });
  }

  function drawStamp(page, geometry, text, color, opacity, font, fontScale) {
    page.drawRectangle({
      x: geometry.bl.x,
      y: geometry.bl.y,
      width: geometry.width,
      height: geometry.height,
      rotate: window.PDFLib.degrees(geometry.angle),
      borderColor: color,
      borderWidth: Math.max(0.8, geometry.height * 0.055),
      borderOpacity: opacity,
      opacity: 0,
    });
    drawTextElement(page, geometry, text || 'APROVADO', color, opacity, font, fontScale * 0.86);
  }

  function drawCheckbox(page, geometry, color, opacity, checked) {
    const size = Math.min(geometry.width, geometry.height) * 0.82;
    const ox = (geometry.width - size) / 2;
    const oy = (geometry.height - size) / 2;
    const p1 = localPoint(geometry, ox, oy);
    const p2 = localPoint(geometry, ox + size, oy);
    const p3 = localPoint(geometry, ox + size, oy + size);
    const p4 = localPoint(geometry, ox, oy + size);
    const thickness = Math.max(0.8, size * 0.055);
    drawPdfLine(page, p1, p2, color, opacity, thickness);
    drawPdfLine(page, p2, p3, color, opacity, thickness);
    drawPdfLine(page, p3, p4, color, opacity, thickness);
    drawPdfLine(page, p4, p1, color, opacity, thickness);

    if (checked) {
      const c1 = localPoint(geometry, ox + size * 0.18, oy + size * 0.48);
      const c2 = localPoint(geometry, ox + size * 0.40, oy + size * 0.22);
      const c3 = localPoint(geometry, ox + size * 0.82, oy + size * 0.74);
      drawPdfLine(page, c1, c2, color, opacity, thickness * 1.35);
      drawPdfLine(page, c2, c3, color, opacity, thickness * 1.35);
    }
  }

  function drawPdfLine(page, start, end, color, opacity, thickness) {
    page.drawLine({ start, end, color, opacity, thickness });
  }

  function localPoint(geometry, x, y) {
    return {
      x: geometry.bl.x + geometry.ux.x * x + geometry.uy.x * y,
      y: geometry.bl.y + geometry.ux.y * x + geometry.uy.y * y,
    };
  }

  function rotateScreenPoint(x, y, centerX, centerY, degrees) {
    const radians = degrees * Math.PI / 180;
    const dx = x - centerX;
    const dy = y - centerY;
    return {
      x: centerX + Math.cos(radians) * dx - Math.sin(radians) * dy,
      y: centerY + Math.sin(radians) * dx + Math.cos(radians) * dy,
    };
  }

  function invertTransform(matrix) {
    const [a, b, c, d, e, f] = matrix;
    const determinant = a * d - b * c;
    if (!determinant) throw new Error('Transformação inválida da página.');
    return [
      d / determinant,
      -b / determinant,
      -c / determinant,
      a / determinant,
      (c * f - d * e) / determinant,
      (b * e - a * f) / determinant,
    ];
  }

  function applyTransform(point, matrix) {
    return {
      x: point.x * matrix[0] + point.y * matrix[2] + matrix[4],
      y: point.x * matrix[1] + point.y * matrix[3] + matrix[5],
    };
  }

  function groupElementsByPage(elements) {
    return elements.reduce((accumulator, element) => {
      const key = String(element.page);
      if (!accumulator[key]) accumulator[key] = [];
      accumulator[key].push(element);
      return accumulator;
    }, {});
  }

  function humanizeExportError(error) {
    const message = String(error?.message || error || '');
    if (/encrypted/i.test(message)) return 'Este PDF possui restrições de edição que impedem a exportação.';
    if (/WinAnsi|encode/i.test(message)) return 'Um dos textos contém caracteres que esta versão não consegue incorporar ao PDF.';
    return message || 'Não foi possível gerar o PDF final.';
  }

  async function shareLastExport() {
    if (!state.lastExportBlob || !canShareFiles()) {
      showToast('O compartilhamento de arquivo não está disponível neste navegador.', 'error');
      return;
    }
    try {
      const file = new File([state.lastExportBlob], state.lastExportName, { type: 'application/pdf' });
      await navigator.share({ files: [file], title: state.lastExportName, text: 'PDF editado no PDF Signer Pro.' });
    } catch (error) {
      if (error?.name !== 'AbortError') showToast('Não foi possível compartilhar o PDF.', 'error');
    }
  }

  function canShareFiles() {
    if (!navigator.share || !navigator.canShare || !state.lastExportBlob) return false;
    try {
      return navigator.canShare({ files: [new File([state.lastExportBlob], state.lastExportName || 'documento.pdf', { type: 'application/pdf' })] });
    } catch (_) {
      return false;
    }
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  async function sha256Hex(bytes) {
    if (!window.crypto?.subtle) return '';
    const digest = await window.crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  function dataUrlToUint8Array(dataUrl) {
    const base64 = dataUrl.split(',')[1];
    const raw = atob(base64);
    const bytes = new Uint8Array(raw.length);
    for (let index = 0; index < raw.length; index += 1) bytes[index] = raw.charCodeAt(index);
    return bytes;
  }

  function hexToPdfColor(hex) {
    const normalized = /^#[0-9a-f]{6}$/i.test(hex) ? hex : '#111827';
    return window.PDFLib.rgb(
      parseInt(normalized.slice(1, 3), 16) / 255,
      parseInt(normalized.slice(3, 5), 16) / 255,
      parseInt(normalized.slice(5, 7), 16) / 255,
    );
  }

  function sanitizePdfText(value) {
    return String(value || '')
      .normalize('NFC')
      .replace(/[\u0100-\uFFFF]/g, '?')
      .slice(0, 140);
  }

  function handleGlobalKeyboard(event) {
    if (state.activeModalId) {
      handleModalKeyboard(event);
      return;
    }

    const editable = isEditableTarget(event.target);
    const modifier = event.ctrlKey || event.metaKey;

    if (modifier && !event.shiftKey && event.key.toLowerCase() === 'z') {
      event.preventDefault();
      undo();
      return;
    }
    if (modifier && (event.key.toLowerCase() === 'y' || (event.shiftKey && event.key.toLowerCase() === 'z'))) {
      event.preventDefault();
      redo();
      return;
    }
    if (editable) return;

    if (event.key === 'Escape') {
      cancelPendingTool();
      selectElement(null);
      return;
    }

    if ((event.key === 'Delete' || event.key === 'Backspace') && state.selectedId) {
      event.preventDefault();
      deleteElement(state.selectedId);
      return;
    }

    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key) && state.selectedId) {
      event.preventDefault();
      const selected = findElement(state.selectedId);
      if (!selected || selected.locked || pro.pan) return;
      const pixels = event.shiftKey ? 10 : 1;
      const dx = pixels / Math.max(refs.renderWrapper.clientWidth, 1);
      const dy = pixels / Math.max(refs.renderWrapper.clientHeight, 1);
      if (event.key === 'ArrowLeft') selected.x = clamp(selected.x - dx, 0, 1 - selected.w);
      if (event.key === 'ArrowRight') selected.x = clamp(selected.x + dx, 0, 1 - selected.w);
      if (event.key === 'ArrowUp') selected.y = clamp(selected.y - dy, 0, 1 - selected.h);
      if (event.key === 'ArrowDown') selected.y = clamp(selected.y + dy, 0, 1 - selected.h);
      commitHistory();
      renderOverlays();
    }
  }

  function openModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    state.lastFocusedElement = document.activeElement;
    state.activeModalId = id;
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    setTimeout(() => {
      const focusable = getFocusableElements(modal);
      (focusable[0] || modal).focus();
    }, 0);
  }

  function closeModal(id) {
    const modal = document.getElementById(id);
    if (!modal || modal.classList.contains('hidden')) return;
    modal.classList.add('hidden');
    state.activeModalId = null;
    document.body.style.overflow = '';
    if (state.lastFocusedElement instanceof HTMLElement) state.lastFocusedElement.focus();
  }

  function handleModalKeyboard(event) {
    const modal = document.getElementById(state.activeModalId);
    if (!modal) return;

    if (event.key === 'Escape' && state.activeModalId !== 'password-modal') {
      event.preventDefault();
      closeModal(state.activeModalId);
      return;
    }

    if (event.key !== 'Tab') return;
    const focusable = getFocusableElements(modal);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function getFocusableElements(root) {
    return $$('button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])', root)
      .filter((element) => !element.classList.contains('hidden') && element.offsetParent !== null);
  }

  async function copyPixKey() {
    const key = refs.pixKey.textContent.trim();
    try {
      await navigator.clipboard.writeText(key);
    } catch (_) {
      const area = document.createElement('textarea');
      area.value = key;
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      document.execCommand('copy');
      area.remove();
    }
    refs.copyPix.textContent = 'Chave copiada!';
    setTimeout(() => { refs.copyPix.textContent = 'Copiar chave PIX'; }, 1800);
  }

  function installPwa() {
    if (!state.deferredInstallPrompt) return;
    state.deferredInstallPrompt.prompt();
    state.deferredInstallPrompt.userChoice.finally(() => {
      state.deferredInstallPrompt = null;
      refs.installButton.classList.add('hidden');
    });
  }

  function registerServiceWorker() {
    if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
    navigator.serviceWorker.register('./sw.js', {updateViaCache:'none'}).then(reg=>{
      const offer=()=>{ if(reg.waiting && navigator.serviceWorker.controller) { $('#update-banner').classList.remove('hidden'); $('#apply-update').onclick=()=>{
        if(isDirty() && !confirm('Baixe ou salve seu rascunho antes de atualizar. Recarregar agora?')) return;
        pro.acceptUpdate=true; reg.waiting.postMessage({type:'SKIP_WAITING'});
      }; }};
      offer();reg.addEventListener('updatefound',()=>{const w=reg.installing;w?.addEventListener('statechange',offer)});
      reg.update().catch(()=>{});
      navigator.serviceWorker.addEventListener('controllerchange',()=>{if(pro.acceptUpdate)location.reload()});
    }).catch(()=>showToast('Modo offline indisponível. O editor continua funcionando online.'));
  }

  function handleWindowResize() {
    clearTimeout(state.resizeTimer);
    state.resizeTimer = setTimeout(() => {
      if (state.pdfDoc && state.zoomMode !== 'manual') renderPage(state.currentPage);
      else if (state.pdfDoc) renderOverlays();
    }, 180);
  }

  function updateUI() {
    updateProUI();
    const hasPdf = Boolean(state.pdfDoc && state.pdfFile);
    refs.uploadZone.classList.toggle('hidden', hasPdf);
    refs.fileInfo.classList.toggle('hidden', !hasPdf);
    refs.emptyState.classList.toggle('hidden', hasPdf);
    refs.pdfViewer.classList.toggle('hidden', !hasPdf);
    refs.downloadButton.classList.toggle('hidden', !hasPdf);
    refs.toolsPanel.classList.toggle('disabled-panel', !hasPdf);
    refs.toolsPanel.setAttribute('aria-disabled', String(!hasPdf));

    [refs.signatureTool, refs.textTool, refs.dateTool, refs.initialsTool, refs.checkboxTool, refs.stampTool]
      .forEach((button) => { button.disabled = !hasPdf; });

    refs.signatureCard.classList.toggle('hidden', !state.signatureImage);
    if (state.signatureImage) refs.signaturePreview.src = state.signatureImage;
    refs.forgetSignature.classList.toggle('hidden', !hasSavedSignature());

    updateNavigationUI();
    updateHistoryButtons();
    updatePropertiesPanel();
    updateElementsList();
  }

  function updateNavigationUI() {
    refs.pageInput.value = String(state.currentPage || 1);
    refs.pageInput.max = String(state.numPages || 1);
    refs.pageTotal.textContent = `/ ${state.numPages || 1}`;
    refs.prevPage.disabled = !state.pdfDoc || state.currentPage <= 1;
    refs.nextPage.disabled = !state.pdfDoc || state.currentPage >= state.numPages;
    refs.zoomOut.disabled = !state.pdfDoc || state.currentScale <= MIN_ZOOM;
    refs.zoomIn.disabled = !state.pdfDoc || state.currentScale >= MAX_ZOOM;
    refs.zoomLabel.textContent = `${Math.round((state.currentScale || 1) * 100)}%`;
  }

  function updateHistoryButtons() {
    refs.undoButton.disabled = state.historyIndex <= 0;
    refs.redoButton.disabled = state.historyIndex >= state.history.length - 1;
  }

  function showLoading(title, detail) {
    refs.loadingTitle.textContent = title;
    refs.loadingDetail.textContent = detail;
    refs.loadingOverlay.classList.remove('hidden');
  }

  function hideLoading() {
    refs.loadingOverlay.classList.add('hidden');
  }

  function showToast(message, type = 'default', duration = 3400) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    refs.toastRegion.replaceChildren(toast);
    setTimeout(() => toast.remove(), duration);
  }

  function findElement(id) {
    return id ? state.elements.find((element) => element.id === id) : null;
  }

  function typeLabel(type) {
    return ({ signature: 'Assinatura', text: 'Texto', date: 'Data', initials: 'Iniciais', checkbox: 'Marcação', stamp: 'Carimbo' })[type] || 'Elemento';
  }

  function typeIcon(type) {
    return ({ signature: '✍', text: 'T', date: '◷', initials: 'AB', checkbox: '✓', stamp: '▣' })[type] || '•';
  }

  function makeId() {
    return window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function normalizeAngle(value) {
    let angle = value % 360;
    if (angle > 180) angle -= 360;
    if (angle < -180) angle += 360;
    return Math.round(angle * 10) / 10;
  }

  function structuredCloneSafe(value) {
    return window.structuredClone ? window.structuredClone(value) : JSON.parse(JSON.stringify(value));
  }

  function buildOutputName(filename) {
    const base = String(filename || 'documento.pdf').replace(/\.pdf$/i, '');
    return `${base}_assinado.pdf`;
  }

  function sanitizeOutputName(filename) {
    let value = String(filename || 'documento_assinado.pdf')
      .replace(/[\\/:*?"<>|\u0000-\u001F]/g, '_')
      .trim()
      .slice(0, 120);
    if (!value.toLowerCase().endsWith('.pdf')) value += '.pdf';
    return value || 'documento_assinado.pdf';
  }

  function formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    return `${(bytes / 1024 ** index).toFixed(index ? 1 : 0)} ${units[index]}`;
  }

  function formatDate(date) {
    return new Intl.DateTimeFormat('pt-BR').format(date);
  }

  function isEditableTarget(target) {
    return target instanceof HTMLElement && Boolean(target.closest('input, textarea, select, [contenteditable="true"]'));
  }

  function nextFrame() {
    return new Promise((resolve) => requestAnimationFrame(resolve));
  }

  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error || new Error('Falha ao ler o arquivo.'));
      reader.readAsDataURL(file);
    });
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Imagem inválida.'));
      image.src = src;
    });
  }

  // v2.1: non-destructive output plan, local drafts and verified exports.
  const pro = {plan:[],baseline:null,exported:null,pan:false,saveTimer:null,documentEpoch:0,restoring:false,
    draftEnabled:true,pendingDraft:null,batch:null,batchToken:0,previewDoc:null,previewToken:0,previewTask:null,organizing:[],template:null,ready:false};
  function isDirty(){return Boolean(state.pdfDoc && pro.baseline !== null && serializeElements()!==pro.baseline)}
  function safeAction(fn){return async (...args)=>{try{await fn(...args)}catch(e){console.error(e);showToast(e.message || 'Não foi possível concluir. Suas alterações continuam aqui.','error',7000)}}}
  function initPro(){
    refs.toolsPanel.insertAdjacentHTML('afterend',`<section class="panel pro-panel"><div class="panel-heading"><h2>Seu fluxo de trabalho</h2><span class="pro-version">v2.1.1</span></div>
      <div class="pro-actions"><button id="pro-preview" class="button primary">Visualizar resultado</button><button id="pro-pages" class="button ghost">Organizar páginas</button><button id="pro-templates" class="button ghost">Modelos de preenchimento</button><button id="pro-pan" class="button ghost" aria-pressed="false">Modo: editar elementos</button></div>
      <label class="checkbox-row"><input type="checkbox" id="draft-enabled" checked><span>Salvar rascunho neste dispositivo</span></label><p class="pro-note">Inclui o PDF e suas assinaturas. Evite ativar em computadores compartilhados.</p><p id="draft-status" class="pro-note" role="status">Salvamento local ativado</p><div class="pro-actions"><button id="draft-restore" class="button secondary hidden">Recuperar rascunho</button><button id="draft-delete" class="button ghost small">Apagar rascunho salvo</button></div>
      <div id="update-banner" class="pro-banner hidden">Há uma atualização disponível. <button id="apply-update" class="button small secondary">Atualizar</button></div></section>`);
    refs.propertiesPanel.insertAdjacentHTML('beforeend',`<div class="pro-selection"><button id="pro-batch" class="button secondary full">Aplicar em várias páginas</button><div class="pro-actions"><button id="pro-lock" class="button ghost small">Bloquear posição</button><button id="pro-center" class="button ghost small">Centralizar na horizontal</button></div><p class="pro-note">Setas: ajuste fino · Shift + seta: 10 px. Guias de centro ao arrastar.</p></div>`);
    document.body.insertAdjacentHTML('beforeend',`<nav class="pro-mobile" aria-label="Ações rápidas"><button id="mobile-sign" class="button ghost">✍ Assinar</button><button id="mobile-pan" class="button ghost">Navegar</button><button id="mobile-preview" class="button primary">Conferir PDF</button></nav>`);
    // New dialogs share the existing focus trap and close handlers.
    $('#pro-preview').onclick=()=>exportPdf('preview');$('#mobile-preview').onclick=()=>exportPdf('preview');
    $('#pro-pages').onclick=safeAction(openOrganizer);$('#pro-templates').onclick=safeAction(openTemplates);
    $('#pro-batch').onclick=()=>{if(!state.selectedId)return;$('#batch-range').value='todas';invalidateBatch();openModal('batch-modal')};
    $('#batch-range').oninput=invalidateBatch;$('#batch-preview').onclick=safeAction(previewBatch);$('#batch-apply').onclick=applyBatch;
    $('#pro-lock').onclick=()=>{const e=findElement(state.selectedId);if(e){e.locked=!e.locked;commitHistory();renderOverlays()}};
    $('#pro-center').onclick=()=>{const e=findElement(state.selectedId);if(e&&!e.locked){e.x=(1-e.w)/2;commitHistory();renderOverlays()}};
    $('#pro-pan').onclick=togglePan;$('#mobile-pan').onclick=togglePan;$('#mobile-sign').onclick=()=>{if(state.pdfDoc){pro.pan=false;updateProUI();handleSignatureTool()}};
    $('#draft-enabled').onchange=safeAction(async e=>{pro.draftEnabled=e.target.checked;try{localStorage.setItem('pdf-sign.drafts-enabled',String(pro.draftEnabled))}catch{}if(pro.draftEnabled)scheduleDraft();else{clearTimeout(pro.saveTimer);pro.documentEpoch++;await dbAction('delete','draft');pro.pendingDraft=null;$('#draft-restore').classList.add('hidden');$('#draft-status').textContent='Salvamento desativado; rascunho removido.'}});
    $('#draft-restore').onclick=safeAction(restoreDraft);$('#draft-delete').onclick=safeAction(async()=>{if(!confirm('Apagar o rascunho salvo neste navegador? O documento aberto será mantido.'))return;clearTimeout(pro.saveTimer);pro.documentEpoch++;pro.draftEnabled=false;try{localStorage.setItem('pdf-sign.drafts-enabled','false')}catch{}$('#draft-enabled').checked=false;await dbAction('delete','draft');pro.pendingDraft=null;$('#draft-restore').classList.add('hidden');$('#draft-status').textContent='Rascunho apagado. Salvamento desativado.'});
    $('#pages-filter').onclick=safeAction(()=>{const included=new Set(parsePageRange($('#pages-range').value,state.numPages));pro.organizing.forEach(p=>p.included=included.has(p.source));renderOrganizer()});
    $('#pages-apply').onclick=()=>{if(!pro.organizing.some(p=>p.included)){showToast('Mantenha pelo menos uma página.','error');return}pro.plan=structuredCloneSafe(pro.organizing);commitHistory();closeModal('pages-modal');showToast('Organização salva. Confira a ordem final em Visualizar resultado.')};
    $('#preview-page').onchange=safeAction(renderExportPreview);$('#preview-download').onclick=()=>{if(pro.exported!==serializeElements()){showToast('O documento mudou. Gere uma nova prévia.','error');return}downloadBlob(state.lastExportBlob,state.lastExportName);pro.baseline=pro.exported;closeModal('preview-modal');updateProUI();showToast('PDF conferido baixado.')};
    $('#template-save').onclick=safeAction(saveTemplate);$('#template-apply').onclick=safeAction(applyTemplate);
    try{pro.draftEnabled=localStorage.getItem('pdf-sign.drafts-enabled')!=='false'}catch{}
    $('#draft-enabled').checked=pro.draftEnabled;
    if(!pro.draftEnabled)$('#draft-status').textContent='Salvamento local desativado.';
    refs.outputName.addEventListener('input',scheduleDraft);
    window.addEventListener('beforeunload',e=>{if(isDirty()){e.preventDefault();e.returnValue=''}});
    const mobileQuery=matchMedia('(max-width:820px)');
    const adaptThumbnails=()=>{if(mobileQuery.matches)refs.thumbnailsPanel.classList.add('collapsed')};
    adaptThumbnails();mobileQuery.addEventListener('change',adaptThumbnails);
    pro.ready=true;updateProUI();
    dbAction('get','draft').then(d=>{if(d&&!state.pdfDoc){pro.pendingDraft=d;$('#draft-restore').classList.remove('hidden');$('#draft-status').textContent=`Rascunho disponível: ${d.name} · ${new Date(d.savedAt).toLocaleString('pt-BR')}`}}).catch(()=>{$('#draft-status').textContent='Armazenamento local indisponível. Baixe o PDF para guardar o trabalho.'});
  }
  function togglePan(){pro.pan=!pro.pan;cancelPendingTool();updateProUI()}
  function updateProUI(){
    if(!pro.ready)return;
    const has=Boolean(state.pdfDoc);const selected=findElement(state.selectedId);
    if(pro.exported && pro.exported!==serializeElements()){state.lastExportBlob=null;pro.exported=null;refs.shareButton.classList.add('hidden')}
    ['pro-preview','pro-pages','pro-templates','mobile-preview','mobile-sign','mobile-pan','pro-pan'].forEach(id=>{$('#'+id).disabled=!has});
    $('#pro-pan').textContent=pro.pan?'Modo: navegar pelo documento':'Modo: editar elementos';$('#pro-pan').setAttribute('aria-pressed',String(pro.pan));
    $('#mobile-pan').textContent=pro.pan?'Editar':'Navegar';refs.overlayLayer.classList.toggle('pro-pan',pro.pan);
    $('#pro-lock').textContent=selected?.locked?'Desbloquear posição':'Bloquear posição';$('#pro-center').disabled=Boolean(selected?.locked);
    refs.rotateLeft.disabled=Boolean(selected?.locked);refs.rotateRight.disabled=Boolean(selected?.locked);
    $$('.thumbnail-button').forEach(b=>{const n=Number(b.dataset.page),p=pro.plan.find(x=>x.source===n);const modified=state.elements.some(e=>e.page===n);b.classList.toggle('pro-edited',modified);b.classList.toggle('pro-excluded',p?.included===false);b.title=p?.included===false?'Fora do arquivo final':modified?'Página com edições':'Página original'});
    document.body.classList.toggle('pro-has-document',has);
  }
  function proChanged(){state.lastExportBlob=null;pro.exported=null;refs.shareButton.classList.add('hidden');scheduleDraft();updateProUI()}
  function snapToCenter(e,rect){
    const x=Math.abs(e.x+e.w/2-.5)<6/rect.width,y=Math.abs(e.y+e.h/2-.5)<6/rect.height;
    if(x)e.x=(1-e.w)/2;if(y)e.y=(1-e.h)/2;
    refs.renderWrapper.classList.toggle('guide-x',x);refs.renderWrapper.classList.toggle('guide-y',y);
  }
  function parsePageRange(value,max){
    const s=value.trim().toLowerCase();if(s==='todas')return Array.from({length:max},(_,i)=>i+1);
    if(!s)throw new Error('Informe páginas, como 2-5, 8, ou escreva todas.');
    const result=new Set();for(const part of s.split(',')){const m=part.trim().match(/^(\d+)(?:\s*-\s*(\d+))?$/);if(!m)throw new Error('Use números separados por vírgulas ou intervalos, como 2-5.');const a=Number(m[1]),b=Number(m[2]||m[1]);if(a<1||b>max||b<a)throw new Error(`As páginas devem estar entre 1 e ${max}, em intervalos crescentes.`);for(let n=a;n<=b;n++)result.add(n)}return [...result];
  }
  function invalidateBatch(){pro.batchToken++;pro.batch=null;$('#batch-apply').disabled=true;$('#batch-previews').replaceChildren();$('#batch-summary').textContent='Confira a prévia antes de aplicar.'}
  async function fitClone(element,page){
    const e=structuredCloneSafe(element);e.id=makeId();e.page=page;
    if(e.type==='signature'&&e.aspect){const pg=await state.pdfDoc.getPage(page);const v=pg.getViewport({scale:1});e.h=e.w*v.width/(v.height*e.aspect);if(e.h>1){e.w/=e.h;e.h=1}}
    e.x=clamp(e.x,0,1-e.w);e.y=clamp(e.y,0,1-e.h);return e;
  }
  async function previewBatch(){
    invalidateBatch();const token=pro.batchToken;const selected=findElement(state.selectedId);if(!selected)throw new Error('Selecione primeiro o elemento que deseja repetir.');
    const targets=parsePageRange($('#batch-range').value,state.numPages).filter(n=>n!==selected.page&&pro.plan.find(p=>p.source===n)?.included);
    if(!targets.length)throw new Error('Não há outras páginas incluídas para receber este elemento.');
    const copies=[];for(const n of targets){if(token!==pro.batchToken)return;const e=await fitClone(selected,n);copies.push(e);if(copies.length<=12)await miniPreview($('#batch-previews'),n,[...state.elements.filter(x=>x.page===n),e]);}
    if(token!==pro.batchToken)return;pro.batch=copies;$('#batch-summary').textContent=`${copies.length} nova(s) cópia(s). A página de origem não será duplicada.${copies.length>12?' Prévia das primeiras 12 páginas.':''}`;$('#batch-apply').disabled=false;
  }
  function applyBatch(){if(!pro.batch)return;state.elements.push(...pro.batch);pro.batch=null;commitHistory();renderOverlays();closeModal('batch-modal');showToast('Elementos aplicados. Use Desfazer para reverter toda a operação.')}
  async function miniPreview(container,pageNumber,elements){
    const card=document.createElement('div');card.className='pro-mini';const stage=document.createElement('div');stage.className='pro-mini-stage';const canvas=document.createElement('canvas');stage.append(canvas);const caption=document.createElement('small');caption.textContent=`Página ${pageNumber}`;card.append(stage,caption);container.append(card);
    const page=await state.pdfDoc.getPage(pageNumber);const base=page.getViewport({scale:1});const vp=page.getViewport({scale:160/base.width});canvas.width=Math.ceil(vp.width);canvas.height=Math.ceil(vp.height);await page.render({canvasContext:canvas.getContext('2d'),viewport:vp}).promise;
    for(const e of elements){const node=document.createElement(e.type==='signature'?'img':'span');if(e.type==='signature')node.src=e.image;else node.textContent=e.type==='checkbox'?(e.checked?'✓':'□'):e.text;Object.assign(node.style,{position:'absolute',left:e.x*100+'%',top:e.y*100+'%',width:e.w*100+'%',height:e.h*100+'%',transform:`rotate(${e.rotation||0}deg)`,color:e.color,opacity:e.opacity,fontSize:Math.max(4,e.h*vp.height*.65*(e.fontScale||1))+'px'});stage.append(node)}
  }
  function openOrganizer(){pro.organizing=structuredCloneSafe(pro.plan);$('#pages-range').value='todas';renderOrganizer();openModal('pages-modal')}
  function renderOrganizer(){
    const list=$('#pages-list');list.replaceChildren();pro.organizing.forEach((p,i)=>{const row=document.createElement('div');row.className='pro-page-row';const label=document.createElement('label');const check=document.createElement('input');check.type='checkbox';check.checked=p.included;check.onchange=()=>{p.included=check.checked};label.append(check,document.createTextNode(` Original ${p.source} · +${p.rotation}°`));row.append(label);const actions=document.createElement('div');actions.className='pro-actions';
      for(const [name,title,fn,disabled] of [['↑','Mover para cima',()=>{[pro.organizing[i-1],pro.organizing[i]]=[p,pro.organizing[i-1]]},i===0],['↓','Mover para baixo',()=>{[pro.organizing[i+1],pro.organizing[i]]=[p,pro.organizing[i+1]]},i===pro.organizing.length-1],['↻','Girar 90 graus',()=>{p.rotation=(p.rotation+90)%360},false]]){const b=document.createElement('button');b.className='button ghost small';b.textContent=name;b.setAttribute('aria-label',`${title}: página ${p.source}`);b.disabled=disabled;b.onclick=()=>{fn();renderOrganizer()};actions.append(b)}row.append(actions);list.append(row)});
  }
  async function validateExport(bytes,count){
    showLoading('Conferindo o PDF…','Verificando abertura e renderização antes de liberar o arquivo.');
    const doc=await window.pdfjsLib.getDocument({data:bytes.slice(0)}).promise;
    try{if(doc.numPages!==count)throw new Error('A quantidade de páginas exportadas não confere.');for(let n=1;n<=count;n++){const page=await doc.getPage(n),v=page.getViewport({scale:.2}),c=document.createElement('canvas');c.width=Math.ceil(v.width);c.height=Math.ceil(v.height);await page.render({canvasContext:c.getContext('2d'),viewport:v}).promise;page.cleanup();refs.loadingDetail.textContent=`Página ${n} de ${count} conferida.`}}finally{await doc.destroy()}
  }
  async function showExportPreview(bytes){
    if(pro.previewTask){try{pro.previewTask.cancel();await pro.previewTask.promise}catch{}}
    if(pro.previewDoc)await pro.previewDoc.destroy();pro.previewDoc=await window.pdfjsLib.getDocument({data:bytes.slice(0)}).promise;
    $('#preview-page').replaceChildren();for(let n=1;n<=pro.previewDoc.numPages;n++){const o=document.createElement('option');o.value=n;o.textContent=`${n} de ${pro.previewDoc.numPages}`;$('#preview-page').append(o)}openModal('preview-modal');await renderExportPreview();
  }
  async function renderExportPreview(){
    const token=++pro.previewToken;if(pro.previewTask){try{pro.previewTask.cancel();await pro.previewTask.promise}catch{}}
    const pg=await pro.previewDoc.getPage(Number($('#preview-page').value));if(token!==pro.previewToken)return;const base=pg.getViewport({scale:1}),vp=pg.getViewport({scale:Math.min(1.4,760/base.width)}),c=$('#preview-canvas');c.width=Math.ceil(vp.width);c.height=Math.ceil(vp.height);pro.previewTask=pg.render({canvasContext:c.getContext('2d'),viewport:vp});try{await pro.previewTask.promise}catch(e){if(e.name!=='RenderingCancelledException')throw e}
  }
  let dbPromise;
  function openDb(){if(!dbPromise)dbPromise=new Promise((resolve,reject)=>{const r=indexedDB.open('pdf-sign-local-v21',1);r.onupgradeneeded=()=>r.result.createObjectStore('workspace');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});return dbPromise}
  async function dbAction(method,key,value){const db=await openDb();return new Promise((resolve,reject)=>{const tx=db.transaction('workspace',method==='get'?'readonly':'readwrite'),st=tx.objectStore('workspace');const r=method==='put'?st.put(value,key):st[method](key);let result;r.onsuccess=()=>result=r.result;tx.oncomplete=()=>resolve(result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error('Armazenamento interrompido.'))})}
  function scheduleDraft(){if(!pro.ready||pro.restoring||!pro.draftEnabled||!state.pdfBytes)return;clearTimeout(pro.saveTimer);$('#draft-status').textContent='Alterações aguardando salvamento…';pro.saveTimer=setTimeout(()=>saveDraft().catch(()=>{$('#draft-status').textContent='Não foi possível salvar localmente. Baixe o PDF para guardar seu trabalho.'}),600)}
  async function saveDraft(){
    const epoch=pro.documentEpoch;await openDb();if(!state.pdfBytes||!pro.draftEnabled||epoch!==pro.documentEpoch)return;
    const draft={schema:1,bytes:state.pdfBytes.slice(0),name:state.pdfFile.name,outputName:refs.outputName.value,snapshot:serializeElements(),currentPage:state.currentPage,savedAt:Date.now()};await dbAction('put','draft',draft);if(epoch===pro.documentEpoch){pro.pendingDraft=draft;$('#draft-status').textContent=`Rascunho salvo às ${new Date().toLocaleTimeString('pt-BR')}.`;$('#draft-restore').classList.remove('hidden')}
  }
  async function restoreDraft(){
    const d=await dbAction('get','draft');if(!d)throw new Error('Não há rascunho salvo.');if(isDirty()&&!confirm('Substituir as alterações atuais pelo rascunho salvo?'))return;
    pro.restoring=true;try{await loadPdfFile(new File([d.bytes],d.name,{type:'application/pdf'}));if(!state.pdfDoc)throw new Error('Não foi possível abrir o rascunho.');const snap=JSON.parse(d.snapshot);state.elements=snap.elements;pro.plan=snap.plan;refs.outputName.value=d.outputName;resetHistory();await renderPage(clamp(d.currentPage||1,1,state.numPages));updateUI();$('#draft-status').textContent='Rascunho recuperado. Salvamento local ativado.';showToast('Rascunho recuperado. Confira o documento antes de baixar.')}finally{pro.restoring=false}
  }
  async function openTemplates(){pro.template=null;$('#template-apply').disabled=true;$('#template-preview').replaceChildren();$('#template-warning').textContent='';await listTemplates();openModal('templates-modal')}
  async function listTemplates(){const templates=await dbAction('get','templates')||[];const list=$('#templates-list');list.replaceChildren();if(!templates.length){const p=document.createElement('p');p.className='pro-note';p.textContent='Nenhum modelo salvo ainda.';list.append(p)}templates.forEach(t=>{const row=document.createElement('div');row.className='pro-page-row';const name=document.createElement('span');name.textContent=t.name;const btn=document.createElement('button');btn.className='button secondary small';btn.textContent='Conferir';btn.onclick=safeAction(async()=>{pro.template=t;$('#template-preview').replaceChildren();const copies=[];for(const e of t.elements)copies.push(await fitClone(e,state.currentPage));pro.templateCopies=copies;await miniPreview($('#template-preview'),state.currentPage,[...state.elements.filter(e=>e.page===state.currentPage),...copies]);$('#template-warning').textContent=`${copies.length} elemento(s) serão adicionados à página ${state.currentPage}. Revise datas, nomes e valores antes de baixar.`;$('#template-apply').disabled=false});const del=document.createElement('button');del.className='button ghost small';del.textContent='Apagar';del.setAttribute('aria-label','Apagar modelo '+t.name);del.onclick=safeAction(async()=>{if(!confirm('Apagar este modelo e suas assinaturas salvas?'))return;await dbAction('put','templates',templates.filter(x=>x.id!==t.id));pro.template=null;$('#template-apply').disabled=true;$('#template-preview').replaceChildren();await listTemplates()});row.append(name,btn,del);list.append(row)})}
  async function saveTemplate(){const name=$('#template-name').value.trim();const elements=state.elements.filter(e=>e.page===state.currentPage);if(!name)throw new Error('Dê um nome ao modelo.');if(!elements.length)throw new Error('Adicione elementos à página antes de salvar um modelo.');const templates=await dbAction('get','templates')||[];if(templates.length>=20)throw new Error('Limite de 20 modelos. Apague um modelo para continuar.');templates.push({id:makeId(),name,elements:structuredCloneSafe(elements)});await dbAction('put','templates',templates);$('#template-name').value='';await listTemplates();showToast('Modelo salvo somente neste dispositivo.')}
  async function applyTemplate(){if(!pro.template)return;state.elements.push(...pro.templateCopies);commitHistory();renderOverlays();closeModal('templates-modal');showToast('Modelo aplicado. Você pode desfazer a operação.')}

})();
