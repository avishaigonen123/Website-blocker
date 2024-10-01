let nextRuleId = 1;
const blockedPageUrl = chrome.runtime.getURL('blocked.html');

// Load existing rules and set nextRuleId
chrome.storage.local.get(['rules', 'nextRuleId'], (result) => {
    if (result.rules) {
        chrome.declarativeNetRequest.updateDynamicRules({
            addRules: result.rules
        });
    }
    if (result.nextRuleId) {
        nextRuleId = result.nextRuleId;
    }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'addSite') {
        const site = request.site;
        const rule = {
            id: nextRuleId++,
            priority: 1,
            action: { 
                type: 'redirect',
                redirect: { url: blockedPageUrl }
            },
            condition: { urlFilter: `*://*${site}/*`, resourceTypes: ['main_frame'] }
        };

        chrome.declarativeNetRequest.updateDynamicRules({
            addRules: [rule],
        }, () => {
            if (chrome.runtime.lastError) {
                sendResponse({ status: 'error', message: chrome.runtime.lastError.message });
            } else {
                // Save the updated rules and nextRuleId
                chrome.storage.local.get('rules', (result) => {
                    const rules = result.rules || [];
                    rules.push(rule);
                    chrome.storage.local.set({ rules: rules, nextRuleId: nextRuleId }, () => {
                        sendResponse({ status: 'success', ruleId: rule.id });
                    });
                });
            }
        });

        return true; // Indicates that the response will be sent asynchronously
    }

    if (request.action === 'removeSite') {
        chrome.declarativeNetRequest.getDynamicRules((rules) => {
            const ruleToRemove = rules.find(r => r.condition.urlFilter === `*://*${request.site}/*`);
            if (ruleToRemove) {
                chrome.declarativeNetRequest.updateDynamicRules({
                    removeRuleIds: [ruleToRemove.id]
                }, () => {
                    if (chrome.runtime.lastError) {
                        sendResponse({ status: 'error', message: chrome.runtime.lastError.message });
                    } else {
                        // Remove the rule from storage
                        chrome.storage.local.get('rules', (result) => {
                            const updatedRules = result.rules.filter(r => r.id !== ruleToRemove.id);
                            chrome.storage.local.set({ rules: updatedRules }, () => {
                                sendResponse({ status: 'success' });
                            });
                        });
                    }
                });
            } else {
                sendResponse({ status: 'error', message: 'Rule not found' });
            }
        });

        return true; // Indicates that the response will be sent asynchronously
    }

    if (request.action === 'removeAllSites') {
        chrome.declarativeNetRequest.getDynamicRules((rules) => {
            const ruleIds = rules.map(rule => rule.id);
            chrome.declarativeNetRequest.updateDynamicRules({
                removeRuleIds: ruleIds
            }, () => {
                if (chrome.runtime.lastError) {
                    sendResponse({ status: 'error', message: chrome.runtime.lastError.message });
                } else {
                    // Clear rules from storage
                    chrome.storage.local.set({ rules: [], nextRuleId: 1 }, () => {
                        sendResponse({ status: 'success' });
                    });
                }
            });
        });

        return true; // Indicates that the response will be sent asynchronously
    }
});