// Main App component with state-based step management
import { useBookingStore } from './store/bookingStore';
import { Step1FilmChoice } from './pages/Step1FilmChoice';
import { Step2ContactDetails } from './pages/Step2ContactDetails';
import { Confirmation } from './pages/Confirmation';

function App() {
  const { currentStep } = useBookingStore();

  // Render component based on current step
  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return <Step1FilmChoice />;
      case 2:
        return <Step2ContactDetails />;
      case 3:
        return <Confirmation />;
      default:
        return <Step1FilmChoice />;
    }
  };

  return (
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
        {renderCurrentStep()}
      </main>
    </div>
  );
}

export default App;
