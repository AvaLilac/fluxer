(function() {

    if (window.__AVIA_OFFICIAL_REPO__) return;
    window.__AVIA_OFFICIAL_REPO__ = true;

    const OFFICIAL_REPO_URL = "https://raw.githubusercontent.com/AvaLilac/FluxerPluginsRepo/refs/heads/main/plugins.json";

    let repoContent;
    let currentRepoData = [];
    let searchInput;
    let settingsObserver = null;
    let settingsFrame = null;
    let settingsWasOpen = false;
    let observedPanel = null;

    document.getElementById("avia-official-repo-btn")?.remove();

    function injectStyles() {
        if (document.getElementById("avia-repo-styles")) return;

        const style = document.createElement("style");
        style.id = "avia-repo-styles";
        style.textContent = `
            #avia-official-repo-window * { box-sizing: border-box; }

            #avia-repo-content::-webkit-scrollbar { width: 4px; }
            #avia-repo-content::-webkit-scrollbar-track { background: transparent; }
            #avia-repo-content::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 4px; }

            .avia-repo-plugin-card {
                display: flex;
                flex-direction: column;
                gap: 6px;
                padding: 10px 12px;
                border-radius: 10px;
                background: rgba(255,255,255,0.04);
                border: 1px solid rgba(255,255,255,0.06);
                margin-bottom: 8px;
            }

            .avia-repo-card-top {
                display: flex;
                align-items: center;
                gap: 10px;
            }

            .avia-repo-meta { display: flex; flex-direction: column; gap: 4px; flex: 1; min-width: 0; }
            .avia-repo-name { font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.92); word-break: break-word; }
            .avia-repo-author-row { display: flex; align-items: center; gap: 6px; }

            .avia-repo-author-badge {
                font-size: 10px;
                font-weight: 500;
                color: rgba(255,255,255,0.5);
                background: rgba(255,255,255,0.07);
                border: 1px solid rgba(255,255,255,0.08);
                border-radius: 4px;
                padding: 1px 6px;
                white-space: nowrap;
                max-width: 200px;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            .avia-repo-desc { font-size: 11px; color: #fff; word-break: break-word; white-space: normal; line-height: 1.5; }

            .avia-repo-install-btn {
                padding: 5px 13px;
                border-radius: 7px;
                border: 1px solid rgba(255,255,255,0.12);
                background: rgba(255,255,255,0.07);
                color: rgba(255,255,255,0.85);
                font-size: 12px;
                font-weight: 500;
                cursor: pointer;
                flex-shrink: 0;
                transition: background 0.15s, opacity 0.15s;
                font-family: inherit;
                white-space: nowrap;
            }

            .avia-repo-install-btn:hover:not(:disabled) { background: rgba(255,255,255,0.13); }
            .avia-repo-install-btn:disabled { opacity: 0.4; cursor: default; }

            .avia-repo-search {
                width: 100%;
                padding: 7px 10px;
                border-radius: 8px;
                border: 1px solid rgba(255,255,255,0.1);
                outline: none;
                background: rgba(255,255,255,0.05);
                color: #fff;
                font-size: 12px;
                font-family: inherit;
                transition: border-color 0.15s, background 0.15s;
            }

            .avia-repo-search::placeholder { color: rgba(255,255,255,0.3); }

            .avia-repo-search:focus {
                border-color: rgba(255,255,255,0.2);
                background: rgba(255,255,255,0.07);
            }

            .avia-repo-count {
                font-size: 10px;
                font-weight: 500;
                color: rgba(255,255,255,0.35);
                background: rgba(255,255,255,0.06);
                border-radius: 4px;
                padding: 1px 6px;
                margin-left: 4px;
                vertical-align: middle;
            }

            .avia-repo-btn-group { display: flex; flex-direction: row; gap: 6px; flex-shrink: 0; align-items: flex-start; }

            .avia-repo-empty {
                opacity: 0.35;
                text-align: center;
                margin-top: 40px;
                font-size: 13px;
                color: rgba(255,255,255,0.8);
            }
        `;

        document.head.appendChild(style);
    }

    const LOCAL_STORAGE_KEY = "avia_local_plugins";

    const getLocalPlugins = () => JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || "[]");
    const setLocalPlugins = (data) => localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));

    function isInstalledLocally(name) {
        return getLocalPlugins().some(p => p.name === name);
    }

    function rawUrlFromLink(link) {
        try {
            const u = new URL(link);

            if (u.hostname === "github.com") {
                const m = u.pathname.match(/^\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+)$/);

                if (m) {
                    return `https://raw.githubusercontent.com/${m[1]}/${m[2]}/${m[3]}/${m[4]}`;
                }

                return link;
            }

            if (u.hostname === "raw.githubusercontent.com") return link;

            if (u.hostname === "raw.codeberg.page") return link;

            if (u.hostname === "codeberg.org") {
                if (u.pathname.startsWith("/api/v1/repos/")) return link;

                const parts = u.pathname.split("/").filter(Boolean);

                if (parts.length >= 5 && (parts[2] === "raw" || parts[2] === "src")) {
                    const user = parts[0];
                    const repo = parts[1];

                    const branchName = parts[3] === "branch" || parts[3] === "commit" || parts[3] === "tag" ?
                        parts[4] :
                        parts[3];

                    const fileStart = parts[3] === "branch" || parts[3] === "commit" || parts[3] === "tag" ?
                        5 :
                        4;

                    const filePath = parts.slice(fileStart).join("/");

                    return `https://codeberg.org/api/v1/repos/${user}/${repo}/raw/${filePath}?ref=${branchName}`;
                }

                if (parts.length >= 4 && parts[2] === "raw") {
                    const user = parts[0];
                    const repo = parts[1];
                    const branchName = parts[3];
                    const filePath = parts.slice(4).join("/");

                    return `https://codeberg.org/api/v1/repos/${user}/${repo}/raw/${filePath}?ref=${branchName}`;
                }

                if (parts.length >= 5 && parts[2] === "src" && parts[3] === "branch") {
                    const user = parts[0];
                    const repo = parts[1];
                    const branch = parts[4];
                    const filePath = parts.slice(5).join("/");

                    return `https://codeberg.org/api/v1/repos/${user}/${repo}/raw/${filePath}?ref=${branch}`;
                }
            }
        } catch (_) {}

        return link;
    }

    async function installToLocal(plugin, btn) {
        btn.disabled = true;
        btn.textContent = "Fetching…";

        const rawUrl = rawUrlFromLink(plugin.link);

        try {
            const res = await fetch(rawUrl);

            if (!res.ok) throw new Error("HTTP " + res.status);

            const code = await res.text();

            const locals = getLocalPlugins();

            if (locals.some(p => p.name === plugin.name)) {
                btn.textContent = "In Local";
                return;
            }

            locals.push({
                id: "local_" + Date.now() + "_" + Math.random().toString(36).slice(2),
                name: plugin.name,
                code,
                enabled: false
            });

            setLocalPlugins(locals);

            window.dispatchEvent(new Event("avia-local-plugin-list-changed"));

            btn.textContent = "Installed";
        } catch (e) {
            btn.disabled = false;
            btn.textContent = "Local ✕";

            setTimeout(() => {
                btn.textContent = "Install";
                btn.disabled = false;
            }, 2000);
        }
    }

    function updateInstallStates() {
        if (!repoContent) return;

        repoContent.querySelectorAll("[data-name]").forEach(card => {
            const name = card.getAttribute("data-name");
            const localBtn = card.querySelector("button.local-install-btn");

            if (localBtn) {
                if (isInstalledLocally(name)) {
                    localBtn.textContent = "Installed";
                    localBtn.disabled = true;
                } else {
                    localBtn.textContent = "Install";
                    localBtn.disabled = false;
                }
            }
        });
    }

    function renderRepo(data, filter = "") {
        if (!repoContent) return;

        currentRepoData = data.plugins;
        repoContent.innerHTML = "";

        const filtered = [...currentRepoData].filter(p =>
            (p.name + " " + (p.author || "") + " " + (p.description || ""))
            .toLowerCase().includes(filter.toLowerCase())
        ).reverse();

        if (filtered.length === 0) {
            repoContent.innerHTML = `<div class="avia-repo-empty">No plugins found.</div>`;
            return;
        }

        filtered.forEach(repoPlugin => {
            const card = document.createElement("div");
            card.className = "avia-repo-plugin-card";
            card.setAttribute("data-name", repoPlugin.name);

            const topRow = document.createElement("div");
            topRow.style.cssText = "display:flex;align-items:flex-start;gap:10px;";

            const nameMeta = document.createElement("div");
            nameMeta.style.cssText = "display:flex;flex-direction:column;gap:4px;flex:1;min-width:0;";

            const name = document.createElement("div");
            name.className = "avia-repo-name";
            name.textContent = repoPlugin.name;

            const authorRow = document.createElement("div");
            authorRow.className = "avia-repo-author-row";

            const authorBadge = document.createElement("span");
            authorBadge.className = "avia-repo-author-badge";
            authorBadge.textContent = repoPlugin.author || "Unknown";

            authorRow.appendChild(authorBadge);

            nameMeta.appendChild(name);
            nameMeta.appendChild(authorRow);

            const btnGroup = document.createElement("div");
            btnGroup.className = "avia-repo-btn-group";

            const localBtn = document.createElement("button");
            localBtn.className = "avia-repo-install-btn local-install-btn";
            localBtn.textContent = "Install";
            localBtn.onclick = () => installToLocal(repoPlugin, localBtn);

            btnGroup.appendChild(localBtn);

            topRow.appendChild(nameMeta);
            topRow.appendChild(btnGroup);

            card.appendChild(topRow);

            if (repoPlugin.description) {
                const desc = document.createElement("div");
                desc.className = "avia-repo-desc";
                desc.textContent = repoPlugin.description;
                card.appendChild(desc);
            }

            repoContent.appendChild(card);
        });

        updateInstallStates();
    }

    function refetchPlugins() {
        if (!repoContent) return;

        repoContent.innerHTML = `<div class="avia-repo-empty">Loading plugins…</div>`;

        function electronFetch() {
            try {
                const https = require("https");

                https.get(OFFICIAL_REPO_URL, res => {
                    let data = "";

                    res.on("data", chunk => data += chunk);
                    res.on("end", () => renderRepo(JSON.parse(data)));
                }).on("error", () => {
                    repoContent.innerHTML = `<div class="avia-repo-empty">Failed to fetch plugins.</div>`;
                });
            } catch {
                repoContent.innerHTML = `<div class="avia-repo-empty">Failed to fetch plugins.</div>`;
            }
        }

        try {
            fetch(OFFICIAL_REPO_URL)
                .then(res => res.json())
                .then(data => renderRepo(data))
                .catch(() => electronFetch());
        } catch {
            electronFetch();
        }
    }

    function stopSettingsObserver() {
        if (settingsObserver) {
            settingsObserver.disconnect();
            settingsObserver = null;
        }

        if (settingsFrame !== null) {
            cancelAnimationFrame(settingsFrame);
            settingsFrame = null;
        }

        settingsWasOpen = false;
        observedPanel = null;
    }

    function startSettingsObserver(panel) {
        if (observedPanel === panel && settingsObserver) return;

        stopSettingsObserver();

        const SETTINGS_SELECTOR = '[data-flx="user.user-settings-modal.modal-root"]';
        let framePending = false;

        observedPanel = panel;

        function nodeContainsSettingsModal(node) {
            if (!node || node.nodeType !== Node.ELEMENT_NODE) return false;

            return node.matches(SETTINGS_SELECTOR) || !!node.querySelector(SETTINGS_SELECTOR);
        }

        function checkSettingsModal() {
            settingsFrame = null;
            framePending = false;

            if (!panel.isConnected || panel.style.display === "none") {
                stopSettingsObserver();
                return;
            }

            const settingsModal = document.querySelector(SETTINGS_SELECTOR);

            const modalIsOpen = settingsModal &&
                settingsModal.getAttribute("aria-hidden") !== "true" &&
                getComputedStyle(settingsModal).display !== "none" &&
                getComputedStyle(settingsModal).visibility !== "hidden";

            if (!modalIsOpen) {
                settingsWasOpen = false;
                return;
            }

            if (settingsWasOpen) return;

            settingsWasOpen = true;

            const content = panel.querySelector("#avia-repo-content");
            const scrollTop = content ? content.scrollTop : 0;
            const scrollLeft = content ? content.scrollLeft : 0;
            const activeElement = panel.contains(document.activeElement) ? document.activeElement : null;
            const selectionStart = activeElement && typeof activeElement.selectionStart === "number" ?
                activeElement.selectionStart :
                null;
            const selectionEnd = activeElement && typeof activeElement.selectionEnd === "number" ?
                activeElement.selectionEnd :
                null;

            if (panel.parentElement !== document.body || document.body.lastElementChild !== panel) {
                document.body.appendChild(panel);
            }

            panel.removeAttribute("inert");
            panel.inert = false;

            if (panel.getAttribute("aria-hidden") === "true") {
                panel.removeAttribute("aria-hidden");
            }

            panel.style.zIndex = "2147483647";
            panel.style.pointerEvents = "auto";

            panel.querySelectorAll("input, button, textarea, select").forEach(element => {
                element.removeAttribute("inert");
                element.inert = false;
            });

            if (content) {
                content.scrollTop = scrollTop;
                content.scrollLeft = scrollLeft;

                requestAnimationFrame(() => {
                    if (!content.isConnected || panel.style.display === "none") return;

                    content.scrollTop = scrollTop;
                    content.scrollLeft = scrollLeft;

                    if (activeElement && activeElement.isConnected) {
                        activeElement.focus({
                            preventScroll: true
                        });

                        if (selectionStart !== null && selectionEnd !== null) {
                            activeElement.setSelectionRange(selectionStart, selectionEnd);
                        }
                    }
                });
            }
        }

        function scheduleCheck() {
            if (framePending) return;

            framePending = true;
            settingsFrame = requestAnimationFrame(checkSettingsModal);
        }

        settingsObserver = new MutationObserver(records => {
            if (!panel.isConnected || panel.style.display === "none") {
                stopSettingsObserver();
                return;
            }

            const relevantChange = records.some(record => {
                if (record.target === panel || panel.contains(record.target)) {
                    return false;
                }

                if (record.type === "childList") {
                    const changedNodes = [
                        ...record.addedNodes,
                        ...record.removedNodes
                    ];

                    return changedNodes.some(node => {
                        if (node === panel || panel.contains(node)) return false;
                        return nodeContainsSettingsModal(node);
                    });
                }

                if (record.type === "attributes") {
                    const target = record.target;

                    return target.nodeType === Node.ELEMENT_NODE &&
                        (
                            target.matches(SETTINGS_SELECTOR) ||
                            !!target.closest(SETTINGS_SELECTOR)
                        );
                }

                return false;
            });

            if (relevantChange) {
                scheduleCheck();
            }
        });

        settingsObserver.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ["aria-hidden", "inert", "class", "style"]
        });

        scheduleCheck();
    }

    function openWindow() {
        let panel = document.getElementById("avia-official-repo-window");

        if (panel) {
            const isHidden = panel.style.display === "none";

            panel.style.display = isHidden ? "flex" : "none";

            if (isHidden) {
                startSettingsObserver(panel);
            } else {
                stopSettingsObserver();
            }

            return;
        }

        injectStyles();

        panel = document.createElement("div");
        panel.id = "avia-official-repo-window";

        Object.assign(panel.style, {
            position: "fixed",
            bottom: "24px",
            right: "40px",
            width: "420px",
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
            padding: "13px 16px",
            fontWeight: "600",
            fontSize: "14px",
            background: "var(--md-sys-color-surface-container, rgba(255,255,255,0.04))",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            cursor: "move",
            position: "relative",
            textAlign: "center",
            userSelect: "none",
            flexShrink: "0"
        });

        header.textContent = "Plugins Repo";

        const close = document.createElement("div");
        close.textContent = "✕";

        Object.assign(close.style, {
            position: "absolute",
            right: "14px",
            top: "50%",
            transform: "translateY(-50%)",
            cursor: "pointer",
            opacity: "0.5",
            fontSize: "13px",
            lineHeight: "1"
        });

        close.onmouseenter = () => close.style.opacity = "1";
        close.onmouseleave = () => close.style.opacity = "0.5";
        close.onclick = () => {
            panel.style.display = "none";
            stopSettingsObserver();
        };

        header.appendChild(close);

        let isDragging = false;
        let offsetX = 0;
        let offsetY = 0;

        header.addEventListener("mousedown", e => {
            isDragging = true;

            const rect = panel.getBoundingClientRect();

            offsetX = e.clientX - rect.left;
            offsetY = e.clientY - rect.top;

            panel.style.bottom = "auto";
            panel.style.right = "auto";
            panel.style.left = rect.left + "px";
            panel.style.top = rect.top + "px";

            document.body.style.userSelect = "none";
        });

        document.addEventListener("mousemove", e => {
            if (!isDragging) return;

            panel.style.left = e.clientX - offsetX + "px";
            panel.style.top = e.clientY - offsetY + "px";
        });

        document.addEventListener("mouseup", () => {
            isDragging = false;
            document.body.style.userSelect = "";
        });

        const searchWrap = document.createElement("div");

        Object.assign(searchWrap.style, {
            padding: "10px 12px",
            flexShrink: "0",
            borderBottom: "1px solid rgba(255,255,255,0.06)"
        });

        searchInput = document.createElement("input");
        searchInput.className = "avia-repo-search";
        searchInput.placeholder = "Search plugins or authors or descriptions…";

        searchInput.addEventListener("input", () => {
            renderRepo({
                plugins: currentRepoData
            }, searchInput.value);
        });

        searchWrap.appendChild(searchInput);

        repoContent = document.createElement("div");
        repoContent.id = "avia-repo-content";

        Object.assign(repoContent.style, {
            flex: "1",
            overflowY: "auto",
            overflowX: "hidden",
            padding: "10px 12px 12px"
        });

        panel.appendChild(header);
        panel.appendChild(searchWrap);
        panel.appendChild(repoContent);

        document.body.appendChild(panel);

        refetchPlugins();
        startSettingsObserver(panel);
    }

    function registerWithAviaCategory() {
        if (window.AviaCategory) {
            window.AviaCategory.register({
                id: "avia_official_repo",
                name: "Plugins Repo",
                icon: "palette",
                onClick: openWindow
            });
        } else {
            const interval = setInterval(() => {
                if (window.AviaCategory) {
                    clearInterval(interval);

                    window.AviaCategory.register({
                        id: "avia_official_repo",
                        name: "Plugins Repo",
                        icon: "palette",
                        onClick: openWindow
                    });
                }
            }, 100);
        }
    }

    function registerWithAviaMenu() {
        if (window.AviaMenu) {
            window.AviaMenu.register({
                id: "avia_official_repo",
                name: "Plugins Repo",
                icon: "palette",
                onClick: openWindow
            });
        } else {
            const interval = setInterval(() => {
                if (window.AviaMenu) {
                    clearInterval(interval);

                    window.AviaMenu.register({
                        id: "avia_official_repo",
                        name: "Plugins Repo",
                        icon: "palette",
                        onClick: openWindow
                    });
                }
            }, 100);
        }
    }

    window.addEventListener("avia-local-plugin-list-changed", () => {
        if (document.getElementById("avia-official-repo-window")) {
            updateInstallStates();
        }
    });

    registerWithAviaCategory();
    registerWithAviaMenu();

})();
