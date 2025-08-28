// Step 2: Contact Details - Teacher and School information

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AsyncSelect from 'react-select/async';
import { useBookingStore } from '../store/bookingStore';
import { organisationApi, addressApi } from '../api/endpoints';
import type { OrganisationData, OrganisationTypeData } from '../api/endpoints';

export const Step2ContactDetails: React.FC = () => {
  const navigate = useNavigate();
  const { 
    teacher, 
    school, 
    updateTeacher, 
    updateSchool, 
    updateField,
    goToPreviousStep,
    isStep2Valid,
    Naam_tweede_contactpersoon,
    Betalen_met_CJP,
    CJP_nummer,
    Opmerkingen,
    Akkoord_privacyverklaring,
    Akkoord_algemene_voorwaarden,
    resetForm
  } = useBookingStore();

  // School search state
  const [schoolTypes, setSchoolTypes] = useState<OrganisationTypeData[]>([]);
  const [isLoadingSchools, setIsLoadingSchools] = useState(false);

  // Field validation state
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Load school types on mount
  useEffect(() => {
    const loadSchoolTypes = async () => {
      try {
        const types = await organisationApi.getSchoolTypes();
        setSchoolTypes(types);
      } catch (error) {
        console.error('Failed to load school types:', error);
      }
    };
    loadSchoolTypes();
  }, []);

  // Load factuur address when school is selected
  useEffect(() => {
    const loadFactuurAddress = async () => {
      if (school.lookupId) {
        try {
          const address = await addressApi.getFactuurAddress(school.lookupId);
          if (address) {
            updateSchool({
              bekendFactuuradres: true,
              existingFactuuradres: addressApi.formatAddress(address)
            });
          } else {
            // No factuur address found - handle smartly
            updateSchool({
              bekendFactuuradres: false,
              existingFactuuradres: '',
              Factuuradres_keuze: '1' // Force to manual entry when no existing address
            });
          }
        } catch (error) {
          console.error('Failed to load factuur address:', error);
          // Error loading factuur address - handle smartly
          updateSchool({
            bekendFactuuradres: false,
            existingFactuuradres: '',
            Factuuradres_keuze: '1' // Force to manual entry on error
          });
        }
      }
    };
    loadFactuurAddress();
  }, [school.lookupId, updateSchool]);

  // School search function for React Select
  const loadSchoolOptions = async (inputValue: string) => {
    if (inputValue.length < 2) {
      return [];
    }

    setIsLoadingSchools(true);
    
    try {
      const results = await organisationApi.searchSchools(inputValue);
      return results.map(school => ({
        value: school.id,
        label: school.Name,
        data: school
      }));
    } catch (error) {
      console.error('School search failed:', error);
      return [];
    } finally {
      setIsLoadingSchools(false);
    }
  };

  const handleSchoolSelect = (selectedOption: {value: number, label: string, data: OrganisationData} | null) => {
    if (selectedOption) {
      updateSchool({
        lookupId: selectedOption.data.id,
        selectedSchoolName: selectedOption.data.Name,
        School_staat_niet_in_lijst: false
      });
    } else {
      // Handle clearing selection - reset all school-related data
      updateSchool({
        lookupId: null,
        selectedSchoolName: '',
        School_staat_niet_in_lijst: false,
        bekendFactuuradres: false,
        existingFactuuradres: '',
        Factuuradres_keuze: '0', // Reset to default
        Factuuradres: '',
        Factuurreferentie: '',
        E_mailadres_voor_factuur: ''
      });
    }
    
    // Clear school selection error
    if (fieldErrors['school_selection']) {
      setFieldErrors(prev => ({ ...prev, school_selection: '' }));
    }
  };

  const handleManualSchoolToggle = (checked: boolean) => {
    if (checked) {
      // Clear existing school selection and factuur data
      updateSchool({
        lookupId: null,
        selectedSchoolName: '',
        School_staat_niet_in_lijst: true,
        schoolName: '',
        schoolAdres: '',
        schoolType: null,
        bekendFactuuradres: false,
        existingFactuuradres: '',
        Factuuradres_keuze: '1' // Force to show factuuradres field
      });
    } else {
      updateSchool({
        School_staat_niet_in_lijst: false,
        schoolName: '',
        schoolAdres: '',
        schoolType: null,
        Factuuradres_keuze: '0' // Reset to default
      });
    }
    
    // Clear school selection error
    if (fieldErrors['school_selection']) {
      setFieldErrors(prev => ({ ...prev, school_selection: '' }));
    }
  };

  // Validation function
  const validateField = (field: string, value: any) => {
    let error = '';
    
    switch (field) {
      case 'First_name':
        if (!value || value.trim().length === 0) {
          error = 'Voornaam is verplicht';
        }
        break;
      case 'Last_name':
        if (!value || value.trim().length === 0) {
          error = 'Achternaam is verplicht';
        }
        break;
      case 'Email_work':
        if (!value || value.trim().length === 0) {
          error = 'E-mailadres is verplicht';
        } else {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(value)) {
            error = 'Voer een geldig e-mailadres in';
          }
        }
        break;
      case 'Mobile_phone':
        if (!value || value.trim().length === 0) {
          error = 'Mobiel nummer is verplicht';
        }
        break;
      case 'CJP_nummer':
        if (Betalen_met_CJP && (!value || value.trim().length === 0)) {
          error = 'CJP nummer is verplicht';
        }
        break;
      case 'schoolName':
        if (school.School_staat_niet_in_lijst && (!value || value.trim().length === 0)) {
          error = 'Schoolnaam is verplicht';
        }
        break;
      case 'schoolType':
        if (school.School_staat_niet_in_lijst && (!value || value === null)) {
          error = 'Schooltype is verplicht';
        }
        break;
      case 'Factuuradres':
        // Required when: alternative address selected, manual school entry, or no existing address available
        if ((school.Factuuradres_keuze === '1' || school.School_staat_niet_in_lijst || !school.bekendFactuuradres) && (!value || value.trim().length === 0)) {
          error = 'Factuuradres is verplicht';
        }
        break;
      case 'school_selection':
        // Check if no school is selected at all
        if (!school.School_staat_niet_in_lijst && !school.lookupId) {
          error = 'Selecteer een school of vink aan dat uw school niet in de lijst staat';
        }
        break;
      case 'E_mailadres_voor_factuur':
        if (value && value.trim().length > 0) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(value)) {
            error = 'Voer een geldig e-mailadres in';
          }
        }
        break;
      case 'Akkoord_privacyverklaring':
        if (!value) {
          error = 'U moet akkoord gaan met de privacyverklaring';
        }
        break;
      case 'Akkoord_algemene_voorwaarden':
        if (!value) {
          error = 'U moet akkoord gaan met de algemene voorwaarden';
        }
        break;
    }
    
    setFieldErrors(prev => ({
      ...prev,
      [field]: error
    }));
    
    return error === '';
  };

  const handleFieldBlur = (field: string, value: any) => {
    validateField(field, value);
  };

  const handleTeacherFieldChange = (field: string, value: any) => {
    updateTeacher({ [field]: value });
    
    // Clear error when user starts typing
    if (fieldErrors[field]) {
      setFieldErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleSchoolFieldChange = (field: string, value: any) => {
    updateSchool({ [field]: value });
    
    // Clear error when user starts typing
    if (fieldErrors[field]) {
      setFieldErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleSubmit = () => {
    if (isStep2Valid()) {
      // Navigate to confirmation page using React Router
      navigate('/bevestiging');
    } else {
      // Trigger validation to show errors
      window.dispatchEvent(new CustomEvent('validateAllFields'));
    }
  };

  const handleReset = () => {
    if (confirm('Weet u zeker dat u het formulier wilt wissen? Al uw ingevoerde gegevens gaan verloren.')) {
      resetForm();
      navigate('/stap-1');
    }
  };

  // Listen for validation trigger from submit button
  useEffect(() => {
    const handleValidateAll = () => {
      // Validate all required teacher fields
      validateField('First_name', teacher.First_name);
      validateField('Last_name', teacher.Last_name);
      validateField('Email_work', teacher.Email_work);
      validateField('Mobile_phone', teacher.Mobile_phone);
      
      // Validate school selection
      validateField('school_selection', null);
      
      // Validate school fields if manual entry
      if (school.School_staat_niet_in_lijst) {
        validateField('schoolName', school.schoolName);
        validateField('schoolType', school.schoolType);
      }
      
      // Validate CJP if selected
      if (Betalen_met_CJP) {
        validateField('CJP_nummer', CJP_nummer);
      }
      
      // Validate factuur address if alternative address is selected, manual school entry, or no existing address
      if (school.Factuuradres_keuze === '1' || school.School_staat_niet_in_lijst || !school.bekendFactuuradres) {
        validateField('Factuuradres', school.Factuuradres);
      }
      
      // Validate invoice email if provided
      validateField('E_mailadres_voor_factuur', school.E_mailadres_voor_factuur);
      
      // Validate privacy and terms acceptance
      validateField('Akkoord_privacyverklaring', Akkoord_privacyverklaring);
      validateField('Akkoord_algemene_voorwaarden', Akkoord_algemene_voorwaarden);
    };

    window.addEventListener('validateAllFields', handleValidateAll);
    return () => window.removeEventListener('validateAllFields', handleValidateAll);
  }, [teacher, school, Betalen_met_CJP, CJP_nummer, Akkoord_privacyverklaring, Akkoord_algemene_voorwaarden]);


  // Custom styles for React Select
  const selectStyles = {
    control: (base: any, state: any) => ({
      ...base,
      borderColor: fieldErrors['school_selection'] ? 'var(--mtm-red)' : (state.isFocused ? 'var(--mtm-blue)' : 'var(--gray-300)'),
      boxShadow: state.isFocused 
        ? fieldErrors['school_selection'] 
          ? '0 0 0 1px var(--mtm-red)' 
          : '0 0 0 3px rgba(30, 64, 175, 0.1)'
        : fieldErrors['school_selection']
          ? '0 0 0 1px var(--mtm-red)'
          : 'none',
      '&:hover': {
        borderColor: fieldErrors['school_selection'] ? 'var(--mtm-red)' : 'var(--gray-300)'
      },
      minHeight: '42px',
      fontSize: '0.875rem'
    }),
    placeholder: (base: any) => ({
      ...base,
      color: 'var(--gray-500)',
      fontSize: '0.875rem'
    }),
    option: (base: any, state: any) => ({
      ...base,
      backgroundColor: state.isSelected 
        ? 'var(--mtm-blue)' 
        : state.isFocused 
          ? 'var(--gray-50)' 
          : 'white',
      color: state.isSelected ? 'white' : 'var(--gray-900)',
      fontSize: '0.875rem',
      padding: '0.75rem'
    }),
    loadingIndicator: (base: any) => ({
      ...base,
      color: 'var(--mtm-blue)'
    }),
    clearIndicator: (base: any) => ({
      ...base,
      color: 'var(--gray-500)',
      ':hover': {
        color: 'var(--mtm-red)'
      }
    }),
    dropdownIndicator: (base: any) => ({
      ...base,
      color: 'var(--gray-500)',
      ':hover': {
        color: 'var(--mtm-blue)'
      }
    })
  };

  // Get current selected value for React Select
  const selectedSchoolValue = school.lookupId 
    ? { value: school.lookupId, label: school.selectedSchoolName, data: { id: school.lookupId, Name: school.selectedSchoolName } as OrganisationData }
    : null;

  return (
    <div className="container">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Stap 2: Contactgegevens
        </h1>
        <p className="text-gray-600">
          Vul jouw contactgegevens en schoolinformatie in.
        </p>
      </div>

      <div className="space-y-8">
        {/* Teacher Information */}
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Docent/contactpersoon</h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Voornaam *
              </label>
              <input
                type="text"
                value={teacher.First_name}
                onChange={(e) => handleTeacherFieldChange('First_name', e.target.value)}
                onBlur={(e) => handleFieldBlur('First_name', e.target.value)}
                className={`w-full ${fieldErrors['First_name'] ? 'field-invalid' : ''}`}
                required
              />
              {fieldErrors['First_name'] && (
                <div className="field-error">{fieldErrors['First_name']}</div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tussenvoegsel
              </label>
              <input
                type="text"
                value={teacher.Middle_name}
                onChange={(e) => updateTeacher({ Middle_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Achternaam *
              </label>
              <input
                type="text"
                value={teacher.Last_name}
                onChange={(e) => handleTeacherFieldChange('Last_name', e.target.value)}
                onBlur={(e) => handleFieldBlur('Last_name', e.target.value)}
                className={`w-full ${fieldErrors['Last_name'] ? 'field-invalid' : ''}`}
                required
              />
              {fieldErrors['Last_name'] && (
                <div className="field-error">{fieldErrors['Last_name']}</div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                E-mailadres *
              </label>
              <input
                type="email"
                value={teacher.Email_work}
                onChange={(e) => handleTeacherFieldChange('Email_work', e.target.value)}
                onBlur={(e) => handleFieldBlur('Email_work', e.target.value)}
                className={`w-full ${fieldErrors['Email_work'] ? 'field-invalid' : ''}`}
                required
              />
              {fieldErrors['Email_work'] && (
                <div className="field-error">{fieldErrors['Email_work']}</div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mobiel nummer *
              </label>
              <input
                type="tel"
                value={teacher.Mobile_phone}
                onChange={(e) => handleTeacherFieldChange('Mobile_phone', e.target.value)}
                onBlur={(e) => handleFieldBlur('Mobile_phone', e.target.value)}
                className={`w-full ${fieldErrors['Mobile_phone'] ? 'field-invalid' : ''}`}
                required
              />
              {fieldErrors['Mobile_phone'] && (
                <div className="field-error">{fieldErrors['Mobile_phone']}</div>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={teacher.Newsletter_education}
                  onChange={(e) => updateTeacher({ Newsletter_education: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">
                  Ik wil graag op de hoogte blijven en schrijf me in voor de Movies that Matter educatie nieuwsbrief.
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* School Information */}
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Schoolinformatie</h2>
          
          {/* School Selection */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                School zoeken
              </label>
              <AsyncSelect
                value={selectedSchoolValue}
                onChange={handleSchoolSelect}
                loadOptions={loadSchoolOptions}
                isLoading={isLoadingSchools}
                isClearable
                isSearchable
                isDisabled={school.School_staat_niet_in_lijst}
                placeholder="Typ de naam van jouw school..."
                noOptionsMessage={({ inputValue }) => 
                  inputValue.length < 2 
                    ? "Typ minimaal 2 karakters om te zoeken" 
                    : "Geen scholen gevonden"
                }
                loadingMessage={() => "Zoeken naar scholen..."}
                styles={selectStyles}
                onInputChange={() => {
                  // Clear school selection error when user starts typing
                  if (fieldErrors['school_selection']) {
                    setFieldErrors(prev => ({ ...prev, school_selection: '' }));
                  }
                }}
              />
              {fieldErrors['school_selection'] && (
                <div className="field-error">{fieldErrors['school_selection']}</div>
              )}
            </div>

            {/* Manual School Entry Checkbox */}
            <div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={school.School_staat_niet_in_lijst}
                  onChange={(e) => handleManualSchoolToggle(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">
                  Mijn school staat niet in de lijst
                </span>
              </label>
            </div>

            {/* Manual School Entry Fields */}
            {school.School_staat_niet_in_lijst && (
              <div className="space-y-4 bg-gray-50 p-4 rounded-md">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Schoolnaam *
                  </label>
                  <input
                    type="text"
                    value={school.schoolName}
                    onChange={(e) => handleSchoolFieldChange('schoolName', e.target.value)}
                    onBlur={(e) => handleFieldBlur('schoolName', e.target.value)}
                    className={`w-full ${fieldErrors['schoolName'] ? 'field-invalid' : ''}`}
                    required
                  />
                  {fieldErrors['schoolName'] && (
                    <div className="field-error">{fieldErrors['schoolName']}</div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Schooladres
                  </label>
                  <input
                    type="text"
                    value={school.schoolAdres}
                    onChange={(e) => updateSchool({ schoolAdres: e.target.value })}
                    placeholder="Straatnaam + huisnummer, postcode, plaats"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Schooltype *
                  </label>
                  <select
                    value={school.schoolType || ''}
                    onChange={(e) => handleSchoolFieldChange('schoolType', parseInt(e.target.value) || null)}
                    onBlur={(e) => handleFieldBlur('schoolType', parseInt(e.target.value) || null)}
                    className={`w-full ${fieldErrors['schoolType'] ? 'field-invalid' : ''}`}
                    required
                  >
                    <option value="">Selecteer schooltype</option>
                    {schoolTypes.map((type) => (
                      <option key={type.Id} value={type.Id}>
                        {type.Name}
                      </option>
                    ))}
                  </select>
                  {fieldErrors['schoolType'] && (
                    <div className="field-error">{fieldErrors['schoolType']}</div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Billing Address */}
          <div className="mt-6 space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Factuurgegevens</h3>
            
            {school.bekendFactuuradres && (
              <div className="bg-blue-50 p-3 rounded-md">
                <p className="text-sm text-blue-800">
                  <strong>Bekend factuuradres:</strong> {school.existingFactuuradres}
                </p>
              </div>
            )}
            
            {!school.bekendFactuuradres && school.lookupId && !school.School_staat_niet_in_lijst && (
              <div className="bg-yellow-50 p-3 rounded-md">
                <p className="text-sm text-yellow-800">
                  <strong>Let op:</strong> Er is geen factuuradres bekend voor deze school. Vul hieronder het factuuradres in.
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Factuuradres
              </label>
              <div className="space-y-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="factuuradres_keuze"
                    value="0"
                    checked={school.Factuuradres_keuze === '0'}
                    onChange={(e) => updateSchool({ Factuuradres_keuze: e.target.value as '0' | '1' })}
                    className="text-blue-600 focus:ring-blue-500"
                    disabled={school.School_staat_niet_in_lijst || !school.bekendFactuuradres}
                  />
                  <span className={`text-sm ${(school.School_staat_niet_in_lijst || !school.bekendFactuuradres) ? 'text-gray-400' : 'text-gray-700'}`}>
                    Hetzelfde als schooladres
                  </span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="factuuradres_keuze"
                    value="1"
                    checked={school.Factuuradres_keuze === '1'}
                    onChange={(e) => updateSchool({ Factuuradres_keuze: e.target.value as '0' | '1' })}
                    className="text-blue-600 focus:ring-blue-500"
                    disabled={school.School_staat_niet_in_lijst}
                  />
                  <span className={`text-sm ${school.School_staat_niet_in_lijst ? 'text-gray-400' : 'text-gray-700'}`}>
                    Ander factuuradres
                  </span>
                </label>
              </div>
            </div>

            {(school.Factuuradres_keuze === '1' || school.School_staat_niet_in_lijst || (!school.bekendFactuuradres && school.lookupId)) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Factuuradres *
                </label>
                <textarea
                  value={school.Factuuradres}
                  onChange={(e) => handleSchoolFieldChange('Factuuradres', e.target.value)}
                  onBlur={(e) => handleFieldBlur('Factuuradres', e.target.value)}
                  rows={3}
                  className={`w-full ${fieldErrors['Factuuradres'] ? 'field-invalid' : ''}`}
                  placeholder="Volledig factuuradres..."
                  required
                />
                {fieldErrors['Factuuradres'] && (
                  <div className="field-error">{fieldErrors['Factuuradres']}</div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Factuurreferentie
                </label>
                <input
                  type="text"
                  value={school.Factuurreferentie}
                  onChange={(e) => updateSchool({ Factuurreferentie: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  E-mailadres voor factuur
                </label>
                <input
                  type="email"
                  value={school.E_mailadres_voor_factuur}
                  onChange={(e) => handleSchoolFieldChange('E_mailadres_voor_factuur', e.target.value)}
                  onBlur={(e) => handleFieldBlur('E_mailadres_voor_factuur', e.target.value)}
                  placeholder="Alleen invullen als de factuur naar een apart e-mailadres verstuurd moet worden."
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${fieldErrors['E_mailadres_voor_factuur'] ? 'border-red-600' : 'border-gray-300'}`}
                />
                {fieldErrors['E_mailadres_voor_factuur'] && (
                  <div className="field-error">{fieldErrors['E_mailadres_voor_factuur']}</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Additional Information */}
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Aanvullende informatie</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Naam tweede contactpersoon
              </label>
              <input
                type="text"
                value={Naam_tweede_contactpersoon}
                onChange={(e) => updateField('Naam_tweede_contactpersoon', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={Betalen_met_CJP}
                  onChange={(e) => updateField('Betalen_met_CJP', e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">
                  Betalen met CJP/MBO card
                </span>
              </label>
            </div>

            {Betalen_met_CJP && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  CJP/MBO nummer *
                </label>
                <input
                  type="text"
                  value={CJP_nummer}
                  onChange={(e) => {
                    updateField('CJP_nummer', e.target.value);
                    if (fieldErrors['CJP_nummer']) {
                      setFieldErrors(prev => ({ ...prev, CJP_nummer: '' }));
                    }
                  }}
                  onBlur={(e) => handleFieldBlur('CJP_nummer', e.target.value)}
                  className={`w-full ${fieldErrors['CJP_nummer'] ? 'field-invalid' : ''}`}
                  required
                />
                {fieldErrors['CJP_nummer'] && (
                  <div className="field-error">{fieldErrors['CJP_nummer']}</div>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Opmerkingen
              </label>
              <textarea
                value={Opmerkingen}
                onChange={(e) => updateField('Opmerkingen', e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Heb je nog vragen of opmerkingen? Wij horen het graag."
              />
            </div>

            <div>
              <label className="flex items-start space-x-2">
                <input
                  type="checkbox"
                  checked={Akkoord_privacyverklaring}
                  onChange={(e) => {
                    updateField('Akkoord_privacyverklaring', e.target.checked);
                    if (fieldErrors['Akkoord_privacyverklaring']) {
                      setFieldErrors(prev => ({ ...prev, Akkoord_privacyverklaring: '' }));
                    }
                  }}
                  onBlur={(e) => handleFieldBlur('Akkoord_privacyverklaring', e.target.checked)}
                  style={{ marginTop: '0.25rem', marginRight: '0.5rem' }}
                  required
                />
                <span className="text-sm text-gray-700">
                  Door dit formulier in te vullen, ga ik ermee akkoord dat mijn gegevens worden verzameld door Movies that Matter volgens de <a href='https://moviesthatmatter.nl/privacy-en-cookies/' target='_blank' className="text-blue-600 hover:underline">privacyverklaring</a>. *
                </span>
              </label>
              {fieldErrors['Akkoord_privacyverklaring'] && (
                <div className="field-error">{fieldErrors['Akkoord_privacyverklaring']}</div>
              )}
            </div>

            <div>
              <label className="flex items-start space-x-2">
                <input
                  type="checkbox"
                  checked={Akkoord_algemene_voorwaarden}
                  onChange={(e) => {
                    updateField('Akkoord_algemene_voorwaarden', e.target.checked);
                    if (fieldErrors['Akkoord_algemene_voorwaarden']) {
                      setFieldErrors(prev => ({ ...prev, Akkoord_algemene_voorwaarden: '' }));
                    }
                  }}
                  onBlur={(e) => handleFieldBlur('Akkoord_algemene_voorwaarden', e.target.checked)}
                  style={{ marginTop: '0.25rem', marginRight: '0.5rem' }}
                  required
                />
                <span className="text-sm text-gray-700">
                  Hierbij verklaar ik de <a href='https://moviesthatmatter.nl/educatie/algemene-voorwaarden-movies-that-matter-educatie/' target='_blank' className="text-blue-600 hover:underline">algemene voorwaarden Movies that Matter Educatie</a> te hebben gelezen en te aanvaarden. Movies that Matter behoudt zich het recht voor om deze voorwaarden op elk moment te wijzigen. *
                </span>
              </label>
              {fieldErrors['Akkoord_algemene_voorwaarden'] && (
                <div className="field-error">{fieldErrors['Akkoord_algemene_voorwaarden']}</div>
              )}
            </div>
          </div>
        </div>
      </div>


      {/* Navigation */}
      <div className="flex justify-between mt-8">
        <button
          type="button"
          onClick={handleReset}
          className="btn btn-outline text-red-600 hover:bg-red-50"
        >
          Formulier wissen
        </button>
        <div className="flex space-x-4">
          <button
            type="button"
            onClick={goToPreviousStep}
            className="btn btn-secondary"
          >
            Vorige stap
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className={`btn ${isStep2Valid() ? 'btn-primary' : 'btn btn-secondary'}`}
          >
            Aanmelding versturen
          </button>
        </div>
      </div>
    </div>
  );
};