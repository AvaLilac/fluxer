(function() {

    if (window.__FONT_LOADER__) return;
    window.__FONT_LOADER__ = true;
    // anyone reading should totally check my linktree out. Its a party lmao
    const LINKTREE_URL = "https://linktr.ee/GermanAvaLilac";
    const FLUXER_SERVER_CODE = "XFoJZsm2";

    function applyFont(src, name) {
        const fontName = "CustomFont" + Date.now();
        let styleTag = document.getElementById('custom-font-style');
        if (!styleTag) {
            styleTag = document.createElement('style');
            styleTag.id = 'custom-font-style';
            document.head.appendChild(styleTag);
        }
        const ext = (name || src).split('.').pop().split('?')[0].toLowerCase();
        const formatMap = {
            ttf: 'truetype',
            otf: 'opentype',
            woff: 'woff',
            woff2: 'woff2',
            eot: 'embedded-opentype'
        };
        const format = formatMap[ext] || '';
        styleTag.textContent = `
            @font-face {
                font-family: '${fontName}';
                src: url('${src}')${format ? " format('" + format + "')" : ""};
                font-weight: normal;
                font-style: normal;
            }
            body, body *:not(.material-symbols-outlined) {
                font-family: '${fontName}', sans-serif !important;
            }
        `;

        document.documentElement.style.setProperty('--avia-custom-font', `'${fontName}'`);
        if (name) localStorage.setItem('avia_custom_font_name', name);
    }

    function removeFont() {
        localStorage.removeItem('avia_custom_font_url');
        localStorage.removeItem('avia_custom_font_data');
        localStorage.removeItem('avia_custom_font_name');
        const styleTag = document.getElementById('custom-font-style');
        if (styleTag) styleTag.remove();
        document.documentElement.style.removeProperty('--avia-custom-font');
    }

    (function applySavedFont() {
        const data = localStorage.getItem('avia_custom_font_data');
        const url = localStorage.getItem('avia_custom_font_url');
        const name = localStorage.getItem('avia_custom_font_name') || '';
        if (data) applyFont(data, name);
        else if (url) applyFont(url, name);
    })();

    const FONT_MODAL_HOST_ID = "avia-font-modal-host";
    const FONT_MODAL_CLOSE_MS = 150;

    const FONT_MODAL_CSS = `
        * {
            box-sizing: border-box;
        }

        .overlay {
            position: fixed;
            inset: 0;
            z-index: 100000;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px;
            background: rgba(0, 0, 0, 0.65);
            pointer-events: auto;
            font-family: var(--avia-custom-font, Arial), Arial, Helvetica, sans-serif;
            color: #f2f3f5;
        }

        .modal {
            width: 100%;
            max-width: 440px;
            max-height: calc(100vh - 48px);
            overflow: hidden;
            display: flex;
            flex-direction: column;
            background: #23252a;
            color: #f2f3f5;
            border: 1px solid #ffffff12;
            border-radius: 12px;
            box-shadow: 0 10px 30px #00000060;
        }

        .overlay.closing {
            pointer-events: none;
            animation: fade-out ${FONT_MODAL_CLOSE_MS}ms ease-in forwards;
        }

        .overlay.closing .modal {
            animation: modal-out ${FONT_MODAL_CLOSE_MS}ms ease-in forwards;
        }

        .header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
            padding: 20px 24px 0;
        }

        .title {
            margin: 0;
            color: #f2f3f5;
            font-size: 20px;
            font-weight: 700;
            line-height: 1.25;
        }

        .close {
            flex-shrink: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 32px;
            height: 32px;
            padding: 0;
            border: 0;
            border-radius: 6px;
            background: transparent;
            color: #949ba4;
            font-family: inherit;
            font-size: 24px;
            line-height: 1;
            cursor: pointer;
        }

        .close:hover {
            background: #ffffff12;
            color: #ffffff;
        }

        .description {
            margin: 8px 24px 20px;
            color: #b5bac1;
            font-size: 14px;
            line-height: 1.4;
        }

        .body {
            display: flex;
            flex-direction: column;
            gap: 16px;
            padding: 0 24px 24px;
            overflow-y: auto;
            min-height: 0;
        }

        .active-font {
            margin: 0;
            color: #949ba4;
            font-size: 13px;
            line-height: 1.4;
            overflow-wrap: anywhere;
        }

        .tabs {
            display: flex;
            gap: 4px;
            padding: 4px;
            border-radius: 8px;
            background: #1e1f22;
            border: 1px solid #ffffff12;
        }

        .tab {
            flex: 1;
            min-height: 34px;
            padding: 0 12px;
            border: 0;
            border-radius: 6px;
            background: transparent;
            color: #b5bac1;
            font-family: inherit;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: background 120ms ease, color 120ms ease;
        }

        .tab:hover {
            background: #ffffff0f;
            color: #f2f3f5;
        }

        .tab[aria-selected="true"] {
            background: #5865f2;
            color: #ffffff;
        }

        .tab:focus-visible {
            outline: 2px solid #949cf7;
            outline-offset: 2px;
        }

        .panel[hidden] {
            display: none;
        }

        .field {
            display: flex;
            flex-direction: column;
            gap: 8px;
            min-width: 0;
        }

        .label {
            color: #f2f3f5;
            font-size: 14px;
            font-weight: 600;
        }

        .hint {
            color: #949ba4;
            font-size: 12px;
            line-height: 1.4;
        }

        .input {
            width: 100%;
            min-height: 42px;
            padding: 10px 12px;
            border: 1px solid #ffffff20;
            border-radius: 6px;
            outline: none;
            background: #1e1f22;
            color: #f2f3f5;
            font-family: inherit;
            font-size: 14px;
            transition: border-color 120ms ease;
        }

        .input::placeholder {
            color: #949ba4;
        }

        .input:focus {
            border-color: #5865f2;
        }

        .drop {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 6px;
            padding: 26px 16px;
            border: 2px dashed #ffffff20;
            border-radius: 8px;
            background: #1e1f22;
            color: #b5bac1;
            font-size: 14px;
            text-align: center;
            cursor: pointer;
            transition: border-color 120ms ease, background 120ms ease;
        }

        .drop:hover,
        .drop.drag-over {
            border-color: #5865f2;
            background: #5865f21a;
        }

        .drop.has-file {
            border-style: solid;
            border-color: #5865f2;
            background: #5865f21f;
            color: #f2f3f5;
        }

        .drop:focus-visible {
            outline: 2px solid #949cf7;
            outline-offset: 2px;
        }

        .drop-title {
            font-weight: 600;
            overflow-wrap: anywhere;
        }

        .drop-sub {
            color: #949ba4;
            font-size: 12px;
        }

        .error {
            display: none;
            color: #ed4245;
            font-size: 13px;
            line-height: 1.4;
        }

        .error.visible {
            display: block;
        }

        .footer {
            display: flex;
            align-items: center;
            justify-content: flex-end;
            gap: 8px;
            padding: 16px 24px;
            background: #292b30;
        }

        .button {
            min-height: 38px;
            min-width: 80px;
            padding: 0 16px;
            border: 0;
            border-radius: 6px;
            color: #ffffff;
            font-family: inherit;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: background 120ms ease, opacity 120ms ease;
        }

        .button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        .button.primary {
            background: #5865f2;
        }

        .button.primary:hover:not(:disabled) {
            background: #4752c4;
        }

        .button.danger {
            margin-right: auto;
            background: transparent;
            color: #f0686b;
        }

        .button.danger:hover:not(:disabled) {
            background: #da373c26;
        }

        .button:focus-visible {
            outline: 2px solid #949cf7;
            outline-offset: 2px;
        }

        @keyframes fade-out {
            from { opacity: 1; }
            to { opacity: 0; }
        }

        @keyframes modal-out {
            from {
                opacity: 1;
                transform: translateY(0) scale(1);
            }
            to {
                opacity: 0;
                transform: translateY(8px) scale(0.98);
            }
        }

        @media (max-width: 480px) {
            .overlay {
                padding: 16px;
            }

            .header {
                padding: 18px 18px 0;
            }

            .description {
                margin: 8px 18px 18px;
            }

            .body {
                padding: 0 18px 20px;
            }

            .footer {
                padding: 14px 18px;
                flex-wrap: wrap;
            }
        }
    `;

    function closeFontLoaderModal() {
        const host = document.getElementById(FONT_MODAL_HOST_ID);
        if (!host) return;

        if (host.dataset.closing === "true") return;
        host.dataset.closing = "true";

        const overlay = host.shadowRoot?.querySelector(".overlay");
        const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

        if (!overlay || reduceMotion) {
            host.remove();
            return;
        }

        overlay.classList.add("closing");
        setTimeout(() => host.remove(), FONT_MODAL_CLOSE_MS);
    }

    function showFontLoaderModal() {
        if (document.getElementById(FONT_MODAL_HOST_ID)) return;

        const host = document.createElement("div");
        host.id = FONT_MODAL_HOST_ID;
        Object.assign(host.style, {
            position: "fixed",
            inset: "0",
            zIndex: "100000",
            pointerEvents: "none"
        });

        const shadow = host.attachShadow({
            mode: "open"
        });

        const style = document.createElement("style");
        style.textContent = FONT_MODAL_CSS;
        shadow.appendChild(style);

        const overlay = document.createElement("div");
        overlay.className = "overlay";

        const modal = document.createElement("div");
        modal.className = "modal";
        modal.setAttribute("role", "dialog");
        modal.setAttribute("aria-modal", "true");
        modal.setAttribute("aria-labelledby", "avia-font-modal-title");

        const header = document.createElement("div");
        header.className = "header";

        const title = document.createElement("h2");
        title.className = "title";
        title.id = "avia-font-modal-title";
        title.textContent = "Font Loader";

        const closeButton = document.createElement("button");
        closeButton.type = "button";
        closeButton.className = "close";
        closeButton.setAttribute("aria-label", "Close");
        closeButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" height="24" width="24" fill="currentColor" aria-hidden="true"><path d="M6.4,19L5,17.6L10.6,12L5,6.4L6.4,5L12,10.6L17.6,5L19,6.4L13.4,12L19,17.6L17.6,19L12,13.4L6.4,19Z"/></svg>`;

        const description = document.createElement("p");
        description.className = "description";
        description.textContent = "Load a custom font from a URL or a file on your computer.";

        const body = document.createElement("div");
        body.className = "body";

        const footer = document.createElement("div");
        footer.className = "footer";

        header.appendChild(title);
        header.appendChild(closeButton);
        modal.appendChild(header);
        modal.appendChild(description);
        modal.appendChild(body);
        modal.appendChild(footer);
        overlay.appendChild(modal);
        shadow.appendChild(overlay);

        const activeFont = document.createElement("p");
        activeFont.className = "active-font";

        function setActive(name) {
            activeFont.textContent = name ? "Active: " + name : "No custom font active";
        }
        setActive(localStorage.getItem("avia_custom_font_name") || "");

        const tabs = document.createElement("div");
        tabs.className = "tabs";
        tabs.setAttribute("role", "tablist");

        const tabUrl = document.createElement("button");
        tabUrl.type = "button";
        tabUrl.className = "tab";
        tabUrl.setAttribute("role", "tab");
        tabUrl.textContent = "URL";

        const tabFile = document.createElement("button");
        tabFile.type = "button";
        tabFile.className = "tab";
        tabFile.setAttribute("role", "tab");
        tabFile.textContent = "Local File";

        tabs.appendChild(tabUrl);
        tabs.appendChild(tabFile);

        const urlPanel = document.createElement("div");
        urlPanel.className = "panel field";

        const urlLabel = document.createElement("div");
        urlLabel.className = "label";
        urlLabel.textContent = "Font URL";

        const urlInput = document.createElement("input");
        urlInput.id = "avia-font-url";
        urlInput.setAttribute("aria-label", "Font URL");
        urlInput.className = "input";
        urlInput.type = "text";
        urlInput.placeholder = "api.example.com/example.otf";
        urlInput.autocomplete = "off";
        urlInput.spellcheck = false;
        urlInput.value = localStorage.getItem("avia_custom_font_url") || "";

        const urlHint = document.createElement("div");
        urlHint.className = "hint";
        urlHint.textContent = "Direct link to a .ttf, .otf, .woff or .woff2 file.";

        urlPanel.appendChild(urlLabel);
        urlPanel.appendChild(urlInput);
        urlPanel.appendChild(urlHint);

        const filePanel = document.createElement("div");
        filePanel.className = "panel field";

        const fileLabel = document.createElement("div");
        fileLabel.className = "label";
        fileLabel.textContent = "Font file";

        const drop = document.createElement("div");
        drop.className = "drop";
        drop.setAttribute("role", "button");
        drop.tabIndex = 0;

        const dropTitle = document.createElement("div");
        dropTitle.className = "drop-title";

        const dropSub = document.createElement("div");
        dropSub.className = "drop-sub";

        const fileInput = document.createElement("input");
        fileInput.type = "file";
        fileInput.accept = ".ttf,.otf,.woff,.woff2";
        fileInput.style.display = "none";

        drop.appendChild(dropTitle);
        drop.appendChild(dropSub);
        drop.appendChild(fileInput);

        filePanel.appendChild(fileLabel);
        filePanel.appendChild(drop);

        function resetDrop() {
            drop.classList.remove("has-file", "drag-over");
            dropTitle.textContent = "Drop a font file here or click to browse";
            dropSub.textContent = ".ttf · .otf · .woff · .woff2";
        }
        resetDrop();

        const error = document.createElement("div");
        error.className = "error";
        error.setAttribute("role", "alert");

        function showError(message) {
            error.textContent = message;
            error.classList.add("visible");
        }

        function hideError() {
            error.textContent = "";
            error.classList.remove("visible");
        }

        body.appendChild(activeFont);
        body.appendChild(tabs);
        body.appendChild(urlPanel);
        body.appendChild(filePanel);
        body.appendChild(error);

        const removeBtn = document.createElement("button");
        removeBtn.type = "button";
        removeBtn.className = "button danger";
        removeBtn.textContent = "Remove Font";

        const applyBtn = document.createElement("button");
        applyBtn.type = "button";
        applyBtn.className = "button primary";
        applyBtn.textContent = "Apply";

        footer.appendChild(removeBtn);
        footer.appendChild(applyBtn);

        let currentTab = "url";
        let selectedFile = null;

        function updateApplyState() {
            applyBtn.disabled = currentTab === "file" && !selectedFile;
        }

        function setTab(tab) {
            currentTab = tab;
            const isUrl = tab === "url";
            tabUrl.setAttribute("aria-selected", String(isUrl));
            tabFile.setAttribute("aria-selected", String(!isUrl));
            urlPanel.hidden = !isUrl;
            filePanel.hidden = isUrl;
            hideError();
            updateApplyState();
        }

        function handleFileSelected(file) {
            selectedFile = file;
            dropTitle.textContent = file.name;
            dropSub.textContent = (file.size / 1024).toFixed(1) + " KB";
            drop.classList.add("has-file");
            hideError();
            updateApplyState();
        }

        tabUrl.addEventListener("click", () => setTab("url"));
        tabFile.addEventListener("click", () => setTab("file"));

        drop.addEventListener("click", () => fileInput.click());
        drop.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                fileInput.click();
            }
        });
        drop.addEventListener("dragover", (e) => {
            e.preventDefault();
            drop.classList.add("drag-over");
        });
        drop.addEventListener("dragleave", () => drop.classList.remove("drag-over"));
        drop.addEventListener("drop", (e) => {
            e.preventDefault();
            drop.classList.remove("drag-over");
            const file = e.dataTransfer?.files?.[0];
            if (file) handleFileSelected(file);
        });
        fileInput.addEventListener("change", () => {
            if (fileInput.files[0]) handleFileSelected(fileInput.files[0]);
        });

        applyBtn.addEventListener("click", () => {
            hideError();

            if (currentTab === "url") {
                const url = urlInput.value.trim();
                if (!url) {
                    showError("Please enter a font URL.");
                    urlInput.focus();
                    return;
                }
                localStorage.removeItem("avia_custom_font_data");
                localStorage.removeItem("avia_custom_font_name");
                localStorage.setItem("avia_custom_font_url", url);
                const name = url.split("/").pop().split("?")[0];
                applyFont(url, name);
                setActive(name);
                return;
            }

            if (!selectedFile) return;

            const file = selectedFile;
            const reader = new FileReader();
            reader.onload = () => {
                const dataUrl = reader.result;
                try {
                    localStorage.removeItem("avia_custom_font_url");
                    localStorage.setItem("avia_custom_font_data", dataUrl);
                } catch {
                    showError("That font file is too large to save. Try a smaller file or use a URL.");
                    return;
                }
                applyFont(dataUrl, file.name);
                setActive(file.name);
            };
            reader.onerror = () => showError("Couldn't read that file.");
            reader.readAsDataURL(file);
        });

        removeBtn.addEventListener("click", () => {
            removeFont();
            setActive("");
            urlInput.value = "";
            selectedFile = null;
            fileInput.value = "";
            resetDrop();
            hideError();
            updateApplyState();
        });

        urlInput.addEventListener("input", hideError);

        urlInput.addEventListener("paste", (e) => {
            if (!e.defaultPrevented) return;
            const text = (e.clipboardData?.getData("text/plain") || "").replace(/[\r\n]+/g, "").trim();
            if (!text) return;
            const start = urlInput.selectionStart ?? urlInput.value.length;
            const end = urlInput.selectionEnd ?? urlInput.value.length;
            urlInput.setRangeText(text, start, end, "end");
            urlInput.dispatchEvent(new Event("input", {
                bubbles: true
            }));
        });

        urlInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                applyBtn.click();
            }
        });

        closeButton.addEventListener("click", closeFontLoaderModal);

        overlay.addEventListener("mousedown", (event) => {
            if (event.target === overlay) closeFontLoaderModal();
        });

        host.addEventListener("keydown", (event) => {
            event.stopPropagation();
            if (event.key === "Escape") {
                event.preventDefault();
                closeFontLoaderModal();
            }
        });

        ["paste", "copy", "cut", "keyup", "keypress"].forEach((type) => {
            host.addEventListener(type, (event) => event.stopPropagation());
        });

        setTab("url");
        document.body.appendChild(host);
        urlInput.focus();
    }

    function openLink(url) {
        return function() {
            window.open(url, "_blank");
        };
    }

    function registerWithAviaMenu() {
        if (window.AviaMenu) {
            window.AviaMenu.register({
                id: "avia_fontloader",
                name: "Font Loader",
                icon: "upload",
                onClick: showFontLoaderModal
            });
        } else {
            const interval = setInterval(() => {
                if (window.AviaMenu) {
                    clearInterval(interval);
                    window.AviaMenu.register({
                        id: "avia_fontloader",
                        name: "Font Loader",
                        icon: "upload",
                        onClick: showFontLoaderModal
                    });
                }
            }, 100);
        }
    }

    function registerWithAviaCategory() {
        if (window.AviaCategory) {
            window.AviaCategory.register({
                id: "avia_linktree",
                name: "Ava's Linktree",
                icon: "desktop_windows",
                onClick: openLink(LINKTREE_URL)
            });
            window.AviaCategory.register({
                id: "AviaClient",
                name: "(AutoJoins) Fluxer Server",
                icon: "desktop_windows",
                onClick: async () => {
                    const token = localStorage.getItem("token");
                    await fetch("/api/v1/invites/" + FLUXER_SERVER_CODE, {
                        method: "POST",
                        headers: {
                            Authorization: token
                        }
                    });
                }
            });
            window.AviaCategory.register({
                id: "avia_fontloader",
                name: "Font Loader",
                icon: "upload",
                onClick: showFontLoaderModal
            });
        } else {
            const interval = setInterval(() => {
                if (window.AviaCategory) {
                    clearInterval(interval);
                    window.AviaCategory.register({
                        id: "avia_linktree",
                        name: "Ava's Linktree",
                        icon: "desktop_windows",
                        onClick: openLink(LINKTREE_URL)
                    });
                    window.AviaCategory.register({
                        id: "AviaClient",
                        name: "(AutoJoins) Fluxer Server",
                        icon: "desktop_windows",
                        onClick: async () => {
                            const token = localStorage.getItem("token");
                            await fetch("/api/v1/invites/" + FLUXER_SERVER_CODE, {
                                method: "POST",
                                headers: {
                                    Authorization: token
                                }
                            });
                        }
                    });
                    window.AviaCategory.register({
                        id: "avia_fontloader",
                        name: "Font Loader",
                        icon: "upload",
                        onClick: showFontLoaderModal
                    });
                }
            }, 100);
        }
    }

    registerWithAviaMenu();
    registerWithAviaCategory();

})();
