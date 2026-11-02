window.CREATIVITY_API = "https://guarantees-copied-notifications-burton.trycloudflare.com";

function apiUrl(path) {
    var base = String(window.CREATIVITY_API || "").replace(/\/$/, "");
    if (base && location.hostname.endsWith("github.io")) return base + path;
    return path;
}

async function refreshCreativityApi() {
    if (!location.hostname.endsWith("github.io")) return false;
    try {
        var response = await fetch("api-config.js?v=" + Date.now(), { cache: "no-store" });
        if (!response.ok) return false;
        var text = await response.text();
        var match = text.match(/window\.CREATIVITY_API = "([^"]+)"/);
        if (!match || match[1] === window.CREATIVITY_API) return false;
        window.CREATIVITY_API = match[1];
        return true;
    } catch (error) {
        return false;
    }
}
