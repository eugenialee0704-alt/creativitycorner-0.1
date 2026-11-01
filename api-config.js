window.CREATIVITY_API = "https://camps-hudson-friday-weapon.trycloudflare.com";

function apiUrl(path) {
    var base = String(window.CREATIVITY_API || "").replace(/\/$/, "");
    if (base && location.hostname.endsWith("github.io")) return base + path;
    return path;
}
