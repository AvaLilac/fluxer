(function() {
    if (typeof window.AviaMenu?.submenuregister == 'function') {
        let mybackendicon = ''
        let aviabackendicon = ''
        let enabledicon = ``

        function updateIcons() {
            if (localStorage.getItem('fluxerbadges-backendurl') == 'https://codeberg.org/api/v1/repos/0simp/FluxerBadgesBackend/raw/backend/FluxerBadgesBackend.json?ref=main') {
                mybackendicon = 'check_circle'
                aviabackendicon = 'x_circle'
            } else {
                mybackendicon = 'x_circle'
                aviabackendicon = 'check_circle'
            }

            if (localStorage.getItem('fluxerbadges-enabled') == 'false') {
                enabledicon = 'x_circle'
            } else {
                enabledicon = 'check_circle'
            }
        }
        updateIcons()

        function setBackend0simp() {
            localStorage.setItem('fluxerbadges-backendurl', 'https://codeberg.org/api/v1/repos/0simp/FluxerBadgesBackend/raw/backend/FluxerBadgesBackend.json?ref=main')
            updateIcons()
            window.AviaMenu.updatesubmenu({
                parent: 'fluxerbadges-setbackend',
                id: 'fluxerbadges-0simpbackend',
                name: '0simp\'s backend',
                onClick: setBackend0simp,
                icon: mybackendicon
            })
            window.AviaMenu.updatesubmenu({
                parent: 'fluxerbadges-setbackend',
                id: 'fluxerbadges-aviabackend',
                name: 'Avia Client\'s backend',
                onClick: setBackendAvia,
                icon: aviabackendicon
            })
        }

        function setBackendAvia() {
            localStorage.setItem('fluxerbadges-backendurl', 'https://raw.githubusercontent.com/AvaLilac/FluxerBadges/refs/heads/main/badges.json')
            updateIcons()
            window.AviaMenu.updatesubmenu({
                parent: 'fluxerbadges-setbackend',
                id: 'fluxerbadges-0simpbackend',
                name: '0simp\'s backend',
                onClick: setBackend0simp,
                icon: mybackendicon
            })
            window.AviaMenu.updatesubmenu({
                parent: 'fluxerbadges-setbackend',
                id: 'fluxerbadges-aviabackend',
                name: 'Avia Client\'s backend',
                onClick: setBackendAvia,
                icon: aviabackendicon
            })
        }

        function setEnabled() {
            enabled = !enabled
            localStorage.setItem(`fluxerbadges-enabled`, `${enabled}`)
            updateIcons()
            window.AviaMenu.updatesubmenu({
                parent: `fluxerbadges`,
                id: `fluxerbadges-toggle`,
                name: `Fluxerbadges`,
                onclick: setEnabled,
                icon: enabledicon
            })
        }

        window.AviaMenu.submenuregister({
            id: 'fluxerbadges-setbackend',
            name: 'Set fluxer badges backend'
        })
        window.AviaMenu.submenu({
            parent: 'fluxerbadges-setbackend',
            id: 'fluxerbadges-0simpbackend',
            name: '0simp\'s backend',
            onClick: setBackend0simp,
            icon: mybackendicon
        })
        window.AviaMenu.submenu({
            parent: 'fluxerbadges-setbackend',
            id: 'fluxerbadges-aviabackend',
            name: 'Avia Client\'s backend',
            onClick: setBackendAvia,
            icon: aviabackendicon
        })
        window.AviaMenu.submenuregister({
            id: `fluxerbadges`,
            name: `Fluxerbadges`
        })
        window.AviaMenu.submenu({
            parent: 'fluxerbadges',
            id: `fluxerbadges-toggle`,
            name: `Fluxerbadges`,
            onClick: setEnabled,
            icon: enabledicon
        })
    }

    let enabled = localStorage.getItem('fluxerbadges-enabled') ?? 'true'
    enabled = enabled == 'true'
    if (!enabled) {
        console.log(`Fluxer badges is disabled`)
        return;
    }

    if (window.__FLUXER_BADGES__) return;
    window.__FLUXER_BADGES__ = true;

    let BACKENDURL = localStorage.getItem('fluxerbadges-backendurl') ?? 'https://raw.githubusercontent.com/AvaLilac/FluxerBadges/refs/heads/main/badges.json';
    const PREVIEW_ENDPOINT = "/api/v1/users/@me/profile-badges/preview";
    const PROFILE_ENDPOINT = /\/api\/v1\/users\/\d+\/profile(?:\?|$)/;

    const prototype = XMLHttpRequest.prototype;
    const originalOpen = prototype.open;
    const originalSend = prototype.send;

    const responseTextDescriptor = Object.getOwnPropertyDescriptor(prototype, "responseText");
    const responseDescriptor = Object.getOwnPropertyDescriptor(prototype, "response");

    function emojiToHtmlEntityHex(str) {
        return [...str].map(char => {
            const codePoint = char.codePointAt(0);
            return codePoint ? `&#x${codePoint.toString(16).toUpperCase()};` : char;
        }).join('');
    }

    const badgesPromise = fetch(BACKENDURL)
        .then(response => {
            if (!response.ok) throw new Error(`API returned ${response.status}`);
            return response.json();
        })
        .then(data => {
            if (!data.badges && !data[0]) throw new Error("Badge file has no content");
            let badges;
            if (data.badges) {
                badges = data.badges
            } else {
                badges = data
            }

            return Array.isArray(badges) ? badges : [];
        })
        .catch(error => {
            console.error("[Fluxer Badges] Failed to load badges:", error);
            return [];
        });

    const getBadgeKey = (name) => {
        return String(name)
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "_")
            .replace(/^_+|_+$/g, "");
    };

    const modifyResponse = (data, badges, userId) => {
        if (!data || typeof data !== "object") return data;

        if (!Array.isArray(data.profile_badges)) {
            data.profile_badges = [];
        }

        if (!Array.isArray(data.own_badges)) {
            data.own_badges = [];
        }

        const userBadges = badges.filter(badge =>
            Array.isArray(badge.users) &&
            badge.users.some(id => String(id) === String(userId))
        );

        for (const badge of userBadges) {
            if (!badge.name && !badge.text) continue;

            const key = `custom_${getBadgeKey(badge.name??badge.text)}`;
            let text = badge.name ?? badge.text
            let customEmoji;
            let icon;
            if (/^<:([a-zA-Z0-9_]+):(\d{19})>$/.exec(badge.icon)) {
                customEmoji = /^<:([a-zA-Z0-9_]+):(\d{19})>$/.exec(badge.icon || "");
            } else {
                icon = badge.icon
                if (!icon.startsWith('https')) {
                    let htmlEntityHex = emojiToHtmlEntityHex(`${icon}`).toLowerCase().replace('&#x', '').replace(';', '')
                    if (htmlEntityHex.includes('&')) htmlEntityHex = htmlEntityHex.substring(0, htmlEntityHex.indexOf('&'))
                    icon = `https://fluxerstatic.com/emoji/${htmlEntityHex}.svg?v=2`
                }
            }

            const description = badge.Descriptions ?? badge.Description;

            const customBadge = {
                key,
                kind: "custom",
                label: text,
                asset: null,
                asset_url: customEmoji ?
                    `https://fluxerusercontent.com/emojis/${customEmoji[2]}.webp` : icon,
                aspect_ratio: null,
                caption: null,
                href: null,
                details: description == null ? null : {
                    title: text,
                    lines: [description]
                }
            };

            if (!data.profile_badges.some(existing => existing.key === key)) {
                data.profile_badges.push({
                    ...customBadge
                });
            }

            if (!data.own_badges.some(existing => existing.key === key)) {
                data.own_badges.push({
                    ...customBadge,
                    hidden: false
                });
            }
        }

        return data;
    };

    const cache = new WeakMap();

    const getModifiedResponse = (xhr, originalValue) => {
        if (xhr.readyState !== XMLHttpRequest.DONE) {
            return originalValue;
        }

        if (!xhr.__aviaBadgePreview && !xhr.__aviaBadgeProfile) {
            return originalValue;
        }

        if (cache.has(xhr)) {
            const cached = cache.get(xhr);
            return typeof originalValue === "string" ? cached.text : cached.json;
        }

        try {
            const data = typeof originalValue === "string" ?
                JSON.parse(originalValue) :
                JSON.parse(JSON.stringify(originalValue));

            const userId = xhr.__aviaBadgeProfile ?
                data.user?.id :
                localStorage.getItem("userId") || data.user?.id || data.user_id || data.id;

            if (!userId) return originalValue;

            const badges = xhr.__aviaBadges || [];
            const modified = modifyResponse(data, badges, userId);

            const result = {
                json: modified,
                text: JSON.stringify(modified)
            };

            cache.set(xhr, result);

            return typeof originalValue === "string" ? result.text : result.json;
        } catch {
            return originalValue;
        }
    };

    prototype.open = function(method, url, ...args) {
        let decoded = String(url);

        try {
            decoded = decodeURIComponent(decoded);
        } catch {}

        this.__aviaBadgeUrl = decoded;
        this.__aviaBadgePreview = decoded.includes(PREVIEW_ENDPOINT);
        this.__aviaBadgeProfile = PROFILE_ENDPOINT.test(decoded);

        cache.delete(this);

        return originalOpen.call(this, method, url, ...args);
    };

    prototype.send = function(...args) {
        if (!this.__aviaBadgePreview && !this.__aviaBadgeProfile) {
            return originalSend.apply(this, args);
        }

        const xhr = this;

        badgesPromise.then(badges => {
            xhr.__aviaBadges = badges;
            originalSend.apply(xhr, args);
        });
    };

    badgesPromise.then(badges => {
        window.__AVIA_CUSTOM_BADGES_CACHE__ = badges;
    });

    if (responseTextDescriptor?.get && responseTextDescriptor.configurable) {
        Object.defineProperty(prototype, "responseText", {
            ...responseTextDescriptor,
            get: function() {
                return getModifiedResponse(
                    this,
                    responseTextDescriptor.get.call(this)
                );
            }
        });
    }

    if (responseDescriptor?.get && responseDescriptor.configurable) {
        Object.defineProperty(prototype, "response", {
            ...responseDescriptor,
            get: function() {
                const original = responseDescriptor.get.call(this);

                if (this.responseType === "" || this.responseType === "text") {
                    return getModifiedResponse(this, original);
                }

                if (this.responseType === "json") {
                    return getModifiedResponse(this, original);
                }

                return original;
            }
        });
    }
})();
