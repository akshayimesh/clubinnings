import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { AuthLayout } from '../components/AuthLayout';
import { FormError, errorMessage } from '../components/FormError';

export function SignupPage() {
  const { signup, user } = useAuth();
  const navigate = useNavigate();
  const [clubName, setClubName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to="/" replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signup({ clubName, email, password });
      navigate('/', { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout title="Create your club" subtitle="You'll be the club's first admin.">
      <form onSubmit={onSubmit}>
        <label>
          Club name
          <input required minLength={2} value={clubName} onChange={(e) => setClubName(e.target.value)} />
        </label>
        <label>
          Your email
          <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label>
          Password
          <input
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <span className="hint">At least 8 characters.</span>
        </label>
        <FormError message={error} />
        <button type="submit" disabled={submitting}>
          {submitting ? 'Creating…' : 'Create club'}
        </button>
      </form>
      <p className="muted">
        Already registered? <Link to="/login">Log in</Link>
      </p>
    </AuthLayout>
  );
}
