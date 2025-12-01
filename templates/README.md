# Template System

This directory contains the HTML template system to reduce repetition across pages.

## Structure

### Base Template
- **`base.html`** - Main template with `<html>`, `<head>`, and `<body>` structure

### Content Files
- **`home-content.html`** - Content for the home page
- **`home-scripts.html`** - Scripts specific to the home page
- **`extras-content.html`** - Content for the extras page
- **`over-ons-content.html`** - Content for the over-ons page

## Template Parameters

The base template uses the following parameters (format: `{!paramName}`):

- **`{!title}`** - Page title (shown in browser tab)
- **`{!containerClass}`** - CSS class for the main container (`hero` or `content`)
- **`{!content}`** - Main page content (injected from content files)
- **`{!scripts}`** - Page-specific scripts (injected from script files)
- **`{!headExtra}`** - Additional head elements (optional)

## Usage

### In server.js:

```javascript
const { renderTemplate } = require("./utils/template");

app.get("/page", (req, res) => {
  const html = renderTemplate("base", {
    title: "Page Title",
    containerClass: "content",
    content: loadContent("page-content.html"),
    scripts: loadContent("page-scripts.html"),
    headExtra: ""
  });
  res.send(html);
});
```

### Adding a New Page:

1. Create `templates/newpage-content.html` with your page content
2. (Optional) Create `templates/newpage-scripts.html` if you need page-specific scripts
3. Add a route in `server.js` using the template system
4. The navigation, header, and footer are automatically included from `base.html`

## Benefits

- **DRY (Don't Repeat Yourself)** - Common HTML structure is defined once
- **Easy Updates** - Change navigation or layout in one place
- **Consistency** - All pages use the same base structure
- **Simple** - No complex build tools or frameworks needed

