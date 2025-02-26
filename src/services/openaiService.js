class OpenAIService {
  constructor() {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    
    if (!apiKey || apiKey === 'undefined' || apiKey === 'your_openai_api_key_here') {
      this.configurationError = new Error('API_NOT_CONFIGURED');
      console.error(
        '%c OpenAI API key not found in environment variables. %c\n\nPlease follow these steps:', 
        'background: #f44336; color: white; padding: 2px 6px; border-radius: 2px; font-weight: bold',
        'font-weight: bold; color: #333'
      );
      console.log(
        '1. Create a .env file in your project root\n' +
        '2. Add VITE_OPENAI_API_KEY=your_key_here to the .env file\n' +
        '3. Restart your development server\n\n' +
        'Note: You need a valid OpenAI API key for image analysis features to work.'
      );
    } else if (!apiKey.startsWith('sk-') || apiKey.length < 20) {
      this.configurationError = new Error('INVALID_API_KEY_FORMAT');
      console.error(
        '%c Invalid OpenAI API key format. %c\n\nThe key should:', 
        'background: #f44336; color: white; padding: 2px 6px; border-radius: 2px; font-weight: bold',
        'font-weight: bold; color: #333'
      );
      console.log(
        '1. Start with "sk-"\n' +
        '2. Be at least 20 characters long\n\n' +
        'Please check your .env file and ensure the API key is correct.'
      );
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
    if (!this.configurationError) return null;
    
    if (this.configurationError.message === 'API_NOT_CONFIGURED') {
      return 'OpenAI API key not found in environment variables. Please check your .env file.';
    } else if (this.configurationError.message === 'INVALID_API_KEY_FORMAT') {
      return 'Invalid OpenAI API key format. The key should start with "sk-" and be at least 20 characters long.';
    }
    
    return this.configurationError.message;
  }

  // Placeholder method to provide mock data when API is not configured
  getMockAnalysisData() {
    return {
      foodName: "Sample Food Item",
      calories: 350,
      healthScore: 7,
      benefits: "Rich in protein and vitamins",
      concerns: "Moderate sodium content"
    };
  }
  
  // Placeholder method to provide mock data when API is not configured
  getMockRefrigeratorData() {
    return {
      items: ["Milk", "Eggs", "Cheese", "Tomatoes", "Lettuce", "Chicken", "Bread"],
      expiringItems: ["Lettuce", "Tomatoes"],
      suggestedRecipes: [
        {
          name: "Quick Sandwich",
          description: "A simple sandwich using bread, cheese, and vegetables",
          ingredients: ["Bread", "Cheese", "Tomatoes", "Lettuce"]
        },
        {
          name: "Scrambled Eggs",
          description: "Simple scrambled eggs with cheese",
          ingredients: ["Eggs", "Cheese", "Milk"]
        }
      ]
    };
  }

  async generateFoodRecommendations(context) {
    if (!this.isConfigured()) {
      // For demo purposes, we could return mock data if in development mode
      if (import.meta.env.DEV) {
        console.warn('Using mock data because OpenAI API is not configured.');
        return {
          meals: [
            {
              name: "Grilled Chicken Salad",
              description: "A healthy salad with grilled chicken and mixed vegetables",
              calories: 350,
              ingredients: ["Chicken breast", "Lettuce", "Tomatoes", "Cucumber", "Olive oil"]
            }
          ],
          nutritionalGaps: [
            {
              nutrient: "Vitamin D",
              recommendation: "Consider adding more dairy and fatty fish to your diet"
            }
          ],
          mealPlan: {
            "Monday": [
              {
                name: "Oatmeal with Berries",
                calories: 250
              },
              {
                name: "Grilled Chicken Salad",
                calories: 350
              }
            ]
          }
        };
      }
      throw new Error('OpenAI API is not properly configured. ' + this.getConfigurationError());
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
          model: "gpt-4o-mini",
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
        throw new Error(this.handleAPIError(response.status, errorData));
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
      // For demo purposes, we could return mock data if in development mode
      if (import.meta.env.DEV) {
        console.warn('Using mock data because OpenAI API is not configured.');
        return this.getMockAnalysisData();
      }
      throw new Error('OpenAI API is not properly configured. ' + this.getConfigurationError());
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
          model: "gpt-4o-mini",
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
        throw new Error(this.handleAPIError(response.status, errorData));
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
      // For demo purposes, we could return mock data if in development mode
      if (import.meta.env.DEV) {
        console.warn('Using mock data because OpenAI API is not configured.');
        return this.getMockRefrigeratorData();
      }
      throw new Error('OpenAI API is not properly configured. ' + this.getConfigurationError());
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
          model: "gpt-4o-mini",
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
        throw new Error(this.handleAPIError(response.status, errorData));
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

  handleAPIError(status, errorData = {}) {
    // Check for specific OpenAI error codes
    if (errorData.error) {
      if (errorData.error.code === 'content_policy_violation') {
        return 'The image could not be analyzed due to content policy restrictions.';
      }
      
      if (errorData.error.code === 'rate_limit_exceeded') {
        return 'API rate limit exceeded. Please try again later.';
      }
      
      if (errorData.error.code === 'insufficient_quota') {
        return 'Your OpenAI API quota has been exceeded. Please check your billing details.';
      }
      
      if (errorData.error.message) {
        return `OpenAI API error: ${errorData.error.message}`;
      }
    }
    
    // Fall back to status code based errors
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