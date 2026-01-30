// Format card number with spaces
function formatCardNumber(value) {
    return value
        .replace(/\s/g, '')
        .replace(/(\d{4})/g, '$1 ')
        .trim();
}

// Format expiry date as MM/YY
function formatExpiryDate(value) {
    value = value.replace(/\D/g, '');
    if (value.length >= 2) {
        value = value.substring(0, 2) + '/' + value.substring(2, 4);
    }
    return value;
}

// Format CVV (numbers only)
function formatCVV(value) {
    return value.replace(/\D/g, '');
}

// Clear error message
function clearError(fieldId) {
    const errorElement = document.getElementById(fieldId + 'Error');
    const inputElement = document.getElementById(fieldId);
    if (errorElement) errorElement.textContent = '';
    if (inputElement) inputElement.classList.remove('error', 'success');
}

// Display error message
function setError(fieldId, message) {
    const errorElement = document.getElementById(fieldId + 'Error');
    const inputElement = document.getElementById(fieldId);
    if (errorElement) errorElement.textContent = message;
    if (inputElement) {
        inputElement.classList.add('error');
        inputElement.classList.remove('success');
    }
}

// Mark field as valid
function setSuccess(fieldId) {
    const errorElement = document.getElementById(fieldId + 'Error');
    const inputElement = document.getElementById(fieldId);
    if (errorElement) errorElement.textContent = '';
    if (inputElement) {
        inputElement.classList.add('success');
        inputElement.classList.remove('error');
    }
}

// Show message
function showMessage(message, type) {
    const container = document.getElementById('messageContainer');
    const messageBox = document.getElementById('messageBox');
    
    let icon = '';
    if (type === 'success') {
        icon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>`;
    } else {
        icon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>`;
    }
    
    messageBox.innerHTML = icon + message;
    messageBox.className = 'message-box ' + type;
    container.classList.remove('hidden');
    container.classList.add('show');
    
    // Auto-hide success message after 5 seconds
    if (type === 'success') {
        setTimeout(() => {
            container.classList.add('hidden');
            container.classList.remove('show');
        }, 5000);
    }
}

// Validate client-side before submission
function validateForm() {
    const cardNumber = document.getElementById('cardNumber').value.replace(/\s/g, '');
    const expiryDate = document.getElementById('expiryDate').value;
    const cvv = document.getElementById('cvv').value;
    const cardholderName = document.getElementById('cardholderName').value;
    
    let isValid = true;
    
    // Validate cardholder name
    clearError('cardholderName');
    if (!cardholderName || cardholderName.trim().length < 3) {
        setError('cardholderName', 'Cardholder name must be at least 3 characters');
        isValid = false;
    } else if (!/^[a-zA-Z\s]+$/.test(cardholderName)) {
        setError('cardholderName', 'Name must contain only letters and spaces');
        isValid = false;
    } else {
        setSuccess('cardholderName');
    }
    
    // Validate card number
    clearError('cardNumber');
    if (!cardNumber || cardNumber.length < 13) {
        setError('cardNumber', 'Card number must be at least 13 digits');
        isValid = false;
    } else if (!/^\d+$/.test(cardNumber)) {
        setError('cardNumber', 'Card number must contain only digits');
        isValid = false;
    } else {
        // Simple Luhn check
        if (!luhnCheck(cardNumber)) {
            setError('cardNumber', 'Invalid card number');
            isValid = false;
        } else {
            setSuccess('cardNumber');
        }
    }
    
    // Validate expiry date
    clearError('expiryDate');
    if (!expiryDate || !/^\d{2}\/\d{2}$/.test(expiryDate)) {
        setError('expiryDate', 'Expiry date must be MM/YY format');
        isValid = false;
    } else {
        setSuccess('expiryDate');
    }
    
    // Validate CVV
    clearError('cvv');
    if (!cvv || !/^\d{3,4}$/.test(cvv)) {
        setError('cvv', 'CVV must be 3-4 digits');
        isValid = false;
    } else {
        setSuccess('cvv');
    }
    
    return isValid;
}

