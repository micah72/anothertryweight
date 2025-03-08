class OpenAIService {
  constructor() {
    // Get API key from environment variables or use a default for development
    let apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    
    // Use a default placeholder key for development if none is provided
    if (import.meta.env.DEV && (!apiKey || apiKey === 'undefined' || apiKey === 'your_openai_api_key_here')) {
      console.warn('Using development mode with mock responses for OpenAI service');
      apiKey = 'dev_mode_mock_key_for_testing';
      this.useMockData = true;
    }
    
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
    } else if (!this.useMockData && (!apiKey.startsWith('sk-') || apiKey.length < 20)) {
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
    // Always return true in development mode with mock data
    return this.useMockData || (!this.configurationError && this.apiKey);
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
    // Create a more comprehensive mock analysis with all fields that will be expected by the UI
    const mockData = {
      foodName: "Sample Food Item",
      calories: 350,
      healthScore: 7,
      protein: 15,
      carbs: 30,
      fat: 12,
      fiber: 5,
      sugars: 8,
      benefits: "Rich in protein and vitamins",
      concerns: "Moderate sodium content",
      portionSize: "Medium portion (150g)",
      standardServingSize: "100g serving",
      relativePortionSize: 1.5, // 1.5x standard serving
      actualAmountDescription: "About 1.5x a standard serving size",
      nutritionSource: "USDA FoodData Central",
      healthScoreReason: "Good balance of macronutrients with moderate fiber content"
    };

    // Prepare analysis data for storage - same format as in parseAnalysisResponse
    mockData.analysisData = JSON.stringify({
      protein: mockData.protein || 0,
      carbs: mockData.carbs || 0,
      fat: mockData.fat || 0,
      fiber: mockData.fiber || 0,
      sugars: mockData.sugars || 0,
      benefits: mockData.benefits || 'No benefits information available',
      concerns: mockData.concerns || 'No concerns information available',
      nutritionSource: mockData.nutritionSource || 'Estimated by AI',
      healthScoreReason: mockData.healthScoreReason || 'Based on overall nutritional value',
      portionSize: mockData.portionSize || 'Medium portion',
      standardServingSize: mockData.standardServingSize || 'Standard serving',
      relativePortionSize: mockData.relativePortionSize || 1.0,
      actualAmountDescription: mockData.actualAmountDescription || 'Standard serving size'
    });
    
    console.log('Using mock analysis data:', mockData);
    return mockData;
  }
  
  // Placeholder method to provide mock data when API is not configured
  getMockRefrigeratorData() {
    return {
      items: [
        {
          name: "Milk",
          brand: "Organic Valley",
          category: "Dairy",
          quantity: "1 gallon",
          estimatedExpiry: "2025-03-15",
          daysUntilExpiry: 8,
          nutritionSummary: "High in calcium and vitamin D",
          storageRecommendation: "Keep refrigerated below 40°F"
        },
        {
          name: "Eggs",
          brand: "Happy Hens",
          category: "Protein",
          quantity: "12 count, large",
          estimatedExpiry: "2025-03-21",
          daysUntilExpiry: 14,
          nutritionSummary: "High in protein and B vitamins",
          storageRecommendation: "Keep refrigerated, store in original carton"
        },
        {
          name: "Cheddar Cheese",
          brand: "Tillamook",
          category: "Dairy",
          quantity: "8oz block, about 75% remaining",
          estimatedExpiry: "2025-04-10",
          daysUntilExpiry: 34,
          nutritionSummary: "Good source of calcium and protein",
          storageRecommendation: "Keep wrapped and refrigerated"
        },
        {
          name: "Tomatoes",
          brand: "Organic",
          category: "Vegetables",
          quantity: "4 medium, slightly soft",
          estimatedExpiry: "2025-03-10",
          daysUntilExpiry: 3,
          nutritionSummary: "High in vitamins A, C and lycopene",
          storageRecommendation: "Use soon, store at room temperature for best flavor"
        },
        {
          name: "Lettuce",
          brand: "Fresh Farms",
          category: "Vegetables",
          quantity: "1 head, showing signs of wilting",
          estimatedExpiry: "2025-03-09",
          daysUntilExpiry: 2,
          nutritionSummary: "Low in calories, good source of fiber",
          storageRecommendation: "Use immediately, wash only before use"
        },
        {
          name: "Chicken Breast",
          brand: "Perdue",
          category: "Protein",
          quantity: "1 lb package, unopened",
          estimatedExpiry: "2025-03-12",
          daysUntilExpiry: 5,
          nutritionSummary: "Lean protein source, low in fat",
          storageRecommendation: "Keep refrigerated or freeze for longer storage"
        },
        {
          name: "Whole Grain Bread",
          brand: "Dave's Killer Bread",
          category: "Grain",
          quantity: "3/4 loaf remaining",
          estimatedExpiry: "2025-03-14",
          daysUntilExpiry: 7,
          nutritionSummary: "Good source of fiber and whole grains",
          storageRecommendation: "Keep sealed to maintain freshness"
        }
      ],
      inventorySummary: {
        totalItems: 7,
        expiringWithin3Days: 2,
        expiringWithin7Days: 4,
        categories: {
          "Dairy": 2,
          "Protein": 2,
          "Vegetables": 2,
          "Grain": 1
        },
        nutritionalBalance: "Good protein and vegetable options, could use more fruits and whole grains"
      },
      foodGroups: {
        "Well Stocked": ["Dairy", "Protein"],
        "Low Stock": ["Fruits", "Whole Grains"],
        "Missing": ["Legumes"]
      },
      expiringItems: [
        {
          name: "Lettuce",
          daysUntilExpiry: 2,
          recommendation: "Use in salads or sandwiches within 2 days"
        },
        {
          name: "Tomatoes",
          daysUntilExpiry: 3,
          recommendation: "Use in salads, sandwiches, or make a quick sauce"
        }
      ],
      suggestedRecipes: [
        {
          name: "Chicken Club Sandwich",
          description: "A hearty sandwich with grilled chicken, lettuce, tomato and cheese",
          ingredients: ["Bread", "Chicken Breast", "Lettuce", "Tomatoes", "Cheddar Cheese"],
          nutritionEstimate: "Approximately 450 calories, 35g protein, 30g carbs",
          preparationTime: "15 minutes"
        },
        {
          name: "Vegetable Omelette",
          description: "Fluffy omelette with tomatoes, cheese and fresh herbs",
          ingredients: ["Eggs", "Tomatoes", "Cheddar Cheese", "Milk"],
          nutritionEstimate: "Approximately 350 calories, 25g protein, 5g carbs",
          preparationTime: "10 minutes"
        },
        {
          name: "Grilled Chicken Salad",
          description: "Fresh salad with grilled chicken, tomatoes and lettuce",
          ingredients: ["Chicken Breast", "Lettuce", "Tomatoes"],
          nutritionEstimate: "Approximately 300 calories, 35g protein, 10g carbs",
          preparationTime: "20 minutes"
        }
      ],
      shoppingRecommendations: [
        "Fresh fruits (berries, apples, bananas)",
        "More vegetables for variety (bell peppers, carrots, cucumbers)",
        "Whole grains (quinoa, brown rice)",
        "Legumes (beans, lentils)"
      ]
    };
  }

  async generateFoodRecommendations(context) {
    if (!this.isConfigured()) {
      // For demo purposes, we could return mock data if in development mode
      if (import.meta.env.DEV || this.useMockData) {
        console.warn('Using mock data because OpenAI API is not configured.');
        return {
          meals: [
            {
              name: "Grilled Chicken Salad",
              description: "A healthy salad with grilled chicken, mixed greens, and a light vinaigrette dressing",
              calories: 350,
              ingredients: ["Chicken breast", "Mixed greens", "Tomatoes", "Cucumber", "Red onion", "Olive oil", "Balsamic vinegar"]
            },
            {
              name: "Vegetable Stir Fry with Tofu",
              description: "A protein-packed vegetarian stir fry with colorful vegetables and tofu",
              calories: 400,
              ingredients: ["Tofu", "Broccoli", "Bell peppers", "Carrots", "Snow peas", "Soy sauce", "Ginger", "Garlic"]
            },
            {
              name: "Salmon with Roasted Vegetables",
              description: "Oven-baked salmon fillet with a medley of roasted seasonal vegetables",
              calories: 450,
              ingredients: ["Salmon fillet", "Zucchini", "Bell peppers", "Cherry tomatoes", "Red onion", "Olive oil", "Lemon", "Herbs"]
            },
            {
              name: "Greek Yogurt Parfait",
              description: "A protein-rich breakfast or snack with layers of yogurt, fruit, and granola",
              calories: 300,
              ingredients: ["Greek yogurt", "Berries", "Banana", "Granola", "Honey", "Chia seeds"]
            }
          ],
          nutritionalGaps: [
            {
              nutrient: "Vitamin D",
              recommendation: "Consider adding more dairy, fatty fish, and egg yolks to your diet, or get more sun exposure"
            },
            {
              nutrient: "Omega-3 Fatty Acids",
              recommendation: "Include more fatty fish (salmon, mackerel, sardines), walnuts, and flaxseeds in your meals"
            },
            {
              nutrient: "Fiber",
              recommendation: "Increase your intake of whole grains, legumes, fruits, and vegetables for better digestive health"
            }
          ],
          mealPlan: {
            "Monday": [
              {
                name: "Oatmeal with Berries and Nuts",
                calories: 350
              },
              {
                name: "Quinoa Bowl with Roasted Vegetables",
                calories: 450
              },
              {
                name: "Grilled Chicken with Sweet Potato",
                calories: 500
              }
            ],
            "Tuesday": [
              {
                name: "Greek Yogurt Parfait",
                calories: 300
              },
              {
                name: "Mediterranean Wrap",
                calories: 400
              },
              {
                name: "Salmon with Roasted Vegetables",
                calories: 450
              }
            ],
            "Wednesday": [
              {
                name: "Veggie Omelette with Whole Grain Toast",
                calories: 350
              },
              {
                name: "Lentil Soup with Side Salad",
                calories: 400
              },
              {
                name: "Turkey Meatballs with Zucchini Noodles",
                calories: 450
              }
            ]
          }
        };
      }
      
      throw this.getConfigurationError();
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
      if (import.meta.env.DEV || this.useMockData) {
        console.warn('Using mock data because OpenAI API is not configured.');
        const mockData = this.getMockAnalysisData();
        console.log('Mock data for analysis:', mockData);
        return mockData;
      }
      throw new Error('OpenAI API is not properly configured. ' + this.getConfigurationError());
    }

    if (!this.validateImage(base64Image)) {
      throw new Error('Invalid image format');
    }

    try {
      console.log('Sending image to OpenAI API for analysis...');
      
      // Prepare the request payload
      const requestBody = {
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a nutritional analysis expert. Analyze food images and provide detailed nutritional information based on reliable nutritional databases like USDA FoodData Central. Be thorough, accurate, and provide sources for your nutritional data. You must accurately estimate the relative portion size in the image compared to standard serving sizes."
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analyze this food image and provide detailed nutritional information in a JSON format. VERY IMPORTANT: First analyze the relative portion size visible in the image compared to a standard serving, then calculate nutritional values proportionate to that actual amount.\n\nInclude the following data:\n\n{\"foodName\": \"name of food\", \"calories\": number proportional to visible amount, \"protein\": number in grams proportional to visible amount, \"carbs\": number in grams proportional to visible amount, \"fat\": number in grams proportional to visible amount, \"fiber\": number in grams proportional to visible amount, \"sugars\": number in grams proportional to visible amount, \"healthScore\": number from 1-10, \"benefits\": \"main nutritional benefits\", \"concerns\": \"potential health concerns\", \"portionSize\": \"description of the amount in the image\", \"standardServingSize\": \"what a standard serving size would be\", \"relativePortionSize\": number ratio compared to standard serving, \"actualAmountDescription\": \"description comparing to standard serving size\", \"nutritionSource\": \"source of the nutritional data\", \"healthScoreReason\": \"explanation for the health score\"}\n\nProvide ONLY the JSON without any additional text or markdown. Use high-quality sources such as USDA FoodData Central or other reputable nutritional databases."
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
        };
      
        console.log('Request payload:', JSON.stringify(requestBody));
        
        const response = await fetch(this.apiUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('OpenAI API Error Response:', errorData);
        throw new Error(this.handleAPIError(response.status, errorData));
      }

      const data = await response.json();
      console.log('OpenAI API Response:', data);
      
      const content = data.choices[0].message.content;
      console.log('Content from response:', content);
      
      const result = this.parseAnalysisResponse(content);
      console.log('Parsed result:', result);
      
      if (result.error) {
        throw new Error('Failed to analyze image content');
      }
      
      return result;
    } catch (error) {
      console.error('Error in analyzeImage:', error);
      // Fall back to mock data in development mode
      if (import.meta.env.DEV || this.useMockData) {
        console.warn('Falling back to mock data due to error');
        return this.getMockAnalysisData();
      }
      throw error;
    }
  }

  async analyzeRefrigeratorImage(base64Image) {
    if (!this.isConfigured()) {
      // For demo purposes, we could return mock data if in development mode
      if (import.meta.env.DEV || this.useMockData) {
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
              role: "system",
              content: "You are an expert in food inventory analysis and nutritional assessment. Your task is to meticulously analyze refrigerator contents, identify brands, packaging, portion sizes, and estimate nutritional information. Provide detailed insights about food items, expiration dates, and generate recipe suggestions based on available ingredients."
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Analyze this refrigerator image in extreme detail and provide the following in a JSON format without any additional text or markdown:\n\n{\n  \"items\": [\n    {\n      \"name\": \"full name of the food item\",\n      \"brand\": \"identified brand name if visible\",\n      \"category\": \"food category (Dairy, Protein, Vegetables, etc.)\",\n      \"quantity\": \"estimated quantity and portion size\",\n      \"estimatedExpiry\": \"YYYY-MM-DD estimated expiration date\",\n      \"daysUntilExpiry\": number of days until expiry,\n      \"nutritionSummary\": \"brief nutrition highlights\",\n      \"storageRecommendation\": \"proper storage advice\"\n    }\n  ],\n  \"inventorySummary\": {\n    \"totalItems\": total number of items,\n    \"expiringWithin3Days\": number of soon-expiring items,\n    \"expiringWithin7Days\": number of items expiring within a week,\n    \"categories\": {\"category name\": count},\n    \"nutritionalBalance\": \"assessment of nutritional balance\"\n  },\n  \"foodGroups\": {\n    \"Well Stocked\": [\"list of well-represented food groups\"],\n    \"Low Stock\": [\"list of under-represented food groups\"],\n    \"Missing\": [\"list of missing essential food groups\"]\n  },\n  \"expiringItems\": [\n    {\n      \"name\": \"item name\",\n      \"daysUntilExpiry\": days left,\n      \"recommendation\": \"usage recommendation\"\n    }\n  ],\n  \"suggestedRecipes\": [\n    {\n      \"name\": \"recipe name\",\n      \"description\": \"detailed description with cooking method\",\n      \"ingredients\": [\"list of required ingredients from visible items\"],\n      \"nutritionEstimate\": \"estimated nutritional information\",\n      \"preparationTime\": \"estimated prep and cook time\"\n    }\n  ],\n  \"shoppingRecommendations\": [\"list of items to buy based on what's missing\"]\n}\n\nBe extremely thorough in identifying ALL items in the refrigerator, including condiments, beverages, and items in drawers or on door shelves. Look for expiration dates on packaging, brand labels, and assess the condition of produce. Identify any organic or specialty products."
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
          max_tokens: 2000,
          temperature: 0.3
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
      console.log('Parsing OpenAI response:', content);
      
      // Clean the content by removing any markdown code blocks and trimming whitespace
      let cleanContent = content.replace(/```json\s*|\s*```/g, '').trim();
      console.log('Cleaned content:', cleanContent);
      
      // Extract JSON from the content
      const jsonMatch = cleanContent.match(/{[\s\S]*}/);
      if (!jsonMatch) {
        console.error('No valid JSON found in response');
        throw new Error('Invalid response format');
      }

      console.log('JSON match found:', jsonMatch[0]);
      
      // Parse the JSON data
      const parsedData = JSON.parse(jsonMatch[0]);
      console.log('Successfully parsed JSON data:', parsedData);

      // Prepare analysis data for storage
      const analysisData = JSON.stringify({
        protein: parsedData.protein || 0,
        carbs: parsedData.carbs || 0,
        fat: parsedData.fat || 0,
        fiber: parsedData.fiber || 0,
        sugars: parsedData.sugars || 0,
        benefits: parsedData.benefits || 'No benefits information available',
        concerns: parsedData.concerns || 'No concerns information available',
        nutritionSource: parsedData.nutritionSource || 'Estimated by AI',
        healthScoreReason: parsedData.healthScoreReason || 'Based on overall nutritional value',
        portionSize: parsedData.portionSize || 'Standard serving',
        standardServingSize: parsedData.standardServingSize || 'Standard serving',
        relativePortionSize: parsedData.relativePortionSize || 1.0,
        actualAmountDescription: parsedData.actualAmountDescription || 'Standard serving size'
      });

      // Create the final result object with all required fields
      const result = {
        foodName: String(parsedData.foodName || 'Unknown Food'),
        calories: Number(parsedData.calories) || 0,
        healthScore: Number(parsedData.healthScore) || 0,
        protein: Number(parsedData.protein) || 0,
        carbs: Number(parsedData.carbs) || 0,
        fat: Number(parsedData.fat) || 0,
        fiber: Number(parsedData.fiber) || 0,
        sugars: Number(parsedData.sugars) || 0,
        benefits: String(parsedData.benefits || 'No benefits information available'),
        concerns: String(parsedData.concerns || 'No concerns information available'),
        portionSize: String(parsedData.portionSize || 'Standard serving'),
        standardServingSize: String(parsedData.standardServingSize || 'Standard serving'),
        relativePortionSize: Number(parsedData.relativePortionSize) || 1.0,
        actualAmountDescription: String(parsedData.actualAmountDescription || 'Standard serving size'),
        nutritionSource: String(parsedData.nutritionSource || 'Estimated by AI'),
        healthScoreReason: String(parsedData.healthScoreReason || 'Based on overall nutritional value'),
        analysisData: analysisData
      };
      
      console.log('Final parsed result object:', result);
      return result;
    } catch (error) {
      console.error('Error parsing OpenAI response:', error);
      // Return a structured error object with all required fields
      return {
        error: true,
        foodName: 'Analysis Failed',
        calories: 0,
        healthScore: 0,
        protein: 0,
        standardServingSize: 'Standard serving',
        relativePortionSize: 1.0,
        actualAmountDescription: 'Standard serving size',
        carbs: 0,
        fat: 0,
        fiber: 0,
        sugars: 0,
        benefits: 'Unable to analyze nutritional benefits',
        concerns: 'Unable to analyze health concerns',
        portionSize: 'Standard serving',
        nutritionSource: 'Analysis Failed',
        healthScoreReason: 'Analysis Failed',
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
        inventorySummary: parsedData.inventorySummary || {
          totalItems: 0,
          expiringWithin3Days: 0,
          expiringWithin7Days: 0,
          categories: {},
          nutritionalBalance: 'No data available'
        },
        foodGroups: parsedData.foodGroups || {
          "Well Stocked": [],
          "Low Stock": [],
          "Missing": []
        },
        expiringItems: Array.isArray(parsedData.expiringItems) ? parsedData.expiringItems : [],
        suggestedRecipes: Array.isArray(parsedData.suggestedRecipes) 
          ? parsedData.suggestedRecipes.map(recipe => ({
              name: String(recipe.name || 'Unnamed Recipe'),
              description: String(recipe.description || 'No description available'),
              ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients : [],
              nutritionEstimate: String(recipe.nutritionEstimate || 'Nutritional information not available'),
              preparationTime: String(recipe.preparationTime || 'Preparation time unknown')
            }))
          : [],
        shoppingRecommendations: Array.isArray(parsedData.shoppingRecommendations) ? parsedData.shoppingRecommendations : []
      };
    } catch (error) {
      console.error('Error parsing refrigerator analysis response:', error);
      return {
        items: [],
        inventorySummary: {
          totalItems: 0,
          expiringWithin3Days: 0,
          expiringWithin7Days: 0,
          categories: {},
          nutritionalBalance: 'Data unavailable'
        },
        foodGroups: {
          "Well Stocked": [],
          "Low Stock": [],
          "Missing": []
        },
        expiringItems: [],
        suggestedRecipes: [],
        shoppingRecommendations: [],
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
  
  // Generate AI meal plan based on refrigerator contents and past meal choices
  async generateAIMealPlan(refrigeratorItems, pastMeals, mealType, calorieTarget) {
    if (!this.isConfigured()) {
      // For demo purposes, return mock data if in development mode
      if (import.meta.env.DEV || this.useMockData) {
        console.warn('Using mock data because OpenAI API is not configured.');
        return {
          name: mealType,
          time: '12:00',
          calories: calorieTarget || 500,
          notes: `AI suggested ${mealType.toLowerCase()} using ${refrigeratorItems.slice(0, 3).join(', ')}`,
          ingredients: refrigeratorItems.slice(0, 5),
          recipe: "Mock recipe description based on your available ingredients."
        };
      }
      
      throw this.getConfigurationError();
    }

    try {
      const prompt = this.buildMealPlanPrompt(refrigeratorItems, pastMeals, mealType, calorieTarget);
      
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
              content: "You are a professional chef and nutritionist specializing in creating personalized meal plans. Your task is to suggest meals based on available ingredients and past meal preferences."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 1000
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('OpenAI API Error Response:', errorData);
        throw new Error(this.handleAPIError(response.status, errorData));
      }

      const data = await response.json();
      return this.parseMealPlanResponse(data.choices[0].message.content);
    } catch (error) {
      console.error('Error generating AI meal plan:', error);
      throw error;
    }
  }

  buildMealPlanPrompt(refrigeratorItems, pastMeals, mealType, calorieTarget) {
    return `Create a meal plan for ${mealType} based on the following information:

Available Ingredients in Refrigerator:
${refrigeratorItems.join(', ')}

Past Meal Preferences (most recent first):
${pastMeals.map(meal => `- ${meal.name}: ${meal.notes || 'No notes'}`).join('\n')}

Target Calories: ${calorieTarget || 'Not specified'}

Please suggest a meal that:
1. Primarily uses ingredients available in the refrigerator
2. Aligns with past meal preferences
3. Meets the calorie target if specified
4. Is appropriate for the meal type (${mealType})

Return the response in this JSON format:
{
  "name": "Meal Name",
  "time": "suggested time (HH:MM)",
  "calories": estimated calories (number),
  "notes": "detailed description of the meal with preparation instructions",
  "ingredients": ["ingredient1", "ingredient2", ...],
  "recipe": "step by step recipe instructions"
}`;
  }

  parseMealPlanResponse(content) {
    try {
      // First try to parse as pure JSON
      return JSON.parse(content);
    } catch (error) {
      // If that fails, try to extract JSON from the content
      try {
        // Extract JSON object from the content
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          // Try to parse the extracted JSON
          try {
            return JSON.parse(jsonMatch[0]);
          } catch (jsonError) {
            // Handle common JSON syntax errors like trailing commas
            let cleanedJson = jsonMatch[0];
            
            // Remove trailing commas in objects and arrays
            cleanedJson = cleanedJson.replace(/,\s*([\]}])/g, '$1');
            
            // Try parsing the cleaned JSON
            return JSON.parse(cleanedJson);
          }
        }
      } catch (innerError) {
        console.error('Error parsing meal plan JSON:', innerError);
      }

      // If all parsing fails, return a structured error with fallback values
      console.error('Failed to parse meal plan response:', content);
      return {
        name: "Suggested Meal",
        time: "12:00",
        calories: 500,
        notes: "A balanced meal with protein and vegetables.",
        ingredients: [],
        recipe: "Unable to generate recipe details.",
        error: true,
        message: 'Failed to parse AI response'
      };
    }
  }
  
  // Generate a meal plan based on specific ingredient suggestions
  async generateMealWithIngredients(refrigeratorItems, suggestedIngredients, mealType, calorieTarget) {
    if (!this.isConfigured()) {
      // For demo purposes, return mock data if in development mode
      if (import.meta.env.DEV || this.useMockData) {
        console.warn('Using mock data because OpenAI API is not configured.');
        return {
          name: `${suggestedIngredients[0]} ${mealType}`,
          time: '12:00',
          calories: calorieTarget || 500,
          notes: `AI suggested ${mealType.toLowerCase()} featuring ${suggestedIngredients.join(', ')}`,
          ingredients: [...suggestedIngredients, ...refrigeratorItems.slice(0, 3)],
          recipe: `Mock recipe for ${mealType} using ${suggestedIngredients.join(', ')}`
        };
      }
      
      throw this.getConfigurationError();
    }

    try {
      const prompt = this.buildIngredientBasedMealPrompt(refrigeratorItems, suggestedIngredients, mealType, calorieTarget);
      
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
              content: "You are a professional chef specializing in creating recipes based on specific ingredients. Your task is to create delicious meals that feature the user's suggested ingredients while incorporating other available ingredients."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 1000
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('OpenAI API Error Response:', errorData);
        throw new Error(this.handleAPIError(response.status, errorData));
      }

      const data = await response.json();
      return this.parseMealPlanResponse(data.choices[0].message.content);
    } catch (error) {
      console.error('Error generating ingredient-based meal plan:', error);
      throw error;
    }
  }

  buildIngredientBasedMealPrompt(refrigeratorItems, suggestedIngredients, mealType, calorieTarget) {
    return `Create a recipe for ${mealType} that features the following suggested ingredients:

${suggestedIngredients.join(', ')}

Other available ingredients in refrigerator:
${refrigeratorItems.filter(item => !suggestedIngredients.includes(item)).join(', ')}

Target Calories: ${calorieTarget || 'Not specified'}

Please create a meal that:
1. Features the suggested ingredients as the main components
2. Incorporates other available ingredients as needed
3. Meets the calorie target if specified
4. Is appropriate for the meal type (${mealType})

Return the response in this JSON format:
{
  "name": "Meal Name",
  "time": "suggested time (HH:MM)",
  "calories": "estimated calories (number)",
  "notes": "detailed description of the meal highlighting the suggested ingredients",
  "ingredients": ["ingredient1", "ingredient2"],
  "recipe": "step by step recipe instructions"
}`;
  }
}

export default OpenAIService;