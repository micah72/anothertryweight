import React, { useEffect } from 'react';

const MetaTags = () => {
  useEffect(() => {
    // Set meta tags programmatically
    
    // Set charset
    document.querySelector('meta[charset]') || 
      document.head.appendChild(
        Object.assign(document.createElement('meta'), { charset: 'utf-8' })
      );
    
    // Set description
    let descriptionMeta = document.querySelector('meta[name="description"]');
    if (!descriptionMeta) {
      descriptionMeta = document.createElement('meta');
      descriptionMeta.name = 'description';
      document.head.appendChild(descriptionMeta);
    }
    descriptionMeta.content = 'SnapLicious AI - A comprehensive health and meal planning app';
    
    // Set viewport
    let viewportMeta = document.querySelector('meta[name="viewport"]');
    if (!viewportMeta) {
      viewportMeta = document.createElement('meta');
      viewportMeta.name = 'viewport';
      document.head.appendChild(viewportMeta);
    }
    viewportMeta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';
    
    // Apple specific meta tags
    setMetaTag('apple-mobile-web-app-capable', 'yes');
    setMetaTag('apple-mobile-web-app-status-bar-style', 'black-translucent');
    setMetaTag('format-detection', 'telephone=no');
    
    // Microsoft specific meta tags
    setMetaTag('msapplication-tap-highlight', 'no');
    
    // Safari specific meta tags
    setMetaTag('theme-color', '#3B82F6');
    
    // Preload critical resources
    const preconnectUrls = [
      'https://fonts.googleapis.com',
      'https://fonts.gstatic.com',
      'https://images.unsplash.com',
      'https://images.pexels.com'
    ];
    
    preconnectUrls.forEach(url => {
      if (!document.querySelector(`link[rel="preconnect"][href="${url}"]`)) {
        const link = document.createElement('link');
        link.rel = 'preconnect';
        link.href = url;
        if (url === 'https://fonts.gstatic.com') {
          link.crossOrigin = 'anonymous';
        }
        document.head.appendChild(link);
      }
    });
  }, []);
  
  // Helper function to set meta tags
  const setMetaTag = (name, content) => {
    let meta = document.querySelector(`meta[name="${name}"]`);
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = name;
      document.head.appendChild(meta);
    }
    meta.content = content;
  };

  // This component doesn't render anything visible
  return null;
};

export default MetaTags; 