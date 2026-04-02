import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Where from './pages/vibez/Where';
import WhereLogin from './pages/vibez/WhereLogin';
import WhereRegister from './pages/vibez/WhereRegister';
import WhereDashboard from './pages/vibez/WhereDashboard';
import WhereProfile from './pages/vibez/WhereProfile';
import WhereChat from './pages/vibez/WhereChat';
import WhereAdmin from './pages/vibez/WhereAdmin';
import WhereGroupRooms from './pages/vibez/WhereGroupRooms';
import WhereGroupChat from './pages/vibez/WhereGroupChat';
import ProtectedRoute from './components/vibez/where/ProtectedRoute';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/vibez/where" element={<Where />} />
          <Route path="/vibez/where/login" element={
            <ProtectedRoute require="unauthenticated"><WhereLogin /></ProtectedRoute>
          } />
          <Route path="/vibez/where/register" element={
            <ProtectedRoute require="incomplete"><WhereRegister /></ProtectedRoute>
          } />
          <Route path="/vibez/where/dashboard" element={
            <ProtectedRoute require="completed"><WhereDashboard /></ProtectedRoute>
          } />
          <Route path="/vibez/where/profile" element={
            <ProtectedRoute require="completed"><WhereProfile /></ProtectedRoute>
          } />
          <Route path="/vibez/where/chat" element={
            <ProtectedRoute require="completed"><WhereChat /></ProtectedRoute>
          } />
          <Route path="/vibez/where/admin" element={
            <ProtectedRoute require="completed"><WhereAdmin /></ProtectedRoute>
          } />
          <Route path="/vibez/where/rooms" element={
            <ProtectedRoute require="completed"><WhereGroupRooms /></ProtectedRoute>
          } />
          <Route path="/vibez/where/rooms/:roomId" element={
            <ProtectedRoute require="completed"><WhereGroupChat /></ProtectedRoute>
          } />
          <Route path="/" element={<Where />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
