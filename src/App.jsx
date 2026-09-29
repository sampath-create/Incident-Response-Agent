import React, { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import NewIncidentModal from './components/NewIncidentModal';

import Dashboard from './pages/Dashboard';
import IncidentDetail from './pages/IncidentDetail';
import MemoryHub from './pages/MemoryHub';

export default function App() {
  const [newIncidentOpen, setNewIncidentOpen] = useState(false);

  return (
    <BrowserRouter>
      <div className="app-layout">
        {/* Toast Notifications */}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#131926',
              color: '#f1f5f9',
              border: '1px solid #1e293b',
              fontSize: '13px',
              fontFamily: 'Inter, system-ui, sans-serif',
            },
            success: {
              iconTheme: {
                primary: '#10b981',
                secondary: '#0f172a',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#0f172a',
              },
            },
          }}
        />

        {/* Global Sidebar */}
        <Sidebar onOpenNewIncident={() => setNewIncidentOpen(true)} />

        {/* Main Content Area */}
        <div className="main-wrapper">
          <Navbar onOpenNewIncident={() => setNewIncidentOpen(true)} />

          <main className="content-area">
            <Routes>
              <Route
                path="/"
                element={<Dashboard onOpenNewIncident={() => setNewIncidentOpen(true)} />}
              />
              <Route path="/incidents/:id" element={<IncidentDetail />} />
              <Route path="/memory" element={<MemoryHub />} />
            </Routes>
          </main>
        </div>

        {/* Modal */}
        <NewIncidentModal
          isOpen={newIncidentOpen}
          onClose={() => setNewIncidentOpen(false)}
        />
      </div>
    </BrowserRouter>
  );
}
