// Minimal JS to simulate payment flow on a static site
(function(){
  const amountForm = document.getElementById('amountForm');
  const amountInput = document.getElementById('amount');
  const displayAmount = document.getElementById('displayAmount');
  const currentAmount = document.getElementById('currentAmount');
  const tabs = document.querySelectorAll('.tab');
  const tabContents = document.querySelectorAll('.tab-content');
  const githubLink = document.getElementById('github-link');

  githubLink.addEventListener('click', ()=>{
    window.open('https://github.com/sriyagna123/payment-gateway','_blank')
  })

  amountForm.addEventListener('submit', (e)=>{
    e.preventDefault();
    const amt = parseFloat(amountInput.value);
    if(!amt || amt < 1 || amt > 1000000){
      alert('Enter an amount between ₹1 and ₹10,00,000');
      return;
    }
    displayAmount.textContent = '₹' + amt.toFixed(2);
    currentAmount.classList.remove('hidden');
    window.scrollTo({top:0,behavior:'smooth'});
  })

  tabs.forEach(tab=>{
    tab.addEventListener('click', ()=>{
      tabs.forEach(t=>t.classList.remove('active'));
      tab.classList.add('active');
      const method = tab.getAttribute('data-method');
      tabContents.forEach(tc=>{
        if(tc.getAttribute('data-method') === method){
          tc.classList.add('active'); tc.classList.remove('hidden');
        } else { tc.classList.remove('active'); tc.classList.add('hidden'); }
      })
    })
  })

  function generateTxn(){
    const t = Date.now().toString();
    const rand = Math.floor(Math.random()*9000)+1000;
    return 'TXN' + t + rand.toString(16).toUpperCase().slice(0,6);
  }

  document.querySelectorAll('.pay-btn').forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      const parent = e.target.closest('form');
      const method = parent.getAttribute('data-method');
      const amountText = displayAmount.textContent || '';
      const amount = parseFloat((amountText.replace('₹','')||'0'));
      if(!amount || amount <= 0){ alert('Please set an amount first'); return; }

      // Basic client-side validation for each method
      let valid = true; let details = {};
      if(method === 'UPI'){
        const upi = parent.querySelector('#upi_id').value.trim();
        valid = /^[a-zA-Z0-9._-]+@[a-zA-Z]+$/.test(upi);
        details.upi_id = upi;
      }
      if(method === 'Card'){
        const num = parent.querySelector('#card_number').value.replace(/\s+/g,'');
        valid = /^\d{16}$/.test(num);
        details.card_last_4 = num.slice(-4);
      }
      if(method === 'Net Banking'){
        const bank = parent.querySelector('#bank').value;
        valid = bank !== '';
        details.bank = bank;
      }
      if(method === 'Wallet'){
        const wallet = parent.querySelector('#wallet').value;
        valid = wallet !== '';
        details.wallet = wallet;
      }
      if(!valid){ alert('Please fill valid details for ' + method); return; }

      const txn = generateTxn();
      const now = new Date().toLocaleString();

      const receiptArea = document.getElementById('receiptArea');
      receiptArea.innerHTML = `
        <div class="receipt-card">
          <div class="receipt-line"><strong>Transaction ID</strong><span class="font-mono">${txn}</span></div>
          <div class="receipt-line"><strong>Method</strong><span>${method}</span></div>
          <div class="receipt-line"><strong>Amount</strong><span>₹${amount.toFixed(2)}</span></div>
          <div class="receipt-line"><strong>Date</strong><span>${now}</span></div>
        </div>
        <div class="footer-note">This is a static demo — no real money was moved.</div>
      `;
      receiptArea.classList.remove('hidden');
      receiptArea.scrollIntoView({behavior:'smooth'});
    })
  })
})();