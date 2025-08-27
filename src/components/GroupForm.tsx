// Group form component for selecting screening and entering group details

import React, { useState, useEffect } from 'react';
import { useBookingStore } from '../store/bookingStore';
import type { GroupData } from '../store/bookingStore';
import { screeningApi } from '../api/endpoints';
import type { ScreeningData, EducationTypeData } from '../api/endpoints';
import { FORM_CONFIG } from '../utils/constants';
import { formatDutchDate, formatTime } from '../utils/dateUtils';

interface GroupFormProps {
  groupId: string;
  groupIndex: number;
  onRemove?: () => void;
  showRemoveButton?: boolean;
}

export const GroupForm: React.FC<GroupFormProps> = ({
  groupId,
  groupIndex,
  onRemove,
  showRemoveButton = false
}) => {
  const { groups, updateGroup, getTotalPeopleInGroup } = useBookingStore();
  const group = groups.find(g => g.id === groupId);
  
  const [screenings, setScreenings] = useState<ScreeningData[]>([]);
  const [educationTypes, setEducationTypes] = useState<EducationTypeData[]>([]);
  const [loading, setLoading] = useState(false);
  const [educationTypesLoading, setEducationTypesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Field validation state
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});


  // Load education types on mount
  useEffect(() => {
    const loadEducationTypes = async () => {
      setEducationTypesLoading(true);
      try {
        const types = await screeningApi.getEducationTypes();
        setEducationTypes(types);
      } catch (err) {
        console.error('Failed to load education types:', err);
      } finally {
        setEducationTypesLoading(false);
      }
    };

    loadEducationTypes();
  }, []);

  // Load screenings when city or education types change
  useEffect(() => {
    const loadScreenings = async () => {
      if (!group?.stad) {
        setScreenings([]);
        return;
      }
      
      setLoading(true);
      setError(null);
      
      try {
        const educationTypeIds = group.educationTypeIds.length > 0 ? group.educationTypeIds : undefined;
        const data = await screeningApi.getScreenings(group.stad, educationTypeIds);
        setScreenings(data);
      } catch (err) {
        setError('Kon filmvertoningen niet laden');
        console.error('Failed to load screenings:', err);
      } finally {
        setLoading(false);
      }
    };

    loadScreenings();
  }, [group?.stad, group?.educationTypeIds]);

  if (!group) return null;

  const validateField = (field: string, value: any) => {
    let error = '';
    
    switch (field) {
      case 'Aantal_leerlingen_studenten':
        if (!value || value < 1) {
          error = 'Aantal leerlingen moet minimaal 1 zijn';
        } else if (value > FORM_CONFIG.MAX_GROUP_SIZE) {
          error = `Maximum ${FORM_CONFIG.MAX_GROUP_SIZE} leerlingen per groep`;
        }
        break;
      case 'educationTypeIds':
        if (!value || value.length === 0) {
          error = 'Selecteer minimaal één onderwijstype';
        }
        break;
      case 'Toelichting':
        if (needsToelichting && (!value || value.trim().length === 0)) {
          error = 'Toelichting is verplicht voor MBO en ISK';
        }
        break;
      case 'Aantal_begeleiders':
        if (!value || value < 1) {
          error = 'Aantal begeleiders moet minimaal 1 zijn';
        } else if (value > FORM_CONFIG.MAX_GROUP_SIZE) {
          error = `Maximum ${FORM_CONFIG.MAX_GROUP_SIZE} begeleiders per groep`;
        }
        break;
      case 'stad':
        if (!value || value.length === 0) {
          error = 'Selecteer een stad';
        }
        break;
      case 'selectedScreeningId':
        if (!value) {
          error = 'Selecteer een screening';
        }
        break;
    }
    
    // Check total group size
    if (field === 'Aantal_leerlingen_studenten' || field === 'Aantal_begeleiders') {
      const students = field === 'Aantal_leerlingen_studenten' ? value : group?.Aantal_leerlingen_studenten || 0;
      const supervisors = field === 'Aantal_begeleiders' ? value : group?.Aantal_begeleiders || 0;
      const total = students + supervisors;
      
      if (total > FORM_CONFIG.MAX_GROUP_SIZE) {
        error = `Totaal aantal personen (${total}) mag niet meer dan ${FORM_CONFIG.MAX_GROUP_SIZE} zijn`;
      }
    }
    
    setFieldErrors(prev => ({
      ...prev,
      [field]: error
    }));
    
    return error === '';
  };

  const handleFieldChange = (field: keyof GroupData, value: any) => {
    const updates: Partial<GroupData> = { [field]: value };
    
    // Clear screening selection when changing stad or education types
    if (field === 'stad' || field === 'educationTypeIds') {
      updates.selectedScreeningId = null;
    }
    
    updateGroup(groupId, updates);
    
    // Clear error when user starts typing/changing
    if (fieldErrors[field]) {
      setFieldErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleFieldBlur = (field: string, value: any) => {
    validateField(field, value);
  };

  const handleEducationTypeToggle = (typeId: number, typeName: string) => {
    const currentIds = group.educationTypeIds;
    const currentNames = group.educationTypeNames;
    
    let newIds, newNames;
    if (currentIds.includes(typeId)) {
      // Remove type
      newIds = currentIds.filter(id => id !== typeId);
      newNames = currentNames.filter(name => name !== typeName);
    } else {
      // Add type
      newIds = [...currentIds, typeId];
      newNames = [...currentNames, typeName];
    }
    
    updateGroup(groupId, { 
      educationTypeIds: newIds, 
      educationTypeNames: newNames 
    });
    
    // Validate education types
    validateField('educationTypeIds', newIds);
  };

  const totalPeople = getTotalPeopleInGroup(groupId);
  // Check if any selected education type is MBO/ISK
  const mboIskIds = [3, 14, 24, 29];
  const needsToelichting = group.educationTypeIds.some(id => mboIskIds.includes(id));

  // Listen for validation trigger from step button
  useEffect(() => {
    const handleValidateAll = () => {
      // Validate all required fields
      validateField('Aantal_leerlingen_studenten', group.Aantal_leerlingen_studenten);
      validateField('educationTypeIds', group.educationTypeIds);
      validateField('Aantal_begeleiders', group.Aantal_begeleiders);
      validateField('stad', group.stad);
      validateField('selectedScreeningId', group.selectedScreeningId);
      if (needsToelichting) {
        validateField('Toelichting', group.Toelichting);
      }
    };

    window.addEventListener('validateAllGroups', handleValidateAll);
    return () => window.removeEventListener('validateAllGroups', handleValidateAll);
  }, [group, needsToelichting]);

  return (
    <div className="card space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold text-gray-900">
          Groep {groupIndex + 1}
        </h3>
        {showRemoveButton && (
          <button
            type="button"
            onClick={onRemove}
            className="btn btn-secondary text-red-600"
          >
            Verwijder groep
          </button>
        )}
      </div>

      {/* Section 1: Group fields */}
      <div className="space-y-4">

        {/* Aantal leerlingen/studenten */}
        <div className="space-y-2">
          <label>
            Aantal leerlingen/studenten *
          </label>
          <input
            type="number"
            min="1"
            max={FORM_CONFIG.MAX_GROUP_SIZE}
            value={group.Aantal_leerlingen_studenten || ''}
            onChange={(e) => handleFieldChange('Aantal_leerlingen_studenten', parseInt(e.target.value) || 0)}
            onBlur={(e) => handleFieldBlur('Aantal_leerlingen_studenten', parseInt(e.target.value) || 0)}
            className={fieldErrors['Aantal_leerlingen_studenten'] ? 'field-invalid' : ''}
            required
          />
          {fieldErrors['Aantal_leerlingen_studenten'] && (
            <div className="field-error">{fieldErrors['Aantal_leerlingen_studenten']}</div>
          )}
        </div>

        {/* Onderwijstype en leerjaar */}
        <div className="space-y-2">
          <label>
            Onderwijstype en leerjaar *
          </label>
          {educationTypesLoading ? (
            <div className="text-sm text-gray-500">Laden...</div>
          ) : (
            <div className={`space-y-2 border rounded-md p-3 ${
              fieldErrors['educationTypeIds'] ? 'border-red-600' : 'border-gray-200'
            }`}>
              {educationTypes.map((type) => (
                <label key={type.Id} className="flex items-center" style={{ width: 'fit-content' }}>
                  <input
                    type="checkbox"
                    checked={group.educationTypeIds.includes(type.Id)}
                    onChange={() => handleEducationTypeToggle(type.Id, type.Type)}
                  />
                  <span className="text-sm text-gray-700">{type.Type}</span>
                </label>
              ))}
            </div>
          )}
          {fieldErrors['educationTypeIds'] && (
            <div className="field-error">{fieldErrors['educationTypeIds']}</div>
          )}
        </div>

        {/* Toelichting (alleen voor MBO/ISK) */}
        {needsToelichting && (
          <div className="space-y-2">
            <label>
              Toelichting *
            </label>
            <textarea
              value={group.Toelichting || ''}
              onChange={(e) => handleFieldChange('Toelichting', e.target.value)}
              onBlur={(e) => handleFieldBlur('Toelichting', e.target.value)}
              className={fieldErrors['Toelichting'] ? 'field-invalid' : ''}
              rows={3}
              placeholder="Geef een toelichting voor deze MBO/ISK groep"
              required={needsToelichting}
            />
            {fieldErrors['Toelichting'] && (
              <div className="field-error">{fieldErrors['Toelichting']}</div>
            )}
          </div>
        )}

        {/* Aantal begeleiders */}
        <div className="space-y-2">
          <label>
            Aantal begeleiders *
          </label>
          <input
            type="number"
            min="1"
            max={FORM_CONFIG.MAX_GROUP_SIZE}
            value={group.Aantal_begeleiders || ''}
            onChange={(e) => handleFieldChange('Aantal_begeleiders', parseInt(e.target.value) || 0)}
            onBlur={(e) => handleFieldBlur('Aantal_begeleiders', parseInt(e.target.value) || 0)}
            className={fieldErrors['Aantal_begeleiders'] ? 'field-invalid' : ''}
            required
          />
          {fieldErrors['Aantal_begeleiders'] && (
            <div className="field-error">{fieldErrors['Aantal_begeleiders']}</div>
          )}
        </div>
      </div>

      {/* Section 2: Screening */}
      <div className="space-y-4">
        <h4 className="text-lg font-semibold text-gray-900">Filmvertoning</h4>
        
        {/* Warning text */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
          <p className="text-sm text-yellow-800">
            <strong>Let op:</strong> Als het aantal plekken rood wordt weergegeven, zijn er niet voldoende stoelen voor jouw groep beschikbaar in de zaal.
          </p>
        </div>

        {/* Show selected education types */}
        {group.educationTypeNames.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <div className="flex justify-between items-center text-sm" style={{ gap: '1.5rem' }}>
              <span><strong>Aantal personen:</strong> {totalPeople}</span>
              <span><strong>Leerjaar/niveau van mijn groep:</strong> {group.educationTypeNames.join(', ')}</span>
            </div>
          </div>
        )}

        {/* Keuze stad */}
        <div className="space-y-2">
          <label>
            Stad *
          </label>
          <select
            value={group.stad}
            onChange={(e) => handleFieldChange('stad', e.target.value)}
            onBlur={(e) => handleFieldBlur('stad', e.target.value)}
            className={fieldErrors['stad'] ? 'field-invalid' : ''}
            required
          >
            <option value="">Selecteer een stad</option>
            <option value="a">Amsterdam</option>
            <option value="d">Den Haag</option>
          </select>
          {fieldErrors['stad'] && (
            <div className="field-error">{fieldErrors['stad']}</div>
          )}
        </div>

        {/* Keuze film/screening */}
        <div className="space-y-2">
          <label>
            Kies filmvertoning *
          </label>
          {loading ? (
            <div className="text-sm text-gray-500">Laden...</div>
          ) : error ? (
            <div className="text-sm text-red-600">{error}</div>
          ) : (
            <div className={`border rounded-md ${fieldErrors['selectedScreeningId'] ? 'border-red-600' : 'border-gray-300'}`}>
              {!group.stad || group.educationTypeIds.length === 0 || screenings.length === 0 ? (
                <div className="p-3 text-sm text-gray-500">
                  {!group.stad ? 'Selecteer eerst een stad' : 
                   group.educationTypeIds.length === 0 ? 'Selecteer eerst een onderwijstype' :
                   screenings.length === 0 ? 'Geen vertoningen beschikbaar voor dit onderwijstype' :
                   'Selecteer een filmvertoning'}
                </div>
              ) : (
                <div className="overflow-y-auto" style={{ maxHeight: '400px' }}>
                  <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
                    <thead>
                      <tr className="border-b border-gray-300" style={{ backgroundColor: 'var(--gray-100)' }}>
                        <th style={{ width: '40px', padding: '0.75rem' }}></th>
                        <th className="text-sm font-medium text-gray-700 text-left" style={{ padding: '0.75rem' }}>Datum</th>
                        <th className="text-sm font-medium text-gray-700 text-left" style={{ padding: '0.75rem' }}>Tijd</th>
                        <th className="text-sm font-medium text-gray-700 text-left" style={{ padding: '0.75rem' }}>Titel</th>
                        <th className="text-sm font-medium text-gray-700 text-left" style={{ padding: '0.75rem' }}>Stad</th>
                        <th className="text-sm font-medium text-gray-700 text-left" style={{ padding: '0.75rem' }}>Locatie</th>
                        <th className="text-sm font-medium text-gray-700 text-left" style={{ padding: '0.75rem' }}>Totale capaciteit zaal</th>
                        <th className="text-sm font-medium text-gray-700 text-left" style={{ padding: '0.75rem' }}>Beschikbare plekken</th>
                      </tr>
                    </thead>
                    <tbody>
                      {screenings.map((screening) => {
                        const availableSeats = screening.Beschikbare_plekken_educatie;
                        const hasEnoughSeats = availableSeats === null || availableSeats >= totalPeople;
                        const isSelected = group.selectedScreeningId === screening.id.toString();
                        
                        return (
                          <tr
                            key={screening.id}
                            onClick={() => {
                              handleFieldChange('selectedScreeningId', screening.id.toString());
                              handleFieldBlur('selectedScreeningId', screening.id.toString());
                            }}
                            className={`screening-item border-b border-gray-200 ${
                              isSelected ? 'bg-green-50' : ''
                            }`}
                            style={{ cursor: 'pointer' }}
                          >
                            <td style={{ padding: '0.75rem' }}>
                              <input 
                                type="radio" 
                                checked={isSelected}
                                readOnly
                                style={{ accentColor: 'var(--mtm-blue)' }}
                              />
                            </td>
                            <td className="text-gray-900" style={{ padding: '0.75rem' }}>{formatDutchDate(screening.Datum)}</td>
                            <td className="text-gray-900" style={{ padding: '0.75rem' }}>{formatTime(screening.Aanvang)}</td>
                            <td className="text-gray-900 font-medium" style={{ padding: '0.75rem' }}>{screening.Title_in_use}</td>
                            <td className="text-gray-900" style={{ padding: '0.75rem' }}>{screening.Stad === 'a' ? 'Amsterdam' : 'Den Haag'}</td>
                            <td className="text-gray-900" style={{ padding: '0.75rem' }}>{screening.Naam}</td>
                            <td className="text-gray-900" style={{ padding: '0.75rem' }}>{screening.Capaciteit || '-'}</td>
                            <td className={hasEnoughSeats ? 'text-green-600' : 'text-red-600 font-medium'} style={{ padding: '0.75rem' }}>
                              {availableSeats !== null ? availableSeats : '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
          {fieldErrors['selectedScreeningId'] && (
            <div className="field-error">{fieldErrors['selectedScreeningId']}</div>
          )}
        </div>

        {/* Show seat availability warning */}
        {group.selectedScreeningId && screenings.length > 0 && (
          (() => {
            const selectedScreening = screenings.find(s => s.id.toString() === group.selectedScreeningId);
            if (selectedScreening && selectedScreening.Beschikbare_plekken_educatie !== null && 
                selectedScreening.Beschikbare_plekken_educatie < totalPeople) {
              return (
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <p className="text-sm text-red-800">
                    <strong>Let op:</strong> Er zijn slechts {selectedScreening.Beschikbare_plekken_educatie} plekken beschikbaar, 
                    maar jouw groep heeft {totalPeople} personen. Kies een andere filmvertoning of verklein je groep.
                  </p>
                </div>
              );
            }
            return null;
          })()
        )}
      </div>
    </div>
  );
};