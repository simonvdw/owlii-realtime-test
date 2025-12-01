// utils/template.js
const fs = require('fs');
const path = require('path');

/**
 * Simple template renderer
 * Replaces {!paramName} with values from params object
 * 
 * @param {string} templateName - Name of template file (without .html)
 * @param {object} params - Object with parameter values
 * @returns {string} Rendered HTML
 */
function renderTemplate(templateName, params = {}) {
  const templatePath = path.join(__dirname, '..', 'templates', `${templateName}.html`);
  let html = fs.readFileSync(templatePath, 'utf-8');
  
  // Replace all {!paramName} with values from params
  for (const [key, value] of Object.entries(params)) {
    const placeholder = `{!${key}}`;
    html = html.replace(new RegExp(placeholder, 'g'), value || '');
  }
  
  // Remove any remaining unreplaced placeholders
  html = html.replace(/\{![^}]+\}/g, '');
  
  return html;
}

module.exports = { renderTemplate };

