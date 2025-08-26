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

  // Load screening details for all groups
  useEffect(() => {
    const loadScreeningDetails = async () => {
      const screeningIds = store.groups
        .filter(group => group.selectedScreeningId)
        .map(group => group.selectedScreeningId!);
      
      if (screeningIds.length === 0) return;
      
      try {
        // Get all screenings for Amsterdam and Den Haag to find our selections
        const [amsterdamScreenings, denHaagScreenings] = await Promise.all([
          screeningApi.getScreenings('a'),
          screeningApi.getScreenings('d')
        ]);
        
        const allScreenings = [...amsterdamScreenings, ...denHaagScreenings];
        const screeningMap: Record<string, ScreeningData> = {};
        
        for (const screeningId of screeningIds) {
          const screening = allScreenings.find(s => s.id.toString() === screeningId);
          if (screening) {
            screeningMap[screeningId] = screening;
          }
        }
        
        setGroupScreenings(screeningMap);
      } catch (error) {
        console.error('Failed to load screening details:', error);
      }
    };
    
    loadScreeningDetails();
  }, [store.groups]);

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
        setSubmitResult({
          success: false,
          error: 'Er zijn niet genoeg plaatsen beschikbaar voor één of meer vertoningen. Pas uw aanmelding aan en probeer opnieuw.'
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
        // Reset form after successful submission
        setTimeout(() => {
          store.resetForm();
        }, 5000);
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
            Uw aanmelding is ontvangen met referentienummer: <strong>{submitResult.bookingId}</strong>
          </p>
          <p className="success-subtext">
            U ontvangt binnenkort een bevestiging per e-mail met alle details van uw boeking.
          </p>
          <div className="success-footer">
            <p>Het formulier wordt over 5 seconden automatisch gereset voor een nieuwe aanmelding.</p>
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
          <p className="error-text">
            {submitResult.error}
          </p>
          <div className="error-actions">
            <button
              onClick={() => store.setCurrentStep(2)}
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
          Controleer uw gegevens en verstuur de aanmelding.
        </p>
      </div>

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
                        <strong>Stad:</strong> {screening.Stad === 'a' ? 'Amsterdam' : 'Den Haag'}
                      </div>
                      {screening.Capaciteit && (
                        <div>
                          <strong>Capaciteit zaal:</strong> {screening.Capaciteit}
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
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="navigation-buttons">
        <button
          type="button"
          onClick={() => store.setCurrentStep(2)}
          className="btn btn-secondary"
          disabled={isSubmitting}
        >
          Terug naar contactgegevens
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="btn btn-primary"
        >
          {isSubmitting ? 'Versturen...' : 'Aanmelding versturen'}
        </button>
      </div>
    </div>
  );
};