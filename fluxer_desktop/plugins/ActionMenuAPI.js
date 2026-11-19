(function () {

    if (window.__AVIA_ACTION_MENU__) return;
    window.__AVIA_ACTION_MENU__ = true;

    const actionMenuRegisteredItems = [];
    // Consts exist here because i am TIRED OF HARDCODING SHIT. This will allow me to more easily maintain it. dont get fussy
    const SEL_ACTION_BAR = '[data-flx="channel.message-action-bar.message-action-bar-core.action-bar"]';
    const SEL_MESSAGE = '[role="article"][data-message-id]';
    const SEL_MORE_ICON = 'svg[data-flx*="more-icon"]';
    const SEL_DELETE_ICON = 'svg[data-flx*="delete-icon"]';
    const SEL_DANGER = '[class*="MessageActionBar.module__danger"]';

    const ID_ATTR = "data-avia-action-id";
    const DEFAULT_VIEWBOX = "0 0 24 24";

    const TT_CHILD_STYLE = `
  --tooltip-active-surface: var(--tooltip-surface);
  --tooltip-active-border-color: var(--tooltip-border-color);
  transform-origin: 50% 100%;
  --tooltip-surface: var(--settings-surface-background,var(--form-surface-background));
  --tooltip-border-width: .0625rem;
  --tooltip-border-color: var(--settings-border-color,var(--background-modifier-accent));
  --tooltip-shadow: 0 .5rem 1rem rgba(0,0,0,.22);
  --tooltip-pointer-surface: var(--tooltip-active-surface);
  --tooltip-pointer-border: var(--tooltip-active-border-color);
  --tooltip-pointer-size: .625rem;
  --tooltip-pointer-half-size: calc(var(--tooltip-pointer-size) / 2);
  z-index: var(--z-index-tooltip);
  pointer-events: none;
  box-sizing: border-box;
  border: var(--tooltip-border-width) solid var(--tooltip-active-border-color);
  background: var(--tooltip-active-surface);
  color: var(--text-primary);
  word-wrap: break-word;
  box-shadow: var(--tooltip-shadow);
  border-radius: .5rem;
  font-size: .8125rem;
  font-weight: 500;
  line-height: 1.125rem;
  position: relative;
  max-width: 21.875rem;
`;

    const TT_POINTER_1_STYLE = `
  -webkit-clip-path: polygon(100% 0,100% 100%,0 100%);
  clip-path: polygon(100% 0,100% 100%,0 100%);
  box-sizing: border-box;
  width: var(--tooltip-pointer-size);
  height: var(--tooltip-pointer-size);
  background: var(--tooltip-pointer-border);
  border: 0;
  display: block;
  transform: rotate(45deg);
  top: calc(100% - var(--tooltip-pointer-half-size));
  margin-left: calc(-1 * var(--tooltip-pointer-half-size));
  position: absolute;
  left: 50%;
  pointer-events: none;
`;

    const TT_POINTER_2_STYLE = `
  top: calc(100% - var(--tooltip-pointer-half-size));
  margin-left: calc(-1 * var(--tooltip-pointer-half-size));
  position: absolute;
  left: 50%;
  pointer-events: none;
`;

    const TT_CONTENT_STYLE = `
  white-space: normal;
  word-break: break-word;
  text-align: center;
  padding: .4375rem .625rem;
  overflow: hidden;
`;

    const TT_ROOT_ID = "avia-action-menu-tooltip-root";
    let ttAnchor = null;
    let ttWatch = null;

    function hideTooltip() {
        if (ttWatch) {
            clearInterval(ttWatch);
            ttWatch = null;
        }
        ttAnchor = null;
        document.getElementById(TT_ROOT_ID)?.remove();
    }

    function showTooltip(text, anchor) {
        hideTooltip();

        const root = document.createElement("div");
        root.id = TT_ROOT_ID;
        root.style.cssText = `
        pointer-events: none;
        z-index: var(--z-index-tooltip);
        background: 0 0;
        position: fixed;
        top: 0; bottom: 0; left: 0; right: 0;
    `;

        root.innerHTML = `
      <div data-floating-ui-portal="">
        <div role="tooltip" data-avia-tooltip="true" style="position: fixed; left: 0px; top: 0px; z-index: var(--z-index-tooltip); visibility: hidden; opacity: 1; transform: none;">
          <div style="${TT_CHILD_STYLE}">
            <div data-avia-tt="p1" style="${TT_POINTER_1_STYLE}"></div>
            <div data-avia-tt="p2" style="${TT_POINTER_2_STYLE}"></div>
            <div data-avia-tt="content" style="${TT_CONTENT_STYLE}"></div>
          </div>
        </div>
      </div>
    `;

        root.querySelector('[data-avia-tt="content"]').textContent = text;
        document.body.appendChild(root);

        const tooltip = root.querySelector('[data-avia-tooltip]');
        const p1 = root.querySelector('[data-avia-tt="p1"]');
        const p2 = root.querySelector('[data-avia-tt="p2"]');

        const rect = anchor.getBoundingClientRect();
        const w = tooltip.offsetWidth;
        const h = tooltip.offsetHeight;

        const left = Math.max(8, Math.min(
            rect.left + rect.width / 2 - w / 2,
            window.innerWidth - w - 8
        ));

        tooltip.style.left = `${left}px`;
        tooltip.style.top = `${rect.top - h - 8}px`;
        tooltip.style.visibility = "visible";

        const pointerLeft = rect.left + rect.width / 2 - left;
        p1.style.left = `${pointerLeft}px`;
        p2.style.left = `${pointerLeft}px`;

        ttAnchor = anchor;
        ttWatch = setInterval(() => {
            const r = ttAnchor?.getBoundingClientRect();
            if (!ttAnchor || !ttAnchor.isConnected || !r || (r.width === 0 && r.height === 0)) {
                hideTooltip();
            }
        }, 150);
    }

    window.addEventListener("blur", hideTooltip);
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") hideTooltip();
    });

    function isOurs(el) {
        return el.hasAttribute(ID_ATTR);
    }

    function isDangerButton(el) {
        return el.matches(SEL_DANGER) || !!el.querySelector(SEL_DELETE_ICON);
    }

    function findRefButton(bar) {
        const more = [...bar.querySelectorAll(SEL_MORE_ICON)]
            .map(icon => icon.closest("button"))
            .find(b => b && !isOurs(b) && !isDangerButton(b));

        if (more) return more;

        const buttons = [...bar.querySelectorAll(":scope > button")].reverse();

        return buttons.find(b => !isOurs(b) && b.querySelector("svg") && !isDangerButton(b)) || null;
    }

    function findInsertAnchor(bar) {
        return [...bar.children].find(
            el => !isOurs(el) && (el.querySelector(SEL_MORE_ICON) || isDangerButton(el))
        ) || null;
    }

    function buildButton(item, template) {
        const button = template.cloneNode(true);

        button.removeAttribute("id");
        button.removeAttribute("disabled");
        button.removeAttribute("data-action");
        button.removeAttribute("data-flx");

        button.setAttribute(ID_ATTR, item.id);
        button.setAttribute("aria-label", item.name);

        const svg = button.querySelector("svg");

        if (svg) {
            if (item.svg) {
                svg.setAttribute("viewBox", item.viewBox || DEFAULT_VIEWBOX);
                svg.removeAttribute("class");

                const path = document.createElementNS("http://www.w3.org/2000/svg", "path");

                path.setAttribute("d", item.svg);
                svg.replaceChildren(path);
            } else if (item.icon) {
                const filled = item.icon.endsWith("_fill");

                let size = "1.25rem";

                const templateSvg = template.querySelector("svg");

                if (templateSvg) {
                    const rect = templateSvg.getBoundingClientRect();

                    if (rect.width > 0) {
                        size = rect.width + "px";
                    }
                }

                const iconSpan = document.createElement("span");

                iconSpan.className = "material-symbols-outlined";

                iconSpan.textContent = filled
                    ? item.icon.slice(0, -5)
                    : item.icon;

                iconSpan.style.cssText =
                    "flex-shrink:0;display:block;" +
                    "font-variation-settings:'FILL' " +
                    (filled ? "1" : "0") +
                    ",'wght' 400,'GRAD' 0;" +
                    "font-size:" + size + ";" +
                    "width:" + size + ";height:" + size + ";" +
                    "line-height:1;";

                svg.replaceWith(iconSpan);
            } else {
                svg.remove();
            }
        }

        button.addEventListener("click", event => {
            event.stopPropagation();
            event.preventDefault();

            hideTooltip();

            const bar = button.closest(SEL_ACTION_BAR);
            const message = bar ? bar.closest(SEL_MESSAGE) : null;

            try {
                item.onClick({
                    event,
                    button,
                    bar,
                    message,
                    messageId: message ? message.getAttribute("data-message-id") : null
                });
            } catch (error) {
                console.error("[AviaActionMenu]", error);
            }
        });

        button.addEventListener("mouseenter", () => showTooltip(item.name, button));
        button.addEventListener("mouseleave", hideTooltip);

        return button;
    }

    function renderBar(bar) {
        let template;

        const getTemplate = () => {
            if (template === undefined) {
                template = findRefButton(bar);
            }

            return template;
        };

        let next = findInsertAnchor(bar);

        for (let i = actionMenuRegisteredItems.length - 1; i >= 0; i--) {
            const item = actionMenuRegisteredItems[i];

            let button = bar.querySelector(
                `:scope > [${ID_ATTR}="${CSS.escape(item.id)}"]`
            );

            if (!button) {
                const ref = getTemplate();

                if (!ref) continue;

                button = buildButton(item, ref);
            }

            if (next) {
                if (button.nextElementSibling !== next) {
                    next.before(button);
                }
            } else if (bar.lastElementChild !== button) {
                bar.appendChild(button);
            }

            next = button;
        }
    }

    function injectAll() {
        if (ttAnchor && !ttAnchor.isConnected) hideTooltip();

        if (!actionMenuRegisteredItems.length) return;

        document.querySelectorAll(SEL_ACTION_BAR).forEach(renderBar);
    }

    function removeButtons(id) {
        document
            .querySelectorAll(`[${ID_ATTR}="${CSS.escape(id)}"]`)
            .forEach(button => button.remove());
    }

    window.AviaActionMenu = {
        register(item) {
            if (!item || typeof item !== "object") {
                console.error(
                    "[AviaActionMenu] register: item must be an object, got",
                    typeof item
                );
                return;
            }

            if (typeof item.id !== "string" || !item.id.trim()) {
                console.error(
                    "[AviaActionMenu] register: item.id must be a non-empty string, got",
                    item.id
                );
                return;
            }

            if (typeof item.name !== "string" || !item.name.trim()) {
                console.error(
                    "[AviaActionMenu] register: item.name must be a non-empty string, got",
                    item.name
                );
                return;
            }

            if (typeof item.onClick !== "function") {
                console.error(
                    "[AviaActionMenu] register: item.onClick must be a function, got",
                    typeof item.onClick
                );
                return;
            }

            const id = item.id.trim();

            if (actionMenuRegisteredItems.some(i => i.id === id)) {
                console.error(
                    "[AviaActionMenu] register: id '%s' is already registered",
                    id
                );
                return;
            }

            actionMenuRegisteredItems.push({
                id,
                name: item.name,
                icon:
                    typeof item.icon === "string" && item.icon.trim()
                        ? item.icon.trim()
                        : null,
                svg:
                    typeof item.svg === "string" && item.svg.trim()
                        ? item.svg.trim()
                        : null,
                viewBox:
                    typeof item.viewBox === "string" && item.viewBox.trim()
                        ? item.viewBox.trim()
                        : null,
                onClick: item.onClick
            });

            injectAll();
        },

        unregister(item) {
            if (!item || typeof item.id !== "string") {
                return;
            }

            const id = item.id.trim();

            const index = actionMenuRegisteredItems.findIndex(
                i => i.id === id
            );

            if (index === -1) {
                return;
            }

            actionMenuRegisteredItems.splice(index, 1);

            hideTooltip();

            removeButtons(id);
        },

        update(item) {
            if (!item || typeof item.id !== "string") {
                console.error(
                    "[AviaActionMenu] update: item.id must be a string, got",
                    item && item.id
                );
                return;
            }

            const id = item.id.trim();

            const registered = actionMenuRegisteredItems.find(
                i => i.id === id
            );

            if (!registered) {
                console.error(
                    "[AviaActionMenu] update: id '%s' is not registered",
                    id
                );
                return;
            }

            const hasName = "name" in item;
            const hasIcon = "icon" in item;
            const hasSvg = "svg" in item;
            const hasViewBox = "viewBox" in item;

            if (hasName && (typeof item.name !== "string" || !item.name.trim())) {
                console.error(
                    "[AviaActionMenu] update: item.name must be a non-empty string, got",
                    item.name
                );
                return;
            }

            if (hasName) {
                registered.name = item.name;
            }

            if (hasIcon) {
                registered.icon =
                    typeof item.icon === "string" && item.icon.trim()
                        ? item.icon.trim()
                        : null;

                if (registered.icon) {
                    registered.svg = null;
                }
            }

            if (hasSvg) {
                registered.svg =
                    typeof item.svg === "string" && item.svg.trim()
                        ? item.svg.trim()
                        : null;

                if (registered.svg) {
                    registered.icon = null;
                }
            }

            if (hasViewBox) {
                registered.viewBox =
                    typeof item.viewBox === "string" && item.viewBox.trim()
                        ? item.viewBox.trim()
                        : null;
            }

            hideTooltip();

            removeButtons(id);

            injectAll();
        }
    };

    let injectScheduled = false;

    function scheduleInject() {
        if (injectScheduled) return;

        injectScheduled = true;

        requestAnimationFrame(() => {
            injectScheduled = false;
            injectAll();
        });
    }

    new MutationObserver(scheduleInject).observe(document.body, {
        childList: true,
        subtree: true
    });

    injectAll();

})();
