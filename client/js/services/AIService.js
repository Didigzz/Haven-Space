/**
 * AI Service - Client-side interface for Groq AI features
 * Provides methods to interact with all AI-powered endpoints
 */

import CONFIG from '../config.js';

class AIService {
  static appwriteClient = null;
  static functions = null;

  static initializeAppwrite() {
    if (
      !this.appwriteClient &&
      typeof window !== 'undefined' &&
      typeof window.Appwrite !== 'undefined'
    ) {
      this.appwriteClient = new window.Appwrite.Client()
        .setEndpoint(CONFIG.APPWRITE.ENDPOINT)
        .setProject(CONFIG.APPWRITE.PROJECT_ID);

      this.functions = new window.Appwrite.Functions(this.appwriteClient);
    }
    return this.appwriteClient;
  }

  static getStoredValue(key) {
    const value = localStorage.getItem(key);
    return value && value !== 'null' && value !== 'undefined' ? value : null;
  }

  static isAppwriteExecutionRequest() {
    return CONFIG.isProduction();
  }

  static async parseJsonResponse(response) {
    const contentType = response.headers.get('content-type') || '';
    const rawText = await response.text();

    if (!contentType.includes('application/json')) {
      throw new Error(
        `Expected JSON response but received ${contentType || 'unknown content type'}`
      );
    }

    try {
      return JSON.parse(rawText);
    } catch (error) {
      throw new Error(`Invalid JSON response: ${error.message}`);
    }
  }

  /**
   * Execute Appwrite function with proper format
   * @param {string} path - API path to call
   * @param {string} method - HTTP method
   * @param {Object} data - Request data
   * @returns {Promise<Object>} Function response
   */
  static async executeFunction(path, method = 'GET', data = null) {
    try {
      const token = AIService.getStoredValue('token');
      const sessionId = AIService.getStoredValue('session_id');
      const userId = AIService.getStoredValue('user_id');
      const isAppwriteExecution = AIService.isAppwriteExecutionRequest();

      if (isAppwriteExecution) {
        // Use Appwrite SDK for production
        this.initializeAppwrite();

        if (!this.appwriteClient) {
          throw new Error('Appwrite SDK not available');
        }

        // Set session if available
        if (sessionId) {
          this.appwriteClient.setSession(sessionId);
        }

        const execution = await this.functions.createExecution(
          CONFIG.APPWRITE.FUNCTION_ID,
          JSON.stringify({
            ...(data || {}),
            path,
            method,
          }),
          false, // async
          path,
          method,
          {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
            ...(sessionId && { 'X-Session-Id': sessionId }),
            ...(userId && { 'X-User-Id': userId }),
          }
        );

        // Parse the response body
        const result = JSON.parse(execution.responseBody || '{}');
        return result;
      } else {
        // Use direct HTTP for local development
        const headers = {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        };

        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        if (sessionId) {
          headers['X-Session-Id'] = sessionId;
        }
        if (userId) {
          headers['X-User-Id'] = userId;
        }

        const requestOptions = {
          method,
          headers,
          credentials: 'include',
        };

        const requestUrl = `${CONFIG.API_BASE_URL}${path}`;

        if (data && method !== 'GET') {
          requestOptions.body = JSON.stringify(data);
        }

        const response = await fetch(requestUrl, requestOptions);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await AIService.parseJsonResponse(response);
        return result;
      }
    } catch (error) {
      console.error(`Function execution failed for ${path}:`, error);

      // Provide more detailed error message
      const errorMessage = error.message || 'Unknown error';
      const detailedError = {
        message: errorMessage,
        path: path,
        method: method,
        isNetworkError:
          errorMessage.includes('Failed to fetch') ||
          errorMessage.includes('NetworkError') ||
          (errorMessage.includes('TypeError') && errorMessage.includes('Failed to fetch')),
        isAuthError:
          errorMessage.includes('401') ||
          errorMessage.includes('403') ||
          errorMessage.includes('Unauthorized') ||
          errorMessage.includes('Forbidden'),
        isTimeout: errorMessage.includes('timeout') || errorMessage.includes('Timeout'),
      };

      throw new Error(`AI service request failed: ${JSON.stringify(detailedError)}`);
    }
  }

