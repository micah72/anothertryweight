import React from 'react';

const AboutPage = () => {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">About Us</h1>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Our Mission</h2>
          <p className="text-gray-600 mb-6">
            We're dedicated to helping people achieve their health and fitness goals through better nutrition tracking and meal planning. 
            Our platform combines cutting-edge technology with nutritional science to provide personalized recommendations and insights.
          </p>
          
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Our Story</h2>
          <p className="text-gray-600 mb-6">
            Founded in 2025, our team of nutritionists, fitness experts, and software engineers came together with a shared vision: 
            to make healthy eating accessible, enjoyable, and sustainable for everyone. We recognized that many people struggle with 
            maintaining healthy eating habits due to lack of time, knowledge, or resources. That's why we created this platform - 
            to simplify nutrition tracking and make it easier for people to make healthier food choices.
          </p>
          
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Our Approach</h2>
          <p className="text-gray-600">
            We believe that healthy eating should be personalized to your unique needs and preferences. Our platform uses advanced 
            algorithms to analyze your dietary patterns, preferences, and goals to provide tailored recommendations. We focus on 
            sustainable habits rather than quick fixes, helping you build a healthier relationship with food for the long term.
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
              <p className="text-gray-500">Head of Nutrition</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutPage;
