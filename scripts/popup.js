// popup.js
document.addEventListener('DOMContentLoaded', () => {
    const siteInput = document.getElementById('siteInput');
    const blockSiteBtn = document.getElementById('blockSiteBtn');
    const blockedSitesList = document.getElementById('blockedSitesList');
    const removeAllBtn = document.getElementById('removeAllBtn');

    // Load blocked sites from active rules
    chrome.declarativeNetRequest.getDynamicRules((rules) => {
        blockedSitesList.innerHTML = ''; // Clear the list first
        rules.forEach(rule => {
            if (rule.condition && rule.condition.urlFilter) {
                const site = rule.condition.urlFilter.replace('*://', '').replace('/*', '').replace('*','');
                addSiteToList(site, rule.id);
            }
        });
    });

    // Handle "Enter" key press inside the input field
    siteInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
            blockSitesList();
        }
    });

    // Block site button click
    blockSiteBtn.addEventListener('click', () => blockSitesList());

    // Remove all button click with confirmation
    removeAllBtn.addEventListener('click', () => {
        const confirmation = confirm("Are you sure you want to remove all blocked sites? This action cannot be undone.");
        if (confirmation) {
            chrome.runtime.sendMessage({ action: 'removeAllSites' }, (response) => {
                if (response && response.status === 'success') {
                    blockedSitesList.innerHTML = '';
                } else if (response) {
                    alert(`Error: ${response.message}`);
                } else {
                    alert('Unexpected response from background script.');
                }
            });
        }
    });

    // Add site to list with remove button
    function addSiteToList(site, ruleId) {
        const item = document.createElement('li');
        item.textContent = site;

        // Create a remove button for each site
        const removeBtn = document.createElement('button');
        removeBtn.textContent = 'Remove';
        removeBtn.classList.add('remove-btn');
        removeBtn.addEventListener('click', () => {
            chrome.runtime.sendMessage({ action: 'removeSite', site }, (response) => {
                if (response.status === 'success') {
                    item.remove(); // Remove the item from the list
                } else {
                    alert(response.message);
                }
            });
        });
        item.appendChild(removeBtn);
        blockedSitesList.appendChild(item);
    }

    function blockSitesList() {
        const sites = siteInput.value.trim().split(" ");
        for(const site of sites) {
            if (site) {
                chrome.runtime.sendMessage({ action: 'addSite', site }, (response) => {
                    if (response.status === 'success') {
                        // Add the site to the list immediately
                        addSiteToList(site, response.ruleId);
                        siteInput.value = '';
                    } else {
                        alert(response.message);
                    }
                });
            }
        }
    }
});

