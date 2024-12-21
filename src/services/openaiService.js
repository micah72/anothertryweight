class OpenAIService {
  constructor() {
    this.apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    this.apiUrl = 'https://api.openai.com/v1/chat/completions';
    if (!this.apiKey) {
      console.error('OpenAI API key is not configured');
    }
  }

  async analyzeImage(base64Image) {
    if (!this.apiKey) {
      throw new Error('OpenAI API key is not configured. Please add your API key to the .env file.');
    }

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: "gpt-4o",  // This is the correct model for image analysis
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Analyze this food image and provide the following in a JSON format without any additional text or markdown: {\"foodName\": \"name of food\", \"calories\": number, \"healthScore\": number from 1-10, \"benefits\": \"main nutritional benefits\", \"concerns\": \"potential health concerns\"}"
                },
                {
                  type: "image_url",
                  image_url: {
                    url: base64Image.startsWith('data:') 
                      ? base64Image 
                      : `data:image/jpeg;base64,${base64Image}`
                  }
                }
              ]
            }
          ],
          max_tokens: 1000,
          temperature: 0.5
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      return this.parseAnalysisResponse(data.choices[0].message.content);
    } catch (error) {
      console.error('Error analyzing image:', error);
      throw error;
    }
  }

  parseAnalysisResponse(content) {
    try {
      // Clean the content of any markdown or extra formatting
      let cleanContent = content.replace(/```json\s*|\s*```/g, '').trim();
      
      // Find the JSON object in the response
      const jsonMatch = cleanContent.match(/{[\s\S]*}/);
      if (jsonMatch) {
        cleanContent = jsonMatch[0];
      }

      // Parse the cleaned content
      const parsedData = JSON.parse(cleanContent);

      // Return a properly structured response
      return {
        foodName: String(parsedData.foodName || 'Unknown Food'),
        calories: Number(parsedData.calories) || 0,
        healthScore: Number(parsedData.healthScore) || 0,
        benefits: String(parsedData.benefits || 'No benefits information available'),
        concerns: String(parsedData.concerns || 'No concerns information available')
      };
    } catch (error) {
      console.error('Error parsing OpenAI response:', error);
      return {
        foodName: 'Analysis Failed',
        calories: 0,
        healthScore: 0,
        benefits: 'Unable to analyze nutritional benefits',
        concerns: 'Unable to analyze health concerns',
        error: true
      };
    }
  }

  validateAPIKey() {
    if (!this.apiKey) {
      return false;
    }
    return this.apiKey.startsWith('sk-') && this.apiKey.length > 20;
  }

  validateImage(base64Image) {
    if (!base64Image) {
      return false;
    }
    if (typeof base64Image !== 'string') {
      return false;
    }
    if (!base64Image.startsWith('data:image/') && !base64Image.match(/^[A-Za-z0-9+/=]+$/)) {
      return false;
    }
    return true;
  }

  handleError(error) {
    if (error.response) {
      switch (error.response.status) {
        case 401:
          return 'Invalid API key. Please check your OpenAI API key.';
        case 429:
          return 'API rate limit exceeded. Please try again later.';
        case 500:
          return 'OpenAI server error. Please try again later.';
        default:
          return `OpenAI API error: ${error.response.status}`;
      }
    }
    return error.message || 'An unknown error occurred';
  }
}

export default OpenAIService;