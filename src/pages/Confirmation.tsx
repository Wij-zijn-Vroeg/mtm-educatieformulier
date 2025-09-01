// Confirmation page for successful booking submission

import React, { useState, useEffect } from 'react';
import { useBookingStore } from '../store/bookingStore';
import { bookingApi, screeningApi } from '../api/endpoints';
import type { ScreeningData } from '../api/endpoints';
import { formatDutchDate, formatTime } from '../utils/dateUtils';

export const Confirmation: React.FC = () => {
  const store = useBookingStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{
    success: boolean;
    bookingId?: string;
    error?: string;
  } | null>(null);
  const [groupScreenings, setGroupScreenings] = useState<Record<string, ScreeningData>>({});
  const [capacityWarnings, setCapacityWarnings] = useState<string[]>([]);

  // Load screening details for all groups - always fetch fresh data
  useEffect(() => {
    const loadScreeningDetails = async () => {
      const screeningIds = store.groups
        .filter(group => group.selectedScreeningId)
        .map(group => group.selectedScreeningId!);
      
      if (screeningIds.length === 0) return;
      
      try {
        // Always fetch fresh screening data to get current available seats
        const [amsterdamScreenings, denHaagScreenings] = await Promise.all([
          screeningApi.getScreenings('Amsterdam'),
          screeningApi.getScreenings('Den Haag')
        ]);
        
        const allScreenings = [...amsterdamScreenings, ...denHaagScreenings];
        const screeningMap: Record<string, ScreeningData> = {};
        const warnings: string[] = [];
        
        for (const screeningId of screeningIds) {
          const screening = allScreenings.find(s => s.id.toString() === screeningId);
          if (screening) {
            screeningMap[screeningId] = screening;
            
            // Check if any group requesting this screening exceeds capacity
            const groupsForThisScreening = store.groups.filter(g => g.selectedScreeningId === screeningId);
            for (const group of groupsForThisScreening) {
              const totalPeople = group.Aantal_leerlingen_studenten + group.Aantal_begeleiders;
              if (screening.Beschikbare_plekken_educatie !== null && 
                  screening.Beschikbare_plekken_educatie < totalPeople) {
                const groupIndex = store.groups.findIndex(g => g.id === group.id);
                warnings.push(
                  `Groep ${groupIndex + 1}: ${screening.Title_in_use} op ${formatDutchDate(screening.Datum)} heeft onvoldoende plekken (${screening.Beschikbare_plekken_educatie} beschikbaar, ${totalPeople} aangevraagd)`
                );
              }
            }
          }
        }
        
        setGroupScreenings(screeningMap);
        setCapacityWarnings(warnings);
      } catch (error) {
        console.error('Failed to load screening details:', error);
      }
    };
    
    loadScreeningDetails();
  }, [store.groups]);

  const handleReset = () => {
    if (confirm('Weet u zeker dat u het formulier wilt wissen? Al uw ingevoerde gegevens gaan verloren.')) {
      store.resetForm();
      // resetForm already sets currentStep to 1
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitResult(null);

    try {
      // Prepare submission data
      const personData = store.preparePersonData();
      const organisationData = store.prepareOrganisationData();
      const aanmeldingData = store.prepareAanmeldingData();

      // Check seat availability first
      const availabilityCheck = await bookingApi.checkSeatAvailability(
        store.groups.map(group => ({
          selectedScreeningId: group.selectedScreeningId!,
          totalPeople: group.Aantal_leerlingen_studenten + group.Aantal_begeleiders
        }))
      );

      if (!availabilityCheck.available) {
        // Build detailed error message with specific screenings
        let errorMessage = 'Er zijn niet genoeg plaatsen beschikbaar voor de volgende vertoning(en):\n\n';
        
        for (const conflict of availabilityCheck.conflicts) {
          const screening = Object.values(groupScreenings).find(s => s.id.toString() === conflict.screeningId);
          if (screening) {
            errorMessage += `• ${screening.Title_in_use}\n`;
            errorMessage += `  ${formatDutchDate(screening.Datum)} om ${formatTime(screening.Aanvang)}\n`;
            errorMessage += `  ${screening.Naam}, ${screening.Stad === 'a' ? 'Amsterdam' : 'Den Haag'}\n`;
            errorMessage += `  Beschikbaar: ${conflict.available}, Aangevraagd: ${conflict.requested}\n\n`;
          } else {
            errorMessage += `• Vertoning ID ${conflict.screeningId}\n`;
            errorMessage += `  Beschikbaar: ${conflict.available}, Aangevraagd: ${conflict.requested}\n\n`;
          }
        }
        
        errorMessage += 'Pas uw aanmelding aan en probeer opnieuw.';
        
        setSubmitResult({
          success: false,
          error: errorMessage
        });
        return;
      }

      // Submit booking
      const result = await bookingApi.submitBooking({
        personData,
        organisationData,
        aanmeldingData,
        groups: store.groups
      });

      setSubmitResult(result);

      if (result.success) {
        // Form will be reset manually by user via button
      }

    } catch (error) {
      console.error('Submission failed:', error);
      setSubmitResult({
        success: false,
        error: 'Er is een onverwachte fout opgetreden. Probeer het opnieuw.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitResult?.success) {
    return (
      <div className="container">
        <div className="success-message">
          <div className="success-icon">✓</div>
          <h1>Aanmelding succesvol verstuurd!</h1>
          <p className="success-text">
            Jouw aanmelding is in goede orde ontvangen met referentienummer: <strong>{submitResult.bookingId}</strong>
          </p>
          <p className="success-subtext">
            Je ontvangt binnenkort een bevestiging per e-mail met alle details van jouw boeking.
          </p>
          <div className="success-footer">
            <button
              type="button"
              onClick={() => {
                store.resetForm();
                // resetForm already sets currentStep to 1
              }}
              className="btn btn-primary"
            >
              Nieuwe aanmelding starten
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (submitResult?.error) {
    return (
      <div className="container">
        <div className="error-message">
          <div className="error-icon">✗</div>
          <h1>Aanmelding mislukt</h1>
          <div className="error-text">
            {submitResult.error.split('\n').map((line, index) => (
              <div key={index} className={line.trim() === '' ? 'mb-2' : ''}>
                {line || '\u00A0'}{/* Non-breaking space for empty lines */}
              </div>
            ))}
          </div>
          <div className="error-actions">
            <button
              onClick={() => {
                store.setCurrentStep(2);
              }}
              className="btn btn-primary"
            >
              Terug naar contactgegevens
            </button>
            <button
              onClick={() => setSubmitResult(null)}
              className="btn btn-secondary"
            >
              Opnieuw proberen
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="mb-8">
        <h1>Bevestiging aanmelding</h1>
        <p className="page-subtitle">
          Controleer hieronder de gegevens van jouw aanmelding en verstuur deze.
        </p>
      </div>

      {/* Capacity warnings */}
      {capacityWarnings.length > 0 && (
        <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start">
            <div className="text-red-600 text-xl mr-3">⚠️</div>
            <div>
              <h3 className="text-red-800 font-semibold mb-2">
                Onvoldoende beschikbare plekken
              </h3>
              <div className="text-red-700 text-sm space-y-1">
                {capacityWarnings.map((warning, index) => (
                  <div key={index}>{warning}</div>
                ))}
                <div className="mt-3 font-medium">
                  De beschikbare plekken zijn veranderd sinds je de eerste stap hebt ingevuld. Je kunt de aanmelding niet versturen totdat je jouw groepsgrootte aanpast of een andere vertoning selecteert.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="space-y-6 mb-8">
        {/* Groups Summary */}
        <div className="card">
          <h2>Geselecteerde vertoningen</h2>
          {store.groups.map((group, index) => {
            const screening = group.selectedScreeningId ? groupScreenings[group.selectedScreeningId] : null;
            
            return (
              <div key={group.id} className="group-summary">
                <h3>Groep {index + 1}</h3>
                
                {/* Screening Details */}
                {screening && (
                  <div className="screening-details">
                    <div className="screening-title">
                      <strong>Film:</strong> {screening.Title_in_use}
                    </div>
                    <div className="screening-info">
                      <div>
                        <strong>Datum:</strong> {formatDutchDate(screening.Datum)}
                      </div>
                      <div>
                        <strong>Tijd:</strong> {formatTime(screening.Aanvang)}
                      </div>
                      <div>
                        <strong>Locatie:</strong> {screening.Naam}
                      </div>
                      <div>
                        <strong>Stad:</strong> {screening.Stad}
                      </div>
                      {screening.Capaciteit && (
                        <div>
                          <strong>Capaciteit zaal:</strong> {screening.Capaciteit}
                        </div>
                      )}
                      {screening.Beschikbare_plekken_educatie !== null && (
                        <div>
                          <strong>Beschikbare plekken:</strong> {screening.Beschikbare_plekken_educatie}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Group Details */}
                <div className="group-info">
                  <div>
                    <strong>Onderwijstype:</strong> {group.educationTypeNames.join(', ')}
                  </div>
                  <div>
                    <strong>Aantal leerlingen:</strong> {group.Aantal_leerlingen_studenten}
                  </div>
                  <div>
                    <strong>Aantal begeleiders:</strong> {group.Aantal_begeleiders}
                  </div>
                  {group.Toelichting && (
                    <div className="group-toelichting">
                      <strong>Toelichting:</strong> {group.Toelichting}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Contact Summary */}
        <div className="card">
          <h2>Contactgegevens</h2>
          <div className="contact-info">
            <div>
              <strong>Naam:</strong> {store.teacher.First_name} {store.teacher.Middle_name} {store.teacher.Last_name}
            </div>
            <div>
              <strong>E-mail:</strong> {store.teacher.Email_work}
            </div>
            <div>
              <strong>Telefoon:</strong> {store.teacher.Mobile_phone}
            </div>
            <div>
              <strong>School:</strong> {
                store.school.lookupId 
                  ? store.school.selectedSchoolName 
                  : store.school.schoolName
              }
            </div>
{/* Display correct invoice address based on selection */}
            {(() => {
              // Determine which address to show
              let invoiceAddress = '';
              if (store.school.Factuuradres_keuze === '0' && store.school.existingFactuuradres) {
                // "Hetzelfde als schooladres" selected and we have known address
                invoiceAddress = store.school.existingFactuuradres;
              } else if (store.school.Factuuradres) {
                // Manual address entered or school not in list
                invoiceAddress = store.school.Factuuradres;
              }
              
              return invoiceAddress ? (
                <div>
                  <strong>Factuuradres:</strong> {invoiceAddress}
                </div>
              ) : null;
            })()}
            {store.school.Factuurreferentie && (
              <div>
                <strong>Factuurreferentie:</strong> {store.school.Factuurreferentie}
              </div>
            )}
            {store.school.E_mailadres_voor_factuur && store.school.E_mailadres_voor_factuur !== store.teacher.Email_work && (
              <div>
                <strong>E-mail factuur:</strong> {store.school.E_mailadres_voor_factuur}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between">
        <button
          type="button"
          onClick={handleReset}
          className="btn btn-outline text-red-600 hover:bg-red-50"
          disabled={isSubmitting}
        >
          Formulier wissen
        </button>
        <div className="flex space-x-4">
          <button
            type="button"
            onClick={() => {
              if (capacityWarnings.length > 0) {
                store.setCurrentStep(1);
              } else {
                store.setCurrentStep(2);
              }
            }}
            className="btn btn-secondary"
            disabled={isSubmitting}
          >
            {capacityWarnings.length > 0 ? 'Terug naar filmkeuze' : 'Terug naar contactgegevens'}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || capacityWarnings.length > 0}
            className={`btn ${capacityWarnings.length > 0 ? 'btn-disabled' : 'btn-primary'}`}
          >
            {isSubmitting ? 'Versturen...' : 'Aanmelding versturen'}
          </button>
        </div>
      </div>
    </div>
  );
};