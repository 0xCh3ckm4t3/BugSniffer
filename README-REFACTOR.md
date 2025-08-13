# BugSniffer - JavaScript File Collector

A Chrome extension that automatically collects and lists all JavaScript file URLs per domain for security research and analysis.

## 📁 Refactored Architecture

### Project Structure

```
BugSniffer/
├── 📁 js/
│   ├── 📁 modules/           # Modular JavaScript components
│   │   ├── dom-utils.js      # DOM manipulation utilities
│   │   ├── storage.js        # Chrome storage operations
│   │   ├── url-manager.js    # URL parsing and validation
│   │   ├── toast-manager.js  # Toast notification system
│   │   ├── file-renderer.js  # File list rendering
│   │   └── stats-manager.js  # Statistics management
│   ├── main-popup.js         # Main application orchestrator
│   └── popup-app.js          # Legacy app (to be replaced)
├── 📁 styles/                # Modular CSS components
│   ├── variables.css         # CSS custom properties
│   ├── base.css             # Base styles and layout
│   ├── header.css           # Header component styles
│   ├── toggle.css           # Toggle switch component
│   ├── stats.css            # Statistics component
│   ├── actions.css          # Action buttons component
│   ├── js-list.css          # JavaScript file list
│   └── utilities.css        # Utility classes and helpers
├── popup-clean.html          # Clean refactored HTML
├── popup-refactored.css      # Main CSS with imports
├── background-refactored.js  # Refactored background script
├── content-refactored.js     # Refactored content script
├── manifest-refactored.json  # Updated manifest
└── README-REFACTOR.md        # This documentation
```

## 🔧 Refactoring Improvements

### 1. **Modular Architecture**
- **Before**: Monolithic JavaScript files with mixed concerns
- **After**: Separated into focused, single-responsibility modules

### 2. **CSS Organization**
- **Before**: Single large CSS file with duplicate code and inconsistencies
- **After**: Modular CSS with shared variables and component-based organization

### 3. **JavaScript Modules**

#### `DOMUtils` - DOM Manipulation
```javascript
// Clean API for DOM operations
DOMUtils.getElement(id)
DOMUtils.setContent(element, content)
DOMUtils.toggleClass(element, className, condition)
```

#### `StorageManager` - Chrome Storage
```javascript
// Promise-based storage operations
await StorageManager.get(keys)
await StorageManager.set(data)
await StorageManager.isEnabled()
```

#### `URLManager` - URL Operations
```javascript
// URL parsing and validation
URLManager.getDomain(url)
URLManager.getCurrentDomain()
URLManager.isJavaScriptFile(url)
```

#### `ToastManager` - Notifications
```javascript
// Centralized notification system
ToastManager.success(message)
ToastManager.error(message)
ToastManager.info(message)
```

#### `FileRenderer` - File List Rendering
```javascript
// Handles file list display and interactions
const renderer = new FileRenderer(domain)
renderer.render(urls, enabled)
```

#### `StatsManager` - Statistics
```javascript
// Manages statistics display
await StatsManager.updateAll(fileCount)
await StatsManager.updateDomainCount()
```

### 4. **CSS Improvements**

#### Variables System
```css
:root {
  /* Color Palette */
  --bg-primary: #0a0a0a;
  --text-accent: #00ff88;
  
  /* Spacing */
  --spacing-sm: 12px;
  --spacing-md: 16px;
  
  /* Transitions */
  --transition-fast: 0.2s ease;
  --transition-normal: 0.3s ease;
}
```

#### Component-Based Styles
- `header.css` - Header component styles
- `toggle.css` - Toggle switch component  
- `stats.css` - Statistics display
- `actions.css` - Action buttons
- `js-list.css` - File list component
- `utilities.css` - Utility classes and responsive design

### 5. **Error Handling**
- **Before**: Inconsistent error handling
- **After**: Comprehensive try-catch blocks with user-friendly error messages

### 6. **Performance Optimizations**
- **Before**: Multiple DOM queries and mixed business logic
- **After**: Cached DOM references and separated concerns

