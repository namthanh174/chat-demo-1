import { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { db, auth } from './firebase';

export default function RoomList({ user }) {
  const [rooms, setRooms] = useState([]);
  const [newRoomName, setNewRoomName] = useState('');
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, 'rooms'),
      where('members', 'array-contains', user.uid)
    );
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => {
        const ta = a.lastMessageAt?.toMillis?.() ?? a.createdAt?.toMillis?.() ?? 0;
        const tb = b.lastMessageAt?.toMillis?.() ?? b.createdAt?.toMillis?.() ?? 0;
        return tb - ta;
      });
      setRooms(list);
    });
    return unsub;
  }, [user.uid]);

  async function createRoom(e) {
    e.preventDefault();
    if (!newRoomName.trim()) return;
    setCreating(true);
    try {
      const ref = await addDoc(collection(db, 'rooms'), {
        name: newRoomName.trim(),
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        members: [user.uid],
        lastMessage: '',
        lastMessageAt: serverTimestamp(),
      });
      setNewRoomName('');
      setShowForm(false);
      window.location.hash = `/room/${ref.id}`;
    } finally {
      setCreating(false);
    }
  }

  function openRoom(id) {
    window.location.hash = `/room/${id}`;
  }

  return (
    <div style={styles.page}>
      <div style={styles.sidebar}>
        <div style={styles.header}>
          <div>
            <div style={styles.appName}>💬 ChatDemo</div>
            <div style={styles.userName}>{user.displayName || user.email}</div>
          </div>
          <button style={styles.signOutBtn} onClick={() => signOut(auth)}>Sign Out</button>
        </div>

        <div style={styles.roomsHeader}>
          <span style={styles.roomsTitle}>Rooms</span>
          <button style={styles.newRoomBtn} onClick={() => setShowForm(!showForm)}>+</button>
        </div>

        {showForm && (
          <form onSubmit={createRoom} style={styles.createForm}>
            <input
              style={styles.input}
              type="text"
              placeholder="Room name..."
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              autoFocus
            />
            <button style={styles.createBtn} type="submit" disabled={creating}>
              {creating ? '...' : 'Create'}
            </button>
          </form>
        )}

        <div style={styles.roomList}>
          {rooms.length === 0 && (
            <div style={styles.emptyState}>
              No rooms yet. Create one or join via a shared link.
            </div>
          )}
          {rooms.map((room) => (
            <button key={room.id} style={styles.roomItem} onClick={() => openRoom(room.id)}>
              <div style={styles.roomName}># {room.name}</div>
              {room.lastMessage && (
                <div style={styles.roomPreview}>{room.lastMessage}</div>
              )}
            </button>
          ))}
        </div>
      </div>

      <div style={styles.welcome}>
        <div style={styles.welcomeIcon}>💬</div>
        <h2 style={styles.welcomeTitle}>Welcome to ChatDemo</h2>
        <p style={styles.welcomeText}>Select a room or create a new one to start chatting.</p>
      </div>
    </div>
  );
}

const styles = {
  page: { display: 'flex', height: '100vh', overflow: 'hidden', background: '#f7f8fc' },
  sidebar: {
    width: 280,
    background: '#1a1d2e',
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
  },
  header: {
    padding: '20px 16px',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  appName: { color: '#fff', fontWeight: 700, fontSize: 18 },
  userName: { color: '#aaa', fontSize: 12, marginTop: 2 },
  signOutBtn: {
    background: 'none',
    border: '1px solid rgba(255,255,255,0.2)',
    color: '#aaa',
    borderRadius: 6,
    padding: '4px 8px',
    fontSize: 12,
    cursor: 'pointer',
  },
  roomsHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 16px 8px',
  },
  roomsTitle: { color: '#888', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 },
  newRoomBtn: {
    background: 'rgba(255,255,255,0.1)',
    border: 'none',
    color: '#fff',
    borderRadius: '50%',
    width: 24,
    height: 24,
    fontSize: 18,
    cursor: 'pointer',
    lineHeight: '24px',
    textAlign: 'center',
    padding: 0,
  },
  createForm: { padding: '0 12px 12px', display: 'flex', gap: 8 },
  input: {
    flex: 1,
    padding: '8px 10px',
    borderRadius: 6,
    border: 'none',
    background: 'rgba(255,255,255,0.1)',
    color: '#fff',
    fontSize: 13,
    outline: 'none',
  },
  createBtn: {
    padding: '8px 12px',
    borderRadius: 6,
    border: 'none',
    background: '#667eea',
    color: '#fff',
    fontSize: 13,
    cursor: 'pointer',
    fontWeight: 600,
  },
  roomList: { flex: 1, overflowY: 'auto', padding: '0 8px' },
  roomItem: {
    width: '100%',
    background: 'none',
    border: 'none',
    color: '#ccc',
    textAlign: 'left',
    padding: '10px 12px',
    borderRadius: 8,
    cursor: 'pointer',
    display: 'block',
    marginBottom: 2,
  },
  roomName: { fontSize: 14, fontWeight: 500 },
  roomPreview: { fontSize: 12, color: '#666', marginTop: 2, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' },
  emptyState: { color: '#555', fontSize: 13, padding: '16px 12px', lineHeight: 1.5 },
  welcome: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#999',
  },
  welcomeIcon: { fontSize: 64, marginBottom: 16 },
  welcomeTitle: { margin: 0, color: '#444', fontSize: 22 },
  welcomeText: { marginTop: 8, fontSize: 15 },
};
