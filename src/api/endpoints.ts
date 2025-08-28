// API endpoint functions

import { apiClient } from './client';
import { INSERT_TYPES } from '../utils/constants';

// Data type interfaces based on actual API responses
export interface ScreeningData {
  id: number; // Note: lowercase 'id' as returned by API
  Datum: string | null;
  Aanvang: string | null;
  Title_in_use: string;
  Naam: string; // Location name (Festivallocatie.Naam)
  Beschikbare_plekken_educatie: number | null;
  Geschikt_voor: number[]; // Array of Education_type IDs directly on Screening
  Stad: string; // City name ('Amsterdam' or 'Den Haag')
  Capaciteit: number | null; // Total capacity (Festivallocatie.Capaciteit)
}

export interface OrganisationData {
  id: number;
  Name: string;
  Subname: string | null;
}

export interface OrganisationTypeData {
  Id: number;
  Name: string;
  Parent: number;
}

export interface AddressData {
  id: number;
  Organisation: number;
  Street: string | null;
  Number: string | null;
  Addition: string | null;
  Postcode: string | null;
  City: string | null;
  Country?: number;
}

export interface EducationTypeData {
  Id: number;
  Type: string; // Display name like "havo/vwo - brugklas"
  Niveau: number | null;
  Leerjaar: number | null;
  Tonen_op_website: boolean;
  Tonen_op_formulier: string[]; // Array of form types this should be shown on
  Volgorde: number; // Sort order
}

// Screening API
export const screeningApi = {
  /**
   * Get screenings filtered by city and optionally by education type IDs
   * Backend automatically applies soort_vertoning: 103 and film.extra_identifier: 178
   */
  async getScreenings(city: 'Amsterdam' | 'Den Haag', educationTypeIds?: number[]): Promise<ScreeningData[]> {
    const filters: any[] = [
      { field: 'Stad', operator: 'equals', value: city }
    ];

    // Add education type filter if provided
    if (educationTypeIds && educationTypeIds.length > 0) {
      // Filter for films that have ANY of the selected education types
      // Query each ID as a single value using equals operator
      const educationFilters = educationTypeIds.map(typeId => ({
        field: 'Geschikt_voor',
        operator: 'equals',
        value: typeId
      }));
      
      if (educationFilters.length > 1) {
        filters.push({ operator: 'or', children: educationFilters });
      } else {
        filters.push(educationFilters[0]);
      }
    }

    const queryDef = {
      class: 'Screening',
      resultFields: [
        'Id', // Note: We request 'Id' but API returns 'id'
        'Datum', 
        'Aanvang',
        'Film.Title_in_use',
        'Geschikt_voor',
        'Festivallocatie.Naam',
        'Stad',
        'Festivallocatie.Capaciteit',
        'Beschikbare_plekken_educatie'
      ],
      filter: filters.length > 1 
        ? { operator: 'and', children: filters }
        : filters[0],
      sortSpecs: [
        { field: 'Datum', direction: 'asc' as const },
        { field: 'Aanvang', direction: 'asc' as const }
      ]
    };

    const records = await apiClient.query<ScreeningData>(queryDef);
    return records.map(record => record.data);
  },

  /**
   * Get all education types available for form selection
   */
  async getEducationTypes(): Promise<EducationTypeData[]> {
    const queryDef = {
      class: 'Education_type',
      // Get all education types, will filter client-side
      sortSpecs: [
        { field: 'Volgorde', direction: 'asc' as const }
      ]
    };

    const records = await apiClient.query<EducationTypeData>(queryDef);
    // Filter for types that should be shown on form type "1"
    return records
      .map(record => record.data)
      .filter(type => type.Tonen_op_formulier && type.Tonen_op_formulier.includes('1'));
  }
};