// Luhn algorithm for card number validation
function luhnCheck(cardNumber) {
    let sum = 0;
    let isEven = false;
    
    for (let i = cardNumber.length - 1; i >= 0; i--) {
        let digit = parseInt(cardNumber.charAt(i), 10);
        
        if (isEven) {
            digit *= 2;
            if (digit > 9) {
                digit -= 9;
            }
        }
        
        sum += digit;
        isEven = !isEven;
    }
    
    return sum % 10 === 0;
}

// Initialize event listeners when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('paymentForm');
    const cardNumberInput = document.getElementById('cardNumber');
    const expiryDateInput = document.getElementById('expiryDate');
    const cvvInput = document.getElementById('cvv');
    const submitBtn = document.getElementById('submitBtn');
    const buttonText = submitBtn.querySelector('.button-text');
    const buttonLoader = document.getElementById('submitLoader');
    
    // Card number formatting and validation
    if (cardNumberInput) {
        cardNumberInput.addEventListener('input', function() {
            this.value = formatCardNumber(this.value);
        });
        
        cardNumberInput.addEventListener('blur', function() {
            if (this.value) {
                clearError('cardNumber');
                const cardNum = this.value.replace(/\s/g, '');
                if (/^\d{13,19}$/.test(cardNum) && luhnCheck(cardNum)) {
                    setSuccess('cardNumber');
                }
            }
        });
    }
    
    // Expiry date formatting and validation
    if (expiryDateInput) {
        expiryDateInput.addEventListener('input', function() {
            this.value = formatExpiryDate(this.value);
        });
        
        expiryDateInput.addEventListener('blur', function() {
            if (this.value && /^\d{2}\/\d{2}$/.test(this.value)) {
                setSuccess('expiryDate');
            }
        });
    }
    
    // CVV formatting
    if (cvvInput) {
        cvvInput.addEventListener('input', function() {
            this.value = formatCVV(this.value);
        });
        
        cvvInput.addEventListener('blur', function() {
            if (this.value && /^\d{3,4}$/.test(this.value)) {
                setSuccess('cvv');
            }
        });
    }
    
    // Form submission
    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Validate form
            if (!validateForm()) {
                showMessage('Please fix the errors above', 'error');
                return;
            }
            
            // Disable submit button and show loader
            submitBtn.disabled = true;
            buttonText.style.opacity = '0';
            buttonLoader.classList.remove('hidden');
            
            try {
                // Prepare form data
                const formData = {
                    cardNumber: document.getElementById('cardNumber').value.replace(/\s/g, ''),
                    expiryDate: document.getElementById('expiryDate').value,
                    cvv: document.getElementById('cvv').value,
                    cardholderName: document.getElementById('cardholderName').value
                };
                
                // Send payment request to backend
                const response = await fetch('/api/process-payment', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formData)
                });
                
                const result = await response.json();
                
                if (response.ok && result.success) {
                    // Success
                    showMessage(`✓ ${result.message} (ID: ${result.transactionId})`, 'success');
                    form.reset();
                    
                    // Clear all field styles
                    ['cardNumber', 'expiryDate', 'cvv', 'cardholderName'].forEach(fieldId => {
                        const input = document.getElementById(fieldId);
                        if (input) {
                            input.classList.remove('success', 'error');
                        }
                    });
                } else {
                    // Error from backend
                    const errorMessages = result.errors && result.errors.length > 0 
                        ? result.errors.join(', ')
                        : result.message || 'Payment processing failed';
                    showMessage(errorMessages, 'error');
                }
            } catch (error) {
                showMessage('Network error: ' + error.message, 'error');
                console.error('Error:', error);
            } finally {
                // Re-enable submit button and hide loader
                submitBtn.disabled = false;
                buttonText.style.opacity = '1';
                buttonLoader.classList.add('hidden');
            }
        });
    }
});
