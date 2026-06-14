const RAW_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
// Normalize: strip trailing /api or /api/ if someone includes it in env
const API_URL = RAW_API_URL.replace(/\/api\/?$/, '');

class ApiClient {
  private tokenGetter: (() => Promise<string | null>) | null = null;
  private staticToken: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.staticToken = localStorage.getItem('token');
    }
  }

  /**
   * Set a dynamic token getter (e.g., Clerk's getToken).
   * This is called before every request to get a fresh session token.
   */
  setTokenGetter(getter: () => Promise<string | null>) {
    this.tokenGetter = getter;
  }

  /** Legacy: set a static JWT token */
  setToken(token: string) {
    this.staticToken = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', token);
    }
  }

  /** Legacy: clear the static JWT token */
  clearToken() {
    this.staticToken = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
    }
  }

  private async getToken(): Promise<string | null> {
    // Prefer dynamic token getter (Clerk) if available
    if (this.tokenGetter) {
      try {
        return await this.tokenGetter();
      } catch {
        // fall through to static token
      }
    }
    // Fallback to static token / localStorage (legacy)
    if (typeof window !== 'undefined') {
      return this.staticToken || localStorage.getItem('token');
    }
    return this.staticToken;
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const currentToken = await this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (currentToken) {
      headers['Authorization'] = `Bearer ${currentToken}`;
    } else if (endpoint.includes('/media/')) {
      console.warn(`[API] No auth token for ${endpoint} — request may fail`);
    }

    try {
      const response = await fetch(`${API_URL}/api${endpoint}`, {
        ...options,
        headers,
      });
      // Guard: if server returns HTML instead of JSON, don't crash
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        console.warn(`[API] Non-JSON response for ${endpoint}: ${response.status} ${contentType}`);
        return { success: false, message: `Server returned ${response.status}` };
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('API Error:', error);
      return { success: false, message: 'Network error. Please try again.' };
    }
  }

  // Auth
  async register(data: { name: string; email: string; password: string; role: string; phone?: string; licenseId?: string; specialization?: string }) {
    return this.request('/auth/register', { method: 'POST', body: JSON.stringify(data) });
  }

  async login(data: { email: string; password: string }) {
    return this.request('/auth/login', { method: 'POST', body: JSON.stringify(data) });
  }

  async verifyToken() {
    return this.request('/auth/verify');
  }

  // Users
  async getProfile() {
    return this.request('/users/profile');
  }

  async updateProfile(data: Record<string, unknown>) {
    return this.request('/users/profile', { method: 'PUT', body: JSON.stringify(data) });
  }

  async updateHealthProfile(data: Record<string, unknown>) {
    return this.request('/users/health-profile', { method: 'PUT', body: JSON.stringify(data) });
  }

  // Appointments
  async bookAppointment(data: Record<string, unknown>) {
    return this.request('/appointments', { method: 'POST', body: JSON.stringify(data) });
  }

  async getMyAppointments() {
    return this.request('/appointments/my');
  }

  // Hospitals
  async searchHospitals(params: Record<string, string>) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/hospitals?${query}`);
  }

  async getNearbyHospitals(lat: number, lng: number) {
    return this.request(`/hospitals/nearby?lat=${lat}&lng=${lng}`);
  }

  // Reports
  async analyzeReport(data: { fileUrl?: string; extractedText: string; type: string; title: string }) {
    return this.request('/reports/analyze', { method: 'POST', body: JSON.stringify(data) });
  }

  async getMyReports() {
    return this.request('/reports/my');
  }

  // AI Agents
  async checkSymptoms(data: { symptoms: string[]; additionalInfo?: string }) {
    return this.request('/ai/symptoms', { method: 'POST', body: JSON.stringify(data) });
  }

  async predictDiabetes(data: Record<string, unknown>) {
    return this.request('/ai/diabetes', { method: 'POST', body: JSON.stringify(data) });
  }

  async aiChat(message: string, context?: string) {
    return this.request('/ai/chat', { method: 'POST', body: JSON.stringify({ message, context }) });
  }

  async emergencyAssess(situation: string) {
    return this.request('/ai/emergency-assess', { method: 'POST', body: JSON.stringify({ situation }) });
  }

  // Medicines
  async searchMedicines(query: string) {
    return this.request(`/medicines/search?q=${encodeURIComponent(query)}`);
  }

  async askMedicine(question: string) {
    return this.request('/medicines/ask', { method: 'POST', body: JSON.stringify({ question }) });
  }

  // Emergency
  async sendSOS(data: { location: { lat: number; lng: number }; message: string }) {
    return this.request('/emergency/sos', { method: 'POST', body: JSON.stringify(data) });
  }

  // Blood Donors
  async registerDonor(data: Record<string, unknown>) {
    return this.request('/blood-donors/register', { method: 'POST', body: JSON.stringify(data) });
  }

  async searchDonors(params: Record<string, string>) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/blood-donors/search?${query}`);
  }

  // Chat
  async getChats() {
    return this.request('/chat');
  }

  async startChat(targetUserId: string) {
    return this.request('/chat/start', { method: 'POST', body: JSON.stringify({ targetUserId }) });
  }

  async getChatMessages(chatId: string) {
    return this.request(`/chat/${chatId}/messages`);
  }


  // Orders
  async createOrder(data: Record<string, unknown>) {
    return this.request('/orders', { method: 'POST', body: JSON.stringify(data) });
  }

  async getMyOrders() {
    return this.request('/orders/my');
  }

  // Media / Cloudinary
  async uploadMedia(data: { fileData: string; mediaType: 'image' | 'video'; title?: string; description?: string }) {
    return this.request('/media/upload', { method: 'POST', body: JSON.stringify(data) });
  }

  async uploadAvatar(fileData: string) {
    return this.request('/media/avatar', { method: 'POST', body: JSON.stringify({ fileData }) });
  }

  async getMyMedia() {
    return this.request('/media/my');
  }

  async getDoctorGallery() {
    return this.request('/media/doctors/gallery');
  }

  async getDoctorMedia(userId: string) {
    return this.request(`/media/doctors/${userId}`);
  }

  async deleteMedia(id: string) {
    return this.request(`/media/${id}`, { method: 'DELETE' });
  }

  // Doctor Profiles
  async getDoctorProfiles(params?: { search?: string; location?: string; specialization?: string }) {
    const query = params ? new URLSearchParams(params as Record<string, string>).toString() : '';
    return this.request(`/doctor-profiles${query ? `?${query}` : ''}`);
  }

  async getMyDoctorProfile() {
    return this.request('/doctor-profiles/me');
  }

  async getDoctorProfile(id: string) {
    return this.request(`/doctor-profiles/${id}`);
  }

  async createDoctorProfile(data: Record<string, unknown>) {
    return this.request('/doctor-profiles', { method: 'POST', body: JSON.stringify(data) });
  }

  async updateDoctorProfile(data: Record<string, unknown>) {
    return this.request('/doctor-profiles', { method: 'PUT', body: JSON.stringify(data) });
  }

  async deleteDoctorProfile() {
    return this.request('/doctor-profiles', { method: 'DELETE' });
  }
}

export const api = new ApiClient();
export default api;