// Organisation API
export const organisationApi = {
  /**
   * Search schools by name
   * Backend automatically filters for school types only
   */
  async searchSchools(searchTerm: string): Promise<OrganisationData[]> {
    const queryDef = {
      class: 'Organisation',
      resultFields: ['Id', 'Name', 'Subname'],
      filter: {
        operator: 'or',
        children: [
          { field: 'Name', operator: 'like', value: `%${searchTerm}%` },
          { field: 'Subname', operator: 'like', value: `%${searchTerm}%` }
        ]
      }
    };

    const records = await apiClient.query<OrganisationData>(queryDef);
    return records.map(record => record.data);
  },

  /**
   * Get all available school types for organisation creation
   */
  async getSchoolTypes(): Promise<OrganisationTypeData[]> {
    const queryDef = {
      class: 'organisation_type',
      sortSpecs: [{ field: 'Name', direction: 'asc' as const }]
    };

    const records = await apiClient.query<OrganisationTypeData>(queryDef);
    return records.map(record => record.data);
  },

  /**
   * Create a new school organisation
   */
  async createSchool(name: string, typeId: number): Promise<string> {
    const data = {
      Name: name,
      Type: typeId
    };

    return await apiClient.createRecord('Organisation', data);
  }
};

// Address API (READ-ONLY)
export const addressApi = {
  /**
   * Get factuur address for a school
   * Backend automatically filters for Type = 6 (factuur)
   */
  async getFactuurAddress(organisationId: number): Promise<AddressData | null> {
    const queryDef = {
      class: 'Address',
      filter: { field: 'Organisation', operator: 'equals', value: organisationId }
    };

    const records = await apiClient.query<AddressData>(queryDef);
    
    // Return first address if found, or null if none
    return records.length > 0 ? records[0].data : null;
  },

  /**
   * Format address data for display
   */
  formatAddress(address: AddressData): string {
    const parts = [
      address.Street,
      address.Number,
      address.Addition,
      address.Postcode,
      address.City
    ].filter(Boolean);
    
    return parts.join(' ');
  }
};

// Person API
export const personApi = {
  /**
   * Create a teacher person record
   */
  async createTeacher(personData: {
    First_name: string;
    Last_name: string;
    Email_work: string; // Correct field name for primary email
    Mobile_phone: string;
    Middle_name?: string;
    schoolName: string; // For Other_school field
  }): Promise<string> {
    const data = {
      First_name: personData.First_name,
      Middle_name: personData.Middle_name || null,
      Last_name: personData.Last_name,
      Email_work: personData.Email_work,
      Mobile_phone: personData.Mobile_phone,
      Type: INSERT_TYPES.PERSON_TYPE_DOCENT,
      Other_school: personData.schoolName, // Required to bypass school validation
    };

    return await apiClient.createRecord('Person', data);
  }
};

