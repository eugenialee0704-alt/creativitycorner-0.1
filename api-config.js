window.CREATIVITY_API = "https://faculty-straight-tube-sie.trycloudflare.com";

function apiUrl(path) {
    var base = String(window.CREATIVITY_API || "").replace(/\/$/, "");
    if (base && location.hostname.endsWith("github.io")) return base + path;
    return path;
}

async function refreshCreativityApi() {
    if (!location.hostname.endsWith("github.io")) return false;
    try {
        var response = await Promise.race([
            fetch("api-config.js?v=" + Date.now(), { cache: "no-store" }),
            new Promise(function (_, reject) {
                setTimeout(function () { reject(new Error("timeout")); }, 5000);
            })
        ]);
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

if (typeof location !== "undefined" && location.hostname.endsWith("github.io")) {
    refreshCreativityApi();
}
