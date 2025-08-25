// API client with authentication wrapper

import { API_CONFIG } from '../utils/constants';

// API Response types
export interface ApiResponse<T = any> {
  statusMessage: {
    errcode: number;
    message: string;
  };
  timestamp: string;
  authhash?: string;
  recordList?: T[];
  record?: T;
  total?: number;
  count?: number;
  key?: string;
}

export interface ApiRecord<T = any> {
  class: string;
  key: string;
  data: T;
}

// Determine the base URL based on environment
const getBaseUrl = () => {
  // TODO: In production, switch to PROD_DOMAIN based on environment
  return API_CONFIG.DEV_DOMAIN;
};

// API client class with automatic authentication
export class CrossmarXApiClient {
  private baseUrl: string;
  
  constructor() {
    this.baseUrl = `${getBaseUrl()}/engine/api/${API_CONFIG.VERSION}`;
  }

  // Add authentication parameters to URL
  private addAuthParams(url: URL): void {
    url.searchParams.set('loginname', API_CONFIG.LOGIN_NAME);
    url.searchParams.set('password', API_CONFIG.PASSWORD);
  }

  // Generic fetch wrapper with error handling
  private async fetchWithAuth<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    
    // Add authentication for GET requests
    if (!options.method || options.method === 'GET') {
      this.addAuthParams(url);
    }

    const config: RequestInit = {
      ...options,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    // Add auth to POST body for non-GET requests
    if (options.method && options.method !== 'GET' && options.body) {
      const body = JSON.parse(options.body as string);
      body.loginname = API_CONFIG.LOGIN_NAME;
      body.password = API_CONFIG.PASSWORD;
      config.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(url.toString(), config);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: ApiResponse<T> = await response.json();
      
      if (data.statusMessage.errcode !== 0) {
        throw new Error(`API Error ${data.statusMessage.errcode}: ${data.statusMessage.message}`);
      }

      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // GET request for query with filters
  async query<T>(queryDef: QueryDefinition): Promise<ApiRecord<T>[]> {
    const url = `/query?querydef=${encodeURIComponent(JSON.stringify(queryDef))}`;
    const response = await this.fetchWithAuth<ApiRecord<T>>(url);
    
    return response.recordList || [];
  }

  // POST request to create a record
  async createRecord(className: string, data: Record<string, any>): Promise<string> {
    const response = await this.fetchWithAuth<any>(`/record/${className}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    
    if (!response.key) {
      throw new Error('No key returned from record creation');
    }
    
    return response.key;
  }
}

// Query definition interfaces
export interface FilterLeaf {
  field: string;
  operator: string;
  value: any;
}

export interface FilterNode {
  operator?: 'and' | 'or' | 'not';
  children: (FilterLeaf | FilterNode)[];
}

export interface SortSpec {
  field: string;
  direction: 'asc' | 'desc';
}

export interface QueryDefinition {
  class: string;
  resultFields?: string[];
  filter?: FilterLeaf | FilterNode;
  sortSpecs?: SortSpec[];
}

// Create and export a singleton instance
export const apiClient = new CrossmarXApiClient();