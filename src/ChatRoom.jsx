import { useState, useEffect, useRef } from 'react';
import {
  doc,
  getDoc,
  onSnapshot,
  collection,
  query,
  orderBy,
  addDoc,
  updateDoc,
  arrayUnion,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import ShareLink from './ShareLink';

export default function ChatRoom({ roomId, user }) {
  const [room, setRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState('');
  const bottomRef = useRef(null);

  // Load room and auto-join if needed
  useEffect(() => {
    async function loadRoom() {
      try {
        const roomRef = doc(db, 'rooms', roomId);
        const snap = await getDoc(roomRef);
        if (!snap.exists()) {
          setNotFound(true);
          return;
        }
        const data = snap.data();
        setRoom({ id: snap.id, ...data });
        if (!data.members.includes(user.uid)) {
          await updateDoc(roomRef, { members: arrayUnion(user.uid) });
        }
      } catch (err) {
        console.error('Failed to load room:', err);
        setLoadError(err.code === 'permission-denied'
          ? 'You do not have permission to access this room.'
          : 'Failed to load room. Please try again.');
      }
    }
    loadRoom();
  }, [roomId, user.uid]);

  // Listen for room updates (name changes, etc.)
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'rooms', roomId), (snap) => {
      if (snap.exists()) setRoom({ id: snap.id, ...snap.data() });
    });
    return unsub;
  }, [roomId]);

  // Listen for messages
  useEffect(() => {
    const q = query(
      collection(db, 'rooms', roomId, 'messages'),
      orderBy('timestamp', 'asc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [roomId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendMessage(e) {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    const msgText = text.trim();
    setText('');
    try {
      await addDoc(collection(db, 'rooms', roomId, 'messages'), {
        text: msgText,
        uid: user.uid,
        displayName: user.displayName || user.email,
        timestamp: serverTimestamp(),
      });
      await updateDoc(doc(db, 'rooms', roomId), {
        lastMessage: msgText,
        lastMessageAt: serverTimestamp(),
      });
    } finally {
      setSending(false);
    }
  }

  if (notFound) {
    return (
      <div style={styles.center}>
        <h2>Room not found</h2>
        <button style={styles.backBtn} onClick={() => (window.location.hash = '/')}>
          ← Back to rooms
        </button>
      </div>
    );
  }

  if (loadError) {
    return (
      <div style={styles.center}>
        <p style={{ color: '#e53e3e', marginBottom: 16 }}>{loadError}</p>
        <button style={styles.backBtn} onClick={() => (window.location.hash = '/')}>
          ← Back to rooms
        </button>
      </div>
    );
  }

  if (!room) {
    return <div style={styles.center}>Loading room...</div>;
  }

  return (
    <div style={styles.page}>
      <div style={styles.topbar}>
        <button style={styles.backBtn} onClick={() => (window.location.hash = '/')}>
          ←
        </button>
        <div style={styles.roomInfo}>
          <span style={styles.roomName}># {room.name}</span>
          <span style={styles.memberCount}>{room.members?.length || 1} member{room.members?.length !== 1 ? 's' : ''}</span>
        </div>
        <ShareLink roomId={roomId} />
      </div>

      <div style={styles.messages}>
        {messages.length === 0 && (
          <div style={styles.emptyMessages}>
            No messages yet. Be the first to say something!
          </div>
        )}
        {messages.map((msg, i) => {
          const isOwn = msg.uid === user.uid;
          const showName = !isOwn && (i === 0 || messages[i - 1].uid !== msg.uid);
          return (
            <div key={msg.id} style={{ ...styles.msgWrapper, alignItems: isOwn ? 'flex-end' : 'flex-start' }}>
              {showName && <div style={styles.senderName}>{msg.displayName}</div>}
              <div style={isOwn ? styles.bubbleOwn : styles.bubble}>
                {msg.text}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={sendMessage} style={styles.inputBar}>
        <input
          style={styles.input}
          type="text"
          placeholder={`Message #${room.name}`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={sending}
          autoFocus
        />
        <button style={styles.sendBtn} type="submit" disabled={sending || !text.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}

const styles = {
  page: { display: 'flex', flexDirection: 'column', height: '100vh', background: '#f7f8fc' },
  center: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 16 },
  topbar: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '12px 20px',
    background: '#fff',
    borderBottom: '1px solid #e2e8f0',
    boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
  },
  backBtn: {
    background: 'none',
    border: 'none',
    fontSize: 20,
    cursor: 'pointer',
    color: '#667eea',
    padding: '4px 8px',
    borderRadius: 6,
  },
  roomInfo: { flex: 1, display: 'flex', flexDirection: 'column' },
  roomName: { fontWeight: 700, fontSize: 16, color: '#1a1d2e' },
  memberCount: { fontSize: 12, color: '#999' },
  messages: {
    flex: 1,
    overflowY: 'auto',
    padding: '20px 20px 8px',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  emptyMessages: { textAlign: 'center', color: '#aaa', marginTop: 40, fontSize: 14 },
  msgWrapper: { display: 'flex', flexDirection: 'column', marginBottom: 4 },
  senderName: { fontSize: 12, color: '#888', marginBottom: 2, paddingLeft: 4 },
  bubble: {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '2px 16px 16px 16px',
    padding: '8px 14px',
    fontSize: 14,
    color: '#333',
    maxWidth: '70%',
    wordBreak: 'break-word',
    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
  },
  bubbleOwn: {
    background: 'linear-gradient(135deg, #667eea, #764ba2)',
    borderRadius: '16px 16px 2px 16px',
    padding: '8px 14px',
    fontSize: 14,
    color: '#fff',
    maxWidth: '70%',
    wordBreak: 'break-word',
    boxShadow: '0 2px 8px rgba(102,126,234,0.3)',
  },
  inputBar: {
    display: 'flex',
    gap: 10,
    padding: '14px 20px',
    background: '#fff',
    borderTop: '1px solid #e2e8f0',
  },
  input: {
    flex: 1,
    padding: '10px 16px',
    borderRadius: 24,
    border: '1px solid #e2e8f0',
    fontSize: 14,
    outline: 'none',
    background: '#f7f8fc',
  },
  sendBtn: {
    padding: '10px 20px',
    borderRadius: 24,
    border: 'none',
    background: 'linear-gradient(135deg, #667eea, #764ba2)',
    color: '#fff',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
};
