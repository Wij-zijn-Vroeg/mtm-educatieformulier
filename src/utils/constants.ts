// App constants and configuration

export const API_CONFIG = {
  // API endpoints
  DEV_DOMAIN: 'https://mtm.cx-develop.nl',
  PROD_DOMAIN: 'https://database.moviesthatmatter.nl',
  VERSION: 'aanmelding_educatie',
  
  // Authentication
  LOGIN_NAME: 'form_api_user',
  PASSWORD: 'pw$V19DM0sJv9QDAGcgp',
  
  // Note: soort_vertoning (103) and film.extra_identifier (178) filters
  // are applied automatically in the backend for security and maintainability
  
  // City values
  CITIES: {
    AMSTERDAM: 'a',
    DEN_HAAG: 'd',
  }
} as const;

export const FORM_CONFIG = {
  MAX_GROUPS: 3,
  MAX_GROUP_SIZE: 340, // max aantal leerlingen + begeleiders per groep
  MAX_STUDENTS_SIZE: 200, // max aantal leerlingen per groep
} as const;

export const EDUCATION_TYPES = {
  MBO: 'MBO',
  ISK: 'ISK',
  // Other types will be dynamically loaded from API
} as const;

// Required types for record creation
export const INSERT_TYPES = {
  FACTUUR_ADDRESS_TYPE: 6, // Type for factuur (invoice) addresses
  PERSON_TYPE_DOCENT: 56, // Person type 'Docent' for teachers
} as const;