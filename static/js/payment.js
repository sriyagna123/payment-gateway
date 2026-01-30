/* ===========================
   PAYMENT GATEWAY - JAVASCRIPT
   =========================== */

document.addEventListener('DOMContentLoaded', function() {
    // Tab Switching
    initTabs();
    // Form Input Formatting
    initCardFormatting();
    initExpiryFormatting();
    initCVVFormatting();
    // Form Submission Handlers
    initFormHandlers();
    // Wallet Selection
    initWalletSelection();
});

// ===========================
// TAB SWITCHING
// ===========================

function initTabs() {
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.getAttribute('data-tab');
            
            // Update active tab
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // Update active content
            tabContents.forEach(content => {
                if (content.id === tabName) {
                    content.classList.add('active');
                    content.classList.remove('hidden');
                } else {
                    content.classList.remove('active');
                    content.classList.add('hidden');
                }
            });

            // Clear errors on tab change
            clearAllErrors();
        });
    });
}

// ===========================
// INPUT FORMATTING
// ===========================

function initCardFormatting() {
    const cardInput = document.getElementById('card-number');
    if (!cardInput) return;

    cardInput.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, '');
        value = value.slice(0, 16);
        value = value.replace(/(\d{4})(?=\d)/g, '$1 ');
        e.target.value = value;
    });
}

function initExpiryFormatting() {
    const expiryInput = document.getElementById('card-expiry');
    if (!expiryInput) return;

    expiryInput.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length >= 2) {
            value = value.substring(0, 2) + '/' + value.substring(2, 4);
        }
        e.target.value = value;
    });
}

function initCVVFormatting() {
    const cvvInput = document.getElementById('card-cvv');
    if (!cvvInput) return;

    cvvInput.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/\D/g, '').slice(0, 4);
    });
}

// ===========================
// FORM HANDLERS
// ===========================

function initFormHandlers() {
    const forms = document.querySelectorAll('.payment-form');
    forms.forEach(form => {
        form.addEventListener('submit', handleFormSubmit);
    });
}

async function handleFormSubmit(e) {
    e.preventDefault();
    
    const form = e.target;
    const method = form.getAttribute('data-method');
    
    clearAllErrors();
    
    switch(method) {
        case 'upi':
            await processUPI(form);
            break;
        case 'card':
            await processCard(form);
            break;
        case 'netbanking':
            await processNetBanking(form);
            break;
        case 'wallet':
            await processWallet(form);
            break;
    }
}

// ===========================
// UPI PROCESSING
// ===========================

async function processUPI(form) {
    const upiId = document.getElementById('upi-id').value.trim();
    
    // Validation
    if (!validateUPI(upiId)) {
        showError('upi-error', 'Invalid UPI ID format (e.g., username@bankname)');
        return;
    }

    const data = {
        upi_id: upiId
    };

    await submitPayment(CONFIG.upiEndpoint, data);
}

function validateUPI(upi) {
    const pattern = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$/;
    return pattern.test(upi);
}

// ===========================
// CARD PROCESSING
// ===========================

async function processCard(form) {
    const name = document.getElementById('cardholder-name').value.trim();
    const cardNumber = document.getElementById('card-number').value.replace(/\s/g, '');
    const expiry = document.getElementById('card-expiry').value.trim();
    const cvv = document.getElementById('card-cvv').value.trim();
    
    let hasError = false;
    
    // Validate inputs
    if (!name || name.length < 3) {
        showError('card-name-error', 'Cardholder name must be at least 3 characters');
        hasError = true;
    }
    
    if (!cardNumber || cardNumber.length < 13) {
        showError('card-number-error', 'Invalid card number');
        hasError = true;
    }
    
    if (!expiry.match(/^\d{2}\/\d{2}$/)) {
        showError('card-expiry-error', 'Expiry date must be MM/YY format');
        hasError = true;
    }
    
    if (!cvv || cvv.length < 3 || cvv.length > 4) {
        showError('card-cvv-error', 'CVV must be 3-4 digits');
        hasError = true;
    }
    
    if (hasError) return;
    
    const data = {
        cardholder_name: name,
        card_number: cardNumber,
        expiry_date: expiry,
        cvv: cvv
    };
    
    await submitPayment(CONFIG.cardEndpoint, data);
}

