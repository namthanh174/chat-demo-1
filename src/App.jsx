import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';
import AuthPage from './AuthPage';
import RoomList from './RoomList';
import ChatRoom from './ChatRoom';

function getRoute() {
  const hash = window.location.hash;
  const match = hash.match(/^#\/room\/(.+)$/);
  if (match) return { view: 'room', roomId: match[1] };
  return { view: 'list' };
}

export default function App() {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [route, setRoute] = useState(getRoute());

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthReady(true);
    });
    return unsub;
  }, []);

  useEffect(() => {
    function onHashChange() {
      setRoute(getRoute());
    }
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  if (!authReady) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontSize: 18, color: '#888' }}>
        Loading...
      </div>
    );
  }

  if (!user) return <AuthPage />;

  if (route.view === 'room') {
    return <ChatRoom roomId={route.roomId} user={user} />;
  }

  return <RoomList user={user} />;
}
