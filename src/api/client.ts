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
  // In development mode (vite dev server), use full dev domain
  // In production build, use relative path (no domain) so it works on any server
  if (import.meta.env.DEV) {
    return API_CONFIG.DEV_DOMAIN;
  }
  
  // Production: use relative path, server will handle the domain
  return '';
};

// API client class with automatic authentication
export class CrossmarXApiClient {
  private baseUrl: string;
  
  constructor() {
    const baseUrl = getBaseUrl();
    this.baseUrl = baseUrl ? `${baseUrl}/engine/api/${API_CONFIG.VERSION}` : `/engine/api/${API_CONFIG.VERSION}`;
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
    const fullUrl = `${this.baseUrl}${endpoint}`;
    
    // For relative URLs, use current location as base
    const url = fullUrl.startsWith('/') 
      ? new URL(fullUrl, window.location.origin)
      : new URL(fullUrl);
    
    // Always add authentication as query parameters for all requests
    this.addAuthParams(url);

    const config: RequestInit = {
      ...options,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url.toString(), config);
      
      if (!response.ok) {
        // Try to get error details from response body
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorData: ApiResponse<T> = await response.json();
          if (errorData.statusMessage?.message) {
            errorMessage = errorData.statusMessage.message;
          }
        } catch {
          // If we can't parse the error, use the default HTTP message
        }
        throw new Error(errorMessage);
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