### 7. **Code Quality**
- **Before**: Mixed ES5/ES6 syntax, no JSDoc
- **After**: Modern ES6+ modules with comprehensive JSDoc documentation

## 🚀 Usage

### Development Setup

1. **Load the refactored extension:**
   ```bash
   # Use the refactored manifest
   cp manifest-refactored.json manifest.json
   ```

2. **Update HTML to use modular version:**
   ```bash
   cp popup-clean.html popup.html
   ```

3. **Use modular CSS:**
   ```bash
   cp popup-refactored.css popup.css
   ```

### File Structure Benefits

#### ✅ **Maintainability**
- Each module has a single responsibility
- Easy to locate and fix bugs
- Clear separation of concerns

#### ✅ **Testability**
- Modules can be tested independently
- Mock dependencies easily
- Clear input/output contracts

#### ✅ **Scalability**
- Easy to add new features
- Modules can be reused
- Clear extension points

#### ✅ **Performance**
- Optimized CSS with no duplicates
- Efficient DOM operations
- Proper resource cleanup

## 📋 Migration Guide

### From Legacy to Refactored

1. **Replace main files:**
   ```bash
   # HTML
   mv popup-clean.html popup.html
   
   # CSS  
   mv popup-refactored.css popup.css
   
   # JavaScript
   # Update popup.html script tag:
   # <script type="module" src="js/main-popup.js"></script>
   
   # Manifest
   mv manifest-refactored.json manifest.json
   ```

2. **Test the refactored version:**
   - Load extension in Chrome
   - Test enable/disable toggle
   - Test file collection on various websites
   - Test copy/download functionality
   - Verify toast notifications work

3. **Remove legacy files** (after testing):
   ```bash
   rm popup-refactored.js
   rm js/popup-app.js  # old version
   ```

## 🔍 Key Features Preserved

- ✅ JavaScript file collection from DOM and network
- ✅ Per-domain storage
- ✅ Enable/disable functionality  
- ✅ Copy to clipboard
- ✅ Download as text file
- ✅ Real-time statistics
- ✅ Toast notifications
- ✅ Responsive design

## 🎯 Benefits of Refactoring

### Code Quality
- **Readability**: Clear, well-documented modules
- **Maintainability**: Easy to understand and modify
- **Consistency**: Unified coding patterns throughout

### Performance
- **Optimized CSS**: No duplicate styles, better caching
- **Efficient DOM**: Cached references, minimal queries  
- **Memory**: Proper cleanup and resource management

### Developer Experience
- **Modularity**: Work on specific features independently
- **Debugging**: Easier to isolate and fix issues
- **Testing**: Each module can be unit tested

### User Experience  
- **Reliability**: Better error handling and recovery
- **Performance**: Faster loading and smoother interactions
- **Consistency**: Uniform design and behavior

## 🧪 Testing

### Manual Testing Checklist
- [ ] Extension loads without errors
- [ ] Domain detection works correctly
- [ ] Toggle enables/disables functionality
- [ ] JavaScript files are collected and displayed
- [ ] Statistics update correctly
- [ ] Copy functionality works
- [ ] Download creates proper file
- [ ] Clear function removes files
- [ ] Toast notifications display
- [ ] Responsive design works

### Browser Compatibility
- ✅ Chrome 88+
- ✅ Edge 88+
- ✅ Opera 74+

## 📝 Next Steps

1. **Add unit tests** for each module
2. **Implement dark/light theme toggle**
3. **Add export formats** (JSON, CSV)
4. **Enhanced filtering** and search
5. **Performance metrics** and analysis

## 🤝 Contributing

When contributing to the refactored codebase:

1. **Follow the modular pattern** - create focused, single-purpose modules
2. **Use the established CSS variables** - maintain design consistency  
3. **Add JSDoc documentation** - document all public methods
4. **Handle errors gracefully** - use try-catch and user-friendly messages
5. **Test your changes** - verify functionality across different websites

---

*This refactored version maintains all original functionality while providing a much cleaner, more maintainable, and extensible codebase.*