// ===========================
// NET BANKING PROCESSING
// ===========================

async function processNetBanking(form) {
    const bank = document.getElementById('bank-select').value;
    
    if (!bank) {
        showError('bank-error', 'Please select a bank');
        return;
    }
    
    const data = {
        bank: bank
    };
    
    await submitPayment(CONFIG.netbankingEndpoint, data);
}

// ===========================
// WALLET PROCESSING
// ===========================

function initWalletSelection() {
    const walletButtons = document.querySelectorAll('.wallet-option');
    const walletInput = document.getElementById('wallet-select');
    const walletSubmit = document.getElementById('wallet-submit');
    
    if (!walletButtons.length) return;
    
    walletButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove selection from all buttons
            walletButtons.forEach(btn => btn.classList.remove('selected'));
            
            // Add selection to clicked button
            button.classList.add('selected');
            
            // Set hidden input value
            const wallet = button.getAttribute('data-wallet');
            walletInput.value = wallet;
            
            // Enable submit button
            if (walletSubmit) {
                walletSubmit.disabled = false;
                walletSubmit.textContent = `Pay ₹${walletSubmit.getAttribute('data-amount') || '2,499'} with ${wallet}`;
            }
        });
    });
    
    // Add submit handler to wallet form
    const walletForm = document.querySelector('[data-method="wallet"]');
    if (walletForm) {
        walletForm.addEventListener('submit', processWalletPayment);
    }
}

async function processWalletPayment(e) {
    e.preventDefault();
    
    const walletInput = document.getElementById('wallet-select');
    const wallet = walletInput.value;
    
    if (!wallet) {
        alert('Please select a wallet');
        return;
    }
    
    const data = {
        wallet: wallet
    };
    
    await submitPayment(CONFIG.walletEndpoint, data);
}

// ===========================
// API SUBMISSION
// ===========================

async function submitPayment(endpoint, data) {
    showLoadingOverlay(true);
    
    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        showLoadingOverlay(false);
        
        if (response.ok && result.success) {
            showSuccessModal(result.message, result.transaction_id);
        } else {
            showErrorModal(
                result.error || result.message || 'Payment processing failed',
                result.errors
            );
        }
    } catch (error) {
        showLoadingOverlay(false);
        showErrorModal('An error occurred: ' + error.message);
    }
}

// ===========================
// UI HELPERS
// ===========================

function showError(elementId, message) {
    const errorElement = document.getElementById(elementId);
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }
}

function clearAllErrors() {
    const errorElements = document.querySelectorAll('.error-message');
    errorElements.forEach(el => {
        el.textContent = '';
        el.style.display = 'none';
    });
}

function showLoadingOverlay(show) {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        if (show) {
            overlay.classList.remove('hidden');
        } else {
            overlay.classList.add('hidden');
        }
    }
}

function showSuccessModal(message, transactionId) {
    const modal = document.getElementById('success-modal');
    const messageEl = document.getElementById('success-message');
    const txnIdEl = document.getElementById('txn-id');
    
    if (messageEl) messageEl.textContent = message;
    if (txnIdEl) txnIdEl.textContent = transactionId;
    
    if (modal) {
        modal.classList.remove('hidden');
        
        // Redirect to success page after 2 seconds
        setTimeout(() => {
            window.location.href = `/success/${transactionId}`;
        }, 2000);
    }
}

function showErrorModal(message, errors) {
    const modal = document.getElementById('error-modal');
    const messageEl = document.getElementById('error-message');
    
    let fullMessage = message;
    if (errors && errors.length) {
        fullMessage += '<br><br>' + errors.join('<br>');
    }
    
    if (messageEl) {
        messageEl.innerHTML = fullMessage;
    }
    
    if (modal) {
        modal.classList.remove('hidden');
    }
}

// ===========================
// UTILITY FUNCTIONS
// ===========================

function formatCardNumber(value) {
    return value.replace(/\s/g, '').replace(/(\d{4})(?=\d)/g, '$1 ');
}

function formatExpiryDate(value) {
    value = value.replace(/\D/g, '');
    if (value.length >= 2) {
        value = value.substring(0, 2) + '/' + value.substring(2, 4);
    }
    return value;
}

function formatCVV(value) {
    return value.replace(/\D/g, '');
}
