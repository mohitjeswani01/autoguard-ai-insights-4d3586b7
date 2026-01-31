// AutoGuard AI - API Service Layer
// Configure API_BASE_URL to connect to your FastAPI backend

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

// ============================================
// INTERFACES
// ============================================

export interface DamageAssessment {
  id: string;
  partIdentified: string;
  damageType: 'scratch' | 'dent' | 'crack' | 'shatter' | 'deformation' | 'missing';
  confidenceScore: number;
  boundingBox: BoundingBox;
  estimatedCost: number;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SeverityLevel {
  level: 'minor' | 'moderate' | 'severe';
  score: number; // 0-100
  description: string;
}

export interface AnalysisResult {
  id: string;
  imageUrl: string;
  vehicleInfo: VehicleInfo;
  damages: DamageAssessment[];
  overallSeverity: SeverityLevel;
  totalEstimatedCost: number;
  aiConfidence: number;
  processedAt: string;
  status: 'processing' | 'completed' | 'failed';
}

export interface VehicleInfo {
  make?: string;
  model?: string;
  year?: number;
  plateNumber?: string;
  vin?: string;
  color?: string;
}

export interface Claim {
  id: string;
  claimNumber: string;
  vehiclePlate: string;
  vehicleInfo: VehicleInfo;
  submittedAt: string;
  processedAt?: string;
  aiConfidence: number;
  status: 'pending' | 'processing' | 'approved' | 'rejected' | 'under_review';
  totalPayout: number;
  analysisResult?: AnalysisResult;
  adjusterNotes?: string;
}

export interface ClaimFilters {
  status?: Claim['status'];
  dateFrom?: string;
  dateTo?: string;
  minConfidence?: number;
  searchQuery?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface UploadResponse {
  analysisId: string;
  status: 'queued' | 'processing';
  estimatedTime: number; // seconds
}

export interface ReportRequest {
  claimId: string;
  includeImages: boolean;
  includeConfidenceMetrics: boolean;
  format: 'pdf' | 'json';
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// ============================================
// API SERVICE CLASS
// ============================================

class ApiService {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const error: ApiError = await response.json();
        throw new Error(error.message || `HTTP error! status: ${response.status}`);
      }

      return response.json();
    } catch (error) {
      console.error('API Request failed:', error);
      throw error;
    }
  }

  // ============================================
  // DAMAGE ANALYSIS ENDPOINTS
  // ============================================

  async uploadImage(file: File): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('image', file);

    const response = await fetch(`${this.baseUrl}/analysis/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to upload image');
    }

    return response.json();
  }

  async getAnalysisResult(analysisId: string): Promise<AnalysisResult> {
    return this.request<AnalysisResult>(`/analysis/${analysisId}`);
  }

  async getAnalysisStatus(analysisId: string): Promise<{ status: string; progress: number }> {
    return this.request(`/analysis/${analysisId}/status`);
  }

  // ============================================
  // CLAIMS ENDPOINTS
  // ============================================

  async getClaims(filters?: ClaimFilters): Promise<PaginatedResponse<Claim>> {
    const params = new URLSearchParams();
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
    }

    const query = params.toString();
    return this.request<PaginatedResponse<Claim>>(`/claims${query ? `?${query}` : ''}`);
  }

  async getClaim(claimId: string): Promise<Claim> {
    return this.request<Claim>(`/claims/${claimId}`);
  }

  async approveClaim(claimId: string, notes?: string): Promise<Claim> {
    return this.request<Claim>(`/claims/${claimId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ notes }),
    });
  }

  async rejectClaim(claimId: string, reason: string): Promise<Claim> {
    return this.request<Claim>(`/claims/${claimId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  async requestReview(claimId: string, notes: string): Promise<Claim> {
    return this.request<Claim>(`/claims/${claimId}/review`, {
      method: 'POST',
      body: JSON.stringify({ notes }),
    });
  }

  // ============================================
  // REPORTS ENDPOINTS
  // ============================================

  async generateReport(request: ReportRequest): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}/reports/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error('Failed to generate report');
    }

    return response.blob();
  }

  async downloadReport(claimId: string): Promise<string> {
    const response = await this.request<{ downloadUrl: string }>(`/reports/${claimId}/download`);
    return response.downloadUrl;
  }

  // ============================================
  // ANALYTICS ENDPOINTS
  // ============================================

  async getDashboardStats(): Promise<{
    totalClaims: number;
    pendingClaims: number;
    approvedToday: number;
    averageProcessingTime: number;
    totalPayouts: number;
  }> {
    return this.request('/analytics/dashboard');
  }

  async getClaimsTrend(days: number = 30): Promise<{
    date: string;
    claims: number;
    approved: number;
    rejected: number;
  }[]> {
    return this.request(`/analytics/trends?days=${days}`);
  }
}

// Export singleton instance
export const apiService = new ApiService();

// Export class for custom instances
export { ApiService };
