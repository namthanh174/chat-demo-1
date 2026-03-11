import { useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';

export default function AuthPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isSignUp) {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(cred.user, { displayName });
        await setDoc(doc(db, 'users', cred.user.uid), {
          displayName,
          email,
          createdAt: serverTimestamp(),
        });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      setError(err.message.replace('Firebase: ', '').replace(/ \(auth\/.*\)/, ''));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>💬 ChatDemo</h1>
        <h2 style={styles.subtitle}>{isSignUp ? 'Create Account' : 'Sign In'}</h2>
        <form onSubmit={handleSubmit} style={styles.form}>
          {isSignUp && (
            <input
              style={styles.input}
              type="text"
              placeholder="Display Name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
            />
          )}
          <input
            style={styles.input}
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            style={styles.input}
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
          {error && <p style={styles.error}>{error}</p>}
          <button style={styles.btn} type="submit" disabled={loading}>
            {loading ? 'Please wait...' : isSignUp ? 'Create Account' : 'Sign In'}
          </button>
        </form>
        <p style={styles.toggle}>
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button style={styles.link} onClick={() => { setIsSignUp(!isSignUp); setError(''); }}>
            {isSignUp ? 'Sign In' : 'Sign Up'}
          </button>
        </p>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  },
  card: {
    background: '#fff',
    borderRadius: 16,
    padding: '40px 36px',
    width: '100%',
    maxWidth: 400,
    boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
  },
  title: { margin: 0, fontSize: 28, textAlign: 'center', color: '#333' },
  subtitle: { margin: '8px 0 24px', fontSize: 18, textAlign: 'center', color: '#666', fontWeight: 400 },
  form: { display: 'flex', flexDirection: 'column', gap: 12 },
  input: {
    padding: '12px 14px',
    borderRadius: 8,
    border: '1px solid #ddd',
    fontSize: 15,
    outline: 'none',
  },
  btn: {
    padding: '12px',
    borderRadius: 8,
    border: 'none',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: '#fff',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: 4,
  },
  error: { color: '#e53e3e', margin: 0, fontSize: 14 },
  toggle: { textAlign: 'center', marginTop: 20, color: '#666', fontSize: 14 },
  link: {
    background: 'none',
    border: 'none',
    color: '#667eea',
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 600,
    padding: 0,
  },
};
