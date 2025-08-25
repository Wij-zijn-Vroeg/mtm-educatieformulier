// Zustand store for booking form state

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { FORM_CONFIG } from '../utils/constants';

// Form data interfaces using exact CrossmarX field names
export interface GroupData {
  id: string; // Internal UI ID for managing multiple groups
  Aantal_leerlingen_studenten: number;
  Opleiding_niveau_en_leerjaar: string;
  Toelichting?: string; // Only for MBO/ISK (stored in separate field if needed)
  Aantal_begeleiders: number;
  stad: 'a' | 'd' | ''; // Amsterdam or Den Haag (for screening filter)
  selectedScreeningId: string | null;
}

export interface TeacherData {
  First_name: string;
  Middle_name: string; // Tussenvoegsel
  Last_name: string;
  Primary_email: string;
  Mobile_phone: string;
  Newsletter_education: boolean;
}

export interface SchoolData {
  // School selection
  lookupId: number | null; // Selected school ID from lookup
  School_staat_niet_in_lijst: boolean; // "School staat niet in lijst" checkbox
  School_invul: string; // Manual school name/address entry
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
      Opleiding_niveau_en_leerjaar: '',
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
    Primary_email: '',
    Mobile_phone: '',
    Newsletter_education: false,
  },
  school: {
    lookupId: null,
    School_staat_niet_in_lijst: false,
    School_invul: '',
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
            Opleiding_niveau_en_leerjaar: '',
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
            group.Opleiding_niveau_en_leerjaar.length > 0 &&
            group.Aantal_begeleiders >= 0 &&
            group.stad.length > 0 &&
            group.selectedScreeningId !== null
          );
          
          // Check toelichting requirement for MBO/ISK
          const needsToelichting = ['MBO', 'ISK'].some(type => 
            group.Opleiding_niveau_en_leerjaar.toUpperCase().includes(type)
          );
          const hasRequiredToelichting = !needsToelichting || (group.Toelichting && group.Toelichting.length > 0);
          
          // Check group size limit
          const totalPeople = group.Aantal_leerlingen_studenten + group.Aantal_begeleiders;
          const withinLimit = totalPeople <= FORM_CONFIG.MAX_GROUP_SIZE;
          
          return hasBasicInfo && hasRequiredToelichting && withinLimit;
        });
      },

      isStep2Valid: () => {
        const { teacher, school, Akkoord_algemene_voorwaarden, Betalen_met_CJP, CJP_nummer } = get();
        
        // Required teacher fields
        const teacherValid = (
          teacher.Last_name.length > 0 &&
          teacher.Primary_email.length > 0 &&
          teacher.Mobile_phone.length > 0
        );
        
        // School selection valid
        const schoolValid = school.lookupId !== null || (
          school.School_staat_niet_in_lijst && 
          school.School_invul.length > 0 &&
          school.schoolType !== null
        );
        
        // Required checkboxes
        const checkboxesValid = Akkoord_algemene_voorwaarden;
        
        // CJP number required if checkbox checked
        const cjpValid = !Betalen_met_CJP || CJP_nummer.length > 0;
        
        return teacherValid && schoolValid && checkboxesValid && cjpValid;
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
        const { teacher } = get();
        return {
          First_name: teacher.First_name,
          Middle_name: teacher.Middle_name || null,
          Last_name: teacher.Last_name,
          Primary_email: teacher.Primary_email,
          Mobile_phone: teacher.Mobile_phone,
          Newsletter_education: teacher.Newsletter_education,
          Type: 56, // Docent type
        };
      },

      prepareOrganisationData: () => {
        const { school } = get();
        if (!school.School_staat_niet_in_lijst || !school.schoolType) return null;
        
        return {
          Name: school.School_invul.split('\n')[0] || school.School_invul, // First line as name
          Type: school.schoolType,
        };
      },

      prepareAanmeldingData: () => {
        const state = get();
        const { teacher, school, groups } = state;
        
        // Use first group for main record (others go to separate linking table)
        const mainGroup = groups[0];
        
        return {
          // Contact info (duplicated from Person record)
          Naam_contactpersoon: `${teacher.First_name}${teacher.Middle_name ? ' ' + teacher.Middle_name : ''} ${teacher.Last_name}`,
          E_mailadres: teacher.Primary_email,
          Telefoonnummer: teacher.Mobile_phone,
          
          // School info
          School: school.lookupId,
          School_staat_niet_in_lijst: school.School_staat_niet_in_lijst,
          School_invul: school.School_staat_niet_in_lijst ? school.School_invul : null,
          
          // Group info (main group)
          Aantal_leerlingen_studenten: mainGroup.Aantal_leerlingen_studenten,
          Opleiding_niveau_en_leerjaar: mainGroup.Opleiding_niveau_en_leerjaar,
          Aantal_begeleiders: mainGroup.Aantal_begeleiders,
          
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
        Akkoord_algemene_voorwaarden: state.Akkoord_algemene_voorwaarden,
      }),
    }
  )
);