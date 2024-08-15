chrome.runtime.onInstalled.addListener(() => {
    // Clear all existing rules on installation to start fresh
    chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: []
    }, () => {
        chrome.storage.sync.set({ blockedSites: [], nextRuleId: 1 }, () => {
            console.log("Initialized blocked sites and rule ID counter.");
        });
    });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "addSite") {
        addBlockingRule(request.site, sendResponse);
        return true; // Keep the message channel open for async response
    } else if (request.action === "removeSite") {
        removeBlockingRule(request.site, sendResponse);
        return true; // Keep the message channel open for async response
    } else if (request.action === "removeAllSites") {
        removeAllBlockingRules(sendResponse);
        return true; // Keep the message channel open for async response
    }
});

function addBlockingRule(site, sendResponse) {
    chrome.storage.sync.get(["blockedSites"], (data) => {
        const { blockedSites } = data;

        if (blockedSites.includes(site)) {
            console.log(`Site ${site} is already blocked.`);
            sendResponse({ status: "exists", message: `Site ${site} is already blocked.` });
            return;
        }

        // Retrieve all existing rules
        chrome.declarativeNetRequest.getDynamicRules((existingRules) => {
            let usedIds = existingRules.map(rule => rule.id);
            let newRuleId = 1;

            // Find the smallest available unique ID
            while (usedIds.includes(newRuleId)) {
                newRuleId++;
            }

            const rule = {
                id: newRuleId,
                priority: 1,
                action: {
                    type: "redirect",
                    redirect: { extensionPath: "/blocked.html" }
                },
                condition: {
                    urlFilter: `*://${site}/*`,
                    resourceTypes: ["main_frame"]
                }
            };

            // Add the new rule
            chrome.declarativeNetRequest.updateDynamicRules({
                addRules: [rule]
            }, () => {
                if (chrome.runtime.lastError) {
                    console.error(`Error: ${chrome.runtime.lastError.message}`);
                    sendResponse({ status: "error", message: chrome.runtime.lastError.message });
                } else {
                    blockedSites.push(site);
                    chrome.storage.sync.set({ blockedSites }, () => {
                        console.log(`Site ${site} blocked with rule ID ${newRuleId}.`);
                        sendResponse({ status: "success", message: `Site ${site} blocked successfully.` });
                    });
                }
            });
        });
    });
}

function removeBlockingRule(site, sendResponse) {
    chrome.storage.sync.get(["blockedSites"], (data) => {
        let { blockedSites } = data;

        if (!blockedSites.includes(site)) {
            console.log(`Site ${site} is not blocked.`);
            sendResponse({ status: "not_found", message: `Site ${site} is not blocked.` });
            return;
        }

        chrome.declarativeNetRequest.getDynamicRules((existingRules) => {
            const ruleToRemove = existingRules.find(rule => rule.condition.urlFilter === `*://${site}/*`);

            if (ruleToRemove) {
                chrome.declarativeNetRequest.updateDynamicRules({
                    removeRuleIds: [ruleToRemove.id]
                }, () => {
                    if (chrome.runtime.lastError) {
                        console.error(`Error: ${chrome.runtime.lastError.message}`);
                        sendResponse({ status: "error", message: chrome.runtime.lastError.message });
                    } else {
                        blockedSites = blockedSites.filter(s => s !== site);
                        chrome.storage.sync.set({ blockedSites }, () => {
                            console.log(`Site ${site} unblocked.`);
                            sendResponse({ status: "success", message: `Site ${site} unblocked successfully.` });
                        });
                    }
                });
            } else {
                console.log(`No rule found for site ${site}.`);
                sendResponse({ status: "not_found", message: `No rule found for site ${site}.` });
            }
        });
    });
}

// Clear all rules and reset blocked sites
function removeAllBlockingRules(sendResponse) {
    chrome.declarativeNetRequest.getDynamicRules((existingRules) => {
        const ruleIds = existingRules.map(rule => rule.id);

        // Remove all existing rules
        chrome.declarativeNetRequest.updateDynamicRules({
            removeRuleIds: ruleIds
        }, () => {
            if (chrome.runtime.lastError) {
                console.error(`Error: ${chrome.runtime.lastError.message}`);
                sendResponse({ status: "error", message: chrome.runtime.lastError.message });
            } else {
                // Clear blocked sites
                chrome.storage.sync.set({ blockedSites: [] }, () => {
                    sendResponse({ status: "success", message: "All sites have been removed." });
                });
            }
        });
    });
}