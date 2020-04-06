var URLS = {
    base: "https://api.coronatrends.live",
    location: "/get/locations",
    stat: "/get/stats"
};

function shorten(n, d) {
    if (n < 1000) {
        return n + '';
    }
    if (n > 1e7) {
        return "10M+"
    }
    var x = ('' + n).length;
    var p = Math.pow;
    d = p(10, d);
    x -= x % 3;
    return Math.round(n * d / p(10, x)) / d + " KMBTPE"[x / 3];
}

chrome.alarms.create("checkStats", {delayInMinutes: 5, periodInMinutes: 10});

chrome.browserAction.setBadgeBackgroundColor({
    color: "#FF3B3B"
});
chrome.runtime.setUninstallURL("https://coronatrends.live/support.html?reason=uninstall");
chrome.alarms.onAlarm.addListener(onAlarm);

async function onAlarm(alarm) {
    if (!alarm || alarm.name !== "checkStats") {
        return;
    }
    const now = +new Date();
    // const stats = window.localStorage.getItem("stats");
    chrome.storage.local.get('stats', ({stats}) => {
        const localStats = stats && JSON.parse(stats);
        // check after 3 minutes
        // 180000
        if (localStats && localStats.result) {

            chrome.storage.local.get(['regions', 'seenCount'], async function ({regions, seenCount}) {
                const _regions = regions && JSON.parse(regions);
                if (!_regions || !_regions.length) {
                    return;
                }
                const values = _regions.map(region => region.value);
                let stats;
                try {
                    stats = await fetch(URLS.base + URLS.stat, {
                        method: "POST",
                        body: JSON.stringify({locations: values}),
                        headers: {
                            "Content-Type": "application/json"
                        }
                    }).then(resp => resp.json());
                } catch {
                }

                if (!stats) {
                    return;
                }
                chrome.storage.local.set({
                    stats: JSON.stringify({
                        result: stats,
                        timestamp: now
                    })
                });
                window.localStorage.setItem("stats", JSON.stringify({
                    result: stats,
                    timestamp: now
                }));
                seenCount = +seenCount;
                if (stats.global && stats.global.total && seenCount && seenCount < stats.global.total) {
                    const delta = stats.global.total - seenCount;
                    const displayText = shorten(delta, 1);
                    chrome.browserAction.setBadgeText({text: displayText});
                }
            });
        }
    });
}
