import { useState } from 'react';
import { validateLogin, validateSignUp, validateForgotPassword } from './auth';

function Login({ onLogin, view, onViewChange }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    const validationErrors = validateLogin({ email, password });
    setErrors(validationErrors);
    setSuccessMessage('');

    if (Object.keys(validationErrors).length > 0) return;

    onLogin(email);
  };

  const handleSignUpSubmit = (e) => {
    e.preventDefault();
    const validationErrors = validateSignUp({ fullName, email, password, confirmPassword, agreeToTerms });
    setErrors(validationErrors);
    setSuccessMessage('');

    if (Object.keys(validationErrors).length > 0) return;

    setSuccessMessage('Account setup is ready. Connect your backend later to save the new user.');
  };

  const handleForgotPasswordSubmit = (e) => {
    e.preventDefault();
    const validationErrors = validateForgotPassword({ email });
    setErrors(validationErrors);
    setSuccessMessage('');

    if (Object.keys(validationErrors).length > 0) return;

    setSuccessMessage('Password reset instructions will be sent to your email once backend integration is added.');
  };

  const renderSwitchLinks = () => (
    <div className="auth-switch">
      {view !== 'login' && (
        <button type="button" className="text-link" onClick={() => { setErrors({}); setSuccessMessage(''); onViewChange('login'); }}>
          Back to login
        </button>
      )}
      {view === 'login' && (
        <>
          <button type="button" className="text-link" onClick={() => { setErrors({}); setSuccessMessage(''); onViewChange('signup'); }}>
            Create account
          </button>
          <button type="button" className="text-link" onClick={() => { setErrors({}); setSuccessMessage(''); onViewChange('forgot'); }}>
            Forgot password?
          </button>
        </>
      )}
    </div>
  );

  return (
    <div className="auth-shell">
      <div className="auth-visual-panel">
        <div className="auth-visual-card">
          <div className="auth-badge">Enterprise</div>
          <h2>Streamline your business operations</h2>
          <p>Secure workflows, faster approvals, and real-time visibility for teams that move fast.</p>
          <ul>
            <li>Automated task routing</li>
            <li>Centralized project oversight</li>
            <li>Reliable audit-ready records</li>
          </ul>
        </div>
      </div>

      <div className="auth-form-panel">
        <div className="login-card">
          <div className="login-brand">
            <div className="brand-badge">A</div>
            <div>
              <h2>{view === 'signup' ? 'Create your account' : view === 'forgot' ? 'Reset your password' : 'Automation Portal'}</h2>
              <p className="login-subtitle">
                {view === 'signup'
                  ? 'Start managing projects with a secure account.'
                  : view === 'forgot'
                    ? 'Enter your email to receive reset instructions.'
                    : 'Secure access for your operations workspace'}
              </p>
            </div>
          </div>

          {errors.general && <div className="login-error">{errors.general}</div>}
          {successMessage && <div className="login-success">{successMessage}</div>}

          {view === 'login' && (
            <form onSubmit={handleLoginSubmit} noValidate>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  className={errors.email ? 'input-error' : ''}
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setErrors((prev) => ({ ...prev, email: '' })); }}
                />
                {errors.email && <span className="field-error">{errors.email}</span>}
              </div>
              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  className={errors.password ? 'input-error' : ''}
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setErrors((prev) => ({ ...prev, password: '' })); }}
                />
                {errors.password && <span className="field-error">{errors.password}</span>}
              </div>
              <button type="submit" className="login-btn">Login</button>
            </form>
          )}

          {view === 'signup' && (
            <form onSubmit={handleSignUpSubmit} noValidate>
              <div className="form-group">
                <label>Full name</label>
                <input
                  type="text"
                  className={errors.fullName ? 'input-error' : ''}
                  placeholder="Enter your full name"
                  value={fullName}
                  onChange={(e) => { setFullName(e.target.value); setErrors((prev) => ({ ...prev, fullName: '' })); }}
                />
                {errors.fullName && <span className="field-error">{errors.fullName}</span>}
              </div>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  className={errors.email ? 'input-error' : ''}
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setErrors((prev) => ({ ...prev, email: '' })); }}
                />
                {errors.email && <span className="field-error">{errors.email}</span>}
              </div>
              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  className={errors.password ? 'input-error' : ''}
                  placeholder="Create a password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setErrors((prev) => ({ ...prev, password: '' })); }}
                />
                {errors.password && <span className="field-error">{errors.password}</span>}
              </div>
              <div className="form-group">
                <label>Confirm password</label>
                <input
                  type="password"
                  className={errors.confirmPassword ? 'input-error' : ''}
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setErrors((prev) => ({ ...prev, confirmPassword: '' })); }}
                />
                {errors.confirmPassword && <span className="field-error">{errors.confirmPassword}</span>}
              </div>
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={agreeToTerms}
                  onChange={(e) => { setAgreeToTerms(e.target.checked); setErrors((prev) => ({ ...prev, agreeToTerms: '' })); }}
                />
                <span>I agree to the terms and privacy policy.</span>
              </label>
              {errors.agreeToTerms && <span className="field-error">{errors.agreeToTerms}</span>}
              <button type="submit" className="login-btn">Create account</button>
            </form>
          )}

          {view === 'forgot' && (
            <form onSubmit={handleForgotPasswordSubmit} noValidate>
              <div className="form-group">
                <label>Email address</label>
                <input
                  type="email"
                  className={errors.email ? 'input-error' : ''}
                  placeholder="Enter your registered email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setErrors((prev) => ({ ...prev, email: '' })); }}
                />
                {errors.email && <span className="field-error">{errors.email}</span>}
              </div>
              <button type="submit" className="login-btn">Send reset link</button>
            </form>
          )}

          {renderSwitchLinks()}
        </div>
      </div>
    </div>
  );
}

export default Login;
