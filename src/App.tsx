// Main App component with routing and step management

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useBookingStore } from './store/bookingStore';
import { Step1FilmChoice } from './pages/Step1FilmChoice';
import { Step2ContactDetails } from './pages/Step2ContactDetails';
import { Confirmation } from './pages/Confirmation';

function App() {
  const { currentStep } = useBookingStore();

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header>
          <div className="container">
            <div className="flex justify-between items-center py-4">
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  Movies that Matter - Educatie Aanmelding
                </h1>
              </div>
              
              {/* Step Indicator */}
              <nav className="flex space-x-4">
                <div className={`step-indicator ${
                  currentStep === 1 
                    ? 'step-current' 
                    : currentStep > 1 
                      ? 'step-completed'
                      : 'step-inactive'
                }`}>
                  <span className="mr-2">1</span>
                  Filmkeuze
                  {currentStep > 1 && <span className="ml-2">✓</span>}
                </div>
                <div className={`step-indicator ${
                  currentStep === 2 
                    ? 'step-current' 
                    : currentStep > 2 
                      ? 'step-completed'
                      : 'step-inactive'
                }`}>
                  <span className="mr-2">2</span>
                  Contactgegevens
                  {currentStep > 2 && <span className="ml-2">✓</span>}
                </div>
              </nav>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="py-8">
          <Routes>
            {/* Step 1: Film Choice */}
            <Route 
              path="/stap-1" 
              element={currentStep >= 1 ? <Step1FilmChoice /> : <Navigate to="/stap-1" replace />} 
            />
            
            {/* Step 2: Contact Details */}
            <Route 
              path="/stap-2" 
              element={currentStep >= 2 ? <Step2ContactDetails /> : <Navigate to="/stap-1" replace />} 
            />
            
            {/* Confirmation Page */}
            <Route 
              path="/bevestiging" 
              element={currentStep >= 2 ? <Confirmation /> : <Navigate to="/stap-1" replace />} 
            />
            
            {/* Default redirect */}
            <Route 
              path="/" 
              element={<Navigate to={`/stap-${currentStep}`} replace />} 
            />
            
            {/* Catch all - redirect to current step */}
            <Route 
              path="*" 
              element={<Navigate to={`/stap-${currentStep}`} replace />} 
            />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
