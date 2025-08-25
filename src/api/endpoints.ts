// API endpoint functions

import { apiClient, type ApiRecord } from './client';
import { API_CONFIG, INSERT_TYPES } from '../utils/constants';

// Data type interfaces based on actual API responses
export interface ScreeningData {
  id: number; // Note: lowercase 'id' as returned by API
  Datum: string | null;
  Aanvang: string | null;
  Title_in_use: string;
  Naam: string; // Location name (Festivallocatie.Naam)
  Beschikbare_plekken_educatie: number | null;
  Geschikt_voor?: string;
}

export interface OrganisationData {
  id: number;
  Name: string;
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

// Screening API
export const screeningApi = {
  /**
   * Get screenings filtered by city and optionally by education level
   * Backend automatically applies soort_vertoning: 103 and film.extra_identifier: 178
   */
  async getScreenings(city: 'a' | 'd', educationLevel?: string): Promise<ScreeningData[]> {
    const filters: any[] = [
      { field: 'Festivallocatie.Stad', operator: 'equals', value: city }
    ];

    if (educationLevel) {
      filters.push({ field: 'Geschikt_voor', operator: 'equals', value: educationLevel });
    }

    const queryDef = {
      class: 'Screening',
      resultFields: [
        'Id', // Note: We request 'Id' but API returns 'id'
        'Datum', 
        'Aanvang',
        'Film.Title_in_use',
        'Festivallocatie.Naam',
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
   * Get all unique education levels from screenings for dropdown
   */
  async getEducationLevels(): Promise<string[]> {
    const queryDef = {
      class: 'Screening',
      resultFields: ['Geschikt_voor'],
      filter: { field: 'Geschikt_voor', operator: 'is_not_null' }
    };

    const records = await apiClient.query<{ Geschikt_voor: string }>(queryDef);
    
    // Extract unique education levels, handling case and whitespace
    const levels = records
      .map(record => record.data.Geschikt_voor?.trim())
      .filter(Boolean)
      .filter((level, index, array) => 
        array.findIndex(l => l?.toLowerCase() === level?.toLowerCase()) === index
      );

    return levels.sort();
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
      resultFields: ['Id', 'Name'],
      filter: { field: 'Name', operator: 'like', value: `%${searchTerm}%` }
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

// Address API  
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
   * Create a factuur address for a school
   */
  async createFactuurAddress(organisationId: number, addressData: Partial<AddressData>): Promise<string> {
    const data = {
      Organisation: organisationId,
      Type: INSERT_TYPES.FACTUUR_ADDRESS_TYPE,
      Street: addressData.Street || null,
      Number: addressData.Number || null,
      Addition: addressData.Addition || null,
      Postcode: addressData.Postcode || null,
      City: addressData.City || null,
      Country: addressData.Country || 219 // Default to Netherlands
    };

    return await apiClient.createRecord('Address', data);
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
    Primary_email: string;
    Mobile_phone: string;
    Tussenvoegsel?: string;
  }): Promise<string> {
    const data = {
      ...personData,
      Type: INSERT_TYPES.PERSON_TYPE_DOCENT
    };

    return await apiClient.createRecord('Person', data);
  }
};

// Booking API
export const bookingApi = {
  /**
   * Create education booking
   */
  async createEducationBooking(bookingData: any): Promise<string> {
    return await apiClient.createRecord('Aanmelding educatie', bookingData);
  },

  /**
   * Link booking to screening
   */
  async createBookingScreeningLink(bookingId: string, screeningId: string, linkData: any): Promise<string> {
    const data = {
      ...linkData,
      'Aanmelding educatie': bookingId,
      'Educatie screening': screeningId
    };

    return await apiClient.createRecord('Aanmelding educatie - Educatie screening', data);
  }
};