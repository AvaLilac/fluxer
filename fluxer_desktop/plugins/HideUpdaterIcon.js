(function() {
    if (window.__HIDE_UPDATER_ICON__) return;
    window.__HIDE_UPDATER_ICON__ = true;

    const style = document.createElement("style");
    style.id = "avia-hide-updater-icon";
    style.textContent = `
        button[data-flx="channel.channel-header-components.updater-icon.button.click"]:has(svg path[d^="M228,144v64a12,12,0,0,1-12,12H40a12,12,0,0,1-12-12V144"]) {
            display: none !important;
        }
    `;
    document.head.appendChild(style);
})();
