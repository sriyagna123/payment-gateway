/* ===========================
   GLOBAL SCRIPTS
   =========================== */

document.addEventListener('DOMContentLoaded', function() {
    // Auto-hide flash messages after 5 seconds
    const flashMessages = document.querySelectorAll('.flash');
    flashMessages.forEach(flash => {
        setTimeout(() => {
            flash.style.animation = 'fadeOut 0.3s ease';
            setTimeout(() => {
                flash.remove();
            }, 300);
        }, 5000);
    });
});

@keyframes fadeOut {
    from {
        opacity: 1;
        transform: translateY(0);
    }
    to {
        opacity: 0;
        transform: translateY(-20px);
    }
}
