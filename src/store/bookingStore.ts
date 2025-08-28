// Zustand store for booking form state

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { FORM_CONFIG } from '../utils/constants';

// Form data interfaces using exact CrossmarX field names
export interface GroupData {
  id: string; // Internal UI ID for managing multiple groups
  Aantal_leerlingen_studenten: number;
  educationTypeIds: number[]; // Selected education type IDs for multi-select
  educationTypeNames: string[]; // Display names of selected types
  Toelichting?: string; // Only for MBO/ISK (stored in separate field if needed)
  Aantal_begeleiders: number;
  stad: 'Amsterdam' | 'Den Haag' | ''; // City name (for screening filter)
  selectedScreeningId: string | null;
}

export interface TeacherData {
  First_name: string;
  Middle_name: string; // Tussenvoegsel
  Last_name: string;
  Email_work: string; // Correct field name for primary email
  Mobile_phone: string;
  Newsletter_education: boolean;
}

export interface SchoolData {
  // School selection
  lookupId: number | null; // Selected school ID from lookup
  selectedSchoolName: string; // Store actual name when selected from DB
  School_staat_niet_in_lijst: boolean; // "School staat niet in lijst" checkbox
  
  // Manual school entry (split fields)
  schoolName: string; // Just the school name
  schoolAdres: string; // Just the school address
  schoolType: number | null; // Organisation type for new schools (from organisation_type)
  
  // Address handling
  bekendFactuuradres: boolean; // Whether school has known factuur address
  existingFactuuradres: string; // Address text from Address table (read-only)
  Factuuradres_keuze: '0' | '1'; // "0" = same as school, "1" = different  
  Factuuradres: string; // Different address text
  
  // Additional billing fields
  Factuurreferentie: string;
  E_mailadres_voor_factuur: string;
}

export interface BookingFormData {
  // Navigation
  currentStep: 1 | 2;
  
  // Content management (loaded from API/DB)
  introText: string;
  logoUrl: string;
  
  // Groups (max 3) - each becomes separate Aanmelding educatie - Educatie screening
  groups: GroupData[];
  
  // Teacher information (Person record)
  teacher: TeacherData;
  
  // School information  
  school: SchoolData;
  
  // Additional Aanmelding educatie fields
  Naam_tweede_contactpersoon: string;
  Betalen_met_CJP: boolean;
  CJP_nummer: string;
  Opmerkingen: string;
  Akkoord_privacyverklaring: boolean;
  Akkoord_algemene_voorwaarden: boolean;
  
  // Hidden fields (set automatically)
  Soort_aanmelding: string; // Default "0"
  Status: string; // Default "0"
}

// Store actions interface
interface BookingStoreActions {
  // Navigation
  setCurrentStep: (step: 1 | 2) => void;
  goToNextStep: () => void;
  goToPreviousStep: () => void;
  
  // Groups management
  addGroup: () => void;
  removeGroup: (groupId: string) => void;
  updateGroup: (groupId: string, updates: Partial<GroupData>) => void;
  
  // Teacher updates
  updateTeacher: (updates: Partial<TeacherData>) => void;
  
  // School updates
  updateSchool: (updates: Partial<SchoolData>) => void;
  
  // Other form fields
  updateField: <K extends keyof BookingFormData>(
    field: K, 
    value: BookingFormData[K]
  ) => void;
  
  // Form validation
  isStep1Valid: () => boolean;
  isStep2Valid: () => boolean;
  
  // Utility
  resetForm: () => void;
  getTotalPeopleInGroup: (groupId: string) => number;
  getTotalPeopleAllGroups: () => number;
  
  // API data preparation
  prepareAanmeldingData: () => any;
  preparePersonData: () => any;
  prepareOrganisationData: () => any;
  
  // Initialize app data
  loadDefaultSettings: () => Promise<void>;
}

// Initial state
const initialState: BookingFormData = {
  currentStep: 1,
  introText: '',
  logoUrl: '',
  groups: [
    {
      id: 'group1',
      Aantal_leerlingen_studenten: 0,
      educationTypeIds: [],
      educationTypeNames: [],
      Toelichting: '',
      Aantal_begeleiders: 0,
      stad: '',
      selectedScreeningId: null,
    }
  ],
  teacher: {
    First_name: '',
    Middle_name: '',
    Last_name: '',
    Email_work: '',
    Mobile_phone: '',
    Newsletter_education: false,
  },
  school: {
    lookupId: null,
    selectedSchoolName: '',
    School_staat_niet_in_lijst: false,
    schoolName: '',
    schoolAdres: '',
    schoolType: null,
    bekendFactuuradres: false,
    existingFactuuradres: '',
    Factuuradres_keuze: '0',
    Factuuradres: '',
    Factuurreferentie: '',
    E_mailadres_voor_factuur: '',
  },
  Naam_tweede_contactpersoon: '',
  Betalen_met_CJP: false,
  CJP_nummer: '',
  Opmerkingen: '',
  Akkoord_privacyverklaring: false,
  Akkoord_algemene_voorwaarden: false,
  Soort_aanmelding: '0',
  Status: '0',
};

