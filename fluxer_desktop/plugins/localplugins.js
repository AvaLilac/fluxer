(function() {

    if (window.__LOCAL_PLUGINS__) return;
    window.__LOCAL_PLUGINS__ = true;

    const STORAGE_KEY = "avia_local_plugins";
    const runningLocalPlugins = {};
    const localPluginErrors = {};

    const activeLocalPanels = new Set();
    let localSettingsObserver = null;
    let localSettingsFrame = null;
    let localSettingsWasOpen = false;
    let localSettingsMovedPanels = new WeakSet();

    const SETTINGS_SELECTOR = '[data-flx="user.user-settings-modal.modal-root"]';

    const LP_MODAL_ID = "avia-lp-update-modal";
    const LP_MODAL_CLOSE_MS = 150;

    const LP_MODAL_CSS = `
    * {
        box-sizing: border-box;
    }

    .overlay {
        position: absolute;
        inset: 0;
        z-index: 100000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 24px;
        background: rgba(0, 0, 0, 0.65);
        pointer-events: auto;
        font-family: Arial, Helvetica, sans-serif;
        color: #f2f3f5;
    }

    .modal {
        width: 100%;
        max-width: 440px;
        max-height: calc(100% - 48px);
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
        animation: fade-out ${LP_MODAL_CLOSE_MS}ms ease-in forwards;
    }

    .overlay.closing .modal {
        animation: modal-out ${LP_MODAL_CLOSE_MS}ms ease-in forwards;
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
        white-space: pre-line;
        overflow-wrap: anywhere;
        overflow-y: auto;
        min-height: 0;
    }

    .body {
        display: flex;
        flex-direction: column;
        gap: 16px;
        padding: 0 24px 24px;
        overflow-y: auto;
        min-height: 0;
    }

    .header + .body {
        padding-top: 16px;
    }

    .detail {
        display: flex;
        flex-direction: column;
        gap: 4px;
        min-width: 0;
    }

    .detail-label {
        color: #f2f3f5;
        font-size: 14px;
        font-weight: 600;
    }

    .detail-value {
        padding: 10px 12px;
        border: 1px solid #ffffff20;
        border-radius: 6px;
        background: #1e1f22;
        color: #f2f3f5;
        font-size: 14px;
        font-weight: 500;
        overflow-wrap: anywhere;
    }

    .detail-value.accent {
        color: #949cf7;
        font-weight: 700;
    }

    .warning {
        color: #b5bac1;
        font-size: 13px;
        line-height: 1.4;
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

    .button.primary {
        background: #5865f2;
    }

    .button.primary:hover {
        background: #4752c4;
    }

    .button.secondary {
        background: #4e5058;
    }

    .button.secondary:hover {
        background: #6d6f78;
    }

    .button:focus-visible,
    .close:focus-visible {
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

        .header + .body {
            padding-top: 14px;
        }

        .footer {
            padding: 14px 18px;
        }
    }
`;

    const getLocalPlugins = () => JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    const setLocalPlugins = (data) => localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

    function isLocalPanelVisible(panel) {
        return !!(
            panel &&
            panel.isConnected &&
            panel.style.display !== "none" &&
            getComputedStyle(panel).display !== "none" &&
            getComputedStyle(panel).visibility !== "hidden"
        );
    }

    function isSettingsVisible() {
        const modal = document.querySelector(SETTINGS_SELECTOR);
        if (!modal) return false;
        if (modal.getAttribute("aria-hidden") === "true") return false;
        if (modal.hasAttribute("inert")) return false;

        const style = getComputedStyle(modal);
        return style.display !== "none" && style.visibility !== "hidden";
    }

    function moveLocalPanelAboveSettings(panel) {
        if (!isLocalPanelVisible(panel) || localSettingsMovedPanels.has(panel)) return;

        if (panel.parentElement !== document.body || document.body.lastElementChild !== panel) {
            document.body.appendChild(panel);
        }

        Object.assign(panel.style, {
            zIndex: "2147483647",
            pointerEvents: "auto"
        });

        panel.removeAttribute("inert");
        panel.removeAttribute("aria-hidden");

        panel.querySelectorAll("[inert]").forEach(element => {
            element.removeAttribute("inert");
        });

        localSettingsMovedPanels.add(panel);
    }

    function stopLocalSettingsObserver() {
        if (localSettingsObserver) {
            localSettingsObserver.disconnect();
            localSettingsObserver = null;
        }

        if (localSettingsFrame !== null) {
            cancelAnimationFrame(localSettingsFrame);
            localSettingsFrame = null;
        }

        localSettingsWasOpen = false;
        localSettingsMovedPanels = new WeakSet();
    }

    function checkLocalSettingsPanels() {
        localSettingsFrame = null;

        for (const panel of activeLocalPanels) {
            if (!isLocalPanelVisible(panel)) {
                activeLocalPanels.delete(panel);
            }
        }

        if (activeLocalPanels.size === 0) {
            stopLocalSettingsObserver();
            return;
        }

        const settingsOpen = isSettingsVisible();

        if (!settingsOpen) {
            if (localSettingsWasOpen) {
                localSettingsMovedPanels = new WeakSet();
            }

            localSettingsWasOpen = false;
            return;
        }

        localSettingsWasOpen = true;

        for (const panel of activeLocalPanels) {
            if (!localSettingsMovedPanels.has(panel)) {
                moveLocalPanelAboveSettings(panel);
            }
        }
    }

    function scheduleLocalSettingsCheck() {
        if (localSettingsFrame !== null) return;
        localSettingsFrame = requestAnimationFrame(checkLocalSettingsPanels);
    }

    function registerLocalSettingsPanel(panel) {
        if (!panel) return;

        activeLocalPanels.add(panel);

        if (!localSettingsObserver) {
            localSettingsObserver = new MutationObserver(records => {
                let shouldCheck = false;

                for (const record of records) {
                    const target = record.target.nodeType === Node.ELEMENT_NODE ?
                        record.target :
                        record.target.parentElement;

                    if (!target) continue;

                    if ([...activeLocalPanels].some(activePanel =>
                            activePanel === target || activePanel.contains(target)
                        )) {
                        continue;
                    }

                    if (record.type === "childList") {
                        const changedNodes = [
                            ...record.addedNodes,
                            ...record.removedNodes
                        ];

                        if (changedNodes.some(node =>
                                node.nodeType === Node.ELEMENT_NODE &&
                                (
                                    node.matches?.(SETTINGS_SELECTOR) ||
                                    node.querySelector?.(SETTINGS_SELECTOR)
                                )
                            )) {
                            shouldCheck = true;
                            break;
                        }
                    }

                    if (record.type === "attributes") {
                        if (
                            target.matches?.(SETTINGS_SELECTOR) ||
                            target.closest?.(SETTINGS_SELECTOR)
                        ) {
                            shouldCheck = true;
                            break;
                        }
                    }
                }

                if (shouldCheck) scheduleLocalSettingsCheck();
            });

            localSettingsObserver.observe(document.body, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ["aria-hidden", "inert", "class", "style"]
            });
        }

        scheduleLocalSettingsCheck();
    }

    function unregisterLocalSettingsPanel(panel) {
        if (!panel) return;

        activeLocalPanels.delete(panel);

        if (activeLocalPanels.size === 0) {
            stopLocalSettingsObserver();
        }
    }

    function rawUrlFromLink(link) {
        try {
            const u = new URL(link);
            if (u.hostname === "github.com") {
                const m = u.pathname.match(/^\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+)$/);
                if (m) return `https://raw.githubusercontent.com/${m[1]}/${m[2]}/${m[3]}/${m[4]}`;
                return link;
            }
            if (u.hostname === "raw.githubusercontent.com") return link;
            if (u.hostname === "raw.codeberg.page") return link;
            if (u.hostname === "codeberg.org") {
                if (u.pathname.startsWith("/api/v1/repos/")) return link;
                const parts = u.pathname.split("/").filter(Boolean);
                if (parts.length >= 5 && (parts[2] === "raw" || parts[2] === "src")) {
                    const user = parts[0],
                        repo = parts[1];
                    const branchName = (parts[3] === "branch" || parts[3] === "commit" || parts[3] === "tag") ? parts[4] : parts[3];
                    const fileStart = (parts[3] === "branch" || parts[3] === "commit" || parts[3] === "tag") ? 5 : 4;
                    const filePath = parts.slice(fileStart).join("/");
                    return `https://codeberg.org/api/v1/repos/${user}/${repo}/raw/${filePath}?ref=${branchName}`;
                }
                if (parts.length >= 5 && parts[2] === "src" && parts[3] === "branch") {
                    const user = parts[0],
                        repo = parts[1],
                        branch = parts[4];
                    const filePath = parts.slice(5).join("/");
                    return `https://codeberg.org/api/v1/repos/${user}/${repo}/raw/${filePath}?ref=${branch}`;
                }
            }
        } catch (_) {}
        return link;
    }

    function parseUpdateUrl(code) {
        const m = code.match(/@UPDATEURL:\s*\(?["']?([^"'\)\s]+)["']?\)?/);
        return m ? m[1].trim() : null;
    }

    function parseVersion(code) {
        const m = code.match(/@VERSION:\s*([\d.a-zA-Z-]+)/);
        return m ? m[1].trim() : null;
    }

    function closeLpModal() {
        const host = document.getElementById(LP_MODAL_ID);
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
        setTimeout(() => host.remove(), LP_MODAL_CLOSE_MS);
    }

    function createLpModal(titleText, descriptionText) {
        const existing = document.getElementById(LP_MODAL_ID);
        if (existing) existing.remove();

        const titlebar = document.querySelector('[data-flx="app.native-titlebar.titlebar"]') || document.querySelector("[data-native-titlebar]");
        const titlebarHeight = titlebar?.getBoundingClientRect().height || 0;

        const host = document.createElement("div");
        host.id = LP_MODAL_ID;
        Object.assign(host.style, {
            position: "fixed",
            top: `${titlebarHeight}px`,
            right: "0",
            bottom: "0",
            left: "0",
            zIndex: "2147483647",
            pointerEvents: "none"
        });

        const shadow = host.attachShadow({
            mode: "open"
        });

        const style = document.createElement("style");
        style.textContent = LP_MODAL_CSS;
        shadow.appendChild(style);

        const overlay = document.createElement("div");
        overlay.className = "overlay";

        const modal = document.createElement("div");
        modal.className = "modal";
        modal.setAttribute("role", "dialog");
        modal.setAttribute("aria-modal", "true");
        modal.setAttribute("aria-labelledby", "avia-lp-update-modal-title");

        const header = document.createElement("div");
        header.className = "header";

        const title = document.createElement("h2");
        title.className = "title";
        title.id = "avia-lp-update-modal-title";
        title.textContent = titleText;

        const closeButton = document.createElement("button");
        closeButton.type = "button";
        closeButton.className = "close";
        closeButton.setAttribute("aria-label", "Close");
        closeButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" height="24px" width="24px" fill="#e3e3e3"><path d="M6.4,19L5,17.6L10.6,12L5,6.4L6.4,5L12,10.6L17.6,5L19,6.4L13.4,12L19,17.6L17.6,19L12,13.4L6.4,19Z"/></svg>`;

        header.appendChild(title);
        header.appendChild(closeButton);
        modal.appendChild(header);

        if (descriptionText !== undefined) {
            const description = document.createElement("p");
            description.className = "description";
            description.textContent = descriptionText;
            modal.appendChild(description);
        }

        const body = document.createElement("div");
        body.className = "body";

        const footer = document.createElement("div");
        footer.className = "footer";

        if (descriptionText === undefined) modal.appendChild(body);
        modal.appendChild(footer);

        overlay.appendChild(modal);
        shadow.appendChild(overlay);

        closeButton.addEventListener("click", closeLpModal);

        overlay.addEventListener("mousedown", (event) => {
            if (event.target === overlay) closeLpModal();
        });

        host.addEventListener("keydown", (event) => {
            event.stopPropagation();
            if (event.key === "Escape") {
                event.preventDefault();
                closeLpModal();
            }
        });

        ["paste", "copy", "cut", "keyup", "keypress"].forEach((type) => {
            host.addEventListener(type, (event) => event.stopPropagation());
        });

        document.body.appendChild(host);

        return {
            host,
            body,
            footer
        };
    }

    function createLpButton(label, variant, onClick) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = `button ${variant}`;
        button.textContent = label;
        button.addEventListener("click", onClick);
        return button;
    }

    function createLpDetail(label, value, accent) {
        const row = document.createElement("div");
        row.className = "detail";

        const labelEl = document.createElement("div");
        labelEl.className = "detail-label";
        labelEl.textContent = label;

        const valueEl = document.createElement("div");
        valueEl.className = accent ? "detail-value accent" : "detail-value";
        valueEl.textContent = value;

        row.appendChild(labelEl);
        row.appendChild(valueEl);
        return row;
    }

    function showInfoModal(title, message) {
        const {
            host,
            footer
        } = createLpModal(title, message);

        const closeBtn = createLpButton("Close", "primary", closeLpModal);
        footer.appendChild(closeBtn);

        closeBtn.focus();
        host.shadowRoot.querySelector(".close").blur();
        closeBtn.focus();
    }

    function showUpdateModal(pluginName, localVersion, remoteVersion, wasRunning, onAccept) {
        const {
            body,
            footer
        } = createLpModal("Update Available");

        body.appendChild(createLpDetail("Plugin", pluginName));
        body.appendChild(createLpDetail("Current version", localVersion));
        body.appendChild(createLpDetail("Latest version", remoteVersion, true));

        const warningEl = document.createElement("div");
        warningEl.className = "warning";
        warningEl.textContent = wasRunning ?
            "Any local changes you made to this plugin will be overwritten. Since this plugin is currently running, you will need to restart your client for the update to take effect." :
            "Any local changes you made to this plugin will be overwritten.";
        body.appendChild(warningEl);

        const cancelBtn = createLpButton("Cancel", "secondary", closeLpModal);
        const updateBtn = createLpButton("Update", "primary", () => {
            closeLpModal();
            onAccept();
        });

        footer.appendChild(cancelBtn);
        footer.appendChild(updateBtn);

        cancelBtn.focus();
    }

    async function checkPluginUpdate(plugin, updateBtn) {
        const updateUrl = parseUpdateUrl(plugin.code || "");
        const localVersion = parseVersion(plugin.code || "");

        if (!updateUrl || !localVersion) {
            showInfoModal(
                "Cannot Update",
                `"${plugin.name}" does not have @UPDATEURL and @VERSION defined in its header. The plugin author must add these for update checking to work.`
            );
            return;
        }

        updateBtn.style.opacity = "0.5";
        updateBtn.style.pointerEvents = "none";
        updateBtn.title = "Checking...";

        try {
            const rawUrl = rawUrlFromLink(updateUrl);
            const bustChar = rawUrl.includes("?") ? "&" : "?";
            const res = await fetch(rawUrl + bustChar + "_t=" + Date.now());
            if (!res.ok) throw new Error("HTTP " + res.status);
            const remoteCode = await res.text();
            const remoteVersion = parseVersion(remoteCode);

            if (!remoteVersion) {
                showInfoModal("Cannot Update", `The remote plugin at the update URL does not have a @VERSION defined. Cannot compare versions.`);
                return;
            }

            if (localVersion === remoteVersion) {
                showInfoModal("Up to Date", `"${plugin.name}" is already on the latest version (${localVersion}).`);
                return;
            }

            const wasRunning = !!runningLocalPlugins[plugin.id];
            showUpdateModal(plugin.name, localVersion, remoteVersion, wasRunning, () => {
                const all = getLocalPlugins();
                const target = all.find(p => p.id === plugin.id);
                if (target) {
                    target.code = remoteCode;
                    plugin.code = remoteCode;
                    setLocalPlugins(all);
                }
                renderLocalPanel();
                showInfoModal("Updated", `"${plugin.name}" has been updated to version ${remoteVersion}.`);
            });

        } catch (e) {
            showInfoModal("Update Failed", `Could not fetch the update for "${plugin.name}". Check that the @UPDATEURL is correct and accessible.\n\n${e.message}`);
        } finally {
            updateBtn.style.opacity = "";
            updateBtn.style.pointerEvents = "";
            updateBtn.title = "Check for update";
        }
    }

    function preloadMonaco() {
        return new Promise(resolve => {
            if (window.monaco) return resolve();
            const loader = document.createElement("script");
            loader.src = "https://cdn.jsdelivr.net/npm/monaco-editor@0.50.0/min/vs/loader.js";
            loader.onload = function() {
                require.config({
                    paths: {
                        vs: "https://cdn.jsdelivr.net/npm/monaco-editor@0.50.0/min/vs"
                    }
                });
                require(["vs/editor/editor.main"], () => resolve());
            };
            document.head.appendChild(loader);
        });
    }

    function exportPlugin(plugin) {
        const filename = plugin.name.endsWith(".js") ? plugin.name : plugin.name + ".js";
        const blob = new Blob([plugin.code || ""], {
            type: "text/javascript"
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }

    function runLocalPlugin(plugin) {
        stopLocalPlugin(plugin);
        try {
            const script = document.createElement("script");
            script.textContent = plugin.code || "";
            script.dataset.localPluginId = plugin.id;
            document.body.appendChild(script);
            runningLocalPlugins[plugin.id] = script;
            delete localPluginErrors[plugin.id];
        } catch (e) {
            localPluginErrors[plugin.id] = true;
        }
        renderLocalPanel();
    }

    function stopLocalPlugin(plugin) {
        const script = runningLocalPlugins[plugin.id];
        if (!script) return;
        script.remove();
        delete runningLocalPlugins[plugin.id];
        delete localPluginErrors[plugin.id];
        renderLocalPanel();
    }

    async function openEditorPanel(plugin, onSave) {
        await preloadMonaco();

        const existing = document.getElementById("avia-local-editor-panel");
        if (existing) {
            unregisterLocalSettingsPanel(existing);
            existing.remove();
        }

        const panel = document.createElement("div");
        panel.id = "avia-local-editor-panel";
        Object.assign(panel.style, {
            position: "fixed",
            bottom: "24px",
            left: "24px",
            width: "680px",
            height: "460px",
            background: "var(--md-sys-color-surface, #1e1e1e)",
            borderRadius: "16px",
            boxShadow: "0 8px 28px rgba(0,0,0,0.35)",
            zIndex: "2147483647",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            border: "1px solid rgba(255,255,255,0.08)",
            backdropFilter: "blur(12px)",
            pointerEvents: "auto"
        });

        const header = document.createElement("div");
        header.textContent = `Editing: ${plugin.name}`;
        Object.assign(header.style, {
            padding: "14px 16px",
            fontWeight: "600",
            fontSize: "14px",
            background: "var(--md-sys-color-surface-container, rgba(255,255,255,0.04))",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            cursor: "move",
            color: "#fff",
            flex: "0 0 auto"
        });

        const closeBtn = document.createElement("div");
        closeBtn.textContent = "✕";
        Object.assign(closeBtn.style, {
            position: "absolute",
            top: "12px",
            right: "16px",
            cursor: "pointer",
            opacity: "0.7",
            color: "#fff",
            zIndex: "1"
        });
        closeBtn.onmouseenter = () => closeBtn.style.opacity = "1";
        closeBtn.onmouseleave = () => closeBtn.style.opacity = "0.7";
        closeBtn.onclick = () => {
            unregisterLocalSettingsPanel(panel);
            panel.remove();
        };

        const toolbar = document.createElement("div");
        Object.assign(toolbar.style, {
            padding: "8px 16px",
            display: "flex",
            gap: "8px",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            flex: "0 0 auto"
        });

        const saveBtn = document.createElement("button");
        saveBtn.textContent = "Save";
        styleEditorBtn(saveBtn, "#2d6a4f");

        const saveRunBtn = document.createElement("button");
        saveRunBtn.textContent = "Save & Run";
        styleEditorBtn(saveRunBtn, "#1b4332");

        toolbar.appendChild(saveBtn);
        toolbar.appendChild(saveRunBtn);

        const editorContainer = document.createElement("div");
        editorContainer.style.flex = "1";

        panel.appendChild(header);
        panel.appendChild(closeBtn);
        panel.appendChild(toolbar);
        panel.appendChild(editorContainer);
        document.body.appendChild(panel);

        registerLocalSettingsPanel(panel);

        const editor = monaco.editor.create(editorContainer, {
            value: plugin.code || "",
            language: "javascript",
            theme: "vs-dark",
            automaticLayout: true,
            minimap: {
                enabled: false
            },
            fontSize: 13,
            scrollBeyondLastLine: false,
            wordWrap: "on"
        });

        saveBtn.onclick = () => {
            onSave(editor.getValue(), false);
            saveBtn.textContent = "✓ Saved";
            setTimeout(() => saveBtn.textContent = "Save", 1200);
        };

        saveRunBtn.onclick = () => {
            onSave(editor.getValue(), true);
            saveRunBtn.textContent = "✓ Ran!";
            setTimeout(() => saveRunBtn.textContent = "Save & Run", 1200);
        };

        enableEditorDrag(panel, header);
    }

    function styleEditorBtn(btn, bg) {
        Object.assign(btn.style, {
            padding: "5px 14px",
            borderRadius: "8px",
            border: "none",
            background: bg || "rgba(255,255,255,0.1)",
            color: "#fff",
            cursor: "pointer",
            fontSize: "12px",
            fontWeight: "500"
        });
        btn.onmouseenter = () => btn.style.opacity = "0.8";
        btn.onmouseleave = () => btn.style.opacity = "1";
    }

    function enableEditorDrag(panel, handle) {
        let isDragging = false,
            offsetX, offsetY;
        handle.addEventListener("mousedown", e => {
            isDragging = true;
            offsetX = e.clientX - panel.offsetLeft;
            offsetY = e.clientY - panel.offsetTop;
            document.body.style.userSelect = "none";
        });
        document.addEventListener("mouseup", () => {
            isDragging = false;
            document.body.style.userSelect = "";
        });
        document.addEventListener("mousemove", e => {
            if (!isDragging) return;
            panel.style.left = (e.clientX - offsetX) + "px";
            panel.style.top = (e.clientY - offsetY) + "px";
            panel.style.right = "auto";
            panel.style.bottom = "auto";
        });
    }

    function toggleLocalPanel() {
        let panel = document.getElementById("avia-local-plugins-panel");

        if (panel) {
            if (panel.style.display === "none") {
                panel.style.display = "flex";
                registerLocalSettingsPanel(panel);
                renderLocalPanel();
            } else {
                panel.style.display = "none";
                unregisterLocalSettingsPanel(panel);
            }
            return;
        }

        panel = document.createElement("div");
        panel.id = "avia-local-plugins-panel";
        Object.assign(panel.style, {
            position: "fixed",
            bottom: "24px",
            right: "560px",
            width: "560px",
            height: "520px",
            background: "var(--md-sys-color-surface, #1e1e1e)",
            color: "var(--md-sys-color-on-surface, #fff)",
            borderRadius: "16px",
            boxShadow: "0 8px 28px rgba(0,0,0,0.35)",
            zIndex: "2147483647",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            border: "1px solid rgba(255,255,255,0.08)",
            backdropFilter: "blur(12px)",
            pointerEvents: "auto"
        });

        const header = document.createElement("div");
        Object.assign(header.style, {
            padding: "14px 16px",
            fontWeight: "600",
            fontSize: "14px",
            background: "var(--md-sys-color-surface-container, rgba(255,255,255,0.04))",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            cursor: "move",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flex: "0 0 auto"
        });

        const headerTitle = document.createElement("span");
        headerTitle.textContent = "Plugins";

        const closeBtn = document.createElement("div");
        closeBtn.textContent = "✕";
        Object.assign(closeBtn.style, {
            cursor: "pointer",
            opacity: "0.7",
            fontSize: "15px",
            lineHeight: "1",
            padding: "2px 4px"
        });
        closeBtn.onmouseenter = () => closeBtn.style.opacity = "1";
        closeBtn.onmouseleave = () => closeBtn.style.opacity = "0.7";
        closeBtn.onclick = () => {
            panel.style.display = "none";
            unregisterLocalSettingsPanel(panel);
        };

        header.appendChild(headerTitle);
        header.appendChild(closeBtn);

        const controlsBar = document.createElement("div");
        Object.assign(controlsBar.style, {
            padding: "12px 16px",
            display: "flex",
            gap: "8px",
            alignItems: "center",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            flex: "0 0 auto"
        });

        const nameInput = document.createElement("input");
        nameInput.placeholder = "Plugin name";
        styleLocalInput(nameInput);
        nameInput.style.flex = "1";

        const addBtn = document.createElement("button");
        addBtn.textContent = "New";
        styleLocalBtn(addBtn);
        addBtn.onclick = () => {
            const name = nameInput.value.trim();
            if (!name) return;
            const plugins = getLocalPlugins();
            const newPlugin = {
                id: "local_" + Date.now(),
                name,
                code: "",
                enabled: false
            };
            plugins.push(newPlugin);
            setLocalPlugins(plugins);
            nameInput.value = "";
            renderLocalPanel(searchInput.value.toLowerCase());
        };

        const importBtn = document.createElement("button");
        importBtn.textContent = "Import";
        styleLocalBtn(importBtn, "#2d6a4f");
        importBtn.onmouseenter = () => importBtn.style.opacity = "0.75";
        importBtn.onmouseleave = () => importBtn.style.opacity = "1";

        const fileInput = document.createElement("input");
        fileInput.type = "file";
        fileInput.accept = ".js";
        fileInput.multiple = true;
        fileInput.style.display = "none";

        importBtn.onclick = () => fileInput.click();
        fileInput.onchange = async () => {
            const files = [...fileInput.files];
            if (!files.length) return;
            const plugins = getLocalPlugins();
            for (const file of files) {
                const text = await file.text();
                const name = file.name.replace(/\.js$/i, "");
                plugins.push({
                    id: "local_" + Date.now() + "_" + Math.random(),
                    name,
                    code: text,
                    enabled: false
                });
            }
            setLocalPlugins(plugins);
            fileInput.value = "";
            renderLocalPanel(searchInput.value.toLowerCase());
        };

        controlsBar.appendChild(nameInput);
        controlsBar.appendChild(addBtn);
        controlsBar.appendChild(importBtn);
        controlsBar.appendChild(fileInput);

        const searchBar = document.createElement("div");
        Object.assign(searchBar.style, {
            padding: "10px 16px",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            flex: "0 0 auto"
        });

        const searchInput = document.createElement("input");
        searchInput.placeholder = "Search plugins…";
        styleLocalInput(searchInput);
        searchInput.style.width = "100%";
        searchInput.oninput = () => renderLocalPanel(searchInput.value.toLowerCase());
        searchBar.appendChild(searchInput);

        const content = document.createElement("div");
        content.id = "avia-local-plugins-content";
        Object.assign(content.style, {
            flex: "1",
            overflowY: "auto",
            padding: "12px 16px 16px",
            scrollbarWidth: "none",
            msOverflowStyle: "none"
        });

        if (!document.getElementById("avia-local-scrollbar-hide")) {
            const s = document.createElement("style");
            s.id = "avia-local-scrollbar-hide";
            s.textContent = "#avia-local-plugins-content::-webkit-scrollbar{display:none}";
            document.head.appendChild(s);
        }

        panel.appendChild(header);
        panel.appendChild(controlsBar);
        panel.appendChild(searchBar);
        panel.appendChild(content);

        const dropOverlay = document.createElement("div");
        dropOverlay.textContent = "Import JS files";
        Object.assign(dropOverlay.style, {
            position: "absolute",
            inset: "0",
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "18px",
            fontWeight: "600",
            color: "#fff",
            opacity: "0",
            pointerEvents: "none",
            transition: "opacity 0.15s ease",
            borderRadius: "16px"
        });
        panel.appendChild(dropOverlay);
        document.body.appendChild(panel);

        registerLocalSettingsPanel(panel);

        let dragDepth = 0;
        panel.addEventListener("dragenter", e => {
            e.preventDefault();
            e.stopPropagation();
            dragDepth++;
            dropOverlay.style.opacity = "1";
            panel.style.border = "1px dashed rgba(255,255,255,0.4)";
        });
        panel.addEventListener("dragover", e => {
            e.preventDefault();
            e.stopPropagation();
        });
        panel.addEventListener("dragleave", e => {
            e.preventDefault();
            e.stopPropagation();
            dragDepth--;
            if (dragDepth <= 0) {
                dropOverlay.style.opacity = "0";
                panel.style.border = "1px solid rgba(255,255,255,0.08)";
                dragDepth = 0;
            }
        });
        panel.addEventListener("drop", async e => {
            e.preventDefault();
            e.stopPropagation();
            dropOverlay.style.opacity = "0";
            panel.style.border = "1px solid rgba(255,255,255,0.08)";
            dragDepth = 0;
            const files = [...e.dataTransfer.files].filter(f => f.name.endsWith(".js"));
            if (!files.length) return;
            const plugins = getLocalPlugins();
            for (const file of files) {
                const text = await file.text();
                const name = file.name.replace(/\.js$/i, "");
                plugins.push({
                    id: "local_" + Date.now() + "_" + Math.random(),
                    name,
                    code: text,
                    enabled: false
                });
            }
            setLocalPlugins(plugins);
            renderLocalPanel(searchInput.value.toLowerCase());
        });

        let isDragging = false,
            offsetX, offsetY;
        header.addEventListener("mousedown", e => {
            isDragging = true;
            offsetX = e.clientX - panel.offsetLeft;
            offsetY = e.clientY - panel.offsetTop;
            document.body.style.userSelect = "none";
        });
        document.addEventListener("mouseup", () => {
            isDragging = false;
            document.body.style.userSelect = "";
        });
        document.addEventListener("mousemove", e => {
            if (!isDragging) return;
            panel.style.left = (e.clientX - offsetX) + "px";
            panel.style.top = (e.clientY - offsetY) + "px";
            panel.style.right = "auto";
            panel.style.bottom = "auto";
        });

        renderLocalPanel();
    }

    function renderLocalPanel(filter = "") {
        const content = document.getElementById("avia-local-plugins-content");
        if (!content) return;
        content.innerHTML = "";

        const plugins = getLocalPlugins();
        const runSnap = {
            ...runningLocalPlugins
        };
        const errSnap = {
            ...localPluginErrors
        };

        const filtered = filter ? plugins.filter(p => p.name.toLowerCase().includes(filter)) : plugins;
        const visible = [...filtered].reverse();

        if (visible.length === 0) {
            const empty = document.createElement("div");
            empty.textContent = plugins.length === 0 ? "No plugins yet. Add one above." : "No plugins match your search.";
            Object.assign(empty.style, {
                opacity: "0.4",
                fontSize: "13px",
                textAlign: "center",
                padding: "24px 0"
            });
            content.appendChild(empty);
            return;
        }

        const sectionLabel = document.createElement("div");
        sectionLabel.textContent = `Plugins: ${visible.length}`;
        Object.assign(sectionLabel.style, {
            fontSize: "11px",
            fontWeight: "700",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.35)",
            marginBottom: "10px"
        });
        content.appendChild(sectionLabel);

        const grid = document.createElement("div");
        Object.assign(grid.style, {
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: "10px"
        });

        visible.forEach((plugin) => {
            const isRunning = !!runSnap[plugin.id];
            const hasError = !!errSnap[plugin.id];

            const card = document.createElement("div");
            Object.assign(card.style, {
                background: "rgba(255,255,255,0.04)",
                border: `1px solid ${hasError ? "rgba(255,77,77,0.3)" : isRunning ? "rgba(77,255,136,0.25)" : "rgba(255,255,255,0.06)"}`,
                borderRadius: "10px",
                padding: "12px",
                display: "flex",
                flexDirection: "column",
                gap: "8px"
            });
            card.onmouseenter = () => {
                if (!hasError && !isRunning) card.style.borderColor = "rgba(255,255,255,0.13)";
            };
            card.onmouseleave = () => {
                card.style.borderColor = hasError ? "rgba(255,77,77,0.3)" : isRunning ? "rgba(77,255,136,0.25)" : "rgba(255,255,255,0.06)";
            };

            const topRow = document.createElement("div");
            Object.assign(topRow.style, {
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "8px"
            });

            const nameWrap = document.createElement("div");
            Object.assign(nameWrap.style, {
                display: "flex",
                alignItems: "center",
                gap: "7px",
                minWidth: "0",
                flex: "1"
            });

            const dot = document.createElement("div");
            Object.assign(dot.style, {
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                flexShrink: "0",
                background: hasError ? "#ff4d4d" : isRunning ? "#4dff88" : "#555",
                boxShadow: hasError ? "0 0 5px #ff4d4d" : isRunning ? "0 0 5px #4dff88" : "none"
            });

            const nameEl = document.createElement("div");
            nameEl.textContent = plugin.name;
            Object.assign(nameEl.style, {
                fontSize: "13px",
                fontWeight: "600",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap"
            });

            nameWrap.appendChild(dot);
            nameWrap.appendChild(nameEl);

            const switchWrap = document.createElement("div");
            Object.assign(switchWrap.style, {
                position: "relative",
                width: "36px",
                height: "20px",
                flexShrink: "0",
                cursor: "pointer"
            });

            const track = document.createElement("div");
            Object.assign(track.style, {
                position: "absolute",
                inset: "0",
                borderRadius: "10px",
                background: plugin.enabled ? "rgba(100,160,255,0.6)" : "rgba(255,255,255,0.15)",
                transition: "background 0.2s"
            });

            const thumb = document.createElement("div");
            Object.assign(thumb.style, {
                position: "absolute",
                top: "3px",
                left: plugin.enabled ? "19px" : "3px",
                width: "14px",
                height: "14px",
                borderRadius: "50%",
                background: "#fff",
                transition: "left 0.2s",
                pointerEvents: "none"
            });

            switchWrap.appendChild(track);
            switchWrap.appendChild(thumb);
            switchWrap.onclick = () => {
                const all = getLocalPlugins();
                const target = all.find(p => p.id === plugin.id);
                if (!target) return;
                target.enabled = !target.enabled;
                plugin.enabled = target.enabled;
                setLocalPlugins(all);
                if (target.enabled) runLocalPlugin(plugin);
                else stopLocalPlugin(plugin);
                renderLocalPanel(filter);
            };

            topRow.appendChild(nameWrap);
            topRow.appendChild(switchWrap);

            const footer = document.createElement("div");
            Object.assign(footer.style, {
                display: "flex",
                gap: "6px",
                marginTop: "auto",
                paddingTop: "2px"
            });

            const updateIconBtn = document.createElement("button");
            updateIconBtn.title = "Check for update";
            updateIconBtn.type = "button";
            Object.assign(updateIconBtn.style, {
                padding: "5px 8px",
                borderRadius: "8px",
                border: "none",
                background: "rgba(255,255,255,0.06)",
                color: "#fff",
                cursor: "pointer",
                fontSize: "12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: "0"
            });
            updateIconBtn.onmouseenter = () => updateIconBtn.style.opacity = "0.75";
            updateIconBtn.onmouseleave = () => updateIconBtn.style.opacity = "1";

            const updateIcon = document.createElement("span");
            updateIcon.className = "material-symbols-outlined";
            updateIcon.textContent = "update";
            updateIcon.style.cssText = "font-size:16px;display:block;font-variation-settings:'FILL' 0,'wght' 400,'GRAD' 0;";
            updateIconBtn.appendChild(updateIcon);
            updateIconBtn.onclick = () => checkPluginUpdate(plugin, updateIconBtn);

            const exportBtn = document.createElement("button");
            exportBtn.textContent = "Export";
            styleLocalBtn(exportBtn, "rgba(80,200,120,0.15)");
            exportBtn.title = "Download as .js file";
            exportBtn.onclick = () => exportPlugin(plugin);

            const editBtn = document.createElement("button");
            editBtn.textContent = "Edit";
            styleLocalBtn(editBtn, "rgba(100,140,255,0.2)");
            editBtn.style.flex = "1";
            editBtn.onclick = () => {
                openEditorPanel(plugin, (newCode, andRun) => {
                    const all = getLocalPlugins();
                    const target = all.find(p => p.id === plugin.id);
                    if (target) {
                        target.code = newCode;
                        plugin.code = newCode;
                        setLocalPlugins(all);
                    }
                    if (andRun) {
                        plugin.enabled = true;
                        setLocalPlugins(getLocalPlugins().map(p => p.id === plugin.id ? {
                            ...p,
                            code: newCode,
                            enabled: true
                        } : p));
                        runLocalPlugin(plugin);
                    }
                    renderLocalPanel(filter);
                });
            };

            const removeBtn = document.createElement("button");
            removeBtn.textContent = "✕";
            styleLocalBtn(removeBtn, "rgba(255,80,80,0.15)");
            removeBtn.onclick = () => {
                stopLocalPlugin(plugin);
                const editorPanel = document.getElementById("avia-local-editor-panel");
                if (editorPanel) {
                    unregisterLocalSettingsPanel(editorPanel);
                    editorPanel.remove();
                }
                const all = getLocalPlugins();
                all.splice(all.findIndex(p => p.id === plugin.id), 1);
                setLocalPlugins(all);
                renderLocalPanel(filter);
            };

            footer.appendChild(updateIconBtn);
            footer.appendChild(exportBtn);
            footer.appendChild(editBtn);
            footer.appendChild(removeBtn);

            card.appendChild(topRow);
            card.appendChild(footer);
            grid.appendChild(card);
        });

        content.appendChild(grid);
    }

    function styleLocalInput(input) {
        Object.assign(input.style, {
            padding: "6px 8px",
            borderRadius: "8px",
            border: "1px solid rgba(255,255,255,0.1)",
            background: "rgba(255,255,255,0.05)",
            color: "#fff",
            fontSize: "13px"
        });
    }

    function styleLocalBtn(btn, bg) {
        Object.assign(btn.style, {
            padding: "5px 12px",
            borderRadius: "8px",
            border: "none",
            background: bg || "rgba(255,255,255,0.08)",
            color: "#fff",
            cursor: "pointer",
            fontSize: "12px",
            whiteSpace: "nowrap"
        });
        btn.onmouseenter = () => btn.style.opacity = "0.75";
        btn.onmouseleave = () => btn.style.opacity = "1";
    }

    function registerWithAviaMenu() {
        const reg = () => window.AviaMenu && window.AviaMenu.register({
            id: "avia_plugins",
            name: "Plugins",
            icon: "extension",
            onClick: toggleLocalPanel
        });
        if (window.AviaMenu) reg();
        else {
            const iv = setInterval(() => {
                if (window.AviaMenu) {
                    clearInterval(iv);
                    reg();
                }
            }, 100);
        }
    }

    function registerWithAviaCategory() {
        const reg = () => window.AviaCategory && window.AviaCategory.register({
            id: "avia_plugins",
            name: "Plugins",
            icon: "extension_fill",
            onClick: toggleLocalPanel
        });
        if (window.AviaCategory) reg();
        else {
            const iv = setInterval(() => {
                if (window.AviaCategory) {
                    clearInterval(iv);
                    reg();
                }
            }, 100);
        }
    }

    getLocalPlugins().forEach(plugin => {
        if (plugin.enabled) runLocalPlugin(plugin);
    });
    preloadMonaco();
    registerWithAviaMenu();
    registerWithAviaCategory();

})();
