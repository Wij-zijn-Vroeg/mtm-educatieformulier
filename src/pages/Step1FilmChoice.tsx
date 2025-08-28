// Step 1: Film Choice - Group selection and screening booking

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBookingStore } from '../store/bookingStore';
import { GroupForm } from '../components/GroupForm';
import { FORM_CONFIG } from '../utils/constants';
import type { ScreeningData } from '../api/endpoints';

export const Step1FilmChoice: React.FC = () => {
  const navigate = useNavigate();
  const { 
    groups, 
    addGroup, 
    removeGroup, 
    goToNextStep,
    isStep1Valid,
    resetForm,
    introText,
    loadDefaultSettings,
  } = useBookingStore();
  
  // Track screenings loaded by GroupForm components
  const [allScreenings, setAllScreenings] = useState<Record<string, ScreeningData>>({});

  // Load default settings on component mount
  useEffect(() => {
    if (!introText) {
      loadDefaultSettings();
    }
  }, [introText, loadDefaultSettings]);

  // Callback for GroupForm to report loaded screenings
  const handleScreeningsLoaded = (_groupId: string, screenings: ScreeningData[]) => {
    setAllScreenings(prev => {
      const updated = { ...prev };
      // Index screenings by ID for easy lookup
      screenings.forEach(screening => {
        updated[screening.id.toString()] = screening;
      });
      return updated;
    });
  };

  // Check if any group has capacity issues
  const hasCapacityIssues = (): boolean => {
    return groups.some(group => {
      if (!group.selectedScreeningId) return false;
      
      const screening = allScreenings[group.selectedScreeningId];
      if (!screening) return false;
      
      const totalPeople = group.Aantal_leerlingen_studenten + group.Aantal_begeleiders;
      return screening.Beschikbare_plekken_educatie !== null && 
             screening.Beschikbare_plekken_educatie < totalPeople;
    });
  };

  const handleAddGroup = () => {
    if (groups.length < FORM_CONFIG.MAX_GROUPS) {
      addGroup();
    }
  };

  const handleRemoveGroup = (groupId: string) => {
    if (groups.length > 1) {
      removeGroup(groupId);
    }
  };

  const handleNext = () => {
    console.log('handleNext called');
    console.log('isStep1Valid():', isStep1Valid());
    console.log('hasCapacityIssues():', hasCapacityIssues());
    console.log('groups:', groups);
    
    const basicValidation = isStep1Valid();
    const capacityValid = !hasCapacityIssues();
    
    if (basicValidation && capacityValid) {
      console.log('Calling goToNextStep');
      goToNextStep();
      navigate('/stap-2');
    } else {
      console.log('Step 1 validation failed - basic:', basicValidation, 'capacity:', capacityValid);
      // Trigger validation on all group forms to show errors
      window.dispatchEvent(new CustomEvent('validateAllGroups'));
    }
  };

  const handleReset = () => {
    if (confirm('Weet u zeker dat u het formulier wilt wissen? Al uw ingevoerde gegevens gaan verloren.')) {
      resetForm();
      navigate('/stap-1');
    }
  };

  const canAddGroup = groups.length < FORM_CONFIG.MAX_GROUPS;

  return (
    <div className="container">
      {/* Intro Text from Default Settings */}
      {introText && (
        <div 
          className="intro-text mb-8"
          dangerouslySetInnerHTML={{ __html: introText }}
        />
      )}

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Stap 1: Kies filmvertoning(en)
        </h1>
        <p className="text-gray-600">
          Selecteer voor elke groep een filmvertoning. U kunt maximaal {FORM_CONFIG.MAX_GROUPS} groepen aanmelden.
        </p>
      </div>

      {/* Groups */}
      <div className="space-y-6 mb-8">
        {groups.map((group, index) => (
          <GroupForm
            key={group.id}
            groupId={group.id}
            groupIndex={index}
            showRemoveButton={groups.length > 1}
            onRemove={() => handleRemoveGroup(group.id)}
            onScreeningsLoaded={handleScreeningsLoaded}
          />
        ))}
      </div>

      {/* Add Group Button */}
      {canAddGroup && (
        <div className="mb-8">
          <button
            type="button"
            onClick={handleAddGroup}
            className="btn btn-outline"
          >
            + Groep toevoegen
          </button>
          <p className="text-sm text-gray-500 mt-2">
            U kunt nog {FORM_CONFIG.MAX_GROUPS - groups.length} groep(en) toevoegen
          </p>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <button
          type="button"
          onClick={handleReset}
          className="btn btn-outline text-red-600 hover:bg-red-50"
        >
          Formulier wissen
        </button>
        <button
          type="button"
          onClick={handleNext}
          className={`btn ${isStep1Valid() && !hasCapacityIssues() ? 'btn-primary' : 'btn btn-secondary'}`}
        >
          Naar stap 2: Contactgegevens
        </button>
      </div>
    </div>
  );
};