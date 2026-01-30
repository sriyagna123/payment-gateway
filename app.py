from flask import Flask, render_template, request, redirect, url_for, session, flash, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from flask_sqlalchemy import SQLAlchemy
import re
import uuid
from datetime import datetime

app = Flask(__name__)
app.secret_key = 'payment-gateway-secret-key'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///payment_gateway.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# ============ DATABASE MODELS ============

class User(db.Model):
    """User model for registration and login"""
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    full_name = db.Column(db.String(120), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.now)

    def set_password(self, password):
        """Hash and set password"""
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        """Verify password"""
        return check_password_hash(self.password_hash, password)

    def __repr__(self):
        return f'<User {self.username}>'


# Create tables
with app.app_context():
    db.create_all()

# ============ VALIDATION FUNCTIONS ============

def validate_email(email):
    """Validate email format"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(pattern, email):
        return False, "Invalid email format"
    return True, "Valid"


def validate_username(username):
    """Validate username"""
    if len(username) < 3:
        return False, "Username must be at least 3 characters"
    if len(username) > 20:
        return False, "Username must be less than 20 characters"
    if not re.match(r'^[a-zA-Z0-9_-]+$', username):
        return False, "Username can only contain letters, numbers, underscores, and hyphens"
    return True, "Valid"


def validate_password(password):
    """Validate password strength"""
    if len(password) < 6:
        return False, "Password must be at least 6 characters"
    if len(password) > 50:
        return False, "Password must be less than 50 characters"
    return True, "Valid"


def validate_full_name(name):
    """Validate full name"""
    if len(name.strip()) < 3:
        return False, "Full name must be at least 3 characters"
    if not re.match(r'^[a-zA-Z\s]+$', name):
        return False, "Full name must contain only letters and spaces"
    return True, "Valid"


def validate_amount(amount):
    """Validate payment amount"""
    try:
        amt = float(amount)
        if amt <= 0:
            return False, "Amount must be greater than 0"
        if amt > 1000000:
            return False, "Amount cannot exceed ₹10,00,000"
        return True, "Valid"
    except ValueError:
        return False, "Invalid amount"


def validate_upi(upi_id):
    """Validate UPI ID format"""
    pattern = r'^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$'
    if not re.match(pattern, upi_id):
        return False, "Invalid UPI ID format (e.g., username@bankname)"
    return True, "Valid"


def validate_card_number(card_number):
    """Validate credit card number using Luhn algorithm"""
    card_number = card_number.replace(" ", "").replace("-", "")
    
    if not card_number.isdigit():
        return False, "Card number must contain only digits"
    
    if len(card_number) not in [13, 14, 15, 16, 17, 18, 19]:
        return False, "Card number must be 13-19 digits"
    
    # Luhn algorithm
    def luhn_check(num):
        digits = [int(d) for d in num]
        checksum = 0
        for i, digit in enumerate(reversed(digits)):
            if i % 2 == 1:
                digit *= 2
                if digit > 9:
                    digit -= 9
            checksum += digit
        return checksum % 10 == 0
    
    if not luhn_check(card_number):
        return False, "Invalid card number"
    
    return True, "Valid"


def validate_expiry_date(expiry_date):
    """Validate expiry date format MM/YY"""
    pattern = r'^(0[1-9]|1[0-2])/\d{2}$'
    if not re.match(pattern, expiry_date):
        return False, "Expiry date must be in MM/YY format"
    
    month, year = expiry_date.split('/')
    current_year = int(datetime.now().strftime('%y'))
    current_month = int(datetime.now().strftime('%m'))
    year = int(year)
    month = int(month)
    
    if year < current_year or (year == current_year and month < current_month):
        return False, "Card has expired"
    
    return True, "Valid"


def validate_cvv(cvv):
    """Validate CVV"""
    if not cvv.isdigit() or len(cvv) not in [3, 4]:
        return False, "CVV must be 3-4 digits"
    return True, "Valid"


def validate_cardholder_name(name):
    """Validate cardholder name"""
    if not name or len(name.strip()) < 3:
        return False, "Cardholder name must be at least 3 characters"
    
    if not re.match(r'^[a-zA-Z\s]+$', name):
        return False, "Cardholder name must contain only letters and spaces"
    
    return True, "Valid"


def validate_bank_selection(bank):
    """Validate bank selection"""
    valid_banks = ['SBI', 'HDFC', 'ICICI', 'Axis', 'PNB', 'BOB']
    if bank not in valid_banks:
        return False, "Please select a valid bank"
    return True, "Valid"


def validate_wallet_selection(wallet):
    """Validate wallet selection"""
    valid_wallets = ['Paytm', 'PhonePe', 'GooglePay', 'AmazonPay']
    if wallet not in valid_wallets:
        return False, "Please select a valid wallet"
    return True, "Valid"


def generate_transaction_id():
    """Generate unique transaction ID"""
    import os
    return f"TXN{datetime.now().strftime('%Y%m%d%H%M%S')}{os.urandom(4).hex().upper()}"


# Store transaction reference
TRANSACTION_REFERENCE = {}

# ============ ROUTES ============

@app.route('/')
def index():
    """Welcome page"""
    if session.get('logged_in'):
        return redirect(url_for('payment'))
    return render_template('index.html')


@app.route('/signup', methods=['GET', 'POST'])
def signup():
    """User signup/registration"""
    if request.method == 'POST':
        email = request.form.get('email', '').strip().lower()
        username = request.form.get('username', '').strip()
        password = request.form.get('password', '').strip()
        confirm_password = request.form.get('confirm_password', '').strip()
        full_name = request.form.get('full_name', '').strip()
        
        # Validate all fields
        is_valid, msg = validate_email(email)
        if not is_valid:
            flash(msg, 'error')
            return redirect(url_for('signup'))
        
        is_valid, msg = validate_username(username)
        if not is_valid:
            flash(msg, 'error')
            return redirect(url_for('signup'))
        
        is_valid, msg = validate_password(password)
        if not is_valid:
            flash(msg, 'error')
            return redirect(url_for('signup'))
        
        if password != confirm_password:
            flash('Passwords do not match', 'error')
            return redirect(url_for('signup'))
        
        is_valid, msg = validate_full_name(full_name)
        if not is_valid:
            flash(msg, 'error')
            return redirect(url_for('signup'))
        
        # Check if user already exists
        if User.query.filter_by(email=email).first():
            flash('Email already registered', 'error')
            return redirect(url_for('signup'))
        
        if User.query.filter_by(username=username).first():
            flash('Username already taken', 'error')
            return redirect(url_for('signup'))
        
        # Create new user
        user = User(email=email, username=username, full_name=full_name)
        user.set_password(password)
        
        try:
            db.session.add(user)
            db.session.commit()
            flash('Account created successfully! Please log in.', 'success')
            return redirect(url_for('login'))
        except Exception as e:
            db.session.rollback()
            flash('An error occurred during registration', 'error')
            return redirect(url_for('signup'))
    
    return render_template('signup.html')


@app.route('/login', methods=['GET', 'POST'])
def login():
    """User login"""
    if request.method == 'POST':
        username_or_email = request.form.get('username_or_email', '').strip()
        password = request.form.get('password', '').strip()
        
        if not username_or_email or not password:
            flash('Please enter username/email and password', 'error')
            return redirect(url_for('login'))
        
        # Find user by username or email
        user = User.query.filter(
            (User.username == username_or_email) | 
            (User.email == username_or_email.lower())
        ).first()
        
        if user and user.check_password(password):
            session['user_id'] = user.id
            session['username'] = user.username
            session['full_name'] = user.full_name
            session['logged_in'] = True
            flash(f'Welcome back, {user.full_name}!', 'success')
            return redirect(url_for('payment'))
        else:
            flash('Invalid username/email or password', 'error')
            return redirect(url_for('login'))
    
    return render_template('login.html')


@app.route('/logout')
def logout():
    """Logout user"""
    session.clear()
    flash('You have been logged out', 'success')
    return redirect(url_for('index'))


@app.route('/payment', methods=['GET', 'POST'])
def payment():
    """Payment page - enter amount and select payment method"""
    if not session.get('logged_in'):
        flash('Please log in first', 'error')
        return redirect(url_for('login'))
    
    if request.method == 'POST':
        amount_str = request.form.get('amount', '').strip()
        
        is_valid, msg = validate_amount(amount_str)
        if not is_valid:
            flash(msg, 'error')
            return redirect(url_for('payment'))
        
        # Store amount in session
        session['amount'] = float(amount_str)
    
    # Get amount from session or use default 0
    amount = session.get('amount', 0)
    user = session.get('full_name', 'User')
    return render_template('payment.html', amount=amount, user=user)


@app.route('/pay', methods=['POST'])
def pay():
    """Process payment through backend - POST from payment form"""
    if not session.get('logged_in'):
        flash('Please log in first', 'error')
        return redirect(url_for('login'))
    
    amount = session.get('amount', 0)
    if amount <= 0:
        flash('Please set an amount first', 'error')
        return redirect(url_for('payment'))
    
    # Get payment method and details from form
    payment_method = request.form.get('method', '').strip()
    
    # Validate based on payment method
    if payment_method == 'UPI':
        upi_id = request.form.get('upi_id', '').strip()
        is_valid, msg = validate_upi(upi_id)
        if not is_valid:
            flash(msg, 'error')
            return redirect(url_for('payment'))
    
    elif payment_method == 'Card':
        cardholder_name = request.form.get('cardholder_name', '').strip()
        card_number = request.form.get('card_number', '').strip()
        expiry_date = request.form.get('expiry_date', '').strip()
        cvv = request.form.get('cvv', '').strip()
        
        is_valid, msg = validate_cardholder_name(cardholder_name)
        if not is_valid:
            flash(msg, 'error')
            return redirect(url_for('payment'))
        
        is_valid, msg = validate_card_number(card_number)
        if not is_valid:
            flash(msg, 'error')
            return redirect(url_for('payment'))
        
        is_valid, msg = validate_expiry_date(expiry_date)
        if not is_valid:
            flash(msg, 'error')
            return redirect(url_for('payment'))
        
        is_valid, msg = validate_cvv(cvv)
        if not is_valid:
            flash(msg, 'error')
            return redirect(url_for('payment'))
    
    elif payment_method == 'Net Banking':
        bank = request.form.get('bank', '').strip()
        is_valid, msg = validate_bank_selection(bank)
        if not is_valid:
            flash(msg, 'error')
            return redirect(url_for('payment'))
    
    elif payment_method == 'Wallet':
        wallet = request.form.get('wallet', '').strip()
        is_valid, msg = validate_wallet_selection(wallet)
        if not is_valid:
            flash(msg, 'error')
            return redirect(url_for('payment'))
    
    else:
        flash('Invalid payment method', 'error')
        return redirect(url_for('payment'))
    
    # Generate transaction ID
    transaction_id = generate_transaction_id()
    
    # Build transaction data
    transaction_data = {
        'method': payment_method,
        'amount': amount,
        'user': session.get('username'),
        'full_name': session.get('full_name'),
        'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    }
    
    # Add method-specific data
    if payment_method == 'UPI':
        transaction_data['upi_id'] = request.form.get('upi_id', '').strip()
    elif payment_method == 'Card':
        card_number = request.form.get('card_number', '').strip()
        transaction_data['card_last_4'] = card_number.replace(' ', '')[-4:]
        transaction_data['cardholder'] = request.form.get('cardholder_name', '').strip()
    elif payment_method == 'Net Banking':
        transaction_data['bank'] = request.form.get('bank', '').strip()
    elif payment_method == 'Wallet':
        transaction_data['wallet'] = request.form.get('wallet', '').strip()
    
    # Store transaction in backend
    TRANSACTION_REFERENCE[transaction_id] = transaction_data
    
    # Clear amount from session
    session.pop('amount', None)
    
    # Redirect to success page
    flash(f'Payment of ₹{amount:.2f} processed successfully via {payment_method}!', 'success')
    return redirect(url_for('success', transaction_id=transaction_id))


@app.route('/success/<transaction_id>')
def success(transaction_id):
    """Payment success page"""
    if not session.get('logged_in'):
        return redirect(url_for('login'))
    
    transaction = TRANSACTION_REFERENCE.get(transaction_id, {})
    if not transaction:
        flash('Invalid transaction ID', 'error')
        return redirect(url_for('payment'))
    
    return render_template('success.html', transaction_id=transaction_id, transaction=transaction)


@app.errorhandler(404)
def page_not_found(error):
    """Handle 404 errors"""
    return render_template('404.html'), 404


if __name__ == '__main__':
    app.run(debug=True, host='127.0.0.1', port=5000)