  /**
   * Generate property description using AI
   * @param {Object} propertyDetails - Property features and details
   * @returns {Promise<Object>} AI-generated description
   */
  static async generateDescription(propertyDetails) {
    try {
      return await AIService.executeFunction('/api/ai/generate-description', 'POST', {
        property_details: propertyDetails,
      });
    } catch (error) {
      console.error('AI description generation failed:', error);

      // Extract detailed error information
      let errorMessage = 'Failed to generate description. Please try again.';
      try {
        const errorObj = JSON.parse(error.message);
        if (errorObj.message) {
          errorMessage = errorObj.message;
        }
      } catch (e) {
        // If not JSON, use the original message
        errorMessage = error.message || errorMessage;
      }

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Enhance search query using AI
   * @param {Object} searchParams - Search query and parameters
   * @returns {Promise<Object>} Enhanced search analysis
   */
  static async enhanceSearch(searchParams) {
    try {
      return await AIService.executeFunction('/api/ai/enhance-search', 'POST', searchParams);
    } catch (error) {
      console.error('AI search enhancement failed:', error);
      return {
        success: false,
        error: 'Search enhancement unavailable. Using basic search.',
      };
    }
  }

  /**
   * Analyze maintenance issue using AI
   * @param {Object} issueData - Maintenance issue details
   * @returns {Promise<Object>} Issue analysis and categorization
   */
  static async analyzeIssue(issueData) {
    try {
      return await AIService.executeFunction('/api/ai/analyze-issue', 'POST', issueData);
    } catch (error) {
      console.error('AI issue analysis failed:', error);
      return {
        success: false,
        error: 'Issue analysis unavailable. Please describe your problem.',
      };
    }
  }

  /**
   * Draft message using AI
   * @param {Object} messageContext - Message context and parameters
   * @returns {Promise<Object>} Message drafts with different tones
   */
  static async draftMessage(messageContext) {
    try {
      return await AIService.executeFunction('/api/ai/draft-message', 'POST', messageContext);
    } catch (error) {
      console.error('AI message drafting failed:', error);
      return {
        success: false,
        error: 'Message suggestions unavailable. Please write your message manually.',
      };
    }
  }

  /**
   * Analyze application using AI (Landlord only)
   * @param {Object} applicationData - Application details
   * @returns {Promise<Object>} Application analysis and recommendation
   */
  static async analyzeApplication(applicationData) {
    try {
      return await AIService.executeFunction(
        '/api/ai/analyze-application',
        'POST',
        applicationData
      );
    } catch (error) {
      console.error('AI application analysis failed:', error);
      return {
        success: false,
        error: 'Application analysis unavailable. Please review manually.',
      };
    }
  }

  /**
   * Get authentication headers if token is available
   * @returns {Object} Headers object with auth if available
   */
  static getAuthHeaders() {
    const headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    // Add auth token if available (for authenticated users)
    const token = localStorage.getItem('token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  /**
   * Chat with Haven AI assistant (basic, no history)
   * @param {string} message - User message
   * @param {string} sessionId - Optional session ID
   * @param {string} userId - Optional user ID
   * @returns {Promise<Object>} AI response
   */
  static async chat(message, sessionId = null, userId = null) {
    return AIService.chatWithHistory(message, []);
  }

  /**
   * Chat with Haven AI assistant, forwarding full conversation history for multi-turn context.
   * The backend injects the live property database before every request.
   *
   * @param {string} message - Current user message
   * @param {Array}  history - Array of {role, content} objects from prior turns
   * @returns {Promise<Object>} AI response with success, response, property_count fields
   */
  static async chatWithHistory(message, history = []) {
    try {
      const chatData = {
        message,
        history: Array.isArray(history) ? history : [],
        session_id: localStorage.getItem('ai_session_id') || 'session_' + Date.now(),
        user_id: localStorage.getItem('user_id') || 'anonymous',
      };

      // Store session ID for continuity
      if (!localStorage.getItem('ai_session_id')) {
        localStorage.setItem('ai_session_id', chatData.session_id);
      }

      return await AIService.executeFunction('/api/ai/chat', 'POST', chatData);
    } catch (error) {
      console.error('AI chatWithHistory failed:', error);
      return {
        success: false,
        error: 'AI assistant unavailable. Please try again later.',
      };
    }
  }

  /**
   * Show loading indicator for AI operations
   * @param {HTMLElement} element - Element to show loading in
   * @param {string} message - Loading message
   */
  static showLoading(element, message = 'AI is thinking...') {
    if (element) {
      element.innerHTML = `
                <div class="ai-loading">
                    <div class="spinner"></div>
                    <span>${message}</span>
                </div>
            `;
    }
  }

  /**
   * Show AI suggestion bubble
   * @param {HTMLElement} element - Element to attach suggestion to
   * @param {string} suggestion - Suggestion text
   * @param {Function} onAccept - Callback when suggestion is accepted
   */
  static showSuggestion(element, suggestion, onAccept) {
    if (element) {
      const suggestionElement = document.createElement('div');
      suggestionElement.className = 'ai-suggestion-bubble';
      suggestionElement.innerHTML = `
                <div class="ai-suggestion-content">
                    ${suggestion}
                </div>
                <div class="ai-suggestion-actions">
                    <button class="btn-accept">Use this</button>
                    <button class="btn-dismiss">Dismiss</button>
                </div>
            `;

      // Add event listeners properly
      const acceptBtn = suggestionElement.querySelector('.btn-accept');
      const dismissBtn = suggestionElement.querySelector('.btn-dismiss');

      if (acceptBtn) {
        acceptBtn.addEventListener('click', () => {
          suggestionElement.remove();
          if (onAccept) onAccept();
        });
      }

      if (dismissBtn) {
        dismissBtn.addEventListener('click', () => {
          suggestionElement.remove();
        });
      }

      element.appendChild(suggestionElement);
    }
  }

  /**
   * Check if AI features are likely available
   * @returns {boolean} True if AI features should be available
   */
  static isAVAILable() {
    // In production, you might want to check this from a config endpoint
    return true;
  }
}

// Export for module systems if needed
export default AIService;

if (typeof module !== 'undefined' && module.exports) {
  module.exports = AIService;
}
if (typeof window !== 'undefined') {
  window.AIService = AIService;
}
