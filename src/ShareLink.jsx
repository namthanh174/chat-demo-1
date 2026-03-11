import { useState } from 'react';

export default function ShareLink({ roomId }) {
  const [copied, setCopied] = useState(false);
  const link = `${window.location.origin}/#/room/${roomId}`;

  function copyLink() {
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <button onClick={copyLink} style={copied ? styles.btnCopied : styles.btn}>
      {copied ? '✓ Copied!' : '🔗 Share Room'}
    </button>
  );
}

const styles = {
  btn: {
    padding: '6px 14px',
    borderRadius: 20,
    border: '1px solid #667eea',
    background: '#fff',
    color: '#667eea',
    fontSize: 13,
    cursor: 'pointer',
    fontWeight: 500,
  },
  btnCopied: {
    padding: '6px 14px',
    borderRadius: 20,
    border: '1px solid #48bb78',
    background: '#f0fff4',
    color: '#276749',
    fontSize: 13,
    cursor: 'pointer',
    fontWeight: 500,
  },
};
