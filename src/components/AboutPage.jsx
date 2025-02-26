import React from 'react';

const AboutPage = () => {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">About SnapMeal AI</h1>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Our Mission</h2>
          <p className="text-gray-600 mb-6">
            We're dedicated to transforming the way people manage their diet through the power of photography and artificial intelligence. 
            SnapMeal AI combines cutting-edge technology with nutritional science to provide personalized meal planning, inventory tracking, and dietary insights.
          </p>
          
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Our Story</h2>
          <p className="text-gray-600 mb-6">
            Founded in 2025, our team of nutritionists, AI specialists, and software engineers came together with a shared vision: 
            to make healthy eating accessible, enjoyable, and sustainable for everyone. We recognized that many people struggle with 
            maintaining healthy eating habits and keeping track of their food inventory. That's why we created SnapMeal AI - 
            to simplify nutrition tracking and meal planning through the simple act of taking photos of your food.
          </p>
          
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Our Approach</h2>
          <p className="text-gray-600">
            We believe that healthy eating should be personalized to your unique needs and preferences. SnapMeal AI uses advanced 
            computer vision and machine learning algorithms to analyze your meals, track your inventory, and understand your dietary patterns. 
            Our platform provides tailored recipe suggestions based on what's in your refrigerator and helps you build a 
            visually engaging food journal that makes healthy eating both fun and sustainable.
          </p>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Our Team</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col items-center">
              <div className="w-32 h-32 bg-gray-200 rounded-full mb-4"></div>
              <h3 className="font-medium text-gray-900">Jane Doe</h3>
              <p className="text-gray-500">Founder & CEO</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-32 h-32 bg-gray-200 rounded-full mb-4"></div>
              <h3 className="font-medium text-gray-900">John Smith</h3>
              <p className="text-gray-500">Head of AI & Nutrition</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutPage;
