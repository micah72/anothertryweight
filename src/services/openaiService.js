class OpenAIService {
  constructor() {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    
    if (!apiKey || apiKey === 'undefined' || apiKey === 'your_openai_api_key_here') {
      this.configurationError = new Error('OpenAI API key not found in environment variables');
      console.error('OpenAI API key not found in environment variables. Ensure you have:',
        '\n1. Created a .env file in your project root',
        '\n2. Added VITE_OPENAI_API_KEY=your_key_here to the .env file',
        '\n3. Restarted your development server');
    } else if (!apiKey.startsWith('sk-') || apiKey.length < 20) {
      this.configurationError = new Error('Invalid OpenAI API key format');
      console.error('Invalid OpenAI API key format. The key should:',
        '\n1. Start with "sk-"',
        '\n2. Be at least 20 characters long');
    } else {
      this.apiKey = apiKey;
      this.configurationError = null;
    }

    this.apiUrl = 'https://api.openai.com/v1/chat/completions';
  }

  isConfigured() {
    return !this.configurationError && this.apiKey;
  }

  getConfigurationError() {
    return this.configurationError ? this.configurationError.message : null;
  }

  async generateFoodRecommendations(context) {
    if (!this.isConfigured()) {
      throw new Error(this.getConfigurationError() || 'OpenAI service is not properly configured');
    }

    try {
      const prompt = this.buildRecommendationsPrompt(context);
      
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: "You are a nutritionist and meal planning expert. Provide personalized meal recommendations based on user profile, available ingredients, and dietary needs."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 1500
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('OpenAI API Error Response:', errorData);
        throw new Error(this.handleAPIError(response.status));
      }

      const data = await response.json();
      return this.parseRecommendationsResponse(data.choices[0].message.content);
    } catch (error) {
      console.error('Error generating food recommendations:', error);
      throw error;
    }
  }

  async analyzeImage(base64Image) {
    if (!this.isConfigured()) {
      throw new Error(this.getConfigurationError() || 'OpenAI service is not properly configured');
    }

    if (!this.validateImage(base64Image)) {
      throw new Error('Invalid image format');
    }

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: "gpt-4o",
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
        console.error('OpenAI API Error Response:', errorData);
        throw new Error(this.handleAPIError(response.status));
      }

      const data = await response.json();
      const result = this.parseAnalysisResponse(data.choices[0].message.content);
      
      if (result.error) {
        throw new Error('Failed to analyze image content');
      }
      
      return result;
    } catch (error) {
      console.error('Error in analyzeImage:', error);
      throw error;
    }
  }

  async analyzeRefrigeratorImage(base64Image) {
    if (!this.isConfigured()) {
      throw new Error(this.getConfigurationError() || 'OpenAI service is not properly configured');
    }

    if (!this.validateImage(base64Image)) {
      throw new Error('Invalid image format');
    }

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Analyze this refrigerator image and provide the following in a JSON format without any additional text or markdown: {\"items\": [\"list of visible food items\"], \"expiringItems\": [\"items that appear to be aging or need to be used soon based on visual cues\"], \"suggestedRecipes\": [{\"name\": \"recipe name\", \"description\": \"brief description using available ingredients\", \"ingredients\": [\"required ingredients from visible items\"]}]}"
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
          max_tokens: 1500,
          temperature: 0.5
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('OpenAI API Error Response:', errorData);
        throw new Error(this.handleAPIError(response.status));
      }

      const data = await response.json();
      const result = this.parseRefrigeratorAnalysisResponse(data.choices[0].message.content);
      
      if (result.error) {
        throw new Error('Failed to analyze refrigerator content');
      }
      
      return result;
    } catch (error) {
      console.error('Error in analyzeRefrigeratorImage:', error);
      throw error;
    }
  }

  buildRecommendationsPrompt(context) {
    const { userProfile, recentMeals, availableIngredients } = context;

    return `Generate personalized meal recommendations based on the following information:

User Profile:
- Age: ${userProfile.age}
- Gender: ${userProfile.gender}
- Weight: ${userProfile.weight}kg
- Height: ${userProfile.height}cm
- Target Weight: ${userProfile.targetWeight}kg
- Daily Calorie Target: ${userProfile.dailyCalorieTarget}kcal

Available Ingredients:
${availableIngredients.join(', ')}

Recent Meals:
${recentMeals.map(meal => `- ${meal.name} (${meal.calories}kcal)`).join('\n')}

Please provide recommendations in the following JSON format:
{
  "meals": [
    {
      "name": "Meal Name",
      "description": "Brief description",
      "calories": calories_number,
      "ingredients": ["ingredient1", "ingredient2"]
    }
  ],
  "nutritionalGaps": [
    {
      "nutrient": "Nutrient Name",
      "recommendation": "Recommendation text"
    }
  ],
  "mealPlan": {
    "Monday": [
      {
        "name": "Meal Name",
        "calories": calories_number
      }
    ]
  }
}`;
  }

  parseRecommendationsResponse(content) {
    try {
      let cleanContent = content.replace(/```json\s*|\s*```/g, '').trim();
      const jsonMatch = cleanContent.match(/{[\s\S]*}/);
      if (!jsonMatch) {
        throw new Error('Invalid response format');
      }

      const parsedData = JSON.parse(jsonMatch[0]);

      return {
        meals: Array.isArray(parsedData.meals) ? parsedData.meals.map(meal => ({
          name: String(meal.name || 'Unnamed Meal'),
          description: String(meal.description || 'No description available'),
          calories: Number(meal.calories) || 0,
          ingredients: Array.isArray(meal.ingredients) ? meal.ingredients : []
        })) : [],
        nutritionalGaps: Array.isArray(parsedData.nutritionalGaps) ? parsedData.nutritionalGaps.map(gap => ({
          nutrient: String(gap.nutrient || 'Unknown Nutrient'),
          recommendation: String(gap.recommendation || 'No recommendation available')
        })) : [],
        mealPlan: parsedData.mealPlan || null
      };
    } catch (error) {
      console.error('Error parsing recommendations:', error);
      return {
        meals: [],
        nutritionalGaps: [
          {
            nutrient: 'General Nutrition',
            recommendation: 'Aim for balanced meals with protein, vegetables, and whole grains'
          }
        ],
        mealPlan: null
      };
    }
  }

  parseAnalysisResponse(content) {
    try {
      let cleanContent = content.replace(/```json\s*|\s*```/g, '').trim();
      const jsonMatch = cleanContent.match(/{[\s\S]*}/);
      if (!jsonMatch) {
        throw new Error('Invalid response format');
      }

      const parsedData = JSON.parse(jsonMatch[0]);

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

  parseRefrigeratorAnalysisResponse(content) {
    try {
      let cleanContent = content.replace(/```json\s*|\s*```/g, '').trim();
      const jsonMatch = cleanContent.match(/{[\s\S]*}/);
      if (!jsonMatch) {
        throw new Error('Invalid response format');
      }

      const parsedData = JSON.parse(jsonMatch[0]);

      return {
        items: Array.isArray(parsedData.items) ? parsedData.items : [],
        expiringItems: Array.isArray(parsedData.expiringItems) ? parsedData.expiringItems : [],
        suggestedRecipes: Array.isArray(parsedData.suggestedRecipes) 
          ? parsedData.suggestedRecipes.map(recipe => ({
              name: String(recipe.name || 'Unnamed Recipe'),
              description: String(recipe.description || 'No description available'),
              ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients : []
            }))
          : []
      };
    } catch (error) {
      console.error('Error parsing refrigerator analysis response:', error);
      return {
        items: [],
        expiringItems: [],
        suggestedRecipes: [],
        error: true
      };
    }
  }

  validateImage(base64Image) {
    return Boolean(
      base64Image &&
      typeof base64Image === 'string' &&
      (base64Image.startsWith('data:image/') || base64Image.match(/^[A-Za-z0-9+/=]+$/))
    );
  }

  handleAPIError(status) {
    switch (status) {
      case 401:
        return 'Invalid API key. Please check your OpenAI API key.';
      case 429:
        return 'API rate limit exceeded. Please try again later.';
      case 500:
        return 'OpenAI server error. Please try again later.';
      case 404:
        return 'API endpoint not found. Please check the API configuration.';
      default:
        return `OpenAI API error: ${status}`;
    }
  }
}

export default OpenAIService;