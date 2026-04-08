(function() {
    // -----------------------------------------------------------------
    // https://github.com/haduc25
    // -----------------------------------------------------------------
    
    chrome.runtime.sendMessage({ action: "getStatus" }, (response) => {
        const adBlockStatus = response ? response.status : 'enabled';
        
        if (adBlockStatus === 'disabled') {
            console.log("[AD BLOCKER] Extension is currently DISABLED. Skipping ad blocking logic.");
            return; 
        }
        
        console.log("[AD BLOCKER] Extension is ENABLED. Activating ad blocking logic.");
        
        // *****************************************************************
        // ** https://github.com/haduc25 **
        // *****************************************************************
      
        const bypassSizeCheck = () => {
            try {
                Object.defineProperty(window, 'innerWidth', { get: () => screen.width });
                Object.defineProperty(window, 'innerHeight', { get: () => screen.height });
                const originalSetInterval = window.setInterval;
                window.setInterval = (func, delay) => {
                    if (delay < 1000) {
                        return setTimeout(func, 5000); 
                    }
                    return originalSetInterval.call(window, func, delay);
                };
            } catch (e) { console.error("[DEBUG BYPASS] Failed to redefine properties:", e); }
        };
        bypassSizeCheck();
        
        // ===============================================
        // https://github.com/haduc25
        // ===============================================
        function logCloseAction() {
            try {
                chrome.storage.local.get(['closeLog'], function(result) {
                    const logEntries = result.closeLog || [];
                    const currentTime = new Date().toLocaleTimeString();
                    
                    const newLog = { 
                        url: window.location.href, 
                        time: currentTime
                    };
                    
                    logEntries.push(newLog);
                    if (logEntries.length > 50) { 
                        logEntries.shift(); 
                    }

                    chrome.storage.local.set({ closeLog: logEntries }, function() {
                        chrome.runtime.sendMessage({ 
                            action: "updateBadge", 
                            count: logEntries.length 
                        });
                    });
                });
            } catch (e){ console.error("[AdBlocker] Lỗi khi ghi log đóng quảng cáo:", e); }
        }

        // ===============================================
        // https://github.com/haduc25
        // ===============================================
        function handleVideoAdsInIframe() {
            if (window.location.host.includes('goatembed.com')) {
                const aggressiveSelectors = [
                    '[id*="ad-"]', '[class*="ad-"]', '[class*="ads-"]', '[id*="ads-"]',
                    '[id*="promo"]', '[class*="promo"]',
                    '[class*="countdown"]', '[class*="remaining-time"]',
                    'div[style*="position: absolute; width: 100%; height: 100%;"]',
                    '[class*="skip-ad-btn"]', '[class*="ads-text"]'
                ];
                
                const aggressiveScan = () => {
                    let blockedCount = 0;
                    
                    aggressiveSelectors.forEach(selector => {
                        document.querySelectorAll(selector).forEach(element => {
                            if (element.offsetParent !== null) { 
                                element.style.setProperty('display', 'none', 'important');
                                element.remove(); 
                                blockedCount++;
                            }
                        });
                    });
                    
                    const allElements = document.getElementsByTagName('*');
                    for (let i = 0; i < allElements.length; i++) {
                        const element = allElements[i];
                        const textContent = element.textContent.toLowerCase();

                        if (textContent.includes('bỏ qua') || 
                            textContent.includes('skip') ||
                            textContent.includes('tắt') || 
                            element.className.includes('close-it')) {
                            
                            if (element.offsetParent !== null) { 
                                element.click();
                                logCloseAction();
                            }
                        } 
                    }

                    if (blockedCount > 0) {
                        logCloseAction(); 
                    }
                };

                setInterval(aggressiveScan, 250); 
                aggressiveScan(); 
                
                return; 
            }
        }

        // ===============================================
        // https://github.com/haduc25
        // ===============================================
        const TARGET_SELECTOR = '.sspp-area .close-it'; 

        function handleRophimHost() {
            if (!window.location.host.includes('rophim.li')) return; 

            // 1. HÀM CHÈN CSS (Nâng cấp)
            function applyGlobalAdStyles() {
                const style = document.createElement('style');
                style.type = 'text/css';
                const css = `
                    .sspp-area,
                    .focus-backdrop,
                    .sspp-modal, 
                    .v-modal,
		    .app-box-fix,   
                    .d-modal {
                        display: none !important;
                        visibility: hidden !important;
                        pointer-events: none !important; /* QUAN TRỌNG: Ngăn chặn tương tác */
                    }
                `;
                if (style.styleSheet) style.styleSheet.cssText = css;
                else style.appendChild(document.createTextNode(css));
                (document.head || document.body || document.documentElement).appendChild(style);
            }
            applyGlobalAdStyles();

            function findAndCloseAd() {
                const adButton = document.querySelector(TARGET_SELECTOR);
                const adContainerModal = document.querySelector('.sspp-modal'); 

                if (adButton && !adButton.getAttribute('data-close-it-applied')) {
                    adButton.setAttribute('data-close-it-applied', 'true');
                    try {
                        adButton.click(); 
                        logCloseAction();
                        return;
                    } catch (e) {
                        console.error("[AdBlocker] Lỗi khi click nút Tắt.");
                    }
                }
                
                if (adContainerModal && adContainerModal.offsetParent !== null) {
                     console.log("[AdBlocker] Xóa Container Modal quảng cáo cứng đầu.");
                     adContainerModal.remove(); 
                     logCloseAction(); 
                }
            }

            document.addEventListener('DOMContentLoaded', () => {
                const observerConfig = { childList: true, subtree: true };
                const observer = new MutationObserver(() => {
                    findAndCloseAd(); 
                });
                observer.observe(document.body, observerConfig); 
                
                findAndCloseAd(); 
                setTimeout(findAndCloseAd, 1000); 
            });
        }
        handleVideoAdsInIframe();
        handleRophimHost();

        // *****************************************************************
        // https://github.com/haduc25
        // *****************************************************************
    });
})();