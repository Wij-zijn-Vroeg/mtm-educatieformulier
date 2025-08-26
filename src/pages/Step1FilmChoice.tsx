// Step 1: Film Choice - Group selection and screening booking

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useBookingStore } from '../store/bookingStore';
import { GroupForm } from '../components/GroupForm';
import { FORM_CONFIG } from '../utils/constants';
import { validateStep1 } from '../schemas/validation';

export const Step1FilmChoice: React.FC = () => {
  const navigate = useNavigate();
  const { 
    groups, 
    addGroup, 
    removeGroup, 
    goToNextStep,
    isStep1Valid,
    getTotalPeopleAllGroups 
  } = useBookingStore();

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
    console.log('groups:', groups);
    if (isStep1Valid()) {
      console.log('Calling goToNextStep');
      goToNextStep();
      navigate('/stap-2');
    } else {
      console.log('Step 1 validation failed');
      // Trigger validation on all group forms to show errors
      window.dispatchEvent(new CustomEvent('validateAllGroups'));
    }
  };

  const totalPeople = getTotalPeopleAllGroups();
  const canAddGroup = groups.length < FORM_CONFIG.MAX_GROUPS;
  const validationResult = validateStep1({ groups });

  return (
    <div className="container">
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
        <div /> {/* Empty div for spacing */}
        <button
          type="button"
          onClick={handleNext}
          className={`btn ${isStep1Valid() ? 'btn-primary' : 'btn btn-secondary'}`}
        >
          Naar stap 2: Contactgegevens
        </button>
      </div>
    </div>
  );
};