// Create the store with persistence
export const useBookingStore = create<BookingFormData & BookingStoreActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Navigation actions
      setCurrentStep: (step) => set({ currentStep: step }),
      goToNextStep: () => {
        const current = get().currentStep;
        if (current === 1 && get().isStep1Valid()) {
          set({ currentStep: 2 });
        }
      },
      goToPreviousStep: () => {
        const current = get().currentStep;
        if (current === 2) {
          set({ currentStep: 1 });
        }
      },

      // Groups management
      addGroup: () => {
        const groups = get().groups;
        if (groups.length < FORM_CONFIG.MAX_GROUPS) {
          const newGroup: GroupData = {
            id: `group${Date.now()}`,
            Aantal_leerlingen_studenten: 0,
            educationTypeIds: [],
            educationTypeNames: [],
            Toelichting: '',
            Aantal_begeleiders: 0,
            stad: '',
            selectedScreeningId: null,
          };
          set({ groups: [...groups, newGroup] });
        }
      },

      removeGroup: (groupId) => {
        const groups = get().groups.filter(g => g.id !== groupId);
        // Always keep at least one group
        if (groups.length === 0) {
          groups.push({ ...initialState.groups[0] });
        }
        set({ groups });
      },

      updateGroup: (groupId, updates) => {
        const groups = get().groups.map(group =>
          group.id === groupId ? { ...group, ...updates } : group
        );
        set({ groups });
      },

      // Teacher updates
      updateTeacher: (updates) => {
        set({ teacher: { ...get().teacher, ...updates } });
      },

      // School updates
      updateSchool: (updates) => {
        set({ school: { ...get().school, ...updates } });
      },

      // General field updates
      updateField: (field, value) => {
        set({ [field]: value });
      },

      // Validation
      isStep1Valid: () => {
        const { groups } = get();
        
        return groups.every(group => {
          // Basic required fields
          const hasBasicInfo = (
            group.Aantal_leerlingen_studenten > 0 &&
            group.educationTypeIds.length > 0 &&
            group.Aantal_begeleiders > 0 &&
            group.stad.length > 0 &&
            group.selectedScreeningId !== null
          );
          
          // Check toelichting requirement for MBO/ISK
          // MBO types: 3, 14, 24; ISK type: 29
          const mboIskIds = [3, 14, 24, 29];
          const needsToelichting = group.educationTypeIds.some(id => mboIskIds.includes(id));
          const hasRequiredToelichting = !needsToelichting || (group.Toelichting && group.Toelichting.length > 0);
          
          // Check group size limit
          const totalPeople = group.Aantal_leerlingen_studenten + group.Aantal_begeleiders;
          const withinLimit = totalPeople <= FORM_CONFIG.MAX_GROUP_SIZE;
          
          return hasBasicInfo && hasRequiredToelichting && withinLimit;
        });
      },

      isStep2Valid: () => {
        const { teacher, school, Akkoord_algemene_voorwaarden, Akkoord_privacyverklaring, Betalen_met_CJP, CJP_nummer } = get();
        
        // Email validation helper
        const isValidEmail = (email: string): boolean => {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          return emailRegex.test(email);
        };
        
        // Required teacher fields with email validation
        const teacherValid = (
          teacher.Last_name.length > 0 &&
          teacher.Email_work.length > 0 &&
          isValidEmail(teacher.Email_work) &&
          teacher.Mobile_phone.length > 0
        );
        
        // Validate invoice email if provided
        const invoiceEmailValid = !school.E_mailadres_voor_factuur || 
          isValidEmail(school.E_mailadres_voor_factuur);
        
        // School selection valid
        const schoolValid = school.lookupId !== null || (
          school.School_staat_niet_in_lijst && 
          school.schoolName.length > 0 &&
          school.schoolType !== null
        );
        
        // Required checkboxes
        const checkboxesValid = Akkoord_algemene_voorwaarden && Akkoord_privacyverklaring;
        
        // CJP number required if checkbox checked
        const cjpValid = !Betalen_met_CJP || CJP_nummer.length > 0;
        
        return teacherValid && schoolValid && checkboxesValid && cjpValid && invoiceEmailValid;
      },

      // Utility functions
      getTotalPeopleInGroup: (groupId) => {
        const group = get().groups.find(g => g.id === groupId);
        return group ? group.Aantal_leerlingen_studenten + group.Aantal_begeleiders : 0;
      },

      getTotalPeopleAllGroups: () => {
        return get().groups.reduce((total, group) => 
          total + group.Aantal_leerlingen_studenten + group.Aantal_begeleiders, 0
        );
      },

      // API data preparation
      preparePersonData: () => {
        const { teacher, school, Akkoord_privacyverklaring } = get();
        
        // Determine school name for Other_school field
        const schoolName = school.School_staat_niet_in_lijst 
          ? school.schoolName // Use manually entered school name
          : school.selectedSchoolName; // Use selected school name from DB
        
        return {
          First_name: teacher.First_name,
          Middle_name: teacher.Middle_name || null,
          Last_name: teacher.Last_name,
          Email_work: teacher.Email_work, // Correct field name
          Mobile_phone: teacher.Mobile_phone,
          Newsletter_education_: teacher.Newsletter_education,
          AVG: Akkoord_privacyverklaring, // Privacy agreement
          Type: 56, // Docent type (required)
          Other_school: schoolName, // Required to bypass school validation
        };
      },

      prepareOrganisationData: () => {
        const { school } = get();
        if (!school.School_staat_niet_in_lijst || !school.schoolType) return null;
        
        return {
          Name: school.schoolName, // Use dedicated school name field
          Type: [school.schoolType], // Send as array
        };
      },

      prepareAanmeldingData: () => {
        const state = get();
        const { teacher, school } = state;
        
        return {
          // Contact info (duplicated from Person record)
          Naam_contactpersoon: `${teacher.First_name}${teacher.Middle_name ? ' ' + teacher.Middle_name : ''} ${teacher.Last_name}`,
          E_mailadres: teacher.Email_work,
          Telefoonnummer: teacher.Mobile_phone,
          
          // School info
          School: school.lookupId,
          School_staat_niet_in_lijst: school.School_staat_niet_in_lijst,
          School_invul: school.School_staat_niet_in_lijst 
            ? `${school.schoolName}\n${school.schoolAdres}`.trim() 
            : null,
          
          // Address/billing
          Factuuradres_keuze: school.Factuuradres_keuze,
          Factuuradres: school.Factuuradres_keuze === '1' ? school.Factuuradres : null,
          Factuurreferentie: school.Factuurreferentie || null,
          E_mailadres_voor_factuur: school.E_mailadres_voor_factuur || null,
          
          // Additional fields
          Naam_tweede_contactpersoon: state.Naam_tweede_contactpersoon || null,
          Betalen_met_CJP: state.Betalen_met_CJP,
          CJP_nummer: state.Betalen_met_CJP ? state.CJP_nummer : null,
          Opmerkingen: state.Opmerkingen || null,
          Akkoord_algemene_voorwaarden: state.Akkoord_algemene_voorwaarden,
          
          // Hidden/system fields
          Soort_aanmelding: state.Soort_aanmelding,
          Status: state.Status,
          
          // Will be set after record creation
          Docent: null, // Person ID reference
        };
      },

      // Initialize app data
      loadDefaultSettings: async () => {
        try {
          const { defaultSettingsApi } = await import('../api/endpoints');
          const settings = await defaultSettingsApi.getDefaultSettings();
          set({ 
            introText: settings.Introtekst_aanmelding_Educatie_MtMF || ''
          });
        } catch (error) {
          console.error('Failed to load default settings:', error);
          // Don't throw - app should work even if default settings fail to load
        }
      },

      // Reset
      resetForm: () => {
        set(initialState);
      },
    }),
    {
      name: 'mtm-booking-form', // localStorage key
      partialize: (state) => ({
        // Only persist form data, not computed/derived values
        currentStep: state.currentStep,
        groups: state.groups,
        teacher: state.teacher,
        school: state.school,
        Naam_tweede_contactpersoon: state.Naam_tweede_contactpersoon,
        Betalen_met_CJP: state.Betalen_met_CJP,
        CJP_nummer: state.CJP_nummer,
        Opmerkingen: state.Opmerkingen,
        Akkoord_privacyverklaring: state.Akkoord_privacyverklaring,
        Akkoord_algemene_voorwaarden: state.Akkoord_algemene_voorwaarden,
      }),
    }
  )
);