// Booking API
export const bookingApi = {
  /**
   * Check seat availability before submission
   */
  async checkSeatAvailability(groups: { selectedScreeningId: string; totalPeople: number }[]): Promise<{
    available: boolean;
    conflicts: { screeningId: string; available: number; requested: number }[];
  }> {
    try {
      // Get screening details for all selected screenings
      const screeningIds = groups.map(g => g.selectedScreeningId);
      const uniqueScreeningIds = [...new Set(screeningIds)];
      
      const screeningPromises = uniqueScreeningIds.map(id =>
        apiClient.query({
          class: 'Screening',
          resultFields: ['Id', 'Beschikbare_plekken_educatie'],
          filter: { field: 'Id', operator: 'equals', value: parseInt(id) }
        })
      );
      
      const screeningResults = await Promise.all(screeningPromises);
      const screenings = screeningResults.flatMap(result => result.map(r => r.data));
      
      const conflicts: { screeningId: string; available: number; requested: number }[] = [];
      
      // Check availability for each group
      groups.forEach(group => {
        const screening = screenings.find((s: any) => s.id.toString() === group.selectedScreeningId) as ScreeningData;
        if (screening && screening.Beschikbare_plekken_educatie !== null) {
          if (screening.Beschikbare_plekken_educatie < group.totalPeople) {
            conflicts.push({
              screeningId: group.selectedScreeningId,
              available: screening.Beschikbare_plekken_educatie,
              requested: group.totalPeople
            });
          }
        }
      });
      
      return { available: conflicts.length === 0, conflicts };
      
    } catch (error) {
      console.error('Seat availability check failed:', error);
      return { available: false, conflicts: [] };
    }
  },

  /**
   * Complete booking submission flow
   * Order: Organisation -> Person -> Aanmelding -> Screening links
   * Fails fast on Organisation duplicate to prevent orphaned records
   */
  async submitBooking(formData: {
    personData: any;
    organisationData: any | null;
    aanmeldingData: any;
    groups: any[];
  }): Promise<{ success: boolean; bookingId?: string; error?: string }> {
    try {
      // Step 1: Create Organisation first (if new school) - fail fast on duplicate
      let organisationId = formData.aanmeldingData.School; // Existing school ID
      if (formData.organisationData) {
        console.log('Creating Organisation record...');
        try {
          const orgId = await apiClient.createRecord('Organisation', formData.organisationData);
          organisationId = parseInt(orgId);
          console.log('Organisation created with ID:', organisationId);
        } catch (error: any) {
          console.error('Organisation creation failed:', error);
          
          // Check for duplicate name error (can include Naam, Subnaam or both)
          if (error.message.includes('Geen unieke waarden voor de velden') && 
              (error.message.includes('Naam') || error.message.includes('Subnaam'))) {
            throw new Error('Een school met deze naam bestaat al. Kies een andere naam of selecteer de bestaande school uit de lijst.');
          }
          
          throw new Error(`School kon niet worden aangemaakt: ${error.message || 'Onbekende fout'}`);
        }
      }
      
      // Step 2: Create Person (teacher) - only after Organisation succeeds
      console.log('Creating Person record...');
      let personId: string;
      try {
        personId = await apiClient.createRecord('Person', formData.personData);
        console.log('Person created with ID:', personId);
      } catch (error) {
        console.error('Person creation failed:', error);
        throw new Error(`Docent kon niet worden aangemaakt: ${error instanceof Error ? error.message : 'Onbekende fout'}`);
      }
      
      // Step 3: Create Aanmelding educatie
      console.log('Creating Aanmelding educatie record...');
      const aanmeldingDataWithRefs = {
        ...formData.aanmeldingData,
        Docent: parseInt(personId),
        School: organisationId,
      };
      
      let bookingId: string;
      try {
        bookingId = await apiClient.createRecord('Aanmelding educatie', aanmeldingDataWithRefs);
        console.log('Aanmelding educatie created with ID:', bookingId);
      } catch (error) {
        console.error('Aanmelding educatie creation failed:', error);
        throw new Error(`Aanmelding kon niet worden aangemaakt: ${error instanceof Error ? error.message : 'Onbekende fout'}`);
      }
      
      // Step 4: Create Aanmelding educatie - Educatie screening for each group
      console.log('Creating screening links for', formData.groups.length, 'groups...');
      const linkingPromises = formData.groups.map((group, index) => {
        // Junction table now contains group-specific data per new data model
        const linkData = {
          'Aanmelding_educatie': parseInt(bookingId),
          'Screening': parseInt(group.selectedScreeningId),
          'Aantal_leerlingen_studenten': group.Aantal_leerlingen_studenten,
          'Aantal_begeleiders': group.Aantal_begeleiders,
          'Onderwijssoorten': group.educationTypeIds,
          'Toelichting': group.Toelichting || null
        };
        
        return apiClient.createRecord('Aanmelding educatie - Educatie screening', linkData)
          .catch(error => {
            console.error(`Screening link creation failed for group ${index + 1}:`, error);
            throw new Error(`Koppeling met filmvertoning ${index + 1} mislukt: ${error instanceof Error ? error.message : 'Onbekende fout'}`);
          });
      });
      
      await Promise.all(linkingPromises);
      console.log('All screening links created successfully');
      
      return { success: true, bookingId };
      
    } catch (error) {
      console.error('Booking submission failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Er is een onbekende fout opgetreden bij het versturen van uw aanmelding.' 
      };
    }
  }
};

// Default Settings API
export interface DefaultSettingsData {
  Introtekst_aanmelding_Educatie_MtMF: string;
}

export const defaultSettingsApi = {
  /**
   * Get default settings including intro text for the education form
   */
  async getDefaultSettings(): Promise<DefaultSettingsData> {
    const queryDef = {
      class: 'Default_settings'
    };
    
    const records = await apiClient.query<DefaultSettingsData>(queryDef);
    
    if (records.length === 0) {
      throw new Error('No default settings found');
    }
    
    return records[0].data;
  